'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useApi';
import { toast } from 'sonner';

interface PushNotificationContextType {
  hasPushPermission: boolean;
  needsPushPermission: boolean;
  isSupported: boolean;
  token: string | null;
  requestPermission: () => Promise<boolean>;
  showPermissionPrompt: boolean;
  dismissPrompt: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotificationContext must be used within a PushNotificationProvider');
  }
  return context;
}

interface PushNotificationProviderProps {
  children: React.ReactNode;
  autoRequestDelay?: number; // Delay before auto-requesting (ms)
  maxAutoRequests?: number; // Max auto-request attempts
}

export function PushNotificationProvider({
  children,
  autoRequestDelay = 5000, // 5 seconds default
  maxAutoRequests = 1 // Only auto-request once per session
}: PushNotificationProviderProps) {
  const {
    hasPushPermission,
    needsPushPermission,
    isSupported,
    token,
    requestPermission: hookRequestPermission,
    isLoading
  } = usePushNotifications();

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [autoRequestAttempts, setAutoRequestAttempts] = useState(0);
  const [hasAttemptedAutoRequest, setHasAttemptedAutoRequest] = useState(false);

  // Auto-request permission logic
  useEffect(() => {
    // Skip if:
    // - Still loading auth or push notification state
    // - Not authenticated
    // - Not supported
    // - Already has permission
    // - Already attempted auto-request
    // - Permission is denied
    if (
      authLoading ||
      isLoading ||
      !isAuthenticated ||
      !isSupported ||
      hasPushPermission ||
      hasAttemptedAutoRequest ||
      Notification.permission === 'denied'
    ) {
      return;
    }

    // Auto-request after delay
    const timer = setTimeout(async () => {
      console.log('🔔 Auto-requesting push notification permission...');
      
      try {
        const granted = await hookRequestPermission();
        setAutoRequestAttempts(prev => prev + 1);
        setHasAttemptedAutoRequest(true);
        
        if (granted) {
          console.log('✅ Auto-request successful');
          toast.success('🔔 Push notifications enabled! You\'ll receive updates even when the app is closed.');
        } else {
          console.log(' Auto-request failed, showing prompt for manual request');
          // If auto-request fails and we haven't hit max attempts, show prompt
          if (autoRequestAttempts < maxAutoRequests) {
            setShowPermissionPrompt(true);
          }
        }
      } catch (error) {
        console.error('Auto-request error:', error);
        setHasAttemptedAutoRequest(true);
        
        // Show prompt as fallback
        if (autoRequestAttempts < maxAutoRequests) {
          setShowPermissionPrompt(true);
        }
      }
    }, autoRequestDelay);

    return () => clearTimeout(timer);
  }, [
    authLoading,
    isLoading,
    isAuthenticated,
    isSupported,
    hasPushPermission,
    hasAttemptedAutoRequest,
    autoRequestDelay,
    autoRequestAttempts,
    maxAutoRequests,
    hookRequestPermission
  ]);

  // Manual permission request (for prompt)
  const requestPermission = async (): Promise<boolean> => {
    try {
      const granted = await hookRequestPermission();
      if (granted) {
        setShowPermissionPrompt(false);
        toast.success('🔔 Push notifications enabled!');
      }
      return granted;
    } catch (error) {
      console.error('Manual permission request failed:', error);
      return false;
    }
  };

  const dismissPrompt = () => {
    setShowPermissionPrompt(false);
    setHasAttemptedAutoRequest(true);
    
    // Store dismissal in sessionStorage to prevent showing again this session
    sessionStorage.setItem('pushNotificationPromptDismissed', 'true');
  };

  // Check if prompt was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('pushNotificationPromptDismissed');
    if (dismissed) {
      setHasAttemptedAutoRequest(true);
    }
  }, []);

  const contextValue: PushNotificationContextType = {
    hasPushPermission,
    needsPushPermission,
    isSupported,
    token,
    requestPermission,
    showPermissionPrompt,
    dismissPrompt
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
    </PushNotificationContext.Provider>
  );
}