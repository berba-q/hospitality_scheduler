# app/scripts/seed_notification_templates.py
"""
Create default notification templates using i18n keys
FIXED VERSION - Removed locale field that doesn't exist in the model
"""

from sqlmodel import Session, select
from app.models import NotificationTemplate, NotificationType, NotificationPriority
from app.deps import engine

def seed_notification_templates():
    """Create default notification templates using i18n keys"""
    
    # ✅ FIXED: Removed "locale" field - we use i18n keys instead
    templates = [
        {
            "template_name": "email_verification_default",
            "notification_type": NotificationType.EMAIL_VERIFICATION,
            # ✅ These are i18n keys that will be resolved at runtime
            "title_template": "notifications.templates.email_verification.title",
            "message_template": "notifications.templates.email_verification.message",
            "whatsapp_template": "notifications.templates.email_verification.whatsapp",
            "default_channels": ["EMAIL"],
            "priority": NotificationPriority.HIGH,
            "enabled": True,
            "tenant_id": None  # Global template
        },
        {
            "template_name": "password_reset_default",
            "notification_type": NotificationType.PASSWORD_RESET,
            "title_template": "notifications.templates.password_reset.title",
            "message_template": "notifications.templates.password_reset.message",
            "whatsapp_template": "notifications.templates.password_reset.whatsapp",
            "default_channels": ["EMAIL", "IN_APP"],
            "priority": NotificationPriority.HIGH,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "schedule_published_default",
            "notification_type": NotificationType.SCHEDULE_PUBLISHED,
            "title_template": "notifications.templates.schedule_published.title",
            "message_template": "notifications.templates.schedule_published.message",
            "whatsapp_template": "notifications.templates.schedule_published.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.MEDIUM,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "swap_request_default",
            "notification_type": NotificationType.SWAP_REQUEST,
            "title_template": "notifications.templates.swap_request.title",
            "message_template": "notifications.templates.swap_request.message",
            "whatsapp_template": "notifications.templates.swap_request.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.MEDIUM,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "swap_approved_default",
            "notification_type": NotificationType.SWAP_APPROVED,
            "title_template": "notifications.templates.swap_approved.title",
            "message_template": "notifications.templates.swap_approved.message",
            "whatsapp_template": "notifications.templates.swap_approved.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.MEDIUM,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "swap_denied_default",
            "notification_type": NotificationType.SWAP_DENIED,
            "title_template": "notifications.templates.swap_denied.title",
            "message_template": "notifications.templates.swap_denied.message",
            "whatsapp_template": "notifications.templates.swap_denied.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.MEDIUM,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "swap_assignment_default",
            "notification_type": NotificationType.SWAP_ASSIGNMENT,
            "title_template": "notifications.templates.swap_assignment.title",
            "message_template": "notifications.templates.swap_assignment.message",
            "whatsapp_template": "notifications.templates.swap_assignment.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "emergency_coverage_default",
            "notification_type": NotificationType.EMERGENCY_COVERAGE,
            "title_template": "notifications.templates.emergency_coverage.title",
            "message_template": "notifications.templates.emergency_coverage.message",
            "whatsapp_template": "notifications.templates.emergency_coverage.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.URGENT,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "schedule_change_default",
            "notification_type": NotificationType.SCHEDULE_CHANGE,
            "title_template": "notifications.templates.schedule_change.title",
            "message_template": "notifications.templates.schedule_change.message",
            "whatsapp_template": "notifications.templates.schedule_change.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.MEDIUM,
            "enabled": True,
            "tenant_id": None
        },
        {
            "template_name": "shift_reminder_default",
            "notification_type": NotificationType.SHIFT_REMINDER,
            "title_template": "notifications.templates.shift_reminder.title",
            "message_template": "notifications.templates.shift_reminder.message",
            "whatsapp_template": "notifications.templates.shift_reminder.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.LOW,
            "enabled": True,
            "tenant_id": None
        }
    ]

    with Session(engine) as session:
        print("🌱 Seeding notification templates with i18n keys...")
        
        created_count = 0
        updated_count = 0
        
        for template_data in templates:
            # Check if template already exists
            existing_template = session.exec(
                select(NotificationTemplate).where(
                    NotificationTemplate.notification_type == template_data["notification_type"],
                    NotificationTemplate.tenant_id.is_(None)  # Global templates only # type: ignore
                )
            ).first()
            
            if existing_template:
                print(f"  ♻️  Updating existing template: {template_data['template_name']}")
                
                # Update existing template with new i18n keys
                for key, value in template_data.items():
                    if key != "notification_type" and hasattr(existing_template, key):
                        setattr(existing_template, key, value)
                
                session.add(existing_template)
                updated_count += 1
            else:
                print(f"  ➕ Creating new template: {template_data['template_name']}")
                
                # Create new template
                new_template = NotificationTemplate(**template_data)
                session.add(new_template)
                created_count += 1
        
        # Commit all changes
        session.commit()
        
        print(f"✅ Seeding completed!")
        print(f"   📄 Created: {created_count} templates")
        print(f"   🔄 Updated: {updated_count} templates")
        print(f"   🌐 All templates now use i18n keys for multi-language support")

def verify_templates():
    """Verify that templates were created correctly"""
    
    with Session(engine) as session:
        templates = session.exec(select(NotificationTemplate)).all()
        
        print(f"\n📋 Found {len(templates)} notification templates:")
        
        for template in templates:
            print(f"  • {template.template_name}")
            print(f"    Type: {template.notification_type}")
            print(f"    Title Key: {template.title_template}")
            print(f"    Channels: {', '.join(template.default_channels)}")
            print(f"    Priority: {template.priority}")
            print(f"    Enabled: {template.enabled}")
            print()

def test_i18n_resolution():
    """Test that i18n keys can be resolved properly"""
    
    from app.services.i18n_service import i18n_service
    
    print("🧪 Testing i18n key resolution...")
    
    # Test English
    en_title = i18n_service.resolve_template_key(
        "notifications.templates.password_reset.title", "en"
    )
    print(f"  🇺🇸 EN: {en_title}")
    
    # Test Italian
    it_title = i18n_service.resolve_template_key(
        "notifications.templates.password_reset.title", "it"
    )
    print(f"  🇮🇹 IT: {it_title}")
    
    # Test template variable substitution
    sample_data = {
        "user_name": "Mario Rossi",
        "reset_url": "https://example.com/reset/abc123",
        "expires_in": "24 hours"
    }
    
    # Simple template rendering test
    import string
    en_rendered = string.Template(en_title).safe_substitute(sample_data)
    it_rendered = string.Template(it_title).safe_substitute(sample_data)
    
    print(f"  🔧 EN Rendered: {en_rendered}")
    print(f"  🔧 IT Rendered: {it_rendered}")
    print("✅ i18n resolution test completed!")

if __name__ == "__main__":
    print("🚀 Starting notification template seeding...")
    
    # Seed templates
    seed_notification_templates()
    
    # Verify creation
    verify_templates()
    
    # Test i18n
    test_i18n_resolution()
    
    print("\n🎉 All done! Your notification templates are ready with i18n support!")
    print("\n📝 Next steps:")
    print("1. Update your notification service with the enhanced version")
    print("2. Test sending notifications to users with different language preferences")
    print("3. Verify that notifications are displayed in the correct language")