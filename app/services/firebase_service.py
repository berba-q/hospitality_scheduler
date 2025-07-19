# app/services/firebase_service.py

import firebase_admin
from firebase_admin import credentials, messaging
from typing import Optional
import os
from ..core.config import get_settings

settings = get_settings()

class FirebaseService:
    """Handle Firebase Admin SDK operations"""
    
    def __init__(self):
        self._app = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if firebase_admin._apps:
                self._app = firebase_admin.get_app()
                print("Firebase already initialized")
                return
            
            # Initialize Firebase with service account
            if settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
                self._app = firebase_admin.initialize_app(cred)
                print(f"Firebase initialized with service account from {settings.FIREBASE_SERVICE_ACCOUNT_PATH}")
            else:
                print(f"Firebase service account file not found: {settings.FIREBASE_SERVICE_ACCOUNT_PATH}")
                self._app = None
                
        except Exception as e:
            print(f"Firebase initialization error: {e}")
            self._app = None
    
    async def send_push_notification(
        self, 
        token: str, 
        title: str, 
        body: str, 
        data: dict = None, # type: ignore
        action_url: str = None # type: ignore
    ) -> bool:
        """Send push notification via Firebase Cloud Messaging"""
        
        if not self._app:
            print("Firebase not initialized, cannot send push notification")
            return False
        
        try:
            # Build the message
            message_data = data or {}
            
            # Convert all data values to strings (FCM requirement)
            string_data = {k: str(v) for k, v in message_data.items()}
            
            # Create FCM message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=string_data,
                token=token,
                webpush=messaging.WebpushConfig(
                    fcm_options=messaging.WebpushFCMOptions(
                        link=action_url
                    )
                ) if action_url else None
            )
            
            # Send the message
            response = messaging.send(message)
            print(f"Push notification sent successfully. Message ID: {response}")
            return True
            
        except messaging.UnregisteredError:
            print(f"FCM token is invalid or unregistered: {token}")
            return False
        except messaging.SenderIdMismatchError:
            print(f"FCM token doesn't match sender ID: {token}")
            return False
        except Exception as e:
            print(f"Push notification error: {e}")
            return False
    
    def is_available(self) -> bool:
        """Check if Firebase service is available"""
        return self._app is not None