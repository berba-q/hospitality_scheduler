from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlmodel import Session, select
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_limiter.depends import RateLimiter
import logging

from ...core.config import get_settings

from ...deps import get_current_user, get_db
from ...models import Facility, PasswordResetToken, Staff, User, Tenant, SecuritySettings 
from ...schemas import ForgotPasswordRequest, PasswordResetResponse, ResetPasswordRequest, Token, UserCreate, UserRead
from ...core.security import verify_password, hash_password, create_access_token
from ...services.notification_service import NotificationService, NotificationType
from ...services.account_lockout_service import AccountLockoutService
from ...services.audit_service import AuditService, AuditEvent
from ...services.session_service import SessionService


router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/signup", response_model=UserRead, status_code=201,
             dependencies=[Depends(RateLimiter(times=3, seconds=300))])  # 3 signups per 5 minutes per IP
async def signup(
    request: Request,
    user_data: UserCreate,  # Keep consistent parameter name
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Enhanced signup with rate limiting and audit logging"""
    
    # Initialize services
    audit_service = AuditService(db)
    session_service = SessionService(db)
    
    # Get client information
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    try:
        # Check if user already exists
        existing_user = db.exec(
            select(User).where(User.email == user_data.email.lower())
        ).first()
        
        if existing_user:
            await audit_service.log_event(
                AuditEvent.SIGNUP_FAILED,
                ip_address=client_ip,
                user_agent=user_agent,
                details={"email": user_data.email, "reason": "email_already_exists"}
            )
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists"
            )
        
        # Create tenant first
        tenant = Tenant(name=user_data.tenant_name.strip())
        db.add(tenant)
        db.flush()  # Get ID but don't commit yet
        
        # Create user
        user = User(
            email=user_data.email.lower().strip(),
            hashed_password=hash_password(user_data.password),
            is_manager=True,
            tenant_id=tenant.id,
        )
        db.add(user)
        db.flush()  # Get user ID
        
        # Create default security settings for the tenant
        security_settings = SecuritySettings(
            tenant_id=tenant.id,
            max_failed_attempts=5,
            lockout_duration_minutes=30,
            failed_attempts_window_minutes=15,
            min_password_length=8,
            require_uppercase=True,
            require_lowercase=True,
            require_numbers=True,
            require_special_chars=True,
            password_history_count=5,
            session_timeout_minutes=480,  # 8 hours
            max_concurrent_sessions=5,
            require_2fa=False,
            login_rate_limit_per_hour=20,
            signup_rate_limit_per_hour=5,
            password_reset_rate_limit_per_hour=3,
            audit_login_attempts=True,
            audit_data_access=True,
            audit_retention_days=90,
            force_https=True
        )
        db.add(security_settings)
        
        # Commit all changes together
        db.commit()
        db.refresh(user)
        
        # Create initial session (optional - for auto-login after signup)
        access_token = create_access_token(subject=str(user.id))
        await session_service.create_session(
            user_id=user.id,
            token=access_token,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        # Log successful signup
        await audit_service.log_event(
            AuditEvent.SIGNUP_SUCCESS,
            user_id=user.id,
            tenant_id=tenant.id,
            ip_address=client_ip,
            user_agent=user_agent,
            details={
                "email": user_data.email, 
                "tenant_name": user_data.tenant_name,
                "auto_login": True
            }
        )
        
        # Send welcome email (optional)
        try:
            notification_service = NotificationService(db)
            await notification_service.send_notification(
                notification_type=NotificationType.WELCOME_EMAIL,
                recipient_user_id=user.id,
                template_data={
                    "user_name": user.email.split('@')[0],
                    "tenant_name": tenant.name,
                    "login_url": f"{get_settings().FRONTEND_URL}/login"
                },
                channels=["EMAIL"],
                background_tasks=background_tasks
            )
        except Exception as e:
            # Don't fail signup if email fails
            logger.warning(f"Failed to send welcome email: {e}")
        
        logger.info(f"New user signup successful: {user.email} for tenant: {tenant.name}")
        
        # Return user data (matching UserRead schema)
        return user

    except HTTPException:
        # Re-raise HTTP exceptions (like email already exists)
        db.rollback()
        raise
    except Exception as e:
        # Handle unexpected errors
        db.rollback()
        
        await audit_service.log_event(
            AuditEvent.SIGNUP_FAILED,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": user_data.email, "error": str(e)},
            severity="error"
        )
        
        logger.error(f"Signup failed for {user_data.email}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Account creation failed. Please try again."
        )

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

# ======================= Login endpoint with account lockout protection =========================
@router.post("/login", response_model=Token, dependencies=[
    Depends(RateLimiter(times=5, seconds=60))  # 5 attempts per minute per IP
])
async def login_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """OAuth2 compatible token login with account lockout protection"""
    
    # Initialize services
    lockout_service = AccountLockoutService(db)
    audit_service = AuditService(db)
    session_service = SessionService(db)
    
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Check if account is locked
    if await lockout_service.is_account_locked(form_data.username):
        await audit_service.log_event(
            AuditEvent.LOGIN_FAILED_LOCKED,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": form_data.username, "reason": "account_locked"}
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked due to too many failed login attempts. Please try again later or reset your password."
        )
    
    # Authenticate user
    user = db.exec(
        select(User).where(User.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Record failed attempt
        await lockout_service.record_failed_attempt(form_data.username, client_ip)
        
        # Log failed login
        await audit_service.log_event(
            AuditEvent.LOGIN_FAILED,
            user_id=user.id if user else None,
            tenant_id=user.tenant_id if user else None,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": form_data.username, "reason": "invalid_credentials"}
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        await audit_service.log_event(
            AuditEvent.LOGIN_FAILED,
            user_id=user.id,
            tenant_id=user.tenant_id,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": form_data.username, "reason": "account_inactive"}
        )
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Clear failed attempts on successful login
    await lockout_service.clear_failed_attempts(form_data.username)
    
    # Create access token
    token = create_access_token(subject=str(user.id))
    
    try:
        await session_service.create_session(
            user_id=user.id,
            token=token,
            ip_address=client_ip,
            user_agent=user_agent
        )
        logger.info(f"Created session for user {user.email}")
    except Exception as e:
        logger.error(f"Failed to create session for user {user.email}: {e}")
    
    # Update last login
    if hasattr(user, "last_login"):
        user.last_login = datetime.now(timezone.utc)

    db.commit()
    
    # Log successful login
    await audit_service.log_event(
        AuditEvent.LOGIN_SUCCESS,
        user_id=user.id,
        tenant_id=user.tenant_id,
        ip_address=client_ip,
        user_agent=user_agent,
        details={"email": user.email}
    )
    
    # Build user data response
    user_data = {
        "sub": str(user.id),
        "email": user.email,
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
                "name": staff.full_name,
                "facility_id": str(staff.facility_id),
                "staff_id": str(staff.id)
            })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }

# ======================= Forgot password endpoints =========================
@router.post("/forgot-password", response_model=PasswordResetResponse, dependencies=[
    Depends(RateLimiter(times=3, seconds=300))  # 3 attempts per 5 minutes per IP
])
async def forgot_password(
    request: Request,
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Enhanced forgot password with rate limiting and audit logging"""
    
    audit_service = AuditService(db)
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    user = db.exec(
        select(User).where(User.email == request_data.email)
    ).first()
    
    # Always return success message for security
    response = PasswordResetResponse(
        message="If an account with this email exists, you will receive a password reset link.",
        success=True
    )
    
    if user:
        # Generate reset token
        token = PasswordResetToken.generate_token(user.id, db)
        
        # Send reset email
        notification_service = NotificationService(db)
        settings = get_settings()
        
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
        
        # Log password reset request
        await audit_service.log_event(
            AuditEvent.PASSWORD_RESET_REQUESTED,
            user_id=user.id,
            tenant_id=user.tenant_id,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": user.email}
        )
    else:
        # Log failed password reset attempt
        await audit_service.log_event(
            AuditEvent.PASSWORD_RESET_FAILED,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"email": request_data.email, "reason": "user_not_found"}
        )
    
    return response

#================== PASSWORD RESET =======================================
@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    request: Request,
    request_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Enhanced password reset with audit logging"""
    
    audit_service = AuditService(db)
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Verify token
    reset_token = PasswordResetToken.verify_token(request_data.token, db)
    if not reset_token:
        await audit_service.log_event(
            AuditEvent.PASSWORD_RESET_FAILED,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"reason": "invalid_token"}
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = db.get(User, reset_token.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    user.hashed_password = hash_password(request_data.new_password)
    reset_token.used = True
    db.commit()
    
    # Clear any account lockouts
    lockout_service = AccountLockoutService(db)
    await lockout_service.clear_failed_attempts(user.email)
    
    # Log successful password reset
    await audit_service.log_event(
        AuditEvent.PASSWORD_RESET_SUCCESS,
        user_id=user.id,
        tenant_id=user.tenant_id,
        ip_address=client_ip,
        user_agent=user_agent,
        details={"email": user.email}
    )
    
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

# ======================= Session Management =========================
@router.post("/revoke-session")
async def revoke_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke current session"""  
    session_service = SessionService(db)
    audit_service = AuditService(db)
    
    # Extract token from request
    token = request.headers.get("authorization", "").replace("Bearer ", "")
    
    # Revoke session
    await session_service.revoke_session(token)
    
    # Log session revocation
    await audit_service.log_event(
        AuditEvent.SESSION_REVOKED,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", ""),
        details={"email": current_user.email}
    )
    
    return {"message": "Session revoked successfully"}

@router.post("/revoke-all-sessions")
async def revoke_all_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all sessions for current user""" 
    session_service = SessionService(db)
    audit_service = AuditService(db)
    
    # Revoke all sessions
    revoked_count = await session_service.revoke_all_user_sessions(current_user.id)
    
    # Log session revocation
    await audit_service.log_event(
        AuditEvent.ALL_SESSIONS_REVOKED,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", ""),
        details={"email": current_user.email, "sessions_revoked": revoked_count}
    )
    
    return {"message": f"Successfully revoked {revoked_count} sessions"}