'use client'

// src/app/dashboard/page.tsx
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) router.push('/login')
  }, [session, status, router])

  // Show loading state
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

  // Don't render if no session
  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {session.user?.name}</p>
          </div>
          <Button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="outline"
          >
            Sign Out
          </Button>
        </div>

        {/* User info card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🎉 Authentication Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {session.user?.image && (
                <img 
                  src={session.user.image} 
                  alt="Profile"
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{session.user?.name}</p>
                <p className="text-sm text-gray-600">{session.user?.email}</p>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✅ Google OAuth working!<br/>
                ✅ NextAuth session active!<br/>
                ✅ User data received!<br/>
                🔧 Ready to connect to FastAPI backend!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>🔗 Connect to FastAPI backend</li>
              <li>📱 Build schedule view</li>
              <li>🔄 Add swap request functionality</li>
              <li>👥 Add manager/staff role detection</li>
              <li>📱 Make it a PWA</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}