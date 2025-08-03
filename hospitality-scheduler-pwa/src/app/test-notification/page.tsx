// app/test-notification/page.tsx
// Test page for notification debugging
'use client'

import { QuickTestNotifications } from '@/components/debug/QuickTestNotifications'
import { I18nTest } from '@/components/debug/I18nTest';

export default function TestNotificationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Notification Testing & Debug
          </h1>
          <p className="text-gray-600">
            Test and debug actionable notifications functionality
          </p>
        </div>
        
        {/* Test Component */}
        <QuickTestNotifications />
        
        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">How to Use</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">1</span>
              <div>
                <strong>Debug All Notifications:</strong> Shows what's currently in your notification data
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">2</span>
              <div>
                <strong>Create Test Notifications:</strong> Creates notifications directly via enhanced service
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">3</span>
              <div>
                <strong>Check Console:</strong> Open browser console (F12) to see detailed logs
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">4</span>
              <div>
                <strong>Check Notification Bell:</strong> Go back to dashboard and click notification bell
              </div>
            </div>
          </div>
        </div>
      </div>
      <I18nTest />
    </div>
  )
}