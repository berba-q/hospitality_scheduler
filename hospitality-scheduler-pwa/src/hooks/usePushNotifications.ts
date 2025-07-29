// src/hooks/usePushNotifications.ts - Updated for SSR compatibility
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  requestNotificationPermission, 
  setupForegroundMessageListener,
  getCurrentToken,
  isPushNotificationSupported
} from '@/lib/firebase';
import { useApiClient } from '@/hooks/useApi';

export interface PushNotificationState {
  permission: NotificationPermission | null;
  token: string | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    permission: null,
    token: null,
    isSupported: false,
    isLoading: true,
    error: null
  });

  const apiClient = useApiClient();

  // Check browser support and initial permission state (client-side only)
  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') return;

    const checkSupport = async () => {
      try {
        const isSupported = await isPushNotificationSupported();
        const permission = isSupported ? Notification.permission : null;
        
        setState(prev => ({
          ...prev,
          isSupported,
          permission,
          isLoading: false
        }));

        console.log('Push notification support check:', { isSupported, permission });
      } catch (error) {
        console.error('Error checking push notification support:', error);
        setState(prev => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: 'Failed to check browser support'
        }));
      }
    };

    checkSupport();
  }, []);

  // Get existing token if permission is already granted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (state.isSupported && state.permission === 'granted' && !state.token) {
      getCurrentToken().then(token => {
        if (token) {
          setState(prev => ({ ...prev, token }));
          console.log('Retrieved existing FCM token');
        }
      }).catch(error => {
        console.error('Error getting existing token:', error);
      });
    }
  }, [state.isSupported, state.permission, state.token]);

  // Set up foreground message listener (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined' || !state.isSupported) return;

    console.log('Setting up foreground message listener...');
    
    const unsubscribe = setupForegroundMessageListener((payload) => {
      console.log('Foreground notification received:', payload);
      
      // Show toast notification for foreground messages
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || 'You have a new notification';
      
      toast(title, {
        description: body,
        action: payload.data?.action_url ? {
          label: 'View',
          onClick: () => {
            window.open(payload.data.action_url, '_self');
          }
        } : undefined,
        duration: 5000,
      });
    });

    return unsubscribe;
  }, [state.isSupported]);

  // Request permission and get token
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      console.warn('Cannot request permission on server side');
      return false;
    }

    if (!state.isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('Requesting notification permission...');
      const token = await requestNotificationPermission();
      
      if (token) {
        setState(prev => ({ 
          ...prev, 
          permission: 'granted',
          token,
          isLoading: false 
        }));

        // Send token to backend
        if (apiClient) {
          try {
            console.log('Saving FCM token to backend...');
            await apiClient.updatePushToken({ push_token: token });
            toast.success('🔔 Push notifications enabled!');
            console.log('FCM token saved to backend successfully');
          } catch (error) {
            console.error('Failed to save push token to backend:', error);
            toast.error('Push notifications enabled, but failed to save settings');
          }
        } else {
          console.warn('API client not available, token not saved to backend');
          toast.success('🔔 Push notifications enabled! (Token not saved - please refresh)');
        }

        return true;
      } else {
        const newPermission = Notification.permission;
        setState(prev => ({ 
          ...prev, 
          permission: newPermission,
          isLoading: false 
        }));
        
        if (newPermission === 'denied') {
          toast.error('Please enable notifications in your browser settings');
          setState(prev => ({ ...prev, error: 'Notifications blocked by user' }));
        } else {
          toast.error('Failed to get notification permission');
          setState(prev => ({ ...prev, error: 'Failed to get permission' }));
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request permission',
        isLoading: false 
      }));
      toast.error('Failed to enable push notifications');
      return false;
    }
  }, [state.isSupported, apiClient]);

  // Refresh token (useful for debugging or when token expires)
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    if (!state.isSupported || state.permission !== 'granted') {
      console.warn('Cannot refresh token - permission not granted');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('Refreshing FCM token...');
      const token = await getCurrentToken();
      
      setState(prev => ({ ...prev, token, isLoading: false }));
      
      if (token && apiClient) {
        await apiClient.updatePushToken({ push_token: token });
        toast.success('Push notification settings refreshed');
        console.log('Refreshed FCM token saved to backend');
      }
      
      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error('Failed to refresh push notification settings');
      return null;
    }
  }, [state.isSupported, state.permission, apiClient]);

  // Test notification (for debugging)
  const sendTestNotification = useCallback(async () => {
    if (!apiClient) {
      toast.error('API client not available');
      return;
    }

    try {
      console.log('Sending test notification...');
      await apiClient.sendTestNotification();
      toast.success('Test notification sent! Check if you received it.');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
      throw error; // Re-throw for the test component to catch
    }
  }, [apiClient]);

  return {
    // State
    ...state,
    
    // Computed properties (safe for SSR)
    hasPermission: state.permission === 'granted',
    needsPermission: state.isSupported && state.permission !== 'granted',
    isBlocked: state.permission === 'denied',
    
    // Actions
    requestPermission,
    refreshToken,
    sendTestNotification,
  };
}