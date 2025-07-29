'use client';

import { useEffect } from 'react';
import { isPushNotificationSupported } from '@/lib/firebase';

export function FirebaseInitializer() {
  useEffect(() => {
    // Initialize Firebase in the background
    const initializeFirebase = async () => {
      try {
        const isSupported = await isPushNotificationSupported();
        console.log('Firebase initialized:', { isSupported });
        
        // Register service worker if supported
        if (isSupported && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('🔧 Service Worker registered:', registration);
            
            // Optional: Listen for service worker updates
            registration.addEventListener('updatefound', () => {
              console.log('Service Worker update found');
            });
            
          } catch (error) {
            console.error('Service Worker registration failed:', error);
          }
        }
      } catch (error) {
        console.error('Firebase initialization failed:', error);
      }
    };

    // Only initialize on client side
    if (typeof window !== 'undefined') {
      initializeFirebase();
    }
  }, []);

  // This component renders nothing - it's just for initialization
  return null;
}