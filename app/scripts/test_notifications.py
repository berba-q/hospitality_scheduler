# app/scripts/test_notifications.py

import asyncio
from sqlmodel import Session, select
from app.deps import engine
from app.models import User, NotificationType
from app.services.notification_service import NotificationService

async def test_notification_system():
    """Test the complete notification system"""
    
    with Session(engine) as session:
        # Get an active user
        user = session.exec(
            select(User).where(User.is_active == True)
        ).first()
        
        if not user:
            print("❌ No active users found. Create a user first.")
            return
        
        print(f"🧪 Testing notifications for user: {user.email}")
        
        notification_service = NotificationService(session)
        
        try:
            # Test basic notification
            notification = await notification_service.send_notification(
                notification_type=NotificationType.SCHEDULE_PUBLISHED,
                recipient_user_id=user.id,
                template_data={
                    "staff_name": user.email.split('@')[0],
                    "week_start": "January 20, 2025",
                    "facility_name": "Test Facility"
                },
                channels=["IN_APP", "PUSH"],  # Start with these, add WHATSAPP when ready
                action_url="/test-schedule",
                action_text="View Test Schedule"
            )
            
            print(f"✅ Test notification created: {notification.id}")
            print(f"📧 Title: {notification.title}")
            print(f"💬 Message: {notification.message}")
            print(f"🚀 Channels: {notification.channels}")
            
            # Wait for delivery
            await asyncio.sleep(3)
            
            # Refresh from database to see delivery status
            session.refresh(notification)
            print(f"📊 Delivery Status: {notification.delivery_status}")
            print(f"✅ Delivered: {notification.is_delivered}")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_notification_system())