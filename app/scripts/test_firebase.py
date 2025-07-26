import asyncio
from firebase_admin import messaging

async def test_firebase_classes():
    """Test that the Firebase classes and parameters are correct"""
    
    print("🧪 Testing Firebase Admin SDK classes and parameters...")
    
    # Test 1: WebpushFCMOptions - should only accept 'link' parameter
    try:
        webpush_options = messaging.WebpushFCMOptions(link="https://example.com")
        print("✅ WebpushFCMOptions with 'link' parameter: SUCCESS")
    except Exception as e:
        print(f"❌ WebpushFCMOptions test failed: {e}")
    
    # Test 2: AndroidFCMOptions - correct class name and analytics_label parameter
    try:
        android_options = messaging.AndroidFCMOptions(analytics_label="test_label")
        print("✅ AndroidFCMOptions with 'analytics_label' parameter: SUCCESS")
    except Exception as e:
        print(f"❌ AndroidFCMOptions test failed: {e}")
    
    # Test 3: Check that send_each_for_multicast exists
    try:
        # Just check if the function exists
        func = getattr(messaging, 'send_each_for_multicast')
        print("✅ send_each_for_multicast function exists: SUCCESS")
    except AttributeError:
        print("❌ send_each_for_multicast function not found")
    
    # Test 4: Build a complete message to validate structure
    try:
        message = messaging.Message(
            notification=messaging.Notification(title="Test", body="Test body"),
            data={"key": "value"},
            token="test_token",
            fcm_options=messaging.FCMOptions(analytics_label="test"),
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(
                    link="https://example.com"
                )
            ),
            android=messaging.AndroidConfig(
                priority="high",
                fcm_options=messaging.AndroidFCMOptions(analytics_label="test_android"),
            ),
            apns=messaging.APNSConfig(
                fcm_options=messaging.APNSFCMOptions(analytics_label="test_apns")
            ),
        )
        print("✅ Complete message structure: SUCCESS")
    except Exception as e:
        print(f"❌ Message structure test failed: {e}")
    
    # Test 5: Build a multicast message
    try:
        multicast_message = messaging.MulticastMessage(
            notification=messaging.Notification(title="Test", body="Test body"),
            data={"key": "value"},
            tokens=["token1", "token2"],
            fcm_options=messaging.FCMOptions(analytics_label="test"),
            webpush=messaging.WebpushConfig(
                fcm_options=messaging.WebpushFCMOptions(
                    link="https://example.com"
                )
            ),
            android=messaging.AndroidConfig(
                priority="high",
                fcm_options=messaging.AndroidFCMOptions(analytics_label="test_android"),
            ),
            apns=messaging.APNSConfig(
                fcm_options=messaging.APNSFCMOptions(analytics_label="test_apns")
            ),
        )
        print("✅ Complete multicast message structure: SUCCESS")
    except Exception as e:
        print(f"❌ Multicast message structure test failed: {e}")
    
    print("\n🎯 All class and parameter tests completed!")

if __name__ == "__main__":
    print("🚀 Firebase Service Fixes Validation")
    print("=" * 40)
    asyncio.run(test_firebase_classes())