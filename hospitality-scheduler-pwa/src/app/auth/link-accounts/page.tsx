'use client'

import { Suspense } from 'react'
import AccountLinking from '@/components/auth/account-linking'

function AccountLinkingContent() {
  return <AccountLinking mode="suggestion" />
}

export default function AccountLinkingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AccountLinkingContent />
    </Suspense>
  )
}