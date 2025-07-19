// components/layout/AppLayout.tsx - main app layout
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Navbar } from '@/components/navigation/Navbar'
import { Toaster } from '@/components/ui/sonner'
import { NotificationProvider, useRealtimeNotifications } from '@/contexts/NotificationContext'

interface AppLayoutProps {
  children: React.ReactNode
}

// Inner component that uses the notification context
function AppLayoutInner({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Initialize real-time notifications
  useRealtimeNotifications()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        {children}
      </main>
      <Toaster />
    </div>
  )
}

// Main component that provides the notification context
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <NotificationProvider>
      <AppLayoutInner>
        {children}
      </AppLayoutInner>
    </NotificationProvider>
  )
}