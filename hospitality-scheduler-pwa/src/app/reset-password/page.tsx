'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

export default function ResetPasswordPage() {
  const [passwords, setPasswords] = useState({
    new_password: '',
    confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'invalid-token'>('idle')
  const [message, setMessage] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { t } = useTranslations()

  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid-token')
      setMessage(t('auth.missingResetToken'))
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch('/api/v1/auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          setTokenValid(true)
        } else {
          setTokenValid(false)
          setStatus('invalid-token')
          setMessage(t('auth.invalidOrExpiredToken'))
        }
      } catch (error) {
        setTokenValid(false)
        setStatus('invalid-token')
        setMessage(t('auth.tokenVerificationFailed'))
      }
    }

    verifyToken()
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwords.new_password !== passwords.confirm_password) {
      setStatus('error')
      setMessage(t('auth.passwordsDoNotMatch'))
      return
    }

    if (passwords.new_password.length < 8) {
      setStatus('error')
      setMessage(t('auth.passwordTooShort'))
      return
    }

    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: passwords.new_password,
          confirm_password: passwords.confirm_password
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.detail || t('auth.passwordResetFailed'))
      }
    } catch (error) {
      setStatus('error')
      setMessage(t('auth.networkError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Show success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.passwordResetSuccess')}</CardTitle>
            <CardDescription>
              {message || t('auth.passwordResetSuccessDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              {t('auth.signInWithNewPassword')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show invalid token state
  if (status === 'invalid-token' || tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">{t('auth.invalidResetLink')}</CardTitle>
            <CardDescription>
              {message || t('auth.invalidResetLinkDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => router.push('/forgot-password')}
              className="w-full"
            >
              {t('auth.requestNewResetLink')}
            </Button>
            
            <Link 
              href="/login"
              className="block text-center text-sm text-blue-600 hover:text-blue-500"
            >
              {t('auth.backToLogin')}
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while verifying token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('auth.verifyingResetLink')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.resetPassword')}</CardTitle>
          <CardDescription>
            {t('auth.resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">{t('auth.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwords.new_password}
                  onChange={(e) => setPasswords(prev => ({ ...prev, new_password: e.target.value }))}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t('auth.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength indicator */}
            {passwords.new_password && (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">{t('auth.passwordStrength')}:</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = getPasswordStrength(passwords.new_password)
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          strength >= level 
                            ? strength <= 2 ? 'bg-red-400' : strength === 3 ? 'bg-yellow-400' : 'bg-green-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !passwords.new_password || !passwords.confirm_password}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('auth.resettingPassword')}
                </>
              ) : (
                t('auth.resetPassword')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function for password strength
function getPasswordStrength(password: string): number {
  let strength = 0
  
  if (password.length >= 8) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++
  
  return Math.min(strength, 4)
}