from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from backend.app.agents.base import BaseAgent
from backend.app.models.transaction import Transaction

class TransactionInvestigationAgent(BaseAgent):
    """
    Agent B: Transaction Investigation Agent
    Performs forensic historical analysis using authorized database queries.
    Detects velocity clustering, account takeover liquidation, mule staging,
    and ledger inconsistencies without presuming fraud.
    """
    def __init__(self):
        super().__init__(
            name="TransactionInvestigationAgent",
            version="2.0.0",
            task_type="FORENSIC_DATABASE_INVESTIGATION"
        )

    def _execute(self, db: Session, record_id: Optional[str], **kwargs) -> Dict[str, Any]:
        transaction: Optional[Transaction] = None
        if record_id:
            transaction = db.query(Transaction).filter(Transaction.id == record_id).first()
        elif kwargs.get("transaction_ref"):
            transaction = db.query(Transaction).filter(Transaction.transaction_ref == kwargs.get("transaction_ref")).first()

        if not transaction:
            raise ValueError(f"Investigation target transaction not found for ID/Ref: {record_id or kwargs.get('transaction_ref')}")

        tx = transaction
        facts: List[str] = [
            f"Target Transaction Reference: {tx.transaction_ref}",
            f"Execution Type/Channel: {tx.type}",
            f"Amount Transacted: ${tx.amount:,.2f}",
            f"Originator Account: {tx.name_orig}",
            f"Beneficiary Account: {tx.name_dest}",
            f"Originator Pre-Balance: ${tx.oldbalance_org:,.2f} | Post-Balance: ${tx.newbalance_orig:,.2f}",
            f"Beneficiary Pre-Balance: ${tx.oldbalance_dest:,.2f} | Post-Balance: ${tx.newbalance_dest:,.2f}",
            f"Timeline Step: {tx.step} (Diurnal cycle hour {tx.step % 24:02d}:00)"
        ]

        observed_indicators: List[Dict[str, Any]] = []
        supporting_tx_ids: List[str] = [str(tx.id)]

        # 1. Historical Pattern Query for Originator
        prior_orig_txs = db.query(Transaction).filter(
            Transaction.name_orig == tx.name_orig,
            Transaction.id != tx.id
        ).order_by(desc(Transaction.step)).limit(10).all()

        for p_tx in prior_orig_txs:
            supporting_tx_ids.append(str(p_tx.id))

        if len(prior_orig_txs) > 0:
            avg_prior_amt = sum(t.amount for t in prior_orig_txs) / len(prior_orig_txs)
            facts.append(f"Originator History: {len(prior_orig_txs)} previous record(s) on file (Average amount: ${avg_prior_amt:,.2f}).")
            if tx.amount > (avg_prior_amt * 3.0) and tx.amount > 5000:
                observed_indicators.append({
                    "indicator": "Severe Monetary Volume Deviation",
                    "severity": "HIGH",
                    "detail": f"Transaction amount of ${tx.amount:,.2f} is {tx.amount/avg_prior_amt:.1f}x higher than customer's historical baseline of ${avg_prior_amt:,.2f}."
                })
        else:
            facts.append("Originator History: No prior transaction records discovered in current ledger partition.")

        # 2. Velocity Clustering Check (transactions within ±3 temporal steps)
        velocity_cluster = db.query(Transaction).filter(
            or_(Transaction.name_orig == tx.name_orig, Transaction.name_dest == tx.name_dest),
            Transaction.step >= max(1, tx.step - 3),
            Transaction.step <= tx.step + 3,
            Transaction.id != tx.id
        ).all()

        if len(velocity_cluster) > 0:
            cluster_refs = [c.transaction_ref for c in velocity_cluster]
            observed_indicators.append({
                "indicator": "High-Frequency Velocity Anomaly",
                "severity": "HIGH",
                "detail": f"Identified {len(velocity_cluster)} correlated transaction(s) within close temporal proximity (Steps {tx.step-3} to {tx.step+3}): {', '.join(cluster_refs)}."
            })
            for c in velocity_cluster:
                if str(c.id) not in supporting_tx_ids:
                    supporting_tx_ids.append(str(c.id))

        # 3. Complete Balance Depletion / Drain Check
        if tx.oldbalance_org > 0 and tx.newbalance_orig == 0.0:
            observed_indicators.append({
                "indicator": "Account Takeover Liquidation Pattern",
                "severity": "CRITICAL",
                "detail": f"Originator account {tx.name_orig} had pre-balance of ${tx.oldbalance_org:,.2f} and was liquidated to exactly $0.00."
            })

        # 4. Beneficiary Fresh Mule Account Signature
        if tx.oldbalance_dest == 0.0 and tx.amount > 5000.0:
            observed_indicators.append({
                "indicator": "Zero-Balance High-Inflow Recipient",
                "severity": "MEDIUM",
                "detail": f"Recipient {tx.name_dest} had zero initial balance prior to receiving ${tx.amount:,.2f}, characteristic of newly staged mule receptacles."
            })

        # 5. Ledger Accounting Mathematical Discrepancy
        if tx.type in ["CASH_OUT", "TRANSFER"]:
            expected_new_orig = tx.oldbalance_org - tx.amount
            if abs(tx.newbalance_orig - expected_new_orig) > 0.01:
                observed_indicators.append({
                    "indicator": "Ledger Balance Inconsistency",
                    "severity": "MEDIUM",
                    "detail": f"New balance (${tx.newbalance_orig:,.2f}) deviates from expected (${expected_new_orig:,.2f}) by ${abs(tx.newbalance_orig - expected_new_orig):,.2f}."
                })

        # 6. Structuring / Layering Sequence (Transfer followed by immediate Cash Out)
        dest_cashouts = db.query(Transaction).filter(
            Transaction.name_orig == tx.name_dest,
            Transaction.type == "CASH_OUT",
            Transaction.step >= tx.step,
            Transaction.step <= tx.step + 5
        ).all()

        if len(dest_cashouts) > 0:
            observed_indicators.append({
                "indicator": "Rapid Layering & Cash-Out Chain",
                "severity": "CRITICAL",
                "detail": f"Beneficiary {tx.name_dest} initiated {len(dest_cashouts)} subsequent CASH_OUT operation(s) within 5 hours of inflow."
            })
            for co in dest_cashouts:
                if str(co.id) not in supporting_tx_ids:
                    supporting_tx_ids.append(str(co.id))

        # Uncertainty Assessment
        uncertainty = {
            "level": "LOW" if len(observed_indicators) >= 2 else ("MEDIUM" if len(observed_indicators) == 1 else "HIGH"),
            "confidence_notes": f"Analysis grounded on {len(facts)} verifiable database facts and {len(supporting_tx_ids)} referenced records."
        }

        # Recommendations
        recommendations = []
        if any(ind["severity"] == "CRITICAL" for ind in observed_indicators):
            recommendations.append("Apply immediate provisional settlement hold to mitigate capital flight.")
            recommendations.append(f"Contact customer {tx.name_orig} via verified secondary channel to validate transfer authorization.")
            recommendations.append(f"Screen recipient {tx.name_dest} against internal high-risk watchlists.")
        elif any(ind["severity"] == "HIGH" for ind in observed_indicators):
            recommendations.append("Request Enhanced Due Diligence (EDD) documentation for beneficiary account.")
            recommendations.append("Review 30-day activity profile for originator.")
        else:
            recommendations.append("No immediate account restriction required. Continue automated baseline surveillance.")

        summary_text = (
            f"Forensic investigation completed for {tx.transaction_ref}. "
            f"Observed {len(observed_indicators)} risk indicator(s) across {len(supporting_tx_ids)} supporting record(s). "
            f"Uncertainty assessed as {uncertainty['level']}."
        )

        return {
            "transaction_ref": tx.transaction_ref,
            "facts": facts,
            "observed_indicators": observed_indicators,
            "supporting_transaction_ids": supporting_tx_ids,
            "uncertainty": uncertainty,
            "recommendations": recommendations,
            "summary": summary_text,
            "statement": "Evidence report is factual and non-presumptive. Certified analyst validation is required for SAR/STR filings."
        }

investigation_agent = TransactionInvestigationAgent()
