import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.agents.base import BaseAgent
from backend.app.agents.fraud_detection_agent import fraud_detection_agent
from backend.app.agents.investigation_agent import investigation_agent
from backend.app.agents.explainability_agent import explainability_agent
from backend.app.agents.alert_prioritization_agent import alert_prioritization_agent
from backend.app.models.transaction import Transaction
from backend.app.models.case import InvestigationCase, CaseNote


# --- Prompt Injection Protection ---
INJECTION_PATTERNS = [
    r"ignore\s+(previous|above|prior)\s+instructions",
    r"disregard\s+(previous|all|prior)",
    r"you\s+are\s+now\s+in\s+",
    r"system\s*:\s*",
    r"<\/?script",
    r"javascript\s*:",
    r"on(error|load|click)\s*=",
    r"\{\{.*\}\}",
    r"__import__",
    r"exec\s*\(",
    r"eval\s*\(",
]


def sanitize_user_input(text: str) -> str:
    """Remove potential prompt injection patterns and sanitize input."""
    if not text or not isinstance(text, str):
        return ""
    # Limit length
    text = text[:2000]
    # Strip control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text.strip()


def detect_injection(text: str) -> bool:
    """Returns True if prompt injection patterns are detected."""
    if not text:
        return False
    lower_text = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower_text):
            return True
    return False


# --- Available Copilot Tools ---
COPILOT_TOOLS = {
    "score_transaction": {
        "description": "Run ML fraud scoring on a transaction",
        "requires_confirmation": False,
    },
    "investigate_transaction": {
        "description": "Perform forensic investigation on a transaction",
        "requires_confirmation": False,
    },
    "explain_prediction": {
        "description": "Generate feature attribution explanation for a prediction",
        "requires_confirmation": False,
    },
    "prioritize_alerts": {
        "description": "Prioritize and triage pending alerts",
        "requires_confirmation": False,
    },
    "escalate_to_case": {
        "description": "Create an investigation case from a transaction",
        "requires_confirmation": True,
    },
    "add_case_note": {
        "description": "Add an analyst note to an existing case",
        "requires_confirmation": True,
    },
}


class InvestigationCopilotAgent(BaseAgent):
    """
    Agent E: Investigation Copilot
    Interactive analyst chat interface with tool-calling capabilities.
    Includes prompt injection protection and confirmation gates for 
    write operations.
    """
    def __init__(self):
        super().__init__(
            name="InvestigationCopilotAgent",
            version="2.0.0",
            task_type="INTERACTIVE_COPILOT_CHAT"
        )

    def _execute(self, db: Session, record_id: Optional[str], **kwargs) -> Dict[str, Any]:
        user_message = kwargs.get("message", "")
        session_history: List[Dict] = kwargs.get("session_history", [])
        confirmed_action = kwargs.get("confirmed_action")
        analyst_id = kwargs.get("analyst_id")

        # Sanitize input
        user_message = sanitize_user_input(user_message)

        # Injection check
        if detect_injection(user_message):
            return {
                "response": "⚠️ Security Notice: Your input was flagged by the prompt injection protection system. Please rephrase your request using standard investigation terminology.",
                "tool_called": None,
                "requires_confirmation": False,
                "blocked": True,
                "summary": "Prompt injection attempt detected and blocked."
            }

        # If a confirmed action is provided, execute it
        if confirmed_action:
            return self._execute_confirmed_action(db, confirmed_action, analyst_id)

        # Parse intent from user message
        intent = self._parse_intent(user_message, record_id)

        if intent["tool"]:
            return self._execute_tool(db, intent, user_message)

        # Default conversational response
        return self._generate_help_response(user_message, session_history)

    def _parse_intent(self, message: str, record_id: Optional[str]) -> Dict[str, Any]:
        """Simple deterministic intent parsing from user message."""
        lower = message.lower()

        if any(w in lower for w in ["score", "predict", "fraud probability", "run ml"]):
            return {"tool": "score_transaction", "record_id": record_id}

        if any(w in lower for w in ["investigate", "forensic", "analyze history", "check pattern"]):
            return {"tool": "investigate_transaction", "record_id": record_id}

        if any(w in lower for w in ["explain", "why", "attribution", "feature", "reason"]):
            return {"tool": "explain_prediction", "record_id": record_id}

        if any(w in lower for w in ["prioritize", "triage", "rank alerts", "sort alerts"]):
            return {"tool": "prioritize_alerts", "record_id": None}

        if any(w in lower for w in ["escalate", "create case", "open case", "new case"]):
            return {"tool": "escalate_to_case", "record_id": record_id}

        if any(w in lower for w in ["add note", "case note", "document finding"]):
            return {"tool": "add_case_note", "record_id": record_id}

        return {"tool": None, "record_id": record_id}

    def _execute_tool(self, db: Session, intent: Dict, user_message: str) -> Dict[str, Any]:
        """Execute the identified tool or request confirmation for write ops."""
        tool_name = intent["tool"]
        tool_def = COPILOT_TOOLS.get(tool_name, {})
        record_id = intent.get("record_id")

        # Confirmation gate for write operations
        if tool_def.get("requires_confirmation"):
            return {
                "response": f"🔒 **Confirmation Required**: I'm about to execute `{tool_name}` "
                           f"({tool_def['description']}). "
                           f"This is a write operation that modifies data. "
                           f"Please confirm to proceed.",
                "tool_called": None,
                "pending_action": {
                    "tool": tool_name,
                    "record_id": record_id,
                    "description": tool_def["description"],
                    "user_message": user_message,
                },
                "requires_confirmation": True,
                "summary": f"Awaiting analyst confirmation for {tool_name}."
            }

        # Execute read-only tools directly
        try:
            if tool_name == "score_transaction":
                if not record_id:
                    return self._error_response("Please specify a transaction to score. Navigate to a transaction first.")
                result = fraud_detection_agent.run(db, record_id=record_id)
                return {
                    "response": f"🎯 **Fraud Scoring Complete**\n\n"
                               f"- Probability: **{result.data.get('fraud_probability', 0)*100:.1f}%**\n"
                               f"- Risk Level: **{result.data.get('risk_level', 'N/A')}**\n"
                               f"- Model: {result.data.get('model_version', 'N/A')}\n\n"
                               f"_{result.outcome_summary}_",
                    "tool_called": "score_transaction",
                    "tool_result": result.data,
                    "requires_confirmation": False,
                    "summary": result.outcome_summary
                }

            elif tool_name == "investigate_transaction":
                if not record_id:
                    return self._error_response("Please specify a transaction to investigate.")
                result = investigation_agent.run(db, record_id=record_id)
                indicators = result.data.get("observed_indicators", [])
                indicator_text = "\n".join(
                    f"  - **{ind['indicator']}** ({ind['severity']}): {ind['detail']}"
                    for ind in indicators
                ) if indicators else "  - No significant indicators detected."
                return {
                    "response": f"🔍 **Forensic Investigation Report**\n\n"
                               f"**Indicators Found:** {len(indicators)}\n"
                               f"{indicator_text}\n\n"
                               f"**Recommendations:**\n"
                               + "\n".join(f"  - {r}" for r in result.data.get("recommendations", []))
                               + f"\n\n_{result.outcome_summary}_",
                    "tool_called": "investigate_transaction",
                    "tool_result": result.data,
                    "requires_confirmation": False,
                    "summary": result.outcome_summary
                }

            elif tool_name == "explain_prediction":
                if not record_id:
                    return self._error_response("Please specify a transaction to explain.")
                result = explainability_agent.run(db, record_id=record_id)
                attrs = result.data.get("attributions", [])
                attr_text = "\n".join(
                    f"  - **{a['display_name']}**: {a['value']} → {a['direction']} (weight: {a['weight']})"
                    for a in attrs
                ) if attrs else "  - No attributions available."
                return {
                    "response": f"📊 **Explainability Analysis**\n\n"
                               f"**Feature Attributions:**\n{attr_text}\n\n"
                               f"_{result.outcome_summary}_",
                    "tool_called": "explain_prediction",
                    "tool_result": result.data,
                    "requires_confirmation": False,
                    "summary": result.outcome_summary
                }

            elif tool_name == "prioritize_alerts":
                result = alert_prioritization_agent.run(db)
                alerts_list = result.data.get("prioritized_alerts", [])[:5]
                alerts_text = "\n".join(
                    f"  {a['rank']}. **{a['transaction_ref']}** — Score: {a['priority_score']:.2f} ({a['triage_tier']})"
                    for a in alerts_list
                ) if alerts_list else "  - No alerts to prioritize."
                return {
                    "response": f"📋 **Alert Prioritization**\n\n"
                               f"**Top Alerts:**\n{alerts_text}\n\n"
                               f"_{result.outcome_summary}_",
                    "tool_called": "prioritize_alerts",
                    "tool_result": result.data,
                    "requires_confirmation": False,
                    "summary": result.outcome_summary
                }

        except Exception as e:
            return self._error_response(f"Tool execution failed: {str(e)}")

        return self._error_response("Unknown tool requested.")

    def _execute_confirmed_action(self, db: Session, action: Dict, analyst_id: Optional[str]) -> Dict[str, Any]:
        """Execute a previously confirmed write action."""
        tool_name = action.get("tool")
        record_id = action.get("record_id")

        try:
            if tool_name == "escalate_to_case":
                if not record_id:
                    return self._error_response("No transaction specified for case escalation.")
                
                transaction = db.query(Transaction).filter(Transaction.id == record_id).first()
                if not transaction:
                    return self._error_response("Transaction not found.")

                new_case = InvestigationCase(
                    title=f"Escalated Investigation: {transaction.transaction_ref}",
                    description=f"Auto-escalated from Copilot investigation of transaction {transaction.transaction_ref}.",
                    priority="HIGH",
                    status="OPEN",
                    transaction_id=transaction.id,
                    assigned_to_id=analyst_id,
                )
                db.add(new_case)
                db.commit()
                db.refresh(new_case)

                return {
                    "response": f"✅ **Case Created Successfully**\n\n"
                               f"- Case ID: `{new_case.id}`\n"
                               f"- Title: {new_case.title}\n"
                               f"- Status: {new_case.status}\n"
                               f"- Priority: {new_case.priority}",
                    "tool_called": "escalate_to_case",
                    "tool_result": {"case_id": str(new_case.id)},
                    "requires_confirmation": False,
                    "summary": f"Created investigation case for {transaction.transaction_ref}."
                }

            elif tool_name == "add_case_note":
                if not record_id:
                    return self._error_response("No case specified for note addition.")
                case = db.query(InvestigationCase).filter(InvestigationCase.id == record_id).first()
                if not case:
                    return self._error_response("Case not found.")
                note_content = action.get("user_message", "Copilot-generated note.")
                note = CaseNote(
                    case_id=case.id,
                    author_id=analyst_id,
                    content=sanitize_user_input(note_content),
                )
                db.add(note)
                db.commit()
                return {
                    "response": f"✅ **Note Added** to case `{case.id}`.",
                    "tool_called": "add_case_note",
                    "requires_confirmation": False,
                    "summary": f"Added note to case {case.id}."
                }

        except Exception as e:
            db.rollback()
            return self._error_response(f"Confirmed action failed: {str(e)}")

        return self._error_response("Unknown confirmed action.")

    def _generate_help_response(self, message: str, history: List) -> Dict[str, Any]:
        """Generate a contextual help response."""
        return {
            "response": (
                "👋 **TraceX Investigation Copilot**\n\n"
                "I can help you investigate transactions. Try:\n\n"
                "- **\"Score this transaction\"** — Run ML fraud detection\n"
                "- **\"Investigate this transaction\"** — Forensic pattern analysis\n"
                "- **\"Explain the prediction\"** — Feature attribution breakdown\n"
                "- **\"Prioritize alerts\"** — Triage pending alerts by risk\n"
                "- **\"Escalate to case\"** — Create an investigation case\n"
                "- **\"Add case note\"** — Document findings on a case\n\n"
                "_Navigate to a specific transaction first for context-aware analysis._"
            ),
            "tool_called": None,
            "requires_confirmation": False,
            "summary": "Displayed copilot help menu."
        }

    def _error_response(self, message: str) -> Dict[str, Any]:
        return {
            "response": f"❌ {message}",
            "tool_called": None,
            "requires_confirmation": False,
            "error": True,
            "summary": message
        }


copilot_agent = InvestigationCopilotAgent()
