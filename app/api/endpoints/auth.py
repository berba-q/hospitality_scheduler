from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select
from fastapi.security import OAuth2PasswordRequestForm

from ...core.config import get_settings

from ...deps import get_current_user, get_db
from ...models import Facility, PasswordResetToken, Staff, User, Tenant
from ...schemas import ForgotPasswordRequest, PasswordResetResponse, ResetPasswordRequest, Token, UserCreate, UserRead
from ...core.security import verify_password, hash_password, create_access_token
from ...services.notification_service import NotificationService, NotificationType


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserRead, status_code=201)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # create tenant
    tenant = Tenant(name=user_in.tenant_name)
    db.add(tenant)
    db.flush()  # assign ID
    # create user
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        is_manager=True,
        tenant_id=tenant.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me")
def get_current_user_info(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information with proper name lookup"""
    
    # Default user info
    user_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.email,  # Fallback to email
        "is_manager": current_user.is_manager,
        "is_active": current_user.is_active,
        "tenant_id": str(current_user.tenant_id),
        "facility_id": None,
        "staff_id": None
    }
    
    # If user is staff (not manager), look up their staff record
    if not current_user.is_manager:
        staff = db.exec(
            select(Staff).join(Facility).where(
                Staff.email == current_user.email,
                Facility.tenant_id == current_user.tenant_id,
                Staff.is_active == True
            )
        ).first()
        
        if staff:
            user_data.update({
                "name": staff.full_name,  # ✅ Use actual full name from Staff table
                "facility_id": str(staff.facility_id),
                "staff_id": str(staff.id)
            })
    
    return user_data


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    token = create_access_token(str(user.id))
    
    # Default user data
    user_data = {
        "id": str(user.id),
        "email": user.email,
        "name": user.email,  # Fallback to email
        "is_manager": user.is_manager,
        "is_active": user.is_active,
        "tenant_id": str(user.tenant_id),
        "facility_id": None,
        "staff_id": None
    }
    
    # Look up staff record to get full_name
    if not user.is_manager:
        staff = db.exec(
            select(Staff).join(Facility).where(
                Staff.email == user.email,
                Facility.tenant_id == user.tenant_id,
                Staff.is_active == True
            )
        ).first()
        
        if staff:
            user_data.update({
                "name": staff.full_name,  # Use actual full name from Staff table
                "facility_id": str(staff.facility_id),
                "staff_id": str(staff.id)
            })
    
    # Return both token AND proper user data
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }

# ======================= Forgot password endpoints =========================
@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send password reset email using existing notification system"""
    user = db.exec(
        select(User).where(User.email == request.email)
    ).first()
    
    # Always return success message for security (don't reveal if email exists)
    response = PasswordResetResponse(
        message="If an account with this email exists, you will receive a password reset link.",
        success=True
    )
    
    if not user:
        return response
    
    # Generate reset token
    token = PasswordResetToken.generate_token(user.id, db)
    
    notification_service = NotificationService(db)
    
    settings = get_settings()
    
    # Send reset email using your notification system
    await notification_service.send_notification(
        notification_type=NotificationType.PASSWORD_RESET,  
        recipient_user_id=user.id,
        template_data={
            "user_name": user.email.split('@')[0],
            "reset_url": f"{settings.FRONTEND_URL}/reset-password?token={token}",
            "expires_in": "24 hours"
        },
        channels=["EMAIL"],
        background_tasks=background_tasks
    )
    
    return response

@router.post("/reset-password", response_model=PasswordResetResponse)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    # Verify token
    reset_token = PasswordResetToken.verify_token(request.token, db)
    if not reset_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = db.get(User, reset_token.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    user.hashed_password = hash_password(request.new_password)
    
    # Mark token as used
    reset_token.used = True
    
    db.commit()
    
    return PasswordResetResponse(
        message="Password reset successfully. You can now log in with your new password.",
        success=True
    )

@router.post("/verify-reset-token")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Verify if reset token is valid (for frontend validation)"""
    reset_token = PasswordResetToken.verify_token(token, db)
    
    if not reset_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )
    
    return {"valid": True, "message": "Token is valid"}