'use client'
// Signup page - User Registration
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface SignUpFormData {
  organizationName: string
  fullName: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

export default function SignUpPage() {
  const [formData, setFormData] = useState<SignUpFormData>({
    organizationName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })
  const [showPasswords, setShowPasswords] = useState({ password: false, confirm: false })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const { t } = useTranslations()

  // Redirect if already authenticated
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      router.push('/dashboard')
    }
  }, [sessionStatus, router])

  const handleInputChange = (field: keyof SignUpFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateForm = (): string | null => {
    if (!formData.organizationName.trim()) {
      return t('auth.organizationNameRequired')
    }
    if (!formData.fullName.trim()) {
      return t('auth.fullNameRequired')
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      return t('auth.validEmailRequired')
    }
    if (formData.password.length < 8) {
      return t('auth.passwordTooShort')
    }
    if (formData.password !== formData.confirmPassword) {
      return t('auth.passwordsDoNotMatch')
    }
    if (!formData.agreeToTerms) {
      return t('auth.mustAgreeToTerms')
    }
    return null
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Call signup API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_name: formData.organizationName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          full_name: formData.fullName.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
      } else {
        setError(data.detail || t('auth.signUpFailed'))
      }
    } catch {
      setError(t('auth.networkError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    try {
      await signIn('google', {
        callbackUrl: '/dashboard',
      })
    } catch {
      setError(t('auth.googleSignUpFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++
    return Math.min(strength, 4)
  }

  // Show success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{t('auth.accountCreated')}</h1>
            <p className="text-gray-500">
              {t('auth.checkEmailVerification')}
            </p>
          </div>

          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Mail className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              {t('auth.verificationEmailSent', { email: formData.email })}
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push('/login')}
            className="w-full h-12 text-lg"
          >
            {t('auth.goToLogin')}
          </Button>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Decorative */}
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
            {t('auth.manageYourStaff')}
          </h2>
          <p className="text-lg text-slate-300">
            {t('auth.signUpDescription')}
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          © {new Date().getFullYear()} Schedula Inc. {t('auth.allRightsReserved')}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('auth.signUpTitle')}</h1>
            <p className="text-gray-500">
              {t('auth.signUpDescription')}
            </p>
          </div>

          <div className="space-y-6">
            <Button
              onClick={handleGoogleSignUp}
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
              {t('auth.signUpWithGoogle')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 lg:bg-white px-2 text-gray-500">
                  {t('auth.orSignUpWith')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="organizationName">{t('auth.organizationName')}</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="organizationName"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    placeholder={t('auth.organizationNamePlaceholder')}
                    className="pl-10 h-11 bg-white"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="pl-10 h-11 bg-white"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="pl-10 h-11 bg-white"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      type={showPasswords.password ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="pl-10 pr-10 h-11 bg-white"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      className="pl-10 pr-10 h-11 bg-white"
                      required
                      disabled={isLoading}
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
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((level) => {
                      const strength = getPasswordStrength(formData.password)
                      return (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-all duration-300 ${strength >= level
                            ? strength <= 2 ? 'bg-red-500' : strength === 3 ? 'bg-yellow-500' : 'bg-green-500'
                            : 'bg-gray-100'
                            }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500 text-right">
                    {getPasswordStrength(formData.password) <= 2 ? t('auth.passwordStrengthWeak') : getPasswordStrength(formData.password) === 3 ? t('auth.passwordStrengthMedium') : t('auth.passwordStrengthStrong')}
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed text-gray-600 font-normal">
                  {t('auth.agreeToTerms')}{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    {t('auth.termsOfService')}
                  </Link>{' '}
                  {t('auth.and')}{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    {t('auth.privacyPolicy')}
                  </Link>
                </Label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                disabled={isLoading || !formData.agreeToTerms}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    {t('auth.creatingAccount')}
                  </>
                ) : (
                  t('auth.createAccount')
                )}
              </Button>
            </form>

            <div className="text-center space-y-4 pt-4">
              <p className="text-sm text-gray-600">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link href="/login" className="text-blue-600 font-medium hover:underline hover:text-blue-700">
                  {t('auth.signIn')}
                </Link>
              </p>

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('auth.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}