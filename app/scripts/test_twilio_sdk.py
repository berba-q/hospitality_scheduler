# app/scripts/test_twilio_sdk.py

from app.core.config import get_settings
import asyncio

async def test_twilio_sdk():
    """Test WhatsApp using official Twilio SDK"""
    
    settings = get_settings()
    
    print("🧪 Testing with Official Twilio SDK...")
    print(f"📞 Account SID: {settings.TWILIO_ACCOUNT_SID[:10]}..." if settings.TWILIO_ACCOUNT_SID else "❌ Missing")
    print(f"📱 WhatsApp Number: {settings.TWILIO_WHATSAPP_NUMBER}")
    
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_NUMBER]):
        print("❌ Missing Twilio configuration!")
        return
    
    try:
        # Import Twilio SDK
        from twilio.rest import Client
        
        print("✅ Twilio SDK imported successfully")
        
        # Create Twilio client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        print("✅ Twilio client created successfully")
        
        # Test account info
        account = client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch() # type: ignore
        print(f"✅ Account verified: {account.friendly_name} ({account.status})")
        
        # Send test WhatsApp message
        print("\n📱 Sending test WhatsApp message...")
        
        message = client.messages.create(
            from_=f'whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}',
            body='🎉 Test notification from your scheduling app! The notification system is working!',
            to='whatsapp:+393893161664'
        )
        
        print(f"✅ WhatsApp message sent successfully!")
        print(f"📋 Message SID: {message.sid}")
        print(f"📋 Status: {message.status}")
        print(f"📋 Direction: {message.direction}")
        print(f"📱 Check your WhatsApp for the test message!")
        
        return True
        
    except ImportError:
        print("❌ Twilio SDK not installed. Run: pip install twilio")
        return False
    except Exception as e:
        print(f"❌ Twilio SDK test failed: {e}")
        
        # Specific error handling
        if "Unable to create record" in str(e):
            print("\n💡 SOLUTION:")
            print("1. Make sure you've joined the WhatsApp sandbox:")
            print(f"   Send 'join [code]' to {settings.TWILIO_WHATSAPP_NUMBER}")
            print("2. Check your Twilio Console for the exact join code")
            print("3. Wait for confirmation before testing again")
        elif "not a valid phone number" in str(e):
            print("\n💡 SOLUTION:")
            print("1. Check your TWILIO_WHATSAPP_NUMBER in .env")
            print("2. Make sure it matches your Twilio sandbox number exactly")
        elif "Authenticate" in str(e):
            print("\n💡 SOLUTION:")
            print("1. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN")
            print("2. Make sure they match your Twilio Console credentials")
        
        return False

if __name__ == "__main__":
    asyncio.run(test_twilio_sdk())