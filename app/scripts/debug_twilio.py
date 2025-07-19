# app/scripts/debug_twilio.py

from app.core.config import get_settings
import httpx
import asyncio

async def debug_twilio_config():
    """Debug Twilio WhatsApp configuration"""
    
    settings = get_settings()
    
    print("🔍 Debugging Twilio Configuration...")
    print(f"📞 TWILIO_ACCOUNT_SID: {settings.TWILIO_ACCOUNT_SID[:10]}..." if settings.TWILIO_ACCOUNT_SID else "❌ Missing")
    print(f"🔑 TWILIO_AUTH_TOKEN: {'Set' if settings.TWILIO_AUTH_TOKEN else '❌ Missing'}")
    print(f"📱 TWILIO_WHATSAPP_NUMBER: {settings.TWILIO_WHATSAPP_NUMBER}")
    
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_NUMBER]):
        print("❌ Missing Twilio configuration!")
        return
    
    print("\n🧪 Testing Twilio API connection...")
    
    try:
        # Test basic Twilio API connection
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}.json",
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN) #type:ignore
            )
            
            if response.status_code == 200:
                account_info = response.json()
                print(f"✅ Twilio API connection successful")
                print(f"📋 Account Name: {account_info.get('friendly_name', 'N/A')}")
                print(f"📋 Account Status: {account_info.get('status', 'N/A')}")
            else:
                print(f"❌ Twilio API error {response.status_code}: {response.text}")
                return
        
        print("\n📱 Testing WhatsApp channel...")
        
        # Test a simple WhatsApp message to a valid number
        test_payload = {
            "From": f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            "To": "whatsapp:+393893161664",  # Your number
            "Body": "🧪 Test message from notification system"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN), # type: ignore
                data=test_payload
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ WhatsApp test message sent successfully!")
                print(f"📋 Message SID: {result.get('sid')}")
                print(f"📋 Status: {result.get('status')}")
                print(f"📱 Check your WhatsApp for the test message!")
            else:
                print(f"❌ WhatsApp test failed {response.status_code}:")
                error_response = response.json()
                print(f"   Code: {error_response.get('code')}")
                print(f"   Message: {error_response.get('message')}")
                print(f"   More info: {error_response.get('more_info', 'N/A')}")
                
                # Specific help for common errors
                if error_response.get('code') == 63007:
                    print("\n💡 ERROR 63007 SOLUTION:")
                    print("   1. Check your Twilio Console → Messaging → WhatsApp sandbox")
                    print("   2. Copy the exact sandbox number (e.g., +14155238886)")
                    print("   3. Update TWILIO_WHATSAPP_NUMBER in your .env file")
                    print("   4. Make sure you've joined the sandbox with your phone number")
                elif error_response.get('code') == 63016:
                    print("\n💡 ERROR 63016 SOLUTION:")
                    print("   1. Send 'join [code]' to the Twilio sandbox number from your phone")
                    print("   2. Example: 'join happy-elephant'")
                    print("   3. Wait for confirmation, then try again")
    
    except Exception as e:
        print(f"❌ Debug failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug_twilio_config())