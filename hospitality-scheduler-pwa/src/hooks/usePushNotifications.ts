// src/hooks/usePushNotifications.ts - Updated for SSR compatibility
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  requestNotificationPermission, 
  getCurrentToken,
  isPushNotificationSupported
} from '@/lib/firebase';
import { useApiClient } from '@/hooks/useApi';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  token: string | null;
  isLoading: boolean;
  error: string | null;
  deviceId: string | null;
  deviceStats: {
    total_devices: number;
    devices_with_valid_tokens: number;
    devices_needing_reauth: number;
  } | null;
}
export interface DeviceInfo {
  device_name: string;
  device_type: string;
  platform: string;
  user_agent: string;
}

// Helper functions for device detection
const getBrowserName = (): string => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome Browser';
  if (userAgent.includes('Firefox')) return 'Firefox Browser';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari Browser';
  if (userAgent.includes('Edge')) return 'Edge Browser';
  if (userAgent.includes('Opera')) return 'Opera Browser';
  
  return 'Web Browser';
};

const getPlatformName = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('mac')) return 'macOS';
  if (userAgent.includes('win')) return 'Windows';
  if (userAgent.includes('linux')) return 'Linux';
  if (userAgent.includes('android')) return 'Android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
  
  return 'Web';
};

const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  const platform = getPlatformName();
  const browserName = getBrowserName();
  
  // Determine device type
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
  }
  
  return {
    device_name: `${browserName} on ${platform}`,
    device_type: deviceType,
    platform: platform,
    user_agent: userAgent
  };
};

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    token: null,
    isLoading: false,
    error: null,
    deviceId: null,
    deviceStats: null
  });

  const apiClient = useApiClient();

  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    return 'Web Browser';
  };

const getPlatformName = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mac')) return 'macOS';
    if (userAgent.includes('win')) return 'Windows';
    if (userAgent.includes('linux')) return 'Linux';
    if (userAgent.includes('android')) return 'Android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
    
    return 'Web';
  };

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      if (typeof window === 'undefined') return;

      try {
        const isSupported = await isPushNotificationSupported();
        
        setState(prev => ({ 
          ...prev, 
          isSupported,
          permission: Notification.permission 
        }));

        if (isSupported && Notification.permission === 'granted') {
          // Try to get existing token
          const token = await getCurrentToken();
          if (token) {
            setState(prev => ({ ...prev, token }));
            
            // Register/update device with current token
            await registerCurrentDevice(token);
          }
        }

        // Load device stats
        await loadDeviceStats();

      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to initialize push notifications' 
        }));
      }
    };

    initializePushNotifications();
  }, []);

  // Register current device
  const registerCurrentDevice = async (token?: string) => {
    if (!apiClient) return null;

    try {
      const deviceInfo = getDeviceInfo();
      
      const response = await apiClient.registerDevice({
        ...deviceInfo,
        push_token: token || undefined
      });

      if (response.success) {
        setState(prev => ({ ...prev, deviceId: response.device_id }));
        console.log('Device registered successfully:', response.device_id);
        return response.device_id;
      } else {
        console.error('Device registration failed:', response.message);
        return null;
      }
    } catch (error) {
      console.error('Failed to register device:', error);
      return null;
    }
  };

  // Load device statistics
  const loadDeviceStats = async () => {
    if (!apiClient) return;

    try {
      const stats = await apiClient.getPushStats();
      setState(prev => ({ ...prev, deviceStats: stats }));
    } catch (error) {
      console.error('Failed to load device stats:', error);
    }
  };

  // Request permission and register device
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

        // Register device with new token
        const deviceId = await registerCurrentDevice(token);
        
        if (deviceId) {
          toast.success('🔔 Push notifications enabled!');
          console.log('Device registered with new token');
          
          // Reload stats
          await loadDeviceStats();
        } else {
          toast.error('Push notifications enabled, but failed to save device settings');
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

  // Refresh token and re-register device
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
      
      if (token) {
        await registerCurrentDevice(token);
        toast.success('Push notification settings refreshed');
        console.log('Device re-registered with refreshed token');
        
        // Reload stats
        await loadDeviceStats();
      }
      
      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error('Failed to refresh push notification settings');
      return null;
    }
  }, [state.isSupported, state.permission, apiClient]);

  // Validate push tokens
  const validateTokens = useCallback(async (sendTest: boolean = false) => {
    if (!apiClient) {
      toast.error('API client not available');
      return null;
    }

    try {
      console.log('Validating push tokens...');
      const response = await apiClient.validatePushTokens({
        test_notification: sendTest
      });

      if (sendTest) {
        toast.success(`Token validation complete. ${response.valid_tokens} valid, ${response.invalid_tokens} invalid.`);
      }

      return response;
    } catch (error) {
      console.error('Failed to validate tokens:', error);
      toast.error('Failed to validate push tokens');
      return null;
    }
  }, [apiClient]);

  // Get devices needing reauth
  const getDevicesNeedingReauth = useCallback(async () => {
    if (!apiClient) return [];

    try {
      return await apiClient.getDevicesNeedingReauth();
    } catch (error) {
      console.error('Failed to get devices needing reauth:', error);
      return [];
    }
  }, [apiClient]);

  // Check if re-auth modal should be shown
  const shouldShowReauthModal = useCallback(async (): Promise<boolean> => {
    const devices = await getDevicesNeedingReauth();
    return devices.length > 0;
  }, [getDevicesNeedingReauth]);

  return {
    // State
    state,
    
    // Computed properties
    isSupported: state.isSupported,
    permission: state.permission,
    token: state.token,
    isLoading: state.isLoading,
    error: state.error,
    deviceId: state.deviceId,
    deviceStats: state.deviceStats,
    
    // Derived state
    hasPushPermission: state.permission === 'granted',
    needsPushPermission: state.isSupported && state.permission !== 'granted',
    hasValidToken: Boolean(state.token),
    
    // Actions
    requestPermission,
    refreshToken,
    validateTokens,
    getDevicesNeedingReauth,
    shouldShowReauthModal,
    loadDeviceStats,
    
    // Device info
    getCurrentDeviceInfo: getDeviceInfo
  };
}