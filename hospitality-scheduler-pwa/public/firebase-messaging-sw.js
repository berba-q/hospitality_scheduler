// public/firebase-messaging-sw.js

// This is the Firebase Messaging Service Worker for handling background notifications

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase with your project's configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLlRgv5YxWcBOyWwIdLxixn3qjMSxD_D4",
  authDomain: "hospitality-scheduler-99d35.firebaseapp.com",
  projectId: "hospitality-scheduler-99d35",
  storageBucket: "hospitality-scheduler-99d35.firebasestorage.app",
  messagingSenderId: "846581835290",
  appId: "1:846581835290:web:c8ca16735e0ae96efed3a3"
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

console.log('Firebase Messaging Service Worker initialized');

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  // Extract notification data
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new notification';
  
  // Create notification options
  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192x192.png', // Make sure this icon exists in your public folder
    badge: '/badge-72x72.png', // Badge icon for Android
    tag: payload.data?.notification_type || 'general', // Group similar notifications
    data: {
      url: payload.data?.action_url || '/',
      notification_id: payload.data?.notification_id,
      notification_type: payload.data?.notification_type,
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true, // Keep notification visible until user interacts
    silent: false, // Allow sound
    timestamp: Date.now(),
    vibrate: [200, 100, 200] // Vibration pattern for mobile
  };

  // Add quick action buttons for swap requests
  if (payload.data?.notification_type === 'SWAP_REQUEST_RECEIVED') {
    notificationOptions.actions = [
      {
        action: 'approve',
        title: '✅ Approve',
        icon: '/icon-96x96.png'
      },
      {
        action: 'decline', 
        title: '❌ Decline',
        icon: '/icon-96x96.png'
      },
      {
        action: 'open',
        title: 'View Details'
      }
    ];
  }

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // Handle different actions
  if (action === 'dismiss') {
    console.log('Notification dismissed');
    return;
  }
  
  // Handle quick actions for swap requests
  if (action === 'approve' && data.notification_id) {
    console.log('Quick approve action triggered');

    // Get API URL from data or use default
    const apiUrl = data.api_url || self.location.origin.replace(':3000', ':8000');

    event.waitUntil(
      // Make API call to approve the swap request
      fetch(`${apiUrl}/api/v1/swaps/${data.swap_id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: You'll need to handle authentication in a real implementation
          // For now, this will work if your API allows unauthenticated quick actions
        }
      }).then(response => {
        if (response.ok) {
          // Show success notification
          self.registration.showNotification('✅ Swap Approved', {
            body: 'Your swap request has been approved!',
            icon: '/icon-192x192.png',
            tag: 'swap-approved',
            requireInteraction: false,
            silent: true
          });
        }
      }).catch(error => {
        console.error('Error approving swap:', error);
      })
    );
    return;
  }
  
  if (action === 'decline' && data.notification_id) {
    console.log('Quick decline action triggered');

    // Get API URL from data or use default
    const apiUrl = data.api_url || self.location.origin.replace(':3000', ':8000');

    event.waitUntil(
      fetch(`${apiUrl}/api/v1/swaps/${data.swap_id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }).then(response => {
        if (response.ok) {
          self.registration.showNotification('Swap Declined', {
            body: 'You declined the swap request',
            icon: '/icon-192x192.png',
            tag: 'swap-declined',
            requireInteraction: false,
            silent: true
          });
        }
      }).catch(error => {
        console.error('Error declining swap:', error);
      })
    );
    return;
  }
  
  // Default action: open the app
  const urlToOpen = data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open in a tab
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing tab and navigate to the URL
            return client.focus().then(() => {
              return client.navigate(urlToOpen);
            });
          }
        }
        
        // Open new window if app is not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('Error handling notification click:', error);
      })
  );
});

// Handle notification close (when user dismisses without clicking)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
  
  // Optional: Track dismissal analytics
  // You could send this data to your analytics service
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Firebase Messaging Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Firebase Messaging Service Worker activated');
  event.waitUntil(self.clients.claim()); // Take control of all clients immediately
});

// Handle push events (additional safety net)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push payload:', payload);
      
      // This is handled by Firebase messaging, but we can add custom logic here if needed
    } catch (error) {
      console.error('Error parsing push payload:', error);
    }
  }
});