# seed notification templates
from sqlmodel import Session, select
from app.models import NotificationTemplate, NotificationType, NotificationPriority
from app.deps import engine

def seed_notification_templates():
    """Create default notification templates"""
    
    templates = [
        {
            "template_name": "schedule_published",
            "notification_type": NotificationType.SCHEDULE_PUBLISHED,
            "title_template": "New Schedule Published",
            "message_template": "Hi $staff_name! Your schedule for the week of $week_start is now available.",
            "whatsapp_template": "*Schedule Alert*\n\nHi $staff_name! Your schedule for the week of $week_start is ready.\n\n📍 $facility_name\n\nView schedule: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "swap_request",
            "notification_type": NotificationType.SWAP_REQUEST,
            "title_template": "🔄 Shift Swap Request",
            "message_template": "$requester_name wants to swap their $original_day $original_shift shift with you.",
            "whatsapp_template": "*Swap Request*\n\n$requester_name would like to swap shifts with you:\n\n📅 $original_day\n⏰ $original_shift\n📝 Reason: $reason\n\nRespond here: $action_url",
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
            "template_name": "swap_assignment",
            "notification_type": NotificationType.SWAP_ASSIGNMENT,
            "title_template": "🎯 Shift Assignment",
            "message_template": "You've been assigned to cover $requester_name's $original_day $original_shift shift at $facility_name. Reason: $reason",
            "whatsapp_template": "🎯 *Shift Assignment*\n\nHi $assigned_staff_name!\n\nYou've been assigned to cover a shift:\n\n👤 Originally: $requester_name\n📅 $original_day\n⏰ $original_shift\n📍 $facility_name\n📝 Reason: $reason\n\nPlease accept or decline: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.HIGH
        },
        {
            "template_name": "emergency_coverage",
            "notification_type": NotificationType.EMERGENCY_COVERAGE,
            "title_template": "🚨 Urgent Coverage Needed",
            "message_template": "$requester_name at $facility_name needs urgent coverage for $original_day $original_shift. Reason: $reason",
            "whatsapp_template": "🚨 *URGENT: Coverage Needed*\n\n📍 $facility_name\n👤 $requester_name\n📅 $original_day\n⏰ $original_shift\n📝 Reason: $reason\n\nReview request: $action_url",
            "default_channels": ["IN_APP", "PUSH", "WHATSAPP"],
            "priority": NotificationPriority.URGENT
        }
    ]
    
    with Session(engine) as session:
        for template_data in templates:
            existing = session.exec(
                select(NotificationTemplate).where(
                    NotificationTemplate.template_name == template_data["template_name"]
                )
            ).first()
            
            if not existing:
                template = NotificationTemplate(**template_data)
                session.add(template)
                print(f"✅ Created template: {template_data['template_name']}")
            else:
                print(f"ℹ️ Template already exists: {template_data['template_name']}")
        
        session.commit()
        print("🎉 Notification templates seeded successfully!")

if __name__ == "__main__":
    seed_notification_templates()