from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token
from backend.app.core.config import settings
from backend.app.core.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.schemas.common import LoginRequest, TokenResponse, UserResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            entity_type="User",
            entity_id=login_data.email,
            details={"reason": "Invalid credentials", "email": login_data.email},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact your security administrator."
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject=str(user.id), expires_delta=access_token_expires)

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        entity_type="User",
        entity_id=str(user.id),
        user=user,
        details={"email": user.email, "role": user.role},
        ip_address=request.client.host if request.client else None
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log_audit_event(
        db=db,
        action="LOGOUT",
        entity_type="User",
        entity_id=str(current_user.id),
        user=current_user,
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
