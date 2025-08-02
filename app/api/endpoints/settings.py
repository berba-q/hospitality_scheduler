# app/api/endpoints/settings.py
"""
Settings API endpoints for system, notifications, and profile management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlmodel import Session, select
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
import logging

from ...deps import get_db, get_current_user
from ...models import SystemSettings, NotificationGlobalSettings, UserProfile, User, AuditLog
from ...schemas import (
    SystemSettingsCreate, SystemSettingsRead, SystemSettingsUpdate,
    NotificationGlobalSettingsCreate, NotificationGlobalSettingsRead, NotificationGlobalSettingsUpdate,
    UserProfileRead, UserProfileUpdate, SettingsTestResult,
    SettingsResponse
)
from ...core.encryption_db import create_audit_log_entry, load_and_decrypt_notification_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])

# ==================== SYSTEM SETTINGS ====================

@router.get("/system", response_model=SystemSettingsRead)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system-wide settings for the current tenant, create defaults if none exist"""
    
    # Get settings for current tenant
    statement = select(SystemSettings).where(
        SystemSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        # Create default settings for new tenant
        logger.info(f"Creating default system settings for tenant {current_user.tenant_id}")
        
        settings = SystemSettings(
            tenant_id=current_user.tenant_id,
            company_name="",
            timezone="UTC",
            date_format="MM/dd/yyyy",
            currency="USD",
            language="en",
            smart_scheduling_enabled=True,
            max_optimization_iterations=100,
            conflict_check_enabled=True,
            auto_assign_by_zone=False,
            balance_workload=True,
            require_manager_per_shift=False,
            allow_overtime=False,
            email_notifications_enabled=True,
            whatsapp_notifications_enabled=False,
            push_notifications_enabled=True,
            schedule_published_notify=True,
            swap_request_notify=True,
            urgent_swap_notify=True,
            daily_reminder_notify=False,
            session_timeout_hours=24,
            require_two_factor=False,
            enforce_strong_passwords=True,
            allow_google_auth=True,
            allow_apple_auth=True,
            analytics_cache_ttl=3600,
            enable_usage_tracking=True,
            enable_performance_monitoring=True
        )
        
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
        logger.info(f"Created default system settings with ID {settings.id}")
    
    return settings


@router.post("/system", response_model=SystemSettingsRead, status_code=201)
def create_system_settings(
    settings_in: SystemSettingsCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create initial system settings for tenant (first-time setup)"""
    
    # Check if settings already exist
    existing = db.exec(
        select(SystemSettings).where(SystemSettings.tenant_id == current_user.tenant_id)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System settings already exist. Use PUT to update."
        )
    
    # Create new settings
    settings_data = settings_in.dict()
    settings = SystemSettings(
        tenant_id=current_user.tenant_id,
        **settings_data
    )
    
    db.add(settings)
    db.commit()
    db.refresh(settings)
    
    # Create audit log entry
    background_tasks.add_task(
        create_audit_log_entry,
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        action="CREATE_SETTINGS",
        resource_type="SystemSettings", 
        resource_id=settings.id,
        changes={"action": "initial_setup", "fields": list(settings_data.keys())},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    logger.info(f"System settings created for tenant {current_user.tenant_id}")
    return settings


@router.put("/system", response_model=SettingsResponse)
def update_system_settings(
    settings_update: SystemSettingsUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update system-wide settings"""
    
    # Get existing settings
    statement = select(SystemSettings).where(
        SystemSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System settings not found. Create them first."
        )
    
    # Track what changes
    update_data = settings_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update"
        )
    
    # Track changes for audit
    changes = {}
    updated_fields = []
    
    for field, new_value in update_data.items():
        if hasattr(settings, field):
            old_value = getattr(settings, field)
            if old_value != new_value:
                changes[field] = {"old": old_value, "new": new_value}
                setattr(settings, field, new_value)
                updated_fields.append(field)
    
    if not updated_fields:
        return SettingsResponse(
            success=True,
            message="No changes were made",
            updated_fields=[]
        )
    
    # Update timestamp
    settings.updated_at = datetime.utcnow()
    settings.updated_by = current_user.id
    
    db.commit()
    db.refresh(settings)
    
    # Create audit log entry
    background_tasks.add_task(
        create_audit_log_entry,
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        action="UPDATE_SETTINGS",
        resource_type="SystemSettings",
        resource_id=settings.id,
        changes=changes,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    logger.info(f"System settings updated for tenant {current_user.tenant_id}: {updated_fields}")
    
    return SettingsResponse(
        success=True,
        message=f"Successfully updated {len(updated_fields)} setting(s)",
        updated_fields=updated_fields
    )


# ==================== TEST CONNECTION ENDPOINTS ====================

@router.post("/test-smtp", response_model=SettingsTestResult)
def test_smtp_connection(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test SMTP connection using current notification settings"""
    
    from ...core.encryption_db import load_and_decrypt_notification_settings
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Get decrypted notification settings
    statement = select(NotificationGlobalSettings).where(
        NotificationGlobalSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification settings not found. Configure SMTP settings first."
        )
    
    if not settings.smtp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMTP is not enabled in notification settings"
        )
    
    # Decrypt settings for testing
    decrypted_settings = load_and_decrypt_notification_settings(db, settings.id)
    
    if not decrypted_settings:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt notification settings"
        )
    
    # Type-safe validation with proper None checking
    if not all([
        decrypted_settings.smtp_host,
        decrypted_settings.smtp_username, 
        decrypted_settings.smtp_password,
        decrypted_settings.smtp_from_email
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMTP configuration incomplete. Please set host, username, password, and from_email."
        )
    
    # Now we can safely assert these are not None after validation
    smtp_host = decrypted_settings.smtp_host
    smtp_port = decrypted_settings.smtp_port
    smtp_username = decrypted_settings.smtp_username
    smtp_password = decrypted_settings.smtp_password
    smtp_from_email = decrypted_settings.smtp_from_email
    smtp_use_tls = decrypted_settings.smtp_use_tls
    
    # Type assertion to help type checker - we know these are not None due to validation above
    assert smtp_host is not None
    assert smtp_username is not None  
    assert smtp_password is not None
    assert smtp_from_email is not None
    
    test_result = SettingsTestResult(
        service="smtp",
        success=False,
        message="",
        details={},
        tested_at=datetime.utcnow()
    )
    
    try:
        # Create test connection
        if smtp_use_tls:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        
        # Login
        server.login(smtp_username, smtp_password)
        
        # Send test email to current user
        msg = MIMEMultipart()
        msg['From'] = smtp_from_email
        msg['To'] = current_user.email
        msg['Subject'] = "SMTP Configuration Test - Hospitality Scheduler"
        
        body = f"""
        Hello {current_user.email},
        
        This is a test email to verify your SMTP configuration is working correctly.
        
        Tested at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
        
        Best regards,
        Hospitality Scheduler
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send the email
        server.send_message(msg)
        server.quit()
        
        test_result.success = True
        test_result.message = "SMTP test successful! Check your email for the test message."
        test_result.details = {
            "host": smtp_host,
            "port": smtp_port,
            "use_tls": smtp_use_tls,
            "from_email": smtp_from_email,
            "test_email_sent_to": current_user.email
        }
        
        logger.info(f"SMTP test successful for tenant {current_user.tenant_id}")
        
    except smtplib.SMTPAuthenticationError:
        test_result.message = "SMTP authentication failed. Check username and password."
        test_result.details = {"error_type": "authentication_error"}
    except smtplib.SMTPConnectError:
        test_result.message = "Could not connect to SMTP server. Check host and port."
        test_result.details = {"error_type": "connection_error"}
    except Exception as e:
        test_result.message = f"SMTP test failed: {str(e)}"
        test_result.details = {"error_type": "general_error", "error": str(e)}
        
        logger.error(f"SMTP test failed for tenant {current_user.tenant_id}: {e}")
    
    return test_result


@router.post("/test-whatsapp", response_model=SettingsTestResult)
def test_whatsapp_connection(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test WhatsApp/Twilio connection using current notification settings"""
    
    from ...core.encryption_db import load_and_decrypt_notification_settings
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioException
    
    # Get decrypted notification settings
    statement = select(NotificationGlobalSettings).where(
        NotificationGlobalSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification settings not found. Configure Twilio settings first."
        )
    
    if not settings.twilio_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Twilio/WhatsApp is not enabled in notification settings"
        )
    
    # Decrypt settings for testing
    decrypted_settings = load_and_decrypt_notification_settings(db, settings.id)
    
    if not decrypted_settings:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt notification settings"
        )
    
    # Type-safe validation with proper None checking
    if not all([
        decrypted_settings.twilio_account_sid,
        decrypted_settings.twilio_auth_token,
        decrypted_settings.twilio_whatsapp_number
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Twilio configuration incomplete. Please set account_sid, auth_token, and whatsapp_number."
        )
    
    # Now we can safely assert these are not None after validation
    twilio_account_sid = decrypted_settings.twilio_account_sid
    twilio_auth_token = decrypted_settings.twilio_auth_token
    twilio_whatsapp_number = decrypted_settings.twilio_whatsapp_number
    
    # Type assertion to help type checker
    assert twilio_account_sid is not None
    assert twilio_auth_token is not None
    assert twilio_whatsapp_number is not None
    
    test_result = SettingsTestResult(
        service="twilio",
        success=False,
        message="",
        details={},
        tested_at=datetime.utcnow()
    )
    
    try:
        # Initialize Twilio client
        client = Client(twilio_account_sid, twilio_auth_token)
        
        # Test by getting account info
        account = client.api.accounts(twilio_account_sid).fetch()
        
        # Test WhatsApp capability by checking available phone numbers
        phone_numbers = client.incoming_phone_numbers.list(limit=1)
        
        test_result.success = True
        test_result.message = "Twilio connection test successful!"
        test_result.details = {
            "account_sid": twilio_account_sid,
            "account_status": account.status,
            "whatsapp_number": twilio_whatsapp_number,
            "available_numbers": len(phone_numbers)
        }
        
        logger.info(f"Twilio test successful for tenant {current_user.tenant_id}")
        
    except TwilioException as e:
        # Safely access Twilio exception attributes
        error_code = getattr(e, 'code', 'unknown')
        error_msg = getattr(e, 'msg', str(e))
        
        test_result.message = f"Twilio test failed: {error_msg}"
        test_result.details = {
            "error_type": "twilio_error",
            "error_code": error_code,
            "error": str(e)
        }
        logger.error(f"Twilio test failed for tenant {current_user.tenant_id}: {e}")
    except Exception as e:
        test_result.message = f"Connection test failed: {str(e)}"
        test_result.details = {"error_type": "general_error", "error": str(e)}
        logger.error(f"Twilio test failed for tenant {current_user.tenant_id}: {e}")
    
    return test_result


# ==================== PROFILE SETTINGS ====================

@router.get("/profile", response_model=UserProfileRead)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile settings, create default if none exists"""
    
    # Get user's profile
    statement = select(UserProfile).where(UserProfile.user_id == current_user.id)
    profile = db.exec(statement).first()
    
    if not profile:
        # Create default profile for new user
        logger.info(f"Creating default profile for user {current_user.id}")
        
        profile = UserProfile(
            user_id=current_user.id,
            display_name=None,  # Correct field names from your model
            bio=None,
            title=None,
            department=None,
            phone_number=None,
            avatar_url=None,
            avatar_type="initials",
            avatar_color="#3B82F6",
            theme="system",
            language="en",
            timezone="UTC",
            date_format="MM/dd/yyyy",
            time_format="12h",
            currency="USD",
            dashboard_layout={},
            sidebar_collapsed=False,
            cards_per_row=3,
            show_welcome_tour=False,
            # Notification Preferences (Individual Overrides)
            notification_preferences={},
            quiet_hours_enabled=False,
            quiet_hours_start=None,
            quiet_hours_end=None,
            weekend_notifications=True,
            
            # Privacy & Security Preferences
            profile_visibility="team",  # Good default for workplace
            show_email=False,           # Privacy-first approach
            show_phone=False,           # Privacy-first approach
            show_online_status=True,    # Useful for team collaboration
            
            # Schedule & Work Preferences
            preferred_shifts=[],
            max_consecutive_days=None,
            preferred_days_off=[],      # Empty - user can set their preferences
            
            # Advanced Settings
            enable_desktop_notifications=True,   # Enable for better UX
            enable_sound_notifications=True,     # Enable by default
            auto_accept_swaps=False,             # Safety-first - require manual approval
            show_analytics=True,                 # Most users want to see their stats
            
            # Onboarding & Help
            onboarding_completed=True,  # New user needs onboarding
            onboarding_step=0,           # Start at beginning
            last_help_viewed=None,
            feature_hints_enabled=True,  # Helpful for new users
            
            # Audit fields (last_active will be set automatically on updates)
            last_active=datetime.utcnow()  # Set to now since they're accessing profile
        )
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        logger.info(f"Created default profile with ID {profile.id}")
    
    return profile


@router.put("/profile", response_model=SettingsResponse)
def update_my_profile(
    profile_update: UserProfileUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile settings"""
    
    from ...models import UserProfile
    
    # Get user's profile
    statement = select(UserProfile).where(UserProfile.user_id == current_user.id)
    profile = db.exec(statement).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()  # Get ID but don't commit yet
    
    # Track what changes
    update_data = profile_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update"
        )
    
    # Track changes for audit
    changes = {}
    updated_fields = []
    
    for field, new_value in update_data.items():
        if hasattr(profile, field):
            old_value = getattr(profile, field)
            if old_value != new_value:
                changes[field] = {"old": old_value, "new": new_value}
                setattr(profile, field, new_value)
                updated_fields.append(field)
    
    if not updated_fields:
        return SettingsResponse(
            success=True,
            message="No changes were made",
            updated_fields=[]
        )
    
    # Update timestamp and activity
    profile.updated_at = datetime.utcnow()
    profile.last_active = datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    
    # Create audit log entry
    background_tasks.add_task(
        create_audit_log_entry,
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        action="UPDATE_PROFILE",
        resource_type="UserProfile",
        resource_id=profile.id,
        changes=changes,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    logger.info(f"Profile updated for user {current_user.id}: {updated_fields}")
    
    return SettingsResponse(
        success=True,
        message=f"Successfully updated {len(updated_fields)} profile setting(s)",
        updated_fields=updated_fields
    )


@router.delete("/system")
def reset_system_settings(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset system settings to defaults (dangerous operation)"""
    
    # Get existing settings
    statement = select(SystemSettings).where(
        SystemSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System settings not found"
        )
    
    # Store old settings for audit
    old_settings = settings.dict()
    
    # Delete existing settings (will trigger recreate with defaults)
    db.delete(settings)
    db.commit()
    
    # Create audit log entry
    background_tasks.add_task(
        create_audit_log_entry,
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        action="RESET_SETTINGS",
        resource_type="SystemSettings",
        resource_id=settings.id,
        changes={"action": "reset_to_defaults", "previous_settings": old_settings},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    logger.warning(f"System settings reset for tenant {current_user.tenant_id}")
    
    return {
        "success": True,
        "message": "System settings have been reset to defaults. Create new settings to continue."
    }


# ==================== NOTIFICATION SETTINGS ====================

@router.get("/notifications", response_model=NotificationGlobalSettingsRead)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification settings for the current tenant, create defaults if none exist"""
    
    # Get settings for current tenant
    statement = select(NotificationGlobalSettings).where(
        NotificationGlobalSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        # Create default notification settings for new tenant
        logger.info(f"Creating default notification settings for tenant {current_user.tenant_id}")
        
        settings = NotificationGlobalSettings(
            tenant_id=current_user.tenant_id,
            smtp_enabled=False,
            smtp_host="",  # Correct field name
            smtp_port=587,
            smtp_username="",
            smtp_password="",
            smtp_use_tls=True,
            smtp_from_email="",  # Additional field
            smtp_from_name="",   # Additional field
            twilio_enabled=False,  # Correct field name (not whatsapp_enabled)
            twilio_account_sid="",
            twilio_auth_token="",
            twilio_whatsapp_number="",
            push_enabled=False,
            firebase_server_key="",  # Correct field name (not firebase_config)
            email_templates={},      # Additional field
            whatsapp_templates={},   # Additional field
            email_rate_limit=100,    # Additional field
            whatsapp_rate_limit=50,  # Additional field
            retry_failed_notifications=True,  # Additional field
            max_retry_attempts=3     # Additional field
        )
        
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
        logger.info(f"Created default notification settings with ID {settings.id}")
    
    # For existing settings, try to decrypt if possible, otherwise return as-is
    try:
        # Only try decryption if the function exists and settings have an ID
        if hasattr(settings, 'id') and settings.id:
            from ...core.encryption_db import load_and_decrypt_notification_settings
            decrypted_settings = load_and_decrypt_notification_settings(db, settings.id)
            if decrypted_settings:
                return decrypted_settings
    except (ImportError, AttributeError, Exception) as e:
        logger.info(f"Decryption not available or failed, returning settings as-is: {e}")
    
    # Return settings as-is (either new defaults or existing settings)
    return settings


@router.post("/notifications", response_model=NotificationGlobalSettingsRead, status_code=201)
def create_notification_settings(
    settings_in: NotificationGlobalSettingsCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create notification settings (with automatic encryption of sensitive fields)"""
    
    from ...core.encryption_db import encrypt_and_save_notification_settings
    
    # Check if settings already exist
    existing = db.exec(
        select(NotificationGlobalSettings).where(
            NotificationGlobalSettings.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification settings already exist. Use PUT to update."
        )
    
    # Create new settings with encryption
    settings_data = settings_in.dict()
    settings = NotificationGlobalSettings(
        tenant_id=current_user.tenant_id,
        **settings_data
    )
    
    # Save with automatic encryption of sensitive fields
    encrypted_settings = encrypt_and_save_notification_settings(db, settings)
    
    # Create audit log entry
    background_tasks.add_task(
        create_audit_log_entry,
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        action="CREATE_SETTINGS",
        resource_type="NotificationGlobalSettings",
        resource_id=encrypted_settings.id,
        changes={"action": "initial_setup", "encrypted_fields": ["smtp_password", "twilio_account_sid", "twilio_auth_token", "firebase_server_key"]},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    logger.info(f"Notification settings created for tenant {current_user.tenant_id}")
    
    # Return decrypted version for display
    return load_and_decrypt_notification_settings(db, encrypted_settings.id)


@router.put("/notifications", response_model=SettingsResponse)
def update_notification_settings(
    settings_update: NotificationGlobalSettingsUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notification settings (with automatic encryption of sensitive fields)"""
    
    from ...core.encryption_db import DatabaseEncryption
    
    # Get existing settings
    statement = select(NotificationGlobalSettings).where(
        NotificationGlobalSettings.tenant_id == current_user.tenant_id
    )
    settings = db.exec(statement).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification settings not found. Create them first."
        )
    
    # Track what changes
    update_data = settings_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update"
        )
    
    # Track changes for audit (excluding sensitive fields from logs)
    changes = {}
    updated_fields = []
    sensitive_fields = ["smtp_password", "twilio_account_sid", "twilio_auth_token", "firebase_server_key"]
    
    for field, new_value in update_data.items():
        if hasattr(settings, field):
            old_value = getattr(settings, field)
            if old_value != new_value:
                if field in sensitive_fields:
                    # Don't log actual sensitive values
                    changes[field] = {"old": "***ENCRYPTED***", "new": "***ENCRYPTED***"}
                else:
                    changes[field] = {"old": old_value, "new": new_value}
                updated_fields.append(field)
    
    if not updated_fields:
        return SettingsResponse(
            success=True,
            message="No changes were made",
            updated_fields=[]
        )
    
    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Use encryption-aware update
    db_encryption = DatabaseEncryption(db)
    updated_settings = db_encryption.update_with_encryption(settings, update_data)
    
    # Create audit log entry
    background_tasks.add_task(
        create_audit_log_entry,
        db=db,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        action="UPDATE_SETTINGS",
        resource_type="NotificationGlobalSettings",
        resource_id=updated_settings.id,
        changes=changes,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    logger.info(f"Notification settings updated for tenant {current_user.tenant_id}: {updated_fields}")
    
    return SettingsResponse(
        success=True,
        message=f"Successfully updated {len(updated_fields)} setting(s)",
        updated_fields=updated_fields
    )