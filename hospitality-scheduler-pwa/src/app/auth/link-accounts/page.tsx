'use client'

import { Suspense } from 'react'
import AccountLinking from '@/components/auth/account-linking'
import { useTranslations } from '@/hooks/useTranslations'

function AccountLinkingContent() {
  return <AccountLinking mode="suggestion" />
}

export default function AccountLinkingPage() {
  const { t } = useTranslations()
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    }>
      <AccountLinkingContent />
    </Suspense>
  )
}