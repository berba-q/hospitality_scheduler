// components/layout/AppLayout.tsx - main app layout
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navigation/Navbar'
import { NotificationProvider, useRealtimeNotifications } from '@/contexts/NotificationContext'
import { PushNotificationProvider } from '@/components/providers/PushNotificationProvider';
import { FirebaseInitializer } from '@/components/firebase/FirebaseInitializer';
import { PushReauthModal } from '@/components/notification/PushReauthModal';
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { Toaster } from '@/components/ui/sonner' 


interface AppLayoutProps {
  children: React.ReactNode
}

// Inner component that uses the notification context
function AppLayoutInner({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Initialize real-time notifications
  useRealtimeNotifications()
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [devicesNeedingReauth, setDevicesNeedingReauth] = useState([]);
  const apiClient = useApiClient();
  const { t } = useTranslations();

  useEffect(() => {
  const checkForReauthNeeded = async () => {
    if (!apiClient) return;
    
    try {
      const devices = await apiClient.getDevicesNeedingReauth();
      if (devices.length > 0) {
        setDevicesNeedingReauth(devices);
        setShowReauthModal(true);
      }
    } catch (error) {
      console.error('Failed to check for reauth devices:', error);
    }
  };

  // Check on mount and every 5 minutes
  checkForReauthNeeded();
  const interval = setInterval(checkForReauthNeeded, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [apiClient]);

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])


  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Initialize Firebase in background */}
      <FirebaseInitializer />
      <Navbar />
      <main>
        {children}
      </main>
      <PushReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        devicesNeedingReauth={devicesNeedingReauth}
        onDeviceReauthorized={(deviceId) => {
          setDevicesNeedingReauth(prev => 
            prev.filter(d => d.id !== deviceId)
          );
        }}
      />
    </div>

  )
}

// Main component that provides the notification context
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <NotificationProvider>
      <PushNotificationProvider 
        autoRequestDelay={3000} // Request permission 3 seconds after login
        maxAutoRequests={1}     // Only auto-request once per session
      >
      <AppLayoutInner>
        {children}
        <Toaster 
          position="bottom-right"
          richColors
          duration={4500}
          closeButton
          toastOptions={{
            style: {
              zIndex: 9999
            }
          }}
        />
      </AppLayoutInner>
      </PushNotificationProvider>
    </NotificationProvider>
  )
}