import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.security import hash_password
from backend.app.core.dependencies import require_admin, get_current_user
from backend.app.models.user import User, UserRole
from backend.app.schemas.common import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role.lower())
    
    total = query.count()
    users = query.order_by(desc(User.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if payload.role.lower() not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail=f"Invalid role. Choose from {[r.value for r in UserRole]}")

    new_user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role.lower(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="USER_CREATED",
        entity_type="User",
        entity_id=str(new_user.id),
        user=current_user,
        details={"email": new_user.email, "role": new_user.role}
    )

    return new_user

@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.role is not None:
        if payload.role.lower() not in [r.value for r in UserRole]:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        user.role = payload.role.lower()

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.password:
        user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="USER_UPDATED",
        entity_type="User",
        entity_id=str(user.id),
        user=current_user,
        details={"updated_fields": payload.dict(exclude_unset=True, exclude={"password"})}
    )

    return user
