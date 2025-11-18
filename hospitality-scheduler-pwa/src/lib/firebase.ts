// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging, type MessagePayload } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase config keys:', missingKeys);
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
}

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// VAPID key for web push
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

if (!VAPID_KEY) {
  console.error('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY environment variable');
}

// Messaging instance - only initialize on client side
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  // Check if messaging is supported before initializing
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      console.log('Firebase Messaging initialized successfully');
    } else {
      console.warn('Firebase Messaging is not supported in this browser');
    }
  }).catch((error) => {
    console.error('Error checking Firebase Messaging support:', error);
  });
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    console.log('Requesting notification permission...');

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Check if messaging is available
    if (!messaging) {
      console.warn('Firebase messaging is not available');
      return null;
    }

    // Check if service worker is registered
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker is not supported');
      return null;
    }

    // Request permission
    console.log('Current permission:', Notification.permission);
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('Notification permission granted, getting token...');
      
      try {
        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });
        
        if (token) {
          console.log('FCM Token received:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.warn('No FCM token available - may need to register service worker first');
          return null;
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        return null;
      }
    } else {
      console.warn('Notification permission denied or dismissed:', permission);
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

/**
 * Set up foreground message listener
 */
export function setupForegroundMessageListener(
  onMessageReceived: (payload: MessagePayload) => void
) {
  if (!messaging) {
    console.warn('Cannot set up message listener - messaging not available');
    return () => {};
  }

  console.log('Setting up foreground message listener...');

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    onMessageReceived(payload);
  });

  return unsubscribe;
}

/**
 * Get current FCM token (if permission already granted)
 */
export async function getCurrentToken(): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }
  
  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });
    
    if (token) {
      console.log('Current FCM token retrieved');
      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting current FCM token:', error);
    return null;
  }
}

/**
 * Check if push notifications are supported
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const supported = await isSupported();
    const hasNotification = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    console.log('Push notification support check:', {
      firebaseSupported: supported,
      hasNotification,
      hasServiceWorker,
      overall: supported && hasNotification && hasServiceWorker
    });
    
    return supported && hasNotification && hasServiceWorker;
  } catch (error) {
    console.error('Error checking push notification support:', error);
    return false;
  }
}

export { app, messaging };