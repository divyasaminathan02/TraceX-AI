from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog
from backend.app.models.user import User

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user: Optional[User] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Creates a persistent audit trail record."""
    audit_entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        details=details,
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
