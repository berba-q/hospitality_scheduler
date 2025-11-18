'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  UserPlus, 
  Building, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface InvitationData {
  staff_name: string
  organization_name: string
  facility_name: string
  role: string
  email: string
  invited_by_name: string
  expires_at: string
}

interface AcceptInvitationPageProps {
  params: { token: string }
}

export default function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [signupMethod, setSignupMethod] = useState<'google' | 'credentials' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading')
  
  const router = useRouter()
  const { t } = useTranslations()
  const { token } = params

  const verifyInvitation = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/invitations/verify/${token}`)

      if (response.ok) {
        const data = await response.json()
        setInvitationData(data)
        setStatus('valid')
      } else {
        setStatus('invalid')
      }
    } catch {
      setStatus('invalid')
    }
  }, [token])

  useEffect(() => {
    verifyInvitation()
  }, [verifyInvitation])

  const handleAcceptInvitation = async (method: 'google' | 'credentials') => {
    setIsLoading(true)
    setError('')

    try {
      if (method === 'google') {
        // Store token in session for Google callback
        sessionStorage.setItem('invitation_token', token)
        await signIn('google', {
          callbackUrl: '/dashboard',
        })
      } else {
        // Validate password
        if (password.length < 8) {
          setError(t('auth.passwordTooShort'))
          setIsLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError(t('auth.passwordsDoNotMatch'))
          setIsLoading(false)
          return
        }

        // Accept invitation with credentials
        const response = await fetch('/api/v1/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            signup_method: 'credentials',
            password,
            confirm_password: confirmPassword
          }),
        })

        if (response.ok) {
          setStatus('success')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          const data = await response.json()
          setError(data.detail || t('invitations.acceptFailed'))
        }
      }
    } catch {
      setError(t('auth.networkError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('invitations.verifyingInvitation')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid invitation
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">{t('invitations.invalidInvitation')}</CardTitle>
            <CardDescription>
              {t('invitations.invalidInvitationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              {t('auth.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('invitations.welcomeToTeam')}</CardTitle>
            <CardDescription>
              {t('invitations.accountCreatedSuccessfully')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <UserPlus className="w-4 h-4" />
              <AlertDescription>
                {t('invitations.redirectingToLogin')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid invitation - show signup options
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">
            {t('invitations.joinTeam', { organizationName: invitationData?.organization_name || '' })}
          </CardTitle>
          <CardDescription>
            {t('invitations.welcomeMessage', {
              organizationName: invitationData?.organization_name || '',
              role: invitationData?.role || ''
            })}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{invitationData?.organization_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>{invitationData?.role} at {invitationData?.facility_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>{invitationData?.email}</span>
            </div>
          </div>

          {!signupMethod ? (
            // Method selection
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center">
                {t('invitations.createYourAccount')}
              </h3>
              
              <Button 
                onClick={() => handleAcceptInvitation('google')}
                variant="outline" 
                className="w-full flex items-center gap-2"
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('invitations.acceptInvitationWithGoogle')}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">
                    {t('common.or')}
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => setSignupMethod('credentials')}
                variant="outline" 
                className="w-full"
              >
                {t('invitations.acceptInvitationWithCredentials')}
              </Button>
            </div>
          ) : (
            // Credentials form
            <form onSubmit={(e) => {
              e.preventDefault()
              handleAcceptInvitation('credentials')
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')} *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setSignupMethod(null)}
                  className="w-full"
                  disabled={isLoading}
                >
                  {t('common.back')}
                </Button>
                <Button 
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t('invitations.accepting')}
                    </>
                  ) : (
                    t('invitations.acceptInvitation')
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center text-sm text-gray-600">
            <p>
              {t('invitations.invitedBy')}: <strong>{invitationData?.invited_by_name}</strong>
            </p>
            <p>
              {t('invitations.expiresOn')}: {new Date(invitationData?.expires_at || '').toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}