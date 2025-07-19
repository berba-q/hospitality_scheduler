# app/scripts/setup_notifications.py

from sqlmodel import Session, select
from app.deps import engine
from app.scripts.seed_notification_templates import seed_notification_templates

def setup_notifications():
    """Complete notification system setup"""
    
    print("🚀 Setting up notification system...")
    
    # 1. Seed notification templates
    print("\n📝 Creating notification templates...")
    seed_notification_templates()
    
    # 2. Create default preferences for existing users
    print("\n👥 Setting up default preferences for existing users...")
    setup_default_preferences()
    
    print("\n✅ Notification system setup complete!")
    print("\n📋 Configuration checklist:")
    print("□ Firebase service account JSON file in place")
    print("□ FIREBASE_SERVICE_ACCOUNT_PATH set in .env")
    print("□ Twilio credentials configured in .env")
    print("□ Test notifications with /api/v1/notifications/test")
    print("\n🚀 Ready to integrate into your endpoints!")

def setup_default_preferences():
    """Create default notification preferences for existing users"""
    from app.models import User, NotificationPreference, NotificationType
    
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        preferences_created = 0
        
        for user in users:
            for notification_type in NotificationType:
                existing = session.exec(
                    select(NotificationPreference).where(
                        NotificationPreference.user_id == user.id,
                        NotificationPreference.notification_type == notification_type
                    )
                ).first()
                
                if not existing:
                    preference = NotificationPreference(
                        user_id=user.id,
                        notification_type=notification_type,
                        in_app_enabled=True,
                        push_enabled=True,
                        whatsapp_enabled=False,  # Opt-in only
                        email_enabled=False
                    )
                    session.add(preference)
                    preferences_created += 1
        
        session.commit()
        print(f"✅ Created {preferences_created} default preferences for {len(users)} users")

if __name__ == "__main__":
    setup_notifications()