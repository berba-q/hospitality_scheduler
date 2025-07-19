# app/scripts/test_whatsapp_notification.py

import asyncio
from sqlmodel import Session, select
from app.deps import engine
from app.models import User, NotificationType
from app.services.notification_service import NotificationService

async def test_whatsapp_notification():
    """Test WhatsApp notification specifically"""
    
    with Session(engine) as session:
        # Get admin user
        user = session.exec(
            select(User).where(User.email == "admin@hospitality.com")
        ).first()
        
        if not user:
            print("❌ No admin user found")
            return
        
        print(f"🧪 Testing WhatsApp notification for: {user.email}")
        print(f"📱 Current WhatsApp number: {user.whatsapp_number}")
        
        # Add a test WhatsApp number if none exists
        if not user.whatsapp_number:
            # Use your actual WhatsApp number for testing, or a test number
            test_number = "+393893161664"  # Replace with your WhatsApp number
            user.whatsapp_number = test_number
            session.commit()
            print(f"📱 Added test WhatsApp number: {test_number}")
            #print("⚠️  Replace +1234567890 with your actual WhatsApp number to receive the test message")
        
        notification_service = NotificationService(session)
        
        try:
            # Test WhatsApp-enabled notification
            notification = await notification_service.send_notification(
                notification_type=NotificationType.EMERGENCY_COVERAGE,
                recipient_user_id=user.id,
                template_data={
                    "staff_name": "Test User",
                    "requester_name": "John Doe", 
                    "facility_name": "Test Hotel",
                    "original_day": "Monday",
                    "original_shift": "Morning",
                    "reason": "Family emergency",
                    "urgency": "URGENT"
                },
                channels=["IN_APP", "WHATSAPP"],  # Focus on WhatsApp
                action_url="/test-emergency",
                action_text="Review Request"
            )
            
            print(f"✅ Test notification created: {notification.id}")
            print(f"📧 Title: {notification.title}")
            print(f"💬 Message: {notification.message}")
            print(f"🚀 Channels: {notification.channels}")
            
            # Wait for delivery
            await asyncio.sleep(5)
            
            # Check delivery status
            session.refresh(notification)
            print(f"📊 Delivery Status: {notification.delivery_status}")
            
            if notification.delivery_status.get('WHATSAPP', {}).get('status') == 'delivered':
                print("🎉 WhatsApp message sent successfully!")
                print("📱 Check your WhatsApp for the test message")
            else:
                print("⚠️  WhatsApp delivery failed - check your Twilio configuration")
                whatsapp_status = notification.delivery_status.get('WHATSAPP', {})
                if 'error' in whatsapp_status:
                    print(f"❌ Error: {whatsapp_status['error']}")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_whatsapp_notification())