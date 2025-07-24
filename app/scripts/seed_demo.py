import json
import asyncio
from faker import Faker
from sqlmodel import SQLModel, Session, select, create_engine, delete
from app.models import (
    Tenant, Facility, Staff, User, Schedule, ShiftAssignment, 
    ScheduleConfig, StaffUnavailability, SwapRequest, SwapHistory,
    ZoneAssignment, ScheduleTemplate, ScheduleOptimization,
    # NEW: Facility management models
    FacilityShift, FacilityRole, FacilityZone, ShiftRoleRequirement,
    # NEW: Notification system models
    Notification, NotificationTemplate, NotificationPreference,
    NotificationType, NotificationPriority, SwapStatus
)
from app.core.security import hash_password
from app.core.config import get_settings
from app.services.notification_service import NotificationService
from random import choice, randint, shuffle  # randint still used elsewhere
from datetime import date, timedelta, datetime
from typing import List, Dict, Any
import uuid

fake = Faker()
settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)

def reset_database(session):
    """Reset all tables before seeding"""
    print("🗑️  Resetting database...")
    
    # Delete in reverse dependency order to respect foreign keys
    session.execute(delete(SwapHistory))
    session.execute(delete(SwapRequest))
    session.execute(delete(ZoneAssignment))
    session.execute(delete(ScheduleTemplate))
    session.execute(delete(ScheduleOptimization))
    session.execute(delete(ScheduleConfig))
    session.execute(delete(StaffUnavailability))
    session.execute(delete(ShiftAssignment))
    session.execute(delete(Schedule))
    
    # NEW: Delete notification system tables
    session.execute(delete(Notification))
    session.execute(delete(NotificationPreference))
    session.execute(delete(NotificationTemplate))
    
    # NEW: Delete facility management tables
    session.execute(delete(ShiftRoleRequirement))
    session.execute(delete(FacilityShift))
    session.execute(delete(FacilityRole))
    session.execute(delete(FacilityZone))
    
    session.execute(delete(Staff))
    session.execute(delete(Facility))
    session.execute(delete(User))
    session.execute(delete(Tenant))
    
    session.commit()
    print("✅ Database reset complete!")

def create_notification_templates(session, tenant_id):
    """Create notification templates for the enhanced workflow"""
    print("📧 Creating notification templates...")
    
    templates = [
        {
            "template_name": "schedule_published",
            "notification_type": NotificationType.SCHEDULE_PUBLISHED,
            "title_template": "📅 New Schedule Published",
            "message_template": "Hi $staff_name! Your schedule for the week of $week_start is now available at $facility_name.",
            "whatsapp_template": "*Schedule Alert* 📅\n\nHi $staff_name! Your schedule for the week of $week_start is ready.\n\n📍 $facility_name\n\nView schedule: $action_url",
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
            "template_name": "swap_approved",
            "notification_type": NotificationType.SWAP_APPROVED,
            "title_template": "✅ Swap Request Approved",
            "message_template": "Great news! Your swap request for $original_day $original_shift has been approved by $approver_name.",
            "whatsapp_template": "✅ *Swap Approved!*\n\nYour shift swap has been approved:\n\n📅 $original_day\n⏰ $original_shift\n👤 Approved by: $approver_name\n\nView updated schedule: $action_url",
            "default_channels": ["IN_APP", "PUSH"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "emergency_coverage",
            "notification_type": NotificationType.EMERGENCY_COVERAGE,
            "title_template": "🚨 Urgent Coverage Needed",
            "message_template": "$requester_name at $facility_name needs urgent coverage for $original_day $original_shift. Can you help?",
            "whatsapp_template": "*🚨 URGENT COVERAGE NEEDED*\n\n$requester_name needs immediate help:\n\n📍 $facility_name\n📅 $original_day\n⏰ $original_shift\n📝 $reason\n\nCan you cover? Respond: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.URGENT
        },
        {
            "template_name": "schedule_change",
            "notification_type": NotificationType.SCHEDULE_CHANGE,
            "title_template": "📋 Schedule Update",
            "message_template": "Your schedule at $facility_name has been updated. Please review the changes for the week of $week_start.",
            "whatsapp_template": "*Schedule Update* 📋\n\nYour schedule has been updated:\n\n📍 $facility_name\n📅 Week of $week_start\n\nView changes: $action_url",
            "default_channels": ["IN_APP", "PUSH"],
            "priority": NotificationPriority.MEDIUM
        },
        {
            "template_name": "swap_response_needed",
            "notification_type": NotificationType.SWAP_REQUEST,
            "title_template": "⏰ Swap Response Needed",
            "message_template": "Please respond to $requester_name's swap request for $original_day $original_shift. Request expires in $hours_until_expiry hours.",
            "whatsapp_template": "*Response Needed* ⏰\n\nPlease respond to swap request from $requester_name:\n\n📅 $original_day\n⏰ $original_shift\n⌛ Expires in $hours_until_expiry hours\n\nRespond now: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "auto_assignment_available",
            "notification_type": NotificationType.EMERGENCY_COVERAGE,
            "title_template": "💼 Pick-up Shift Available",
            "message_template": "A $original_shift shift is available for pick-up at $facility_name on $original_day. Interested?",
            "whatsapp_template": "*Shift Available* 💼\n\nExtra shift opportunity:\n\n📍 $facility_name\n📅 $original_day\n⏰ $original_shift\n💰 Rate: $hourly_rate/hour\n\nClaim it: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.MEDIUM
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
            # Different preferences based on user type
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
                    # High priority for schedule notifications
                    preference = NotificationPreference(
                        user_id=user.id,
                        notification_type=notification_type,
                        in_app_enabled=True,
                        push_enabled=True,
                        whatsapp_enabled=choice([True, False]),  # Some prefer WhatsApp, some don't
                        email_enabled=False,
                        quiet_hours_start="23:00",
                        quiet_hours_end="08:00",
                        timezone="America/New_York"
                    )
                elif notification_type in [NotificationType.SWAP_REQUEST, NotificationType.EMERGENCY_COVERAGE]:
                    # Medium priority for swap notifications
                    preference = NotificationPreference(
                        user_id=user.id,
                        notification_type=notification_type,
                        in_app_enabled=True,
                        push_enabled=choice([True, False]),  # Some prefer push, some don't
                        whatsapp_enabled=choice([True, False]),
                        email_enabled=False,
                        quiet_hours_start="23:00",
                        quiet_hours_end="08:00",
                        timezone="America/New_York"
                    )
                else:
                    # Default preferences for other types
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
    """Create sample notifications to demonstrate the system"""
    print("📧 Creating sample notifications...")
    
    # Create notifications directly without using the notification service 
    # to avoid session issues during seeding
    created_notifications = []
    
    # Sample notification data
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
            "type": NotificationType.EMERGENCY_COVERAGE,
            "title": "🚨 Urgent Coverage Needed",
            "message": "Mike Johnson at Downtown Bistro needs urgent coverage for Saturday Dinner Service. Can you help?",
            "channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.URGENT
        }
    ]
    
    # Demo recipients: all managers plus first 10 users
    notification_users = [u for u in users if u.is_manager][:5] + users[:10]
    
    for user in notification_users:
        # Each user gets 1-3 notifications
        user_notifications = sample_notifications[:randint(1, 3)]
        
        for notification_data in user_notifications:
            try:
                # Create notification directly in the database
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
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        for channel in notification_data["channels"]
                    },
                    is_delivered=True,
                    delivered_at=datetime.utcnow(),
                    is_read=False  # force unread so it shows in the bell
                )
                session.add(notification)
                created_notifications.append(notification)
            except Exception as e:
                print(f"⚠️  Failed to create notification for {user.email}: {e}")
    
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
        # Each shift needs at least one manager if requires_manager is True
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
                # Front desk needs agents
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
            # Kitchen always needs cooks
            cook_roles = [r for r in roles if 'Cook' in r.role_name or r.role_name == 'Chef']
            for role in cook_roles[:2]:  # Limit to 2 cook roles per shift
                requirement = ShiftRoleRequirement(
                    facility_shift_id=shift.id,
                    facility_role_id=role.id,
                    min_required=1 if role.role_name == 'Chef' else 1,
                    max_allowed=3,
                    is_required=True
                )
                shift_role_requirements.append(requirement)
                session.add(requirement)
            
            # Dining room needs servers
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
    staff_users = []  # Track created staff users for JSON output
    all_created_accounts = []  # Track all accounts created
    
    # First, create predefined admin/manager accounts
    predefined_accounts = [
        {
            "email": "admin@hospitality.com",
            "password": "admin123",
            "is_manager": True,
            "name": "System Admin",
            "create_staff": False  # Admin doesn't need staff record
        },
        {
            "email": "manager@seaside.com",
            "password": "manager123",
            "is_manager": True,
            "name": "Hotel Manager",
            "create_staff": False  # Manager doesn't need staff record
        },
        {
            "email": "manager@bistro.com", 
            "password": "manager123",
            "is_manager": True,
            "name": "Restaurant Manager",
            "create_staff": False  # Manager doesn't need staff record
        },
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
    
    # Now create staff members and matching user accounts
    for facility in facilities:
        # Get facility roles to match staff to appropriate roles
        facility_roles = session.exec(
            select(FacilityRole).where(FacilityRole.facility_id == facility.id)
        ).all()
        
        if not facility_roles:
            print(f"  ⚠️  No roles found for {facility.name}, skipping staff creation")
            continue
        
        # Determine staff count based on facility type
        if facility.facility_type == "hotel":
            staff_count = randint(18, 28)
        elif facility.facility_type == "restaurant":
            staff_count = randint(12, 20)
        else:  # cafe, etc.
            staff_count = randint(8, 15)
        
        print(f"📋 Creating {staff_count} staff for {facility.name}")
        
        # Ensure we have managers
        manager_roles = [r for r in facility_roles if r.is_management]
        regular_roles = [r for r in facility_roles if not r.is_management]
        
        managers_needed = min(randint(2, 4), len(manager_roles))
        
        for i in range(staff_count):
            # Generate realistic fake names and emails
            first_name = fake.first_name()
            last_name = fake.last_name()
            full_name = f"{first_name} {last_name}"
            
            # Create consistent email format for staff
            base_email = f"{first_name.lower()}.{last_name.lower()}"
            facility_short = facility.name.lower().replace(' ', '').replace('&', 'and')
            
            # Use different email formats to avoid duplicates
            email_options = [
                f"{base_email}@{facility_short}.com",
                f"{base_email}@staff.com",
                f"{base_email}@hospitality.com",
                f"{first_name.lower()}{last_name.lower()}@team.com",
                f"{first_name[0].lower()}{last_name.lower()}@{facility_short}.com"
            ]
            
            # Try each email option until we find one that's not taken
            email = None
            for email_option in email_options:
                # Check if this email already exists in our created accounts
                if not any(acc['email'] == email_option for acc in all_created_accounts):
                    email = email_option
                    break
            
            # Fallback with random number if all emails taken
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
                role=role_obj.role_name,  # Use the actual role from FacilityRole
                skill_level=skill_level,
                facility_id=facility.id,
                phone=fake.phone_number(),
                weekly_hours_max=choice([25, 30, 35, 40]),
                is_active=choice([True, True, True, True, False])  # 80% active
            )
            staff_objs.append(staff)
            
            # Create matching User account for this staff member
            password = "staff123"  # Standard password for all staff
            user_account = {
                "email": email,
                "password": password,
                "is_manager": is_staff_manager,
                "name": full_name,
                "role": role_obj.role_name,
                "facility": facility.name
            }
            
            # Create User in database
            user = User(
                email=email,
                hashed_password=hash_password(password),
                tenant_id=tenant_id,
                is_manager=is_staff_manager,
                is_active=True
            )
            session.add(user)
            
            # Track for JSON output
            all_created_accounts.append(user_account)
            if not is_staff_manager:  # Only track non-manager staff for staff list
                staff_users.append(user_account)
    
    # Save all staff records to database
    session.add_all(staff_objs)
    session.commit()
    
    print(f"✅ Created {len(staff_objs)} staff members with matching user accounts")
    
    return staff_objs, all_created_accounts, staff_users

def create_enhanced_schedules(session, facilities, staff_objs, base_date):
    """Create more realistic schedules using the new shift system"""
    
    print("📅 Creating enhanced schedules with facility shifts...")
    
    demo_facilities = facilities[:2]  # Use first 2 facilities for demo schedules
    
    for facility in demo_facilities:
        # Get facility shifts
        facility_shifts = session.exec(
            select(FacilityShift)
            .where(FacilityShift.facility_id == facility.id)
            .order_by(FacilityShift.shift_order)
        ).all()
        
        if not facility_shifts:
            print(f"  ⚠️  No shifts found for {facility.name}, skipping schedule creation")
            continue
        
        facility_staff = [s for s in staff_objs if s.facility_id == facility.id and s.is_active]
        active_staff = facility_staff[:15]  # Use first 15 active staff
        
        if not active_staff:
            print(f"  ⚠️  No active staff found for {facility.name}, skipping schedule creation")
            continue
        
        # Create 4 weeks of schedules (2 past, 2 future)
        for week_offset in range(-2, 3):
            week_start = base_date + timedelta(weeks=week_offset)
            # Ensure it's a Monday
            week_start = week_start - timedelta(days=week_start.weekday())
            
            schedule = Schedule(
                facility_id=facility.id,
                week_start=week_start
            )
            session.add(schedule)
            session.flush()  # Get the ID
            
            # Create realistic shift assignments using facility shifts
            assignments = []
            
            for day in range(7):  # Monday to Sunday
                for shift_idx, facility_shift in enumerate(facility_shifts):
                    # Determine how many staff needed for this shift
                    staff_needed = randint(facility_shift.min_staff, 
                                         min(facility_shift.max_staff, len(active_staff)))
                    
                    # Randomly assign staff to shifts, ensuring variety
                    available_staff = active_staff.copy()
                    shuffle(available_staff)
                    
                    for i in range(staff_needed):
                        if i < len(available_staff):
                            assignment = ShiftAssignment(
                                schedule_id=schedule.id,
                                day=day,
                                shift=shift_idx,  # Use the facility shift index
                                staff_id=available_staff[i].id
                            )
                            assignments.append(assignment)
            
            session.add_all(assignments)
            print(f"   📋 Created schedule for {facility.name}, week of {week_start} ({len(assignments)} assignments)")
    
    session.commit()

def create_enhanced_swap_requests(session, facilities, staff_objs, base_date):
    """Create enhanced swap requests with new workflow features"""
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
        "Requested time off for personal reasons",
        "Sick family member needs care",
        "Wedding to attend",
        "Court appearance",
        "Graduation ceremony"
    ]
    
    urgency_levels = ["low", "normal", "high", "emergency"]
    
    # Enhanced swap statuses with new workflow states (using correct enum values)
    swap_statuses = [
        SwapStatus.PENDING,
        SwapStatus.MANAGER_APPROVED,
        SwapStatus.STAFF_ACCEPTED,
        SwapStatus.STAFF_DECLINED,
        SwapStatus.POTENTIAL_ASSIGNMENT,  # Fixed: was ASSIGNED which doesn't exist
        SwapStatus.ASSIGNMENT_FAILED,
        SwapStatus.EXECUTED,
        SwapStatus.DECLINED,
        SwapStatus.ASSIGNMENT_DECLINED,
        SwapStatus.MANAGER_FINAL_APPROVAL,  # Fixed: was MANAGER_FINAL_APPROVAL_NEEDED
        SwapStatus.CANCELLED
    ]
    
    created_swaps = 0
    for schedule in recent_schedules[:3]:  # Create swaps for first 3 schedules
        assignments = session.exec(
            select(ShiftAssignment).where(ShiftAssignment.schedule_id == schedule.id)
        ).all()
        
        if len(assignments) < 2:
            continue
            
        # Create 5-8 swap requests per schedule to show workflow variety
        for _ in range(randint(5, 8)):
            requesting_assignment = choice(assignments)
            
            # Determine swap type (60% specific, 40% auto)
            swap_type = "specific" if randint(1, 10) <= 6 else "auto"
            
            # Base swap request data
            swap_data = {
                "schedule_id": schedule.id,
                "requesting_staff_id": requesting_assignment.staff_id,
                "original_day": requesting_assignment.day,
                "original_shift": requesting_assignment.shift,
                "swap_type": swap_type,
                "reason": choice(enhanced_swap_reasons),
                "urgency": choice(urgency_levels),
                "expires_at": datetime.utcnow() + timedelta(days=randint(1, 7)),
                "requires_manager_final_approval": choice([True, False]),
                "role_verification_required": choice([True, False])
            }
            
            if swap_type == "specific":
                # Specific swap with target staff
                target_assignment = choice([a for a in assignments if a.id != requesting_assignment.id])
                swap_data.update({
                    "target_staff_id": target_assignment.staff_id,
                    "target_day": target_assignment.day,
                    "target_shift": target_assignment.shift,
                })
            
            # Set realistic status based on workflow progression
            status = choice(swap_statuses)
            swap_data["status"] = status
            
            # Set workflow-specific fields based on status
            if status == SwapStatus.MANAGER_APPROVED:
                swap_data["manager_approved"] = True
                swap_data["manager_approved_at"] = datetime.utcnow() - timedelta(hours=randint(1, 24))
            elif status == SwapStatus.STAFF_ACCEPTED:
                swap_data["target_staff_accepted"] = True
                swap_data["staff_response_at"] = datetime.utcnow() - timedelta(hours=randint(1, 48))
            elif status == SwapStatus.STAFF_DECLINED:
                swap_data["target_staff_accepted"] = False
                swap_data["staff_response_at"] = datetime.utcnow() - timedelta(hours=randint(1, 48))
            elif status == SwapStatus.POTENTIAL_ASSIGNMENT and swap_type == "auto":
                # For auto swaps, assign someone
                facility_staff = [s for s in staff_objs if s.facility_id == schedule.facility_id and s.id != requesting_assignment.staff_id]
                if facility_staff:
                    swap_data["assigned_staff_id"] = choice(facility_staff).id
                    swap_data["assignment_method"] = choice(["auto", "manual"])
            elif status == SwapStatus.POTENTIAL_ASSIGNMENT:
                # Potential assignment awaiting staff response
                facility_staff = [s for s in staff_objs if s.facility_id == schedule.facility_id and s.id != requesting_assignment.staff_id]
                if facility_staff:
                    swap_data["assigned_staff_id"] = choice(facility_staff).id
                    swap_data["assignment_method"] = "auto"
            
            # Create the swap request
            swap_request = SwapRequest(**swap_data)
            session.add(swap_request)
            session.flush()
            
            # Create history entry
            history = SwapHistory(
                swap_request_id=swap_request.id,
                action="requested",
                actor_staff_id=requesting_assignment.staff_id,
                notes=f"{'Specific' if swap_type == 'specific' else 'Auto-assignment'} requested: {swap_data['reason']}",
                system_action=False
            )
            session.add(history)
            
            # Add additional history entries for progressed statuses
            if status != SwapStatus.PENDING:
                if status in [SwapStatus.MANAGER_APPROVED, SwapStatus.STAFF_ACCEPTED, SwapStatus.EXECUTED, SwapStatus.MANAGER_FINAL_APPROVAL]:
                    # Manager approval history
                    manager_history = SwapHistory(
                        swap_request_id=swap_request.id,
                        action="manager_approved",
                        actor_staff_id=requesting_assignment.staff_id,  # For demo purposes
                        notes="Manager approved the swap request",
                        timestamp=datetime.utcnow() - timedelta(hours=randint(1, 12))
                    )
                    session.add(manager_history)
                
                if status in [SwapStatus.STAFF_ACCEPTED, SwapStatus.EXECUTED]:
                    # Staff acceptance history
                    staff_history = SwapHistory(
                        swap_request_id=swap_request.id,
                        action="staff_accepted",
                        actor_staff_id=swap_data.get("target_staff_id", swap_data.get("assigned_staff_id")),
                        notes="Staff member accepted the swap",
                        timestamp=datetime.utcnow() - timedelta(hours=randint(1, 6))
                    )
                    session.add(staff_history)
            
            created_swaps += 1
    
    session.commit()
    print(f"✅ Created {created_swaps} enhanced swap requests with workflow progression")
    return created_swaps

def save_accounts_to_json(all_accounts, staff_accounts):
    """Save account information to JSON files for reference"""
    
    # Separate accounts by type for easier reference
    managers = [acc for acc in all_accounts if acc['is_manager']]
    staff = [acc for acc in all_accounts if not acc['is_manager']]
    
    # Create comprehensive account data
    account_data = {
        "generated_at": str(date.today()),
        "total_accounts": len(all_accounts),
        "summary": {
            "total_managers": len(managers),
            "total_staff": len(staff),
            "standard_passwords": {
                "admin": "admin123",
                "managers": "manager123",
                "staff": "staff123"
            }
        },
        "admin_accounts": [acc for acc in managers if "admin" in acc['email']],
        "managers": [acc for acc in managers if "admin" not in acc['email']],
        "staff": staff,
        "quick_test_accounts": {
            "admin": "admin@hospitality.com / admin123",
            "hotel_manager": "manager@seaside.com / manager123", 
            "restaurant_manager": "manager@bistro.com / manager123",
            "sample_staff": staff[:5] if staff else []
        }
    }
    
    # Save to JSON file
    with open('demo_accounts.json', 'w') as f:
        json.dump(account_data, f, indent=2)
    
    # Also save a simple staff-only list for easy testing
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
    
    print(f"✅ Saved account data to demo_accounts.json and staff_accounts.json")
    return account_data

async def seed():
    """Main seeding function with async support for notifications"""
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

        # 📧 CREATE NOTIFICATION TEMPLATES FIRST
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

        # 🔧 CREATE FACILITY CONFIGURATIONS (shifts, roles, zones)
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

        # 🔑 CREATE MATCHING STAFF AND USER ACCOUNTS
        staff_objs, all_accounts, staff_accounts = create_matched_staff_and_users(
            facilities, tenant.id, session
        )
        
        # Get all users for notification setup
        all_users = session.exec(select(User).where(User.tenant_id == tenant.id)).all()
        
        # 🔧 CREATE NOTIFICATION PREFERENCES
        create_notification_preferences(session, all_users)
        
        # 📧 CREATE SAMPLE NOTIFICATIONS
        sample_notifications = await create_sample_notifications(session, all_users[:15], facilities[:3])
        
        # 📄 SAVE ACCOUNTS TO JSON
        account_data = save_accounts_to_json(all_accounts, staff_accounts)
        
        # 📅 CREATE ENHANCED SCHEDULES
        base_date = date.today()
        create_enhanced_schedules(session, facilities, staff_objs, base_date)
        
        # 🔄 CREATE ENHANCED SWAP REQUESTS WITH NEW WORKFLOW
        created_swaps = create_enhanced_swap_requests(session, facilities, staff_objs, base_date)
        
        # 🔧 CREATE SAMPLE SCHEDULE CONFIGURATIONS
        print("🔧 Creating sample schedule configurations...")
        
        created_configs = 0
        for facility in facilities[:4]:  # Create configs for first 4 facilities
            # Create comprehensive schedule config
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
                    },
                    "shift_requirements": {
                        "0": {"min_staff": 2, "required_roles": [], "min_skill_level": 1},
                        "1": {"min_staff": 3, "required_roles": ["Manager"] if facility.facility_type == 'hotel' else [], "min_skill_level": 1},
                        "2": {"min_staff": 2, "required_roles": ["Manager"], "min_skill_level": 2}
                    },
                    "skill_requirements": {
                        "Manager": 4,
                        "Chef": 3,
                        "Server": 2,
                        "Front Desk Agent": 2,
                        "Housekeeper": 1
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
        for staff in staff_objs[:20]:  # Create unavailability for first 20 staff
            # Create 1-3 unavailability periods per staff member
            for _ in range(randint(1, 3)):
                start_date = base_date + timedelta(days=randint(-30, 60))
                
                # 70% single day, 30% multi-day
                if randint(1, 10) <= 7:
                    end_date = start_date
                else:
                    end_date = start_date + timedelta(days=randint(1, 5))
                
                unavailability = StaffUnavailability(
                    staff_id=staff.id,
                    start=start_date,
                    end=end_date,
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
        print("\n" + "="*80)
        print("🎉 ENHANCED DEMO DATA CREATION COMPLETE")
        print("="*80)
        print(f"🏢 Tenant: {tenant.name}")
        print(f"🏨 Facilities: {len(facilities)}")
        
        facility_summary = {}
        for fac in facilities:
            staff_count = len([s for s in staff_objs if s.facility_id == fac.id])
            shifts_count = len([s for s in all_shifts if s.facility_id == fac.id])
            roles_count = len([r for r in all_roles if r.facility_id == fac.id])
            zones_count = len([z for z in all_zones if z.facility_id == fac.id])
            
            print(f"   • {fac.name} ({fac.facility_type}):")
            print(f"     - {staff_count} staff, {shifts_count} shifts, {roles_count} roles, {zones_count} zones")
            
            facility_summary[fac.name] = {
                "type": fac.facility_type,
                "staff": staff_count,
                "shifts": shifts_count,
                "roles": roles_count,
                "zones": zones_count
            }
        
        print(f"\n📊 TOTALS:")
        print(f"👥 Staff Records: {len(staff_objs)}")
        print(f"👤 User Accounts: {len(all_accounts)}")
        print(f"🔄 Shifts: {len(all_shifts)}")
        print(f"👔 Roles: {len(all_roles)}")
        print(f"🏢 Zones: {len(all_zones)}")
        print(f"📅 Schedules: {len([s for s in session.exec(select(Schedule)).all()])}")
        print(f"🔄 Swap Requests: {created_swaps}")
        print(f"⚙️  Schedule Configs: {created_configs}")
        print(f"❌ Unavailabilities: {len(unavailabilities)}")
        
        # NEW: Notification system summary
        print(f"\n📧 NOTIFICATION SYSTEM:")
        print(f"📄 Templates: {len(notification_templates)}")
        print(f"🔧 Preferences: {len([p for p in session.exec(select(NotificationPreference)).all()])}")
        print(f"📨 Sample Notifications: {len(sample_notifications)}")
        
        print(f"\n📁 Files Generated:")
        print(f"   • demo_accounts.json - Complete account list")
        print(f"   • staff_accounts.json - Staff-only accounts for testing")
        
        print("\n🔑 QUICK TEST CREDENTIALS:")
        print("ADMIN & MANAGERS:")
        print("   admin@hospitality.com / admin123")
        print("   manager@seaside.com / manager123")
        print("   manager@bistro.com / manager123")
        
        print("\nSAMPLE STAFF ACCOUNTS (with matching Staff records):")
        staff_sample = account_data['staff'][:5]
        for staff_acc in staff_sample:
            print(f"   {staff_acc['email']} / {staff_acc['password']} ({staff_acc['name']} - {staff_acc['role']})")
        
        if len(account_data['staff']) > 5:
            print(f"   ... and {len(account_data['staff']) - 5} more staff accounts in staff_accounts.json")
        
        print(f"\n🚀 NEW FEATURES INCLUDED:")
        print(f"   ✅ Facility-specific shifts, roles, and zones")
        print(f"   ✅ Shift-role requirements and constraints")
        print(f"   ✅ Enhanced schedule configurations")
        print(f"   ✅ Realistic role-based staff assignments")
        print(f"   ✅ Template-based facility setup")
        print(f"   ✅ Staff unavailability tracking")
        print(f"   ✅ Comprehensive notification system")
        print(f"   ✅ Enhanced swap workflow with status tracking")
        print(f"   ✅ Notification templates and preferences")
        print(f"   ✅ Workflow history tracking")
        print(f"   ✅ Role verification and compatibility")
        
        print(f"\n📋 TESTING NOTES:")
        print(f"   • All staff emails match User accounts!")
        print(f"   • Staff password: staff123")
        print(f"   • Manager password: manager123") 
        print(f"   • Each facility has custom shifts, roles, and zones")
        print(f"   • Schedules use facility-specific shift definitions")
        print(f"   • Notifications can be tested via API endpoints")
        print(f"   • Swap requests include enhanced workflow states")
        print(f"   • Check facility management endpoints for full features")
        print(f"   • Use /notifications/test endpoints to verify delivery")
        print("="*80)

def main():
    """Entry point that handles async execution"""
    asyncio.run(seed())

if __name__ == "__main__":
    main()