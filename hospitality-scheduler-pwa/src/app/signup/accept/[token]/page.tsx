'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
  AlertCircle,
  ArrowLeft,
  Calendar,
  User
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
  params: Promise<{ token: string }>
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
  const [token, setToken] = useState<string>('')

  const router = useRouter()
  const { t } = useTranslations()

  const verifyInvitation = useCallback(async () => {
    if (!token) return

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
    // Unwrap the params promise
    params.then(({ token: tokenValue }) => {
      setToken(tokenValue)
    })
  }, [params])

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
          callbackUrl: '/signup/google-callback',
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

  // Left Panel Component (Reusable)
  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
      {/* Modern Abstract Background */}
      <div className="absolute inset-0 bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-slate-900 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900 to-slate-900" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
            <Image
              src="/icons/icons/icon-512x512.png"
              alt="Schedula Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight">Schedula</span>
        </div>
      </div>

      <div className="relative z-10 max-w-md space-y-6">
        <h2 className="text-4xl font-bold leading-tight">
          {t('invitations.joinTeam', { organizationName: invitationData?.organization_name || 'Schedula' })}
        </h2>
        <p className="text-lg text-slate-300">
          {t('invitations.welcomeMessage', {
            organizationName: invitationData?.organization_name || 'us',
            role: invitationData?.role || 'a member'
          })}
        </p>
      </div>

      <div className="relative z-10 text-sm text-slate-400">
        © {new Date().getFullYear()} Schedula Inc. {t('auth.allRightsReserved')}
      </div>
    </div>
  )

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex bg-white">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gray-50 lg:bg-white">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">{t('invitations.verifyingInvitation')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid invitation
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex bg-white">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gray-50 lg:bg-white">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">{t('invitations.invalidInvitation')}</h1>
              <p className="text-gray-500">
                {t('invitations.invalidInvitationDescription')}
              </p>
            </div>
            <Button
              onClick={() => router.push('/login')}
              className="w-full h-12 text-lg"
            >
              {t('auth.goToLogin')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex bg-white">
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gray-50 lg:bg-white">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">{t('invitations.welcomeToTeam')}</h1>
              <p className="text-gray-500">
                {t('invitations.accountCreatedSuccessfully')}
              </p>
            </div>
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <AlertDescription>
                {t('invitations.redirectingToLogin')}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  // Valid invitation - show signup options
  return (
    <div className="min-h-screen flex bg-white">
      <LeftPanel />

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('invitations.createYourAccount')}</h1>
            <p className="text-gray-500">
              {t('invitations.welcomeMessage', {
                organizationName: invitationData?.organization_name || '',
                role: invitationData?.role || ''
              })}
            </p>
          </div>

          {/* Invitation Details Card */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Building className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium text-gray-900">{invitationData?.organization_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-gray-700">{invitationData?.role} at {invitationData?.facility_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-gray-700">{invitationData?.email}</span>
            </div>
          </div>

          <div className="space-y-6">
            {!signupMethod ? (
              <>
                <Button
                  onClick={() => handleAcceptInvitation('google')}
                  variant="outline"
                  className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 border-gray-200 text-gray-700 flex items-center justify-center gap-3 transition-all"
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('invitations.acceptInvitationWithGoogle')}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 lg:bg-white px-2 text-gray-500">
                      {t('common.or')}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setSignupMethod('credentials')}
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                >
                  {t('invitations.acceptInvitationWithCredentials')}
                </Button>
              </>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault()
                handleAcceptInvitation('credentials')
              }} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="pl-10 pr-10 h-11 bg-white"
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
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      className="pl-10 pr-10 h-11 bg-white"
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

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupMethod(null)}
                    className="flex-1 h-12"
                    disabled={isLoading}
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
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

            <div className="text-center space-y-2 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {t('invitations.invitedBy')} <span className="font-medium text-gray-700">{invitationData?.invited_by_name}</span>
              </p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" />
                {t('invitations.expiresOn')} {new Date(invitationData?.expires_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}