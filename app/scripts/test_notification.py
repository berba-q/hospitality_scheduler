import asyncio
import sys
sys.path.append('.')

from sqlmodel import Session, select
from app.deps import engine
from app.models import User, Notification, NotificationType, NotificationPriority
from datetime import datetime
import uuid

async def create_test_notification():
    print("🧪 Creating test notification for manager...")
    
    with Session(engine) as session:
        # Find an active manager
        manager = session.exec(
            select(User).where(
                User.is_manager == True,
                User.is_active == True
            )
        ).first()
        
        if not manager:
            print("❌ No active manager found in database")
            print("💡 Make sure you have a manager user created")
            return
        
        print(f"📍 Found manager: {manager.email} (ID: {manager.id})")
        
        # Create a simple test notification
        notification = Notification(
            recipient_user_id=manager.id,
            tenant_id=manager.tenant_id,
            notification_type=NotificationType.SCHEDULE_PUBLISHED,
            title="🧪 Test Notification - Bell Icon Check",
            message="This is a test notification to verify the bell icon is working correctly. If you can see this, notifications are working!",
            priority=NotificationPriority.HIGH,
            channels=["IN_APP"],  # Only in-app for now
            data={"test": True, "created_by": "test_script"},
            is_delivered=True,  # Mark as delivered so it shows up
            delivered_at=datetime.utcnow(),
            action_url="/dashboard",
            action_text="Go to Dashboard"
        )
        
        session.add(notification)
        session.commit()
        session.refresh(notification)
        
        print(f"✅ Created notification {notification.id}")
        print(f"   Title: {notification.title}")
        print(f"   Delivered: {notification.is_delivered}")
        
        # Check total unread notifications for this manager
        unread_count = session.exec(
            select(Notification).where(
                Notification.recipient_user_id == manager.id,
                Notification.is_read == False
            )
        ).all()
        
        print(f"📊 Manager now has {len(unread_count)} unread notifications")
        
        # Show recent notifications
        print("\n📋 Recent notifications for this manager:")
        for notif in unread_count[-5:]:  # Show last 5
            print(f"   - {notif.title} ({notif.created_at.strftime('%H:%M:%S')})")
        
        print(f"\n🎯 Now check the bell icon in the web app for {manager.email}")
        print("   The bell should show a red badge with the notification count")

if __name__ == "__main__":
    asyncio.run(create_test_notification())