'use client'

// src/app/debug/page.tsx
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [envCheck, setEnvCheck] = useState<any>(null)

  const checkEnvironment = async () => {
    try {
      // Test API providers
      const providersRes = await fetch('/api/auth/providers')
      const providers = await providersRes.json()
      
      // Test session
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()
      
      setEnvCheck({
        providers,
        sessionData,
        clientEnv: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          NODE_ENV: process.env.NODE_ENV,
        }
      })
    } catch (error) {
      setEnvCheck({ error: error.message })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Auth Debug Page</h1>
        
        {/* Session Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>User:</strong> {session?.user?.email || 'Not signed in'}</p>
            <p><strong>Provider:</strong> {session?.provider || 'None'}</p>
          </div>
        </div>

        {/* Environment Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <button 
            onClick={checkEnvironment}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Check Environment
          </button>
          
          {envCheck && (
            <pre className="mt-4 bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(envCheck, null, 2)}
            </pre>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-x-4">
            <a 
              href="/api/auth/signin/google" 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
            >
              Direct Google Sign In
            </a>
            <a 
              href="/api/auth/signout" 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 inline-block"
            >
              Sign Out
            </a>
            <a 
              href="/login" 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
            >
              Login Page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}