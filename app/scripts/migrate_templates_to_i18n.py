# app/scripts/migrate_templates_to_i18n.py
"""
Migration script to update existing notification templates to use i18n keys
Run this once to convert your existing templates

NOTE: This script only uses the fields available in the NotificationTemplate model:
- title_template
- message_template  
- whatsapp_template
Email-specific templates (subject, html, text) are handled separately in the email service.
"""

from sqlmodel import Session, select
from app.models import NotificationTemplate, NotificationType, NotificationPriority
from app.deps import engine

def migrate_templates_to_i18n():
    """Update existing notification templates to use i18n keys"""
    
    # Mapping of notification types to their i18n key patterns
    template_key_mapping = {
        NotificationType.SCHEDULE_PUBLISHED: {
            "title_template": "notifications.templates.schedule_published.title",
            "message_template": "notifications.templates.schedule_published.message",
            "whatsapp_template": "notifications.templates.schedule_published.whatsapp",
        },
        NotificationType.SWAP_REQUEST: {
            "title_template": "notifications.templates.swap_request.title",
            "message_template": "notifications.templates.swap_request.message",
            "whatsapp_template": "notifications.templates.swap_request.whatsapp",
        },
        NotificationType.SWAP_APPROVED: {
            "title_template": "notifications.templates.swap_approved.title",
            "message_template": "notifications.templates.swap_approved.message",
            "whatsapp_template": "notifications.templates.swap_approved.whatsapp",
        },
        NotificationType.SWAP_DENIED: {
            "title_template": "notifications.templates.swap_denied.title",
            "message_template": "notifications.templates.swap_denied.message",
            "whatsapp_template": "notifications.templates.swap_denied.whatsapp",
        },
        NotificationType.SWAP_ASSIGNMENT: {
            "title_template": "notifications.templates.swap_assignment.title",
            "message_template": "notifications.templates.swap_assignment.message",
            "whatsapp_template": "notifications.templates.swap_assignment.whatsapp",
        },
        NotificationType.EMERGENCY_COVERAGE: {
            "title_template": "notifications.templates.emergency_coverage.title",
            "message_template": "notifications.templates.emergency_coverage.message",
            "whatsapp_template": "notifications.templates.emergency_coverage.whatsapp",
        },
        NotificationType.SCHEDULE_CHANGE: {
            "title_template": "notifications.templates.schedule_change.title",
            "message_template": "notifications.templates.schedule_change.message",
            "whatsapp_template": "notifications.templates.schedule_change.whatsapp",
        },
        NotificationType.SHIFT_REMINDER: {
            "title_template": "notifications.templates.shift_reminder.title",
            "message_template": "notifications.templates.shift_reminder.message",
            "whatsapp_template": "notifications.templates.shift_reminder.whatsapp",
        },
        NotificationType.PASSWORD_RESET: {
            "title_template": "notifications.templates.password_reset.title",
            "message_template": "notifications.templates.password_reset.message",
            "whatsapp_template": "notifications.templates.password_reset.whatsapp",
        },
        NotificationType.EMAIL_VERIFICATION: {
            "title_template": "notifications.templates.email_verification.title",
            "message_template": "notifications.templates.email_verification.message",
            "whatsapp_template": "notifications.templates.email_verification.whatsapp",
        },
        # Add more as needed...
    }

    with Session(engine) as session:
        print("🔄 Starting migration of notification templates to i18n keys...")
        
        updated_count = 0
        
        for notification_type, key_mapping in template_key_mapping.items():
            # Find existing templates for this notification type
            existing_templates = session.exec(
                select(NotificationTemplate).where(
                    NotificationTemplate.notification_type == notification_type
                )
            ).all()
            
            if existing_templates:
                print(f"  📝 Updating {len(existing_templates)} templates for {notification_type.value}")
                
                for template in existing_templates:
                    # Update template fields to use i18n keys
                    if "title_template" in key_mapping:
                        template.title_template = key_mapping["title_template"]
                    if "message_template" in key_mapping:
                        template.message_template = key_mapping["message_template"]
                    if "whatsapp_template" in key_mapping:
                        template.whatsapp_template = key_mapping["whatsapp_template"]
                    
                    session.add(template)
                    updated_count += 1
            else:
                # Create new template with i18n keys if none exists
                print(f"  ➕ Creating new template for {notification_type.value}")
                
                new_template = NotificationTemplate(
                    template_name=f"{notification_type.value.lower()}_default",
                    notification_type=notification_type,
                    title_template=key_mapping["title_template"],
                    message_template=key_mapping["message_template"],
                    whatsapp_template=key_mapping.get("whatsapp_template"),
                    default_channels=["IN_APP", "PUSH"],  # Default channels
                    priority=NotificationPriority.MEDIUM,
                    enabled=True,
                    tenant_id=None  # Global template
                )
                
                session.add(new_template)
                updated_count += 1
        
        # Commit all changes
        session.commit()
        
        print(f"✅ Migration completed! Updated/created {updated_count} templates")
        print("🌐 Templates now use i18n keys and will be automatically localized")

def create_missing_password_reset_templates():
    """Specifically create password reset templates if missing"""
    
    with Session(engine) as session:
        print("🔐 Checking for password reset templates...")
        
        existing = session.exec(
            select(NotificationTemplate).where(
                NotificationTemplate.notification_type == NotificationType.PASSWORD_RESET
            )
        ).first()
        
        if not existing:
            print("  ➕ Creating password reset template")
            
            password_reset_template = NotificationTemplate(
                template_name="password_reset_default",
                notification_type=NotificationType.PASSWORD_RESET,
                title_template="notifications.templates.password_reset.title",
                message_template="notifications.templates.password_reset.message",
                whatsapp_template="notifications.templates.password_reset.whatsapp",
                default_channels=["EMAIL", "IN_APP"],
                priority=NotificationPriority.HIGH,
                enabled=True,
                tenant_id=None  # Global template
            )
            
            session.add(password_reset_template)
            session.commit()
            
            print("✅ Password reset template created")
        else:
            print("  ✅ Password reset template already exists")

def verify_i18n_integration():
    """Test that i18n integration is working"""
    
    from app.services.i18n_service import i18n_service
    
    print("🧪 Testing i18n integration...")
    
    # Test English
    en_title = i18n_service.resolve_template_key("notifications.templates.password_reset.title", "en")
    print(f"  EN Title: {en_title}")
    
    # Test Italian
    it_title = i18n_service.resolve_template_key("notifications.templates.password_reset.title", "it")
    print(f"  IT Title: {it_title}")
    
    # Test template rendering
    from app.services.notification_service import NotificationService
    from sqlmodel import Session
    from app.deps import engine
    
    with Session(engine) as session:
        notification_service = NotificationService(session)
        
        # Test rendering with sample data
        sample_data = {
            "user_name": "Mario Rossi",
            "reset_url": "https://example.com/reset/abc123",
            "expires_in": "24 hours"
        }
        
        en_rendered = notification_service._render_template(en_title, sample_data)
        it_rendered = notification_service._render_template(it_title, sample_data)
        
        print(f"  EN Rendered: {en_rendered}")
        print(f"  IT Rendered: {it_rendered}")
    
    print("✅ i18n integration test completed")

if __name__ == "__main__":
    print("🚀 Starting notification template i18n migration...")
    
    # Run migrations
    migrate_templates_to_i18n()
    create_missing_password_reset_templates()
    verify_i18n_integration()
    
    print("\n🎉 Migration completed successfully!")
    print("\n📋 Next steps:")
    print("1. Test the notification service with different user locales")
    print("2. Verify that emails are sent in the correct language")
    print("3. Add any custom translations as needed")
    print("4. Consider adding more languages to the i18n service")