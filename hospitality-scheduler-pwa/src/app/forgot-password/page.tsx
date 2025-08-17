// 1. FORGOT PASSWORD PAGE - /src/app/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { t } = useTranslations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.detail || t('auth.resetLinkFailed'))
      }
    } catch (error) {
      setStatus('error')
      setMessage(t('auth.networkError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.checkYourEmail')}</CardTitle>
            <CardDescription>
              {message || t('auth.resetLinkSent')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="w-4 h-4" />
              <AlertDescription>
                {t('auth.resetLinkInstructions')}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => router.push('/login')}
                className="w-full"
              >
                {t('auth.backToLogin')}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setStatus('idle')
                  setEmail('')
                }}
                className="w-full"
              >
                {t('auth.sendAnotherLink')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.forgotPassword')}</CardTitle>
          <CardDescription>
            {t('auth.forgotPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('auth.sendingResetLink')}
                </>
              ) : (
                t('auth.sendResetLink')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}