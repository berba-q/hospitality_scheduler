import json
import asyncio
from faker import Faker
from sqlmodel import SQLModel, Session, select, create_engine, delete
from sqlalchemy import text  # Added for optional FK disabling
from app.models import (
    # Core models
    NotificationGlobalSettings, SystemSettings, Tenant, Facility, Staff, User, Schedule, ShiftAssignment, 
    ScheduleConfig, StaffUnavailability, SwapRequest, SwapHistory, UserProfile,
    ZoneAssignment, ScheduleTemplate, ScheduleOptimization,
    # Facility management models
    FacilityShift, FacilityRole, FacilityZone, ShiftRoleRequirement,
    # Notification system models
    Notification, NotificationTemplate, NotificationPreference,
    NotificationType, NotificationPriority, SwapStatus,
    # Security models - CORRECTED IMPORTS
    UserSession, SecuritySettings, AccountLockout, LoginAttempt, 
    PasswordHistory, AuditLog, AuditEvent,
    # Invitations
    StaffInvitation,
    # Account linking models
    UserProvider, AccountVerificationToken
)
from app.core.security import hash_password
from app.core.config import get_settings
from random import choice, randint, shuffle
from datetime import date, timedelta, datetime, timezone
from typing import List, Dict, Any
import uuid
import hashlib

fake = Faker()
settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)

def reset_database(session):
    """Reset all tables before seeding - including new security tables"""
    print("🗑️ Resetting database including security tables...")
    
    # Delete in reverse dependency order to respect foreign keys
    # Start with the most dependent tables first
    
    # ------------------------
    # Security and audit tables
    # ------------------------
    session.execute(delete(AuditLog))
    session.execute(delete(UserSession))
    session.execute(delete(PasswordHistory))
    session.execute(delete(LoginAttempt))
    session.execute(delete(AccountLockout))
    session.execute(delete(AccountVerificationToken))

    # ------------------------
    # Swap and schedule related
    # ------------------------
    session.execute(delete(SwapHistory))
    session.execute(delete(SwapRequest))
    session.execute(delete(ZoneAssignment))
    session.execute(delete(ScheduleTemplate))
    session.execute(delete(ScheduleOptimization))
    session.execute(delete(ScheduleConfig))
    session.execute(delete(StaffUnavailability))
    session.execute(delete(ShiftAssignment))
    session.execute(delete(Schedule))

    # ------------------------
    # Notification system tables
    # ------------------------
    session.execute(delete(Notification))
    session.execute(delete(NotificationPreference))
    session.execute(delete(NotificationTemplate))
    session.execute(delete(SystemSettings))                 # depends on User + Tenant
    session.execute(delete(NotificationGlobalSettings))     # depends on Tenant

    # ------------------------
    # Facility management tables
    # ------------------------
    session.execute(delete(ShiftRoleRequirement))
    session.execute(delete(FacilityShift))
    session.execute(delete(FacilityRole))
    session.execute(delete(FacilityZone))

    # ------------------------
    # User related tables
    # ------------------------
    session.execute(delete(StaffInvitation))
    session.execute(delete(UserProfile))
    session.execute(delete(UserProvider))
    session.execute(delete(Staff))

    # ------------------------
    # Core entities
    # ------------------------
    session.execute(delete(Facility))
    session.execute(delete(User))
    session.execute(delete(SecuritySettings))   # depends on Tenant
    session.execute(delete(Tenant))

    session.commit()
    print("✅ Database reset complete including all security tables!")

def create_security_settings(session, tenant_id):
    """Create tenant security settings"""
    print("🔒 Creating tenant security settings...")
    
    security_settings = SecuritySettings(
        tenant_id=tenant_id,
        # Account lockout settings
        max_failed_attempts=5,
        lockout_duration_minutes=30,
        failed_attempts_window_minutes=15,
        
        # Password policy
        min_password_length=8,
        require_uppercase=True,
        require_lowercase=True,
        require_numbers=True,
        require_special_chars=False,  # Keep false for demo ease
        password_history_count=5,
        password_expiry_days=None,  # No expiry for demo
        
        # Session settings
        session_timeout_minutes=480,  # 8 hours
        max_concurrent_sessions=5,
        require_2fa=False,  # Keep false for demo
        
        # Rate limiting (per IP)
        login_rate_limit_per_hour=20,
        signup_rate_limit_per_hour=5,
        password_reset_rate_limit_per_hour=3,
        
        # Audit settings
        audit_login_attempts=True,
        audit_data_access=True,
        audit_retention_days=90,
        
        # Additional security features
        ip_whitelist=None,
        force_https=True
    )
    
    session.add(security_settings)
    session.commit()
    session.refresh(security_settings)
    
    print("✅ Created tenant security settings")
    return security_settings

def create_sample_audit_logs(session, users, tenant_id):
    """Create sample audit log entries - CORRECTED to use actual model fields"""
    print("📊 Creating sample audit log entries...")
    
    audit_logs = []
    
    # CORRECTED: Use actual AuditEvent enum values from models.py
    sample_events = [
        {
            "event_type": AuditEvent.LOGIN_SUCCESS,
            "action": "LOGIN_SUCCESS",
            "event_description": "User logged in successfully",
            "severity": "info",
            "resource_type": "authentication"
        },
        {
            "event_type": AuditEvent.LOGIN_FAILED,
            "action": "LOGIN_FAILED", 
            "event_description": "Failed login attempt",
            "severity": "warning",
            "resource_type": "authentication"
        },
        {
            "event_type": AuditEvent.PASSWORD_CHANGED,
            "action": "PASSWORD_CHANGED",
            "event_description": "User changed password",
            "severity": "info",
            "resource_type": "user_account"
        },
        {
            "event_type": AuditEvent.SESSION_CREATED,
            "action": "SESSION_CREATED",
            "event_description": "New user session created",
            "severity": "info",
            "resource_type": "user_session"
        },
        {
            "event_type": AuditEvent.ACCOUNT_LOCKED,
            "action": "ACCOUNT_LOCKED",
            "event_description": "Account locked due to failed attempts",
            "severity": "warning",
            "resource_type": "user_account"
        },
        {
            "event_type": AuditEvent.DATA_EXPORTED,
            "action": "DATA_EXPORTED",
            "event_description": "Schedule data exported by user",
            "severity": "info",
            "resource_type": "schedule"
        },
        {
            "event_type": AuditEvent.ADMIN_ACTION,
            "action": "ADMIN_ACTION",
            "event_description": "Administrative action performed",
            "severity": "info",
            "resource_type": "admin"
        }
    ]
    
    # Create audit logs for past 30 days
    for user in users[:10]:  # Create logs for first 10 users
        for _ in range(randint(3, 12)):  # 3-12 events per user
            event_data = choice(sample_events)

            # CORRECTED: Use timezone-aware datetime
            random_time = datetime.now(timezone.utc) - timedelta(
                days=randint(0, 30),
                hours=randint(0, 23),
                minutes=randint(0, 59)
            )

            # Normalize event_type to an AuditEvent member (handles strings like 'DATA_EXPORTED')
            et = event_data["event_type"]
            if isinstance(et, AuditEvent):
                normalized_et = et
            else:
                try:
                    # Accept enum NAME such as 'DATA_EXPORTED'
                    normalized_et = AuditEvent[et]
                except Exception:
                    try:
                        # Accept value string with different casing such as 'DATA_EXPORTED' → 'data_exported'
                        normalized_et = AuditEvent(et.lower())
                    except Exception:
                        # Safe fallback to a valid event
                        normalized_et = AuditEvent.DATA_EXPORTED

            # CORRECTED: Use actual AuditLog model fields
            audit_log = AuditLog(
                user_id=user.id,
                tenant_id=tenant_id,
                action=event_data["action"],
                resource_type=event_data["resource_type"],
                resource_id=user.id,  # For demo purposes
                changes={},  # Empty dict for changes
                ip_address=fake.ipv4(),
                user_agent=fake.user_agent(),
                created_at=random_time,
                event_type=normalized_et.value
            )

            # Add optional fields only if they exist in the model
            if hasattr(AuditLog, 'event_type'):
                audit_log.event_type = normalized_et.value
            if hasattr(AuditLog, 'event_description'):
                audit_log.event_description = event_data["event_description"]
            if hasattr(AuditLog, 'severity'):
                audit_log.severity = event_data["severity"]
            if hasattr(AuditLog, 'request_id'):
                audit_log.request_id = f"req_{randint(1000, 9999)}"
            if hasattr(AuditLog, 'details'):
                audit_log.details = {
                    "user_email": user.email,
                    "demo_data": True,
                    "generated_at": random_time.isoformat()
                }

            audit_logs.append(audit_log)
            
            print("SAMPLE ET:", normalized_et, normalized_et.value)
    
    session.add_all(audit_logs)
    session.commit()
    
    print(f"✅ Created {len(audit_logs)} sample audit log entries")
    return audit_logs

def create_sample_login_attempts(session, users):
    """Create sample login attempt records"""
    print("🔍 Creating sample login attempt records...")
    
    login_attempts = []
    
    for user in users[:8]:  # Create attempts for first 8 users
        # Create some successful attempts
        for _ in range(randint(5, 15)):
            attempt = LoginAttempt(
                email=user.email,
                ip_address=fake.ipv4(),
                user_agent=fake.user_agent(),
                success=True,
                attempted_at=datetime.now(timezone.utc) - timedelta(
                    days=randint(0, 30),
                    hours=randint(0, 23)
                )
            )
            login_attempts.append(attempt)
        
        # Create some failed attempts (fewer)
        for _ in range(randint(0, 3)):
            attempt = LoginAttempt(
                email=user.email,
                ip_address=fake.ipv4(),
                user_agent=fake.user_agent(),
                success=False,
                failure_reason=choice([
                    "invalid_password",
                    "invalid_email",
                    "account_locked",
                    "rate_limited"
                ]),
                attempted_at=datetime.now(timezone.utc) - timedelta(
                    days=randint(0, 7),
                    hours=randint(0, 23)
                )
            )
            login_attempts.append(attempt)
    
    session.add_all(login_attempts)
    session.commit()
    
    print(f"✅ Created {len(login_attempts)} login attempt records")
    return login_attempts

def create_sample_user_sessions(session, users):
    """Create sample user session records - FIXED to not interfere with real sessions"""
    print("💻 Creating sample user session records...")
    
    # ✅ FIX: Don't create fake sessions - they interfere with real authentication
    # Instead, just print a message and return empty list
    
    print("ℹ️  Skipping fake session creation to avoid authentication conflicts")
    print("   Real sessions will be created when users actually log in")
    
    return []

def create_sample_account_lockouts(session, users):
    """Create a few sample account lockouts"""
    print("🔒 Creating sample account lockout records...")
    
    lockouts = []
    
    # Create lockouts for 2-3 users to demonstrate the feature
    locked_users = users[:3]
    
    for user in locked_users:
        # Only some users are currently locked
        is_currently_locked = choice([True, False])
        
        # CORRECTED: Use timezone-aware datetime
        locked_time = datetime.now(timezone.utc) - timedelta(
            hours=randint(1, 48) if is_currently_locked else randint(48, 168)
        )
        
        lockout = AccountLockout(
            email=user.email,
            locked_at=locked_time,
            locked_until=locked_time + timedelta(minutes=30),
            failed_attempts=randint(5, 10),
            lockout_reason="too_many_failed_attempts",
            is_active=is_currently_locked
        )
        lockouts.append(lockout)
    
    session.add_all(lockouts)
    session.commit()
    
    print(f"✅ Created {len(lockouts)} account lockout records")
    return lockouts

def create_sample_password_history(session, users):
    """Create sample password history records"""
    print("🔑 Creating sample password history records...")
    
    password_histories = []
    
    for user in users[:8]:  # Create history for first 8 users
        # Each user has 2-5 historical passwords
        for i in range(randint(2, 5)):
            # Create fake old password hashes
            old_password = f"oldpassword{i}_{user.id}"
            
            history = PasswordHistory(
                user_id=user.id,
                password_hash=hash_password(old_password),
                created_at=datetime.now(timezone.utc) - timedelta(
                    days=randint(30, 365)  # Passwords from 30 days to 1 year old
                )
            )
            password_histories.append(history)
    
    session.add_all(password_histories)
    session.commit()
    
    print(f"✅ Created {len(password_histories)} password history records")
    return password_histories

def create_user_providers(session, users):
    """Create user provider records for account linking"""
    print("🔗 Creating user provider records for account linking...")
    
    providers = []
    
    for user in users:
        # Primary provider (usually 'fastapi' for direct registration)
        primary_provider = UserProvider(
            user_id=user.id,
            provider="fastapi",
            provider_id=str(user.id),
            provider_email=user.email,
            provider_data={
                "registration_method": "direct",
                "verified": True
            },
            is_primary=True,
            is_active=True,
            linked_at=datetime.now(timezone.utc) - timedelta(days=randint(1, 30))
        )
        providers.append(primary_provider)
        
        # Some users also have Google accounts linked
        if randint(1, 10) <= 3:  # 30% of users have Google linked
            google_provider = UserProvider(
                user_id=user.id,
                provider="google",
                provider_id=f"google_{randint(100000, 999999)}",
                provider_email=user.email,  # Same email for simplicity
                provider_data={
                    "google_id": f"google_{randint(100000, 999999)}",
                    "picture": f"https://lh3.googleusercontent.com/a/fake_{randint(1, 100)}",
                    "verified_email": True
                },
                is_primary=False,
                is_active=True,
                linked_at=datetime.now(timezone.utc) - timedelta(days=randint(1, 15))
            )
            providers.append(google_provider)
    
    session.add_all(providers)
    session.commit()
    
    print(f"✅ Created {len(providers)} user provider records")
    return providers

def create_notification_templates(session, tenant_id):
    """Create notification templates for the enhanced workflow"""
    print("📧 Creating notification templates...")
    
    templates = [
        {
            "template_name": "schedule_published",
            "notification_type": NotificationType.SCHEDULE_PUBLISHED,
            "title_template": "📅 New Schedule Published",
            "message_template": "Hi $staff_name! Your schedule for the week of $week_start is now available at $facility_name.",
            "whatsapp_template": "*Schedule Alert* 📅\n\nHi $staff_name! Your schedule for the week of $week_start is ready.\n\n🏢 $facility_name\n\nView schedule: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "swap_request_created",
            "notification_type": NotificationType.SWAP_REQUEST,
            "title_template": "🔄 Shift Swap Request",
            "message_template": "$requester_name wants to swap their $original_day $original_shift shift with you. Reason: $reason",
            "whatsapp_template": "*Swap Request* 🔄\n\n$requester_name would like to swap shifts with you:\n\n📅 $original_day\n⏰ $original_shift\n📝 Reason: $reason\n\nRespond here: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "security_alert",
            "notification_type": NotificationType.EMAIL_VERIFICATION,
            "title_template": "🔒 Security Alert",
            "message_template": "Security alert for your account: $alert_message",
            "whatsapp_template": "*🔒 Security Alert*\n\n$alert_message\n\nIf this wasn't you, please contact support immediately.",
            "default_channels": ["IN_APP", "EMAIL"],
            "priority": NotificationPriority.URGENT
        },
        {
            "template_name": "account_linked",
            "notification_type": NotificationType.ACCOUNT_LINKED,
            "title_template": "🔗 Account Linked",
            "message_template": "Your $provider account has been successfully linked to your profile.",
            "whatsapp_template": "*Account Linked* 🔗\n\nYour $provider account is now connected.\n\nYou can now sign in using either method.",
            "default_channels": ["IN_APP", "EMAIL"],
            "priority": NotificationPriority.MEDIUM
        },
        {
            "template_name": "password_changed",
            "notification_type": NotificationType.PASSWORD_RESET,
            "title_template": "🔑 Password Changed",
            "message_template": "Your password has been successfully changed. If you didn't make this change, please contact support immediately.",
            "whatsapp_template": "*Password Changed* 🔑\n\nYour account password was updated.\n\nIf this wasn't you, contact support: $support_url",
            "default_channels": ["IN_APP", "EMAIL"],
            "priority": NotificationPriority.HIGH
        }
    ]
    
    created_templates = []
    for template_data in templates:
        template = NotificationTemplate(
            **template_data,
            tenant_id=tenant_id
        )
        created_templates.append(template)
        session.add(template)
    
    session.commit()
    print(f"✅ Created {len(created_templates)} notification templates")
    return created_templates

def create_notification_preferences(session, users):
    """Create notification preferences for users"""
    print("🔧 Creating user notification preferences...")
    
    preferences_created = 0
    for user in users:
        # Create preferences for each notification type
        for notification_type in NotificationType:
            if user.is_manager:
                # Managers get all notifications across all channels
                preference = NotificationPreference(
                    user_id=user.id,
                    notification_type=notification_type,
                    in_app_enabled=True,
                    push_enabled=True,
                    whatsapp_enabled=True,
                    email_enabled=True,
                    quiet_hours_start="22:00",
                    quiet_hours_end="07:00",
                    timezone="America/New_York"
                )
            else:
                # Staff get targeted preferences
                if notification_type in [NotificationType.SCHEDULE_PUBLISHED, NotificationType.SCHEDULE_CHANGE]:
                    preference = NotificationPreference(
                        user_id=user.id,
                        notification_type=notification_type,
                        in_app_enabled=True,
                        push_enabled=True,
                        whatsapp_enabled=choice([True, False]),
                        email_enabled=False,
                        quiet_hours_start="23:00",
                        quiet_hours_end="08:00",
                        timezone="America/New_York"
                    )
                elif notification_type in [NotificationType.EMAIL_VERIFICATION, NotificationType.PASSWORD_RESET]:
                    # Security notifications always enabled
                    preference = NotificationPreference(
                        user_id=user.id,
                        notification_type=notification_type,
                        in_app_enabled=True,
                        push_enabled=True,
                        whatsapp_enabled=False,
                        email_enabled=True,
                        quiet_hours_start="23:00",
                        quiet_hours_end="08:00",
                        timezone="America/New_York"
                    )
                else:
                    preference = NotificationPreference(
                        user_id=user.id,
                        notification_type=notification_type,
                        in_app_enabled=True,
                        push_enabled=False,
                        whatsapp_enabled=False,
                        email_enabled=False,
                        timezone="America/New_York"
                    )
            
            session.add(preference)
            preferences_created += 1
    
    session.commit()
    print(f"✅ Created {preferences_created} notification preferences")

async def create_sample_notifications(session, users, facilities):
    """Create sample notifications including security notifications"""
    print("📧 Creating sample notifications including security alerts...")
    
    created_notifications = []
    
    # Enhanced sample notifications including security ones
    sample_notifications = [
        {
            "type": NotificationType.SCHEDULE_PUBLISHED,
            "title": "📅 New Schedule Published",
            "message": "Your schedule for the week of January 27, 2025 is now available at Seaside Hotel.",
            "channels": ["IN_APP", "PUSH"],
            "priority": NotificationPriority.HIGH
        },
        {
            "type": NotificationType.SWAP_REQUEST,
            "title": "🔄 Shift Swap Request", 
            "message": "Sarah Wilson wants to swap their Friday Evening Shift with you. Reason: Family emergency",
            "channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "type": NotificationType.EMAIL_VERIFICATION,
            "title": "🔒 Security Alert",
            "message": "Multiple failed login attempts detected on your account. Your account has been temporarily secured.",
            "channels": ["IN_APP", "EMAIL"],
            "priority": NotificationPriority.URGENT
        },
        {
            "type": NotificationType.ACCOUNT_LINKED,
            "title": "🔗 Google Account Linked",
            "message": "Your Google account has been successfully linked to your profile. You can now sign in using Google.",
            "channels": ["IN_APP", "EMAIL"],
            "priority": NotificationPriority.MEDIUM
        },
        {
            "type": NotificationType.PASSWORD_RESET,
            "title": "🔑 Password Changed",
            "message": "Your password has been successfully changed. If you didn't make this change, please contact support.",
            "channels": ["IN_APP", "EMAIL"],
            "priority": NotificationPriority.HIGH
        }
    ]
    
    # Demo recipients: all managers plus first 15 users
    notification_users = [u for u in users if u.is_manager][:5] + users[:15]
    
    for user in notification_users:
        # Each user gets 1-4 notifications
        user_notifications = sample_notifications[:randint(1, 4)]
        
        for notification_data in user_notifications:
            try:
                notification = Notification(
                    recipient_user_id=user.id,
                    tenant_id=user.tenant_id,
                    notification_type=notification_data["type"],
                    title=notification_data["title"],
                    message=notification_data["message"],
                    channels=notification_data["channels"],
                    priority=notification_data["priority"],
                    delivery_status={
                        channel: {
                            "status": "delivered",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                        for channel in notification_data["channels"]
                    },
                    is_delivered=True,
                    delivered_at=datetime.now(timezone.utc),
                    is_read=choice([True, False])  # Mix of read/unread
                )
                session.add(notification)
                created_notifications.append(notification)
            except Exception as e:
                print(f"⚠️ Failed to create notification for {user.email}: {e}")
    
    session.commit()
    print(f"✅ Created {len(created_notifications)} sample notifications")
    return created_notifications

def get_facility_templates():
    """Define facility templates with shifts, roles, and zones"""
    return {
        'hotel': {
            'shifts': [
                {'shift_name': 'Day Shift', 'start_time': '06:00', 'end_time': '14:00', 'requires_manager': False, 'min_staff': 3, 'max_staff': 8, 'color': 'blue', 'shift_order': 0},
                {'shift_name': 'Evening Shift', 'start_time': '14:00', 'end_time': '22:00', 'requires_manager': True, 'min_staff': 4, 'max_staff': 10, 'color': 'orange', 'shift_order': 1},
                {'shift_name': 'Night Shift', 'start_time': '22:00', 'end_time': '06:00', 'requires_manager': True, 'min_staff': 2, 'max_staff': 5, 'color': 'purple', 'shift_order': 2}
            ],
            'roles': [
                {'role_name': 'Manager', 'min_skill_level': 4, 'max_skill_level': 5, 'is_management': True, 'hourly_rate_min': 25.0, 'hourly_rate_max': 35.0},
                {'role_name': 'Assistant Manager', 'min_skill_level': 3, 'max_skill_level': 4, 'is_management': True, 'hourly_rate_min': 20.0, 'hourly_rate_max': 28.0},
                {'role_name': 'Front Desk Agent', 'min_skill_level': 2, 'max_skill_level': 4, 'hourly_rate_min': 15.0, 'hourly_rate_max': 22.0},
                {'role_name': 'Concierge', 'min_skill_level': 3, 'max_skill_level': 5, 'hourly_rate_min': 18.0, 'hourly_rate_max': 25.0},
                {'role_name': 'Housekeeper', 'min_skill_level': 1, 'max_skill_level': 3, 'hourly_rate_min': 14.0, 'hourly_rate_max': 18.0},
                {'role_name': 'Maintenance', 'min_skill_level': 2, 'max_skill_level': 4, 'hourly_rate_min': 16.0, 'hourly_rate_max': 24.0},
                {'role_name': 'Security', 'min_skill_level': 2, 'max_skill_level': 4, 'hourly_rate_min': 15.0, 'hourly_rate_max': 20.0},
                {'role_name': 'Bellhop', 'min_skill_level': 1, 'max_skill_level': 3, 'hourly_rate_min': 13.0, 'hourly_rate_max': 17.0},
            ],
            'zones': [
                {'zone_id': 'front-desk', 'zone_name': 'Front Desk', 'description': 'Main reception and check-in area', 'required_roles': ['Front Desk Agent'], 'preferred_roles': ['Concierge'], 'min_staff_per_shift': 1, 'max_staff_per_shift': 3, 'display_order': 0},
                {'zone_id': 'housekeeping', 'zone_name': 'Housekeeping', 'description': 'Room cleaning and maintenance', 'required_roles': ['Housekeeper'], 'preferred_roles': [], 'min_staff_per_shift': 2, 'max_staff_per_shift': 8, 'display_order': 1},
                {'zone_id': 'lobby', 'zone_name': 'Lobby & Common Areas', 'description': 'Guest common areas and lobby', 'required_roles': [], 'preferred_roles': ['Concierge', 'Security'], 'min_staff_per_shift': 1, 'max_staff_per_shift': 3, 'display_order': 2},
                {'zone_id': 'maintenance', 'zone_name': 'Maintenance', 'description': 'Building and equipment maintenance', 'required_roles': ['Maintenance'], 'preferred_roles': [], 'min_staff_per_shift': 1, 'max_staff_per_shift': 3, 'display_order': 3},
            ]
        },
        'restaurant': {
            'shifts': [
                {'shift_name': 'Breakfast', 'start_time': '07:00', 'end_time': '11:00', 'requires_manager': False, 'min_staff': 2, 'max_staff': 5, 'color': 'yellow', 'shift_order': 0},
                {'shift_name': 'Lunch', 'start_time': '11:00', 'end_time': '16:00', 'requires_manager': True, 'min_staff': 4, 'max_staff': 8, 'color': 'green', 'shift_order': 1},
                {'shift_name': 'Dinner', 'start_time': '16:00', 'end_time': '23:00', 'requires_manager': True, 'min_staff': 5, 'max_staff': 12, 'color': 'red', 'shift_order': 2}
            ],
            'roles': [
                {'role_name': 'Manager', 'min_skill_level': 4, 'max_skill_level': 5, 'is_management': True, 'hourly_rate_min': 22.0, 'hourly_rate_max': 32.0},
                {'role_name': 'Chef', 'min_skill_level': 4, 'max_skill_level': 5, 'hourly_rate_min': 20.0, 'hourly_rate_max': 30.0},
                {'role_name': 'Sous Chef', 'min_skill_level': 3, 'max_skill_level': 4, 'hourly_rate_min': 17.0, 'hourly_rate_max': 24.0},
                {'role_name': 'Line Cook', 'min_skill_level': 2, 'max_skill_level': 4, 'hourly_rate_min': 14.0, 'hourly_rate_max': 19.0},
                {'role_name': 'Prep Cook', 'min_skill_level': 1, 'max_skill_level': 3, 'hourly_rate_min': 13.0, 'hourly_rate_max': 16.0},
                {'role_name': 'Server', 'min_skill_level': 2, 'max_skill_level': 4, 'hourly_rate_min': 12.0, 'hourly_rate_max': 18.0},
                {'role_name': 'Bartender', 'min_skill_level': 3, 'max_skill_level': 5, 'hourly_rate_min': 15.0, 'hourly_rate_max': 25.0},
                {'role_name': 'Host/Hostess', 'min_skill_level': 1, 'max_skill_level': 3, 'hourly_rate_min': 12.0, 'hourly_rate_max': 16.0},
                {'role_name': 'Busser', 'min_skill_level': 1, 'max_skill_level': 2, 'hourly_rate_min': 11.0, 'hourly_rate_max': 14.0},
            ],
            'zones': [
                {'zone_id': 'kitchen', 'zone_name': 'Kitchen', 'description': 'Food preparation area', 'required_roles': ['Chef', 'Line Cook'], 'preferred_roles': ['Sous Chef'], 'min_staff_per_shift': 2, 'max_staff_per_shift': 6, 'display_order': 0},
                {'zone_id': 'dining', 'zone_name': 'Dining Room', 'description': 'Customer seating area', 'required_roles': ['Server'], 'preferred_roles': ['Host/Hostess'], 'min_staff_per_shift': 3, 'max_staff_per_shift': 8, 'display_order': 1},
                {'zone_id': 'bar', 'zone_name': 'Bar', 'description': 'Beverage service area', 'required_roles': ['Bartender'], 'preferred_roles': [], 'min_staff_per_shift': 1, 'max_staff_per_shift': 3, 'display_order': 2},
                {'zone_id': 'host-station', 'zone_name': 'Host Station', 'description': 'Guest greeting and seating', 'required_roles': ['Host/Hostess'], 'preferred_roles': [], 'min_staff_per_shift': 1, 'max_staff_per_shift': 2, 'display_order': 3},
            ]
        },
        'cafe': {
            'shifts': [
                {'shift_name': 'Opening', 'start_time': '06:00', 'end_time': '12:00', 'requires_manager': False, 'min_staff': 2, 'max_staff': 4, 'color': 'green', 'shift_order': 0},
                {'shift_name': 'Midday', 'start_time': '12:00', 'end_time': '18:00', 'requires_manager': True, 'min_staff': 3, 'max_staff': 6, 'color': 'orange', 'shift_order': 1},
                {'shift_name': 'Closing', 'start_time': '18:00', 'end_time': '21:00', 'requires_manager': False, 'min_staff': 2, 'max_staff': 4, 'color': 'purple', 'shift_order': 2}
            ],
            'roles': [
                {'role_name': 'Manager', 'min_skill_level': 3, 'max_skill_level': 5, 'is_management': True, 'hourly_rate_min': 18.0, 'hourly_rate_max': 25.0},
                {'role_name': 'Barista', 'min_skill_level': 2, 'max_skill_level': 4, 'hourly_rate_min': 13.0, 'hourly_rate_max': 18.0},
                {'role_name': 'Cashier', 'min_skill_level': 1, 'max_skill_level': 3, 'hourly_rate_min': 12.0, 'hourly_rate_max': 15.0},
                {'role_name': 'Baker', 'min_skill_level': 3, 'max_skill_level': 5, 'hourly_rate_min': 15.0, 'hourly_rate_max': 22.0},
            ],
            'zones': [
                {'zone_id': 'counter', 'zone_name': 'Service Counter', 'description': 'Order taking and payment', 'required_roles': ['Barista', 'Cashier'], 'preferred_roles': [], 'min_staff_per_shift': 1, 'max_staff_per_shift': 3, 'display_order': 0},
                {'zone_id': 'prep', 'zone_name': 'Prep Area', 'description': 'Food and beverage preparation', 'required_roles': ['Barista'], 'preferred_roles': ['Baker'], 'min_staff_per_shift': 1, 'max_staff_per_shift': 2, 'display_order': 1},
            ]
        }
    }

def create_facility_configuration(session, facility, template_data):
    """Create shifts, roles, zones, and role requirements for a facility"""
    print(f"  🔧 Setting up configuration for {facility.name}")
    
    # Create shifts
    shifts = []
    for shift_data in template_data['shifts']:
        shift = FacilityShift(
            facility_id=facility.id,
            **shift_data
        )
        shifts.append(shift)
        session.add(shift)
    
    # Create roles
    roles = []
    for role_data in template_data['roles']:
        role = FacilityRole(
            facility_id=facility.id,
            **role_data
        )
        roles.append(role)
        session.add(role)
    
    # Create zones
    zones = []
    for zone_data in template_data['zones']:
        zone = FacilityZone(
            facility_id=facility.id,
            **zone_data
        )
        zones.append(zone)
        session.add(zone)
    
    # Commit to get IDs
    session.commit()
    session.refresh(facility)
    
    # Create shift-role requirements
    shift_role_requirements = []
    for shift in shifts:
        if shift.requires_manager:
            manager_roles = [r for r in roles if r.is_management]
            for manager_role in manager_roles:
                requirement = ShiftRoleRequirement(
                    facility_shift_id=shift.id,
                    facility_role_id=manager_role.id,
                    min_required=1,
                    max_allowed=2,
                    is_required=True
                )
                shift_role_requirements.append(requirement)
                session.add(requirement)
        
        # Add requirements for key roles based on facility type
        if facility.facility_type == 'hotel':
            if 'Day' in shift.shift_name or 'Evening' in shift.shift_name:
                front_desk_roles = [r for r in roles if 'Front Desk' in r.role_name]
                for role in front_desk_roles:
                    requirement = ShiftRoleRequirement(
                        facility_shift_id=shift.id,
                        facility_role_id=role.id,
                        min_required=1,
                        max_allowed=3,
                        is_required=True
                    )
                    shift_role_requirements.append(requirement)
                    session.add(requirement)
        
        elif facility.facility_type == 'restaurant':
            cook_roles = [r for r in roles if 'Cook' in r.role_name or r.role_name == 'Chef']
            for role in cook_roles[:2]:
                requirement = ShiftRoleRequirement(
                    facility_shift_id=shift.id,
                    facility_role_id=role.id,
                    min_required=1 if role.role_name == 'Chef' else 1,
                    max_allowed=3,
                    is_required=True
                )
                shift_role_requirements.append(requirement)
                session.add(requirement)
            
            if shift.shift_name in ['Lunch', 'Dinner']:
                server_roles = [r for r in roles if r.role_name == 'Server']
                for role in server_roles:
                    requirement = ShiftRoleRequirement(
                        facility_shift_id=shift.id,
                        facility_role_id=role.id,
                        min_required=2,
                        max_allowed=6,
                        is_required=True
                    )
                    shift_role_requirements.append(requirement)
                    session.add(requirement)
    
    session.commit()
    print(f"    ✅ Created {len(shifts)} shifts, {len(roles)} roles, {len(zones)} zones, {len(shift_role_requirements)} role requirements")
    
    return shifts, roles, zones

def create_matched_staff_and_users(facilities, tenant_id, session):
    """Create Staff records and matching User accounts with the same emails"""
    
    staff_objs = []
    staff_users = []
    all_created_accounts = []
    
    # Enhanced predefined accounts with security features
    predefined_accounts = [
        {
            "email": "admin@hospitality.com",
            "password": "admin123",
            "is_manager": True,
            "name": "System Admin",
            "create_staff": False
        },
        {
            "email": "manager@seaside.com",
            "password": "manager123",
            "is_manager": True,
            "name": "Hotel Manager",
            "create_staff": False
        },
        {
            "email": "manager@bistro.com", 
            "password": "manager123",
            "is_manager": True,
            "name": "Restaurant Manager",
            "create_staff": False
        },
        {
            "email": "security@hospitality.com",
            "password": "security123",
            "is_manager": True,
            "name": "Security Manager",
            "create_staff": False
        }
    ]
    
    # Create predefined accounts
    for account in predefined_accounts:
        user = User(
            email=account["email"],
            hashed_password=hash_password(account["password"]),
            tenant_id=tenant_id,
            is_manager=account["is_manager"],
            is_active=True
        )
        session.add(user)
        all_created_accounts.append(account)
    
    session.commit()
    print("✅ Created predefined admin/manager accounts")
    
    # Create staff members and matching user accounts
    for facility in facilities:
        facility_roles = session.exec(
            select(FacilityRole).where(FacilityRole.facility_id == facility.id)
        ).all()
        
        if not facility_roles:
            print(f"  ⚠️ No roles found for {facility.name}, skipping staff creation")
            continue
        
        # Determine staff count based on facility type
        if facility.facility_type == "hotel":
            staff_count = randint(18, 28)
        elif facility.facility_type == "restaurant":
            staff_count = randint(12, 20)
        else:
            staff_count = randint(8, 15)
        
        print(f"👥 Creating {staff_count} staff for {facility.name}")
        
        manager_roles = [r for r in facility_roles if r.is_management]
        regular_roles = [r for r in facility_roles if not r.is_management]
        
        managers_needed = min(randint(2, 4), len(manager_roles))
        
        for i in range(staff_count):
            # Generate realistic fake names and emails
            first_name = fake.first_name()
            last_name = fake.last_name()
            full_name = f"{first_name} {last_name}"
            
            base_email = f"{first_name.lower()}.{last_name.lower()}"
            facility_short = facility.name.lower().replace(' ', '').replace('&', 'and')
            
            email_options = [
                f"{base_email}@{facility_short}.com",
                f"{base_email}@staff.com",
                f"{base_email}@hospitality.com",
                f"{first_name.lower()}{last_name.lower()}@team.com",
                f"{first_name[0].lower()}{last_name.lower()}@{facility_short}.com"
            ]
            
            email = None
            for email_option in email_options:
                if not any(acc['email'] == email_option for acc in all_created_accounts):
                    email = email_option
                    break
            
            if not email:
                email = f"{base_email}{randint(100, 999)}@staff.com"
            
            # Determine role and skill level
            if i < managers_needed and manager_roles:
                role_obj = choice(manager_roles)
                skill_level = randint(role_obj.min_skill_level, role_obj.max_skill_level)
                is_staff_manager = True
            else:
                role_obj = choice(regular_roles) if regular_roles else choice(facility_roles)
                skill_level = randint(role_obj.min_skill_level, role_obj.max_skill_level)
                is_staff_manager = False
            
            # Create Staff record
            staff = Staff(
                full_name=full_name,
                email=email,
                role=role_obj.role_name,
                skill_level=skill_level,
                facility_id=facility.id,
                phone=fake.phone_number(),
                weekly_hours_max=choice([25, 30, 35, 40]),
                is_active=choice([True, True, True, True, False])
            )
            staff_objs.append(staff)
            
            # Create matching User account
            password = "staff123"
            user_account = {
                "email": email,
                "password": password,
                "is_manager": is_staff_manager,
                "name": full_name,
                "role": role_obj.role_name,
                "facility": facility.name
            }
            
            user = User(
                email=email,
                hashed_password=hash_password(password),
                tenant_id=tenant_id,
                is_manager=is_staff_manager,
                is_active=True
            )
            session.add(user)
            
            all_created_accounts.append(user_account)
            if not is_staff_manager:
                staff_users.append(user_account)
    
    session.add_all(staff_objs)
    session.commit()
    
    print(f"✅ Created {len(staff_objs)} staff members with matching user accounts")
    
    return staff_objs, all_created_accounts, staff_users

def create_enhanced_schedules(session, facilities, staff_objs, base_date):
    """Create more realistic schedules using the new shift system"""
    
    print("📅 Creating enhanced schedules with facility shifts...")
    
    demo_facilities = facilities[:2]
    
    for facility in demo_facilities:
        facility_shifts = session.exec(
            select(FacilityShift)
            .where(FacilityShift.facility_id == facility.id)
            .order_by(FacilityShift.shift_order)
        ).all()
        
        if not facility_shifts:
            print(f"  ⚠️ No shifts found for {facility.name}, skipping schedule creation")
            continue
        
        facility_staff = [s for s in staff_objs if s.facility_id == facility.id and s.is_active]
        active_staff = facility_staff[:15]
        
        if not active_staff:
            print(f"  ⚠️ No active staff found for {facility.name}, skipping schedule creation")
            continue
        
        # Create 4 weeks of schedules (2 past, 2 future)
        for week_offset in range(-2, 3):
            week_start = base_date + timedelta(weeks=week_offset)
            week_start = week_start - timedelta(days=week_start.weekday())
            
            schedule = Schedule(
                facility_id=facility.id,
                week_start=week_start
            )
            session.add(schedule)
            session.flush()
            
            assignments = []
            
            for day in range(7):
                for shift_idx, facility_shift in enumerate(facility_shifts):
                    staff_needed = randint(facility_shift.min_staff, 
                                         min(facility_shift.max_staff, len(active_staff)))
                    
                    available_staff = active_staff.copy()
                    shuffle(available_staff)
                    
                    for i in range(staff_needed):
                        if i < len(available_staff):
                            assignment = ShiftAssignment(
                                schedule_id=schedule.id,
                                day=day,
                                shift=shift_idx,
                                staff_id=available_staff[i].id
                            )
                            assignments.append(assignment)
            
            session.add_all(assignments)
            print(f"   📋 Created schedule for {facility.name}, week of {week_start} ({len(assignments)} assignments)")
    
    session.commit()

def create_enhanced_swap_requests(session, facilities, staff_objs, base_date):
    """Create enhanced swap requests with new workflow features - CORRECTED"""
    print("🔄 Creating enhanced swap requests with workflow statuses...")
    
    recent_schedules = session.exec(
        select(Schedule).where(Schedule.week_start >= base_date)
    ).all()
    
    enhanced_swap_reasons = [
        "Family emergency - need someone to cover",
        "Doctor appointment that I can't reschedule", 
        "Personal matter - willing to trade shifts",
        "Childcare conflict, need coverage",
        "Previously scheduled vacation",
        "Medical appointment",
        "Family commitment that came up",
        "School event for my child",
        "Transportation issues on this day",
        "Requested time off for personal reasons"
    ]
    
    urgency_levels = ["low", "normal", "high", "emergency"]
    
    swap_statuses = [
        SwapStatus.PENDING,
        SwapStatus.MANAGER_APPROVED,
        SwapStatus.STAFF_ACCEPTED,
        SwapStatus.STAFF_DECLINED,
        SwapStatus.POTENTIAL_ASSIGNMENT,
        SwapStatus.ASSIGNMENT_FAILED,
        SwapStatus.EXECUTED,
        SwapStatus.DECLINED,
        SwapStatus.ASSIGNMENT_DECLINED,
        SwapStatus.MANAGER_FINAL_APPROVAL,
        SwapStatus.CANCELLED
    ]
    
    created_swaps = 0
    for schedule in recent_schedules[:3]:
        assignments = session.exec(
            select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule.id)
        ).all()
        
        if len(assignments) < 2:
            continue
            
        for _ in range(randint(5, 8)):
            requesting_assignment = choice(assignments)
            
            swap_type = "specific" if randint(1, 10) <= 6 else "auto"
            
            # CORRECTED: Use timezone-aware datetime
            expires_at_time = datetime.now(timezone.utc) + timedelta(days=randint(1, 7))
            
            swap_data = {
                "schedule_id": schedule.id,
                "requesting_staff_id": requesting_assignment.staff_id,
                "original_day": requesting_assignment.day,
                "original_shift": requesting_assignment.shift,
                "swap_type": swap_type,
                "reason": choice(enhanced_swap_reasons),
                "urgency": choice(urgency_levels),
                "expires_at": expires_at_time,
                "requires_manager_final_approval": choice([True, False]),
                "role_verification_required": choice([True, False])
            }
            
            if swap_type == "specific":
                target_assignment = choice([a for a in assignments if a.id != requesting_assignment.id])
                swap_data.update({
                    "target_staff_id": target_assignment.staff_id,
                    "target_day": target_assignment.day,
                    "target_shift": target_assignment.shift,
                })
            
            status = choice(swap_statuses)
            swap_data["status"] = status
            
            # CORRECTED: Use timezone-aware datetime for timestamps
            if status == SwapStatus.MANAGER_APPROVED:
                swap_data["manager_approved"] = True
                swap_data["manager_approved_at"] = datetime.now(timezone.utc) - timedelta(hours=randint(1, 24))
            elif status == SwapStatus.STAFF_ACCEPTED:
                swap_data["target_staff_accepted"] = True
                swap_data["staff_responded_at"] = datetime.now(timezone.utc) - timedelta(hours=randint(1, 48))
            elif status == SwapStatus.STAFF_DECLINED:
                swap_data["target_staff_accepted"] = False
                swap_data["staff_responded_at"] = datetime.now(timezone.utc) - timedelta(hours=randint(1, 48))
            elif status == SwapStatus.POTENTIAL_ASSIGNMENT:
                facility_staff = [s for s in staff_objs if s.facility_id == schedule.facility_id and s.id != requesting_assignment.staff_id]
                if facility_staff:
                    swap_data["assigned_staff_id"] = choice(facility_staff).id
            
            swap_request = SwapRequest(**swap_data)
            session.add(swap_request)
            session.flush()
            
            # CORRECTED: Use actual SwapHistory model fields only
            history = SwapHistory(
                swap_request_id=swap_request.id,
                action="requested",
                actor_staff_id=requesting_assignment.staff_id,
                notes=f"{'Specific' if swap_type == 'specific' else 'Auto-assignment'} requested: {swap_data['reason']}"
            )
            session.add(history)
            
            if status != SwapStatus.PENDING:
                if status in [SwapStatus.MANAGER_APPROVED, SwapStatus.STAFF_ACCEPTED, SwapStatus.EXECUTED, SwapStatus.MANAGER_FINAL_APPROVAL]:
                    manager_history = SwapHistory(
                        swap_request_id=swap_request.id,
                        action="manager_approved",
                        actor_staff_id=requesting_assignment.staff_id,
                        notes="Manager approved the swap request"
                    )
                    session.add(manager_history)
                
                if status in [SwapStatus.STAFF_ACCEPTED, SwapStatus.EXECUTED]:
                    staff_history = SwapHistory(
                        swap_request_id=swap_request.id,
                        action="staff_accepted",
                        actor_staff_id=swap_data.get("target_staff_id", swap_data.get("assigned_staff_id")),
                        notes="Staff member accepted the swap"
                    )
                    session.add(staff_history)
            
            created_swaps += 1
    
    session.commit()
    print(f"✅ Created {created_swaps} enhanced swap requests with workflow progression")
    return created_swaps

def save_accounts_to_json(all_accounts, staff_accounts):
    """Save account information to JSON files for reference"""
    
    managers = [acc for acc in all_accounts if acc['is_manager']]
    staff = [acc for acc in all_accounts if not acc['is_manager']]
    
    account_data = {
        "generated_at": str(date.today()),
        "total_accounts": len(all_accounts),
        "security_features": {
            "session_management": "enabled",
            "account_lockout": "enabled", 
            "audit_logging": "enabled",
            "password_history": "enabled",
            "account_linking": "enabled"
        },
        "summary": {
            "total_managers": len(managers),
            "total_staff": len(staff),
            "standard_passwords": {
                "admin": "admin123",
                "managers": "manager123", 
                "staff": "staff123",
                "security": "security123"
            }
        },
        "admin_accounts": [acc for acc in managers if "admin" in acc['email'] or "security" in acc['email']],
        "managers": [acc for acc in managers if "admin" not in acc['email'] and "security" not in acc['email']],
        "staff": staff,
        "quick_test_accounts": {
            "admin": "admin@hospitality.com / admin123",
            "hotel_manager": "manager@seaside.com / manager123", 
            "restaurant_manager": "manager@bistro.com / manager123",
            "security_manager": "security@hospitality.com / security123",
            "sample_staff": staff[:5] if staff else []
        },
        "security_test_features": [
            "Login attempt tracking",
            "Account lockout simulation", 
            "Session management",
            "Audit log generation",
            "Password history tracking",
            "Multi-provider account linking"
        ]
    }
    
    with open('demo_accounts.json', 'w') as f:
        json.dump(account_data, f, indent=2)
    
    staff_simple = [
        {
            "name": acc['name'],
            "email": acc['email'],
            "password": acc['password'],
            "role": acc['role'],
            "facility": acc['facility']
        }
        for acc in staff
    ]
    
    with open('staff_accounts.json', 'w') as f:
        json.dump(staff_simple, f, indent=2)
    
    print(f"✅ Saved account data with security features to demo_accounts.json and staff_accounts.json")
    return account_data

async def seed():
    """Main seeding function with comprehensive security features - CORRECTED"""
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Reset database first
        reset_database(session)
        
        # Create tenant
        tenant = Tenant(name="Demo Hospitality Group")
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        print(f"✅ Created tenant: {tenant.name}")

        # 🔒 CREATE SECURITY SETTINGS FIRST
        security_settings = create_security_settings(session, tenant.id)
        
        # 📧 CREATE NOTIFICATION TEMPLATES
        notification_templates = create_notification_templates(session, tenant.id)
        
        # Create facilities with enhanced types
        facilities_data = [
            {"name": "Seaside Hotel", "location": "123 Ocean Drive, Miami Beach", "type": "hotel"},
            {"name": "Downtown Bistro", "location": "456 Main St, Downtown", "type": "restaurant"},
            {"name": "Mountain Lodge", "location": "789 Pine Ridge, Aspen", "type": "hotel"},
            {"name": "Rooftop Restaurant", "location": "100 High St, Manhattan", "type": "restaurant"},
            {"name": "Beach Resort", "location": "555 Paradise Blvd, Malibu", "type": "hotel"},
            {"name": "City Cafe", "location": "789 Urban Ave, Chicago", "type": "cafe"},
            {"name": "Luxury Spa Hotel", "location": "321 Wellness Way, Napa", "type": "hotel"},
            {"name": "Sports Bar & Grill", "location": "888 Stadium Dr, Denver", "type": "restaurant"},
        ]
        
        templates = get_facility_templates()
        facilities = []
        
        for fac_data in facilities_data:
            facility = Facility(
                name=fac_data["name"],
                location=fac_data["location"],
                facility_type=fac_data["type"],
                tenant_id=tenant.id
            )
            facilities.append(facility)
        
        session.add_all(facilities)
        session.commit()
        print(f"✅ Created {len(facilities)} facilities")

        # 🔧 CREATE FACILITY CONFIGURATIONS
        print("🔧 Setting up facility configurations...")
        all_shifts = []
        all_roles = []
        all_zones = []
        
        for facility in facilities:
            template_data = templates.get(facility.facility_type, templates['hotel'])
            shifts, roles, zones = create_facility_configuration(session, facility, template_data)
            all_shifts.extend(shifts)
            all_roles.extend(roles)
            all_zones.extend(zones)
        
        print(f"✅ Created facility configurations: {len(all_shifts)} shifts, {len(all_roles)} roles, {len(all_zones)} zones")

        # 🔒 CREATE MATCHING STAFF AND USER ACCOUNTS
        staff_objs, all_accounts, staff_accounts = create_matched_staff_and_users(
            facilities, tenant.id, session
        )
        
        # Get all users for security and notification setup
        all_users = session.exec(select(User).where(User.tenant_id == tenant.id)).all()
        
        # 🔗 CREATE USER PROVIDERS (Account Linking)
        user_providers = create_user_providers(session, all_users)
        
        # 🔒 CREATE SECURITY RECORDS
        audit_logs = create_sample_audit_logs(session, all_users, tenant.id)
        login_attempts = create_sample_login_attempts(session, all_users)
        user_sessions = create_sample_user_sessions(session, all_users)
        account_lockouts = create_sample_account_lockouts(session, all_users)
        password_histories = create_sample_password_history(session, all_users)
        
        # 📧 CREATE NOTIFICATION PREFERENCES
        create_notification_preferences(session, all_users)
        
        # 📧 CREATE SAMPLE NOTIFICATIONS (including security notifications)
        sample_notifications = await create_sample_notifications(session, all_users[:15], facilities[:3])
        
        # 📄 SAVE ACCOUNTS TO JSON
        account_data = save_accounts_to_json(all_accounts, staff_accounts)
        
        # 📅 CREATE ENHANCED SCHEDULES
        base_date = date.today()
        create_enhanced_schedules(session, facilities, staff_objs, base_date)
        
        # 🔄 CREATE ENHANCED SWAP REQUESTS
        created_swaps = create_enhanced_swap_requests(session, facilities, staff_objs, base_date)
        
        # 📧 CREATE SAMPLE SCHEDULE CONFIGURATIONS
        print("📧 Creating sample schedule configurations...")
        
        created_configs = 0
        for facility in facilities[:4]:
            schedule_config = ScheduleConfig(
                facility_id=facility.id,
                min_rest_hours=randint(8, 12),
                max_consecutive_days=randint(5, 7),
                max_weekly_hours=choice([32, 36, 40, 44]),
                min_staff_per_shift=2 if facility.facility_type == 'cafe' else 3,
                max_staff_per_shift=randint(8, 15),
                require_manager_per_shift=choice([True, False]),
                allow_overtime=choice([True, False]),
                weekend_restrictions=choice([True, False]),
                shift_role_requirements={
                    "zone_role_mapping": {
                        "front-desk": ["Front Desk Agent", "Manager"] if facility.facility_type == 'hotel' else [],
                        "kitchen": ["Chef", "Line Cook", "Prep Cook"] if facility.facility_type in ['restaurant', 'cafe'] else [],
                        "dining": ["Server", "Host/Hostess"] if facility.facility_type == 'restaurant' else [],
                        "bar": ["Bartender"] if facility.facility_type in ['restaurant', 'cafe'] else [],
                        "housekeeping": ["Housekeeper"] if facility.facility_type == 'hotel' else []
                    }
                }
            )
            session.add(schedule_config)
            created_configs += 1
        
        session.commit()
        print(f"✅ Created {created_configs} schedule configurations")
        
        # 📊 CREATE SAMPLE STAFF UNAVAILABILITY
        print("📊 Creating sample staff unavailability records...")
        
        unavailabilities = []
        for staff in staff_objs[:20]:
            for _ in range(randint(1, 3)):
                start_date = base_date + timedelta(days=randint(-30, 60))
                
                if randint(1, 10) <= 7:
                    end_date = start_date
                else:
                    end_date = start_date + timedelta(days=randint(1, 5))
                
                # CORRECTED: Create proper datetime objects
                start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                end_datetime = datetime.combine(end_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                
                unavailability = StaffUnavailability(
                    staff_id=staff.id,
                    start=start_datetime,
                    end=end_datetime,
                    reason=choice([
                        "Vacation",
                        "Medical appointment",
                        "Family commitment",
                        "Personal time off",
                        "Training/Education",
                        "Jury duty",
                        "Wedding",
                        "Sick leave"
                    ]),
                    is_recurring=choice([True, False])
                )
                unavailabilities.append(unavailability)
        
        session.add_all(unavailabilities)
        session.commit()
        print(f"✅ Created {len(unavailabilities)} staff unavailability records")
        
        # 📊 PRINT COMPREHENSIVE SUMMARY
        print("\n" + "="*90)
        print("🎉 CORRECTED DEMO DATA WITH SECURITY FEATURES COMPLETE")
        print("="*90)
        print(f"🏢 Tenant: {tenant.name}")
        print(f"🏨 Facilities: {len(facilities)}")
        
        for fac in facilities:
            staff_count = len([s for s in staff_objs if s.facility_id == fac.id])
            shifts_count = len([s for s in all_shifts if s.facility_id == fac.id])
            roles_count = len([r for r in all_roles if r.facility_id == fac.id])
            zones_count = len([z for z in all_zones if z.facility_id == fac.id])
            
            print(f"   • {fac.name} ({fac.facility_type}):")
            print(f"     - {staff_count} staff, {shifts_count} shifts, {roles_count} roles, {zones_count} zones")
        
        print(f"\n📊 CORE SYSTEM TOTALS:")
        print(f"👥 Staff Records: {len(staff_objs)}")
        print(f"👤 User Accounts: {len(all_accounts)}")
        print(f"🔄 Shifts: {len(all_shifts)}")
        print(f"👔 Roles: {len(all_roles)}")
        print(f"🏢 Zones: {len(all_zones)}")
        print(f"📅 Schedules: {len([s for s in session.exec(select(Schedule)).all()])}")
        print(f"🔄 Swap Requests: {created_swaps}")
        print(f"⚙️ Schedule Configs: {created_configs}")
        print(f"❌ Unavailabilities: {len(unavailabilities)}")
        
        print(f"\n🔒 SECURITY FEATURES TOTALS:")
        print(f"🔒 User Sessions: {len(user_sessions)}")
        print(f"📊 Audit Logs: {len(audit_logs)}")
        print(f"🔍 Login Attempts: {len(login_attempts)}")
        print(f"🔒 Account Lockouts: {len(account_lockouts)}")
        print(f"🔑 Password History: {len(password_histories)}")
        print(f"🔗 User Providers: {len(user_providers)}")
        print(f"⚙️ Security Settings: 1 (tenant-level)")
        
        print(f"\n📧 NOTIFICATION SYSTEM:")
        print(f"📄 Templates: {len(notification_templates)}")
        print(f"🔧 Preferences: {len([p for p in session.exec(select(NotificationPreference)).all()])}")
        print(f"📨 Sample Notifications: {len(sample_notifications)}")
        
        print(f"\n📁 Files Generated:")
        print(f"   • demo_accounts.json - Complete account list with security info")
        print(f"   • staff_accounts.json - Staff-only accounts for testing")
        
        print("\n🔑 QUICK TEST CREDENTIALS:")
        print("ADMIN & MANAGERS:")
        print("   admin@hospitality.com / admin123")
        print("   security@hospitality.com / security123")
        print("   manager@seaside.com / manager123")
        print("   manager@bistro.com / manager123")
        
        print("\nSAMPLE STAFF ACCOUNTS:")
        staff_sample = account_data['staff'][:5]
        for staff_acc in staff_sample:
            print(f"   {staff_acc['email']} / {staff_acc['password']} ({staff_acc['name']} - {staff_acc['role']})")
        
        if len(account_data['staff']) > 5:
            print(f"   ... and {len(account_data['staff']) - 5} more staff accounts in staff_accounts.json")
        
        print(f"\n🚀 CORRECTED SECURITY FEATURES:")
        print(f"   ✅ Proper AuditEvent enum values")
        print(f"   ✅ Correct model field names")
        print(f"   ✅ Timezone-aware datetime objects")
        print(f"   ✅ Comprehensive session management")
        print(f"   ✅ Account lockout protection")
        print(f"   ✅ Detailed audit logging")
        print(f"   ✅ Password history tracking")
        print(f"   ✅ Multi-provider account linking")
        print(f"   ✅ Login attempt monitoring")
        print(f"   ✅ Security settings per tenant")
        
        print("="*90)

def main():
    """Entry point that handles async execution"""
    asyncio.run(seed())

if __name__ == "__main__":
    main()