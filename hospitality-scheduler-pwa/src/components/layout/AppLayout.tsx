// components/layout/AppLayout.tsx - main app layout with PWA support
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { Navbar } from '@/components/navigation/Navbar'
import { NotificationProvider, useRealtimeNotifications } from '@/contexts/NotificationContext'
import { PushNotificationProvider } from '@/components/providers/PushNotificationProvider';
import { FirebaseInitializer } from '@/components/firebase/FirebaseInitializer';
import { PushReauthModal } from '@/components/notification/PushReauthModal';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { Toaster } from '@/components/ui/sonner' 

interface AppLayoutProps {
  children: React.ReactNode
}

// PWA Head component for meta tags
function PWAHead() {
  return (
    <Head>
      {/* App Identity */}
      <title>Schedula</title>
      <meta name="description" content="Professional hospitality scheduling made simple" />
      <meta name="application-name" content="Schedula" />
      
      {/* PWA Configuration */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Schedula" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      <meta name="msapplication-tap-highlight" content="no" />
      <meta name="theme-color" content="#6366f1" />
      
      {/* Viewport - Enhanced for PWA */}
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no" />
      
      {/* Manifest */}
      <link rel="manifest" href="/manifest.json" />
      
      {/* Favicons */}
      <link rel="shortcut icon" href="/icons/favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="64x64" href="/icons/favicon/favicon-64x64.png" />
      
      {/* Apple Icons */}
      <link rel="apple-touch-icon" sizes="152x152" href="/icons/icons/icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/icons/icons/icon-192x192.png" />
      <link rel="apple-touch-icon" href="/icons/icons/icon-192x192.png" />
      
      {/* Apple Startup Images - iOS Splash Screens */}
      <link rel="apple-touch-startup-image" 
            href="/icons/splashscreen/splash-640x1136.png" 
            media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      <link rel="apple-touch-startup-image" 
            href="/icons/splashscreen/splash-750x1334.png" 
            media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      <link rel="apple-touch-startup-image" 
            href="/icons/splashscreen/splash-1242x2208.png" 
            media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
      <link rel="apple-touch-startup-image" 
            href="/icons/splashscreen/splash-1242x2688.png" 
            media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
      
      {/* Windows */}
      <meta name="msapplication-navbutton-color" content="#6366f1" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Security */}
      <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      
      {/* Social Media */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Schedula - Professional Hospitality Scheduling" />
      <meta property="og:description" content="Professional hospitality scheduling made simple" />
      <meta property="og:site_name" content="Schedula" />
      <meta property="og:image" content="/icons/icons/icon-512x512.png" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Schedula" />
      <meta name="twitter:description" content="Professional hospitality scheduling made simple" />
      <meta name="twitter:image" content="/icons/icons/icon-512x512.png" />
    </Head>
  );
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

  // PWA install tracking
  const [pwaInstallCount, setPwaInstallCount] = useState(0);

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

  // PWA event listeners
  useEffect(() => {
    const handlePWAInstalled = () => {
      console.log('Schedula PWA installed successfully!');
      setPwaInstallCount(prev => prev + 1);
      
      // Track installation analytics if needed
      // analytics.track('pwa_installed', { timestamp: Date.now() });
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA install prompt available');
      // The PWAInstallPrompt component will handle this
    };

    window.addEventListener('appinstalled', handlePWAInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('appinstalled', handlePWAInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (status === 'loading') {
    return (
      <>
        <PWAHead />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </>
    )
  }

  if (!session) return <PWAHead />

  return (
    <>
      <PWAHead />
      <div className="min-h-screen bg-gray-50">
        {/* Initialize Firebase in background */}
        <FirebaseInitializer />
        <Navbar />
        <main>
          {children}
        </main>
        
        {/* PWA Install Prompt - only show when logged in */}
        <PWAInstallPrompt 
          onInstall={() => {
            console.log('User installed Schedula PWA');
            // You can track this event or show a success message
          }}
          onDismiss={() => {
            console.log('User dismissed PWA install prompt');
            // Optional: track dismissal analytics
          }}
        />
        
        {/* Push Notification Reauth Modal */}
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
    </>
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
                zIndex: 9999 // Ensure toasts appear above PWA install prompt
              }
            }}
          />
        </AppLayoutInner>
      </PushNotificationProvider>
    </NotificationProvider>
  )
}