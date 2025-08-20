# Updated notification templates using i18n keys

from sqlmodel import Session, select
from app.models import NotificationTemplate, NotificationType, NotificationPriority
from app.deps import engine

def seed_notification_templates():
    """Create default notification templates using i18n keys"""
    
    # Now we store i18n keys instead of full text
    # The notification service will resolve these keys at runtime
    templates = [
        {
            "template_name": "email_verification",
            "notification_type": NotificationType.EMAIL_VERIFICATION,
            "locale": "en",  # This is now just for template organization, not translation
            "title_template": "notifications.templates.email_verification.title",
            "message_template": "notifications.templates.email_verification.message",
            "whatsapp_template": "notifications.templates.email_verification.whatsapp",
            "email_subject_template": "notifications.templates.email_verification.subject",
            "email_html_template": "notifications.templates.email_verification.html",
            "email_text_template": "notifications.templates.email_verification.text",
            "default_channels": ["EMAIL"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "password_reset",
            "notification_type": NotificationType.PASSWORD_RESET,
            "locale": "en",
            "title_template": "notifications.templates.password_reset.title",
            "message_template": "notifications.templates.password_reset.message",
            "whatsapp_template": "notifications.templates.password_reset.whatsapp",
            "email_subject_template": "notifications.templates.password_reset.subject",
            "email_html_template": "notifications.templates.password_reset.html",
            "email_text_template": "notifications.templates.password_reset.text",
            "default_channels": ["EMAIL"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "staff_invitation",
            "notification_type": NotificationType.STAFF_INVITATION,
            "locale": "en",
            "title_template": "notifications.templates.staff_invitation.title",
            "message_template": "notifications.templates.staff_invitation.message",
            "whatsapp_template": "notifications.templates.staff_invitation.whatsapp",
            "email_subject_template": "notifications.templates.staff_invitation.subject",
            "email_html_template": "notifications.templates.staff_invitation.html",
            "email_text_template": "notifications.templates.staff_invitation.text",
            "default_channels": ["EMAIL"],
            "priority": NotificationPriority.MEDIUM
        },
        {
            "template_name": "schedule_published",
            "notification_type": NotificationType.SCHEDULE_PUBLISHED,
            "locale": "en",
            "title_template": "notifications.templates.schedule_published.title",
            "message_template": "notifications.templates.schedule_published.message",
            "whatsapp_template": "notifications.templates.schedule_published.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "swap_request",
            "notification_type": NotificationType.SWAP_REQUEST,
            "locale": "en",
            "title_template": "notifications.templates.swap_request.title",
            "message_template": "notifications.templates.swap_request.message",
            "whatsapp_template": "notifications.templates.swap_request.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "swap_approved",
            "notification_type": NotificationType.SWAP_APPROVED,
            "locale": "en",
            "title_template": "notifications.templates.swap_approved.title",
            "message_template": "notifications.templates.swap_approved.message",
            "whatsapp_template": "notifications.templates.swap_approved.whatsapp",
            "default_channels": ["IN_APP", "PUSH"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "swap_assignment",
            "notification_type": NotificationType.SWAP_ASSIGNMENT,
            "locale": "en",
            "title_template": "notifications.templates.swap_assignment.title",
            "message_template": "notifications.templates.swap_assignment.message",
            "whatsapp_template": "notifications.templates.swap_assignment.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "emergency_coverage",
            "notification_type": NotificationType.EMERGENCY_COVERAGE,
            "locale": "en",
            "title_template": "notifications.templates.emergency_coverage.title",
            "message_template": "notifications.templates.emergency_coverage.message",
            "whatsapp_template": "notifications.templates.emergency_coverage.whatsapp",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.URGENT
        }
    ]
    
    with Session(engine) as session:
        for template_data in templates:
            existing = session.exec(
                select(NotificationTemplate).where(
                    NotificationTemplate.template_name == template_data["template_name"],
                    NotificationTemplate.locale == template_data["locale"]
                )
            ).first()
            
            if not existing:
                template = NotificationTemplate(**template_data)
                session.add(template)
                print(f"✅ Created template: {template_data['template_name']} (using i18n keys)")
            else:
                print(f"ℹ️ Template already exists: {template_data['template_name']}")
        
        session.commit()
        print("🎉 Notification templates seeded successfully with i18n keys!")

if __name__ == "__main__":
    seed_notification_templates()