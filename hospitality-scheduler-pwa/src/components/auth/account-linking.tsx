'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Link2, 
  Unlink, 
  AlertCircle, 
  CheckCircle,
  Mail,
  User,
  Shield
} from 'lucide-react'
import { FaGoogle } from 'react-icons/fa'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'

interface LinkedProvider {
  id: string
  provider: string
  provider_email: string
  linked_at: string
  is_primary: boolean
  is_active: boolean
}

interface AccountLinkingProps {
  mode?: 'suggestion' | 'management'
  className?: string
}

export default function AccountLinking({ mode = 'management', className = '' }: AccountLinkingProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslations()
  
  const [linkedProviders, setLinkedProviders] = useState<LinkedProvider[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Handle account linking suggestion from URL params
  const action = searchParams.get('action')
  const provider = searchParams.get('provider')
  const email = searchParams.get('email')
  const existingUserId = searchParams.get('existing_user_id')
  const existingProviders = searchParams.get('existing_providers')

  useEffect(() => {
    if (session) {
      fetchLinkedProviders()
    }
  }, [session])

  const fetchLinkedProviders = async () => {
    try {
      const response = await fetch('/api/account/providers', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      })
      
      if (response.ok) {
        const providers = await response.json()
        setLinkedProviders(providers)
      } else if (response.status === 404) {
        // API endpoint doesn't exist yet - this is expected during development
        console.log('Account linking API not implemented yet')
        setLinkedProviders([])
      } else {
        console.error('Failed to fetch providers:', response.status)
        setError('Unable to load linked accounts. Please try again later.')
      }
    } catch (error) {
      console.error('Failed to fetch linked providers:', error)
      // Don't show error to user if API is not implemented yet
      setLinkedProviders([])
    }
  }

  const handleLinkProvider = async (providerName: string) => {
    setIsLoading(true)
    setError('')
    
    try {
      // Start OAuth flow for linking
      await signIn(providerName, {
        callbackUrl: '/profile?tab=linked-accounts',
        redirect: true
      })
    } catch (error) {
      setError(t('auth.accountLinkingFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlinkProvider = async (providerName: string) => {
    if (linkedProviders.length <= 1) {
      setError(t('auth.cannotUnlinkOnlyMethod'))
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/account/unlink-provider', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ provider: providerName }),
      })
      
      if (response.ok) {
        setSuccess(t('auth.accountUnlinkedSuccessfully', { provider: providerName }))
        fetchLinkedProviders()
      } else if (response.status === 404) {
        setError(t('auth.featureNotAvailable'))
      } else {
        const data = await response.json()
        setError(data.detail || t('auth.failedToUnlinkAccount'))
      }
    } catch (error) {
      setError(t('auth.unableToUnlinkAccount'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmLinking = async () => {
    if (!provider || !email || !existingUserId) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Perform the actual account linking
      const response = await fetch('/api/account/link-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          provider,
          provider_id: session?.user?.id, // OAuth provider ID
          provider_email: email,
          provider_data: {}
        }),
      })
      
      if (response.ok) {
        setSuccess(t('auth.accountsLinked'))
        router.push('/dashboard')
      } else if (response.status === 404) {
        setError(t('auth.featureNotAvailable'))
      } else if (response.status === 400) {
        const data = await response.json()
        if (data.detail?.includes('email')) {
          setError(t('auth.emailMismatchError', { email }))
        } else {
          setError(data.detail || t('auth.accountLinkingFailed'))
        }
      } else {
        const data = await response.json()
        setError(data.detail || t('auth.accountLinkingFailed'))
      }
    } catch (error) {
      setError(t('auth.unableToLinkAccounts'))
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'google':
        return <FaGoogle className="w-4 h-4" />
      case 'fastapi':
        return <Mail className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getProviderName = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'google':
        return 'Google'
      case 'fastapi':
        return t('auth.email') + ' & ' + t('auth.password')
      default:
        return providerName
    }
  }

  // Account linking suggestion mode
  if (mode === 'suggestion' && action === 'link_accounts') {
    const existingProvidersList = existingProviders ? JSON.parse(existingProviders) : []
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Link2 className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>{t('auth.linkAccounts')}</CardTitle>
            <CardDescription>
              {t('auth.linkAccountsDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {t('auth.linkAccountsDescription')} <strong>{email}</strong>:
                <div className="flex flex-wrap gap-2 mt-2">
                  {existingProvidersList.map((p: string) => (
                    <Badge key={p} variant="secondary">
                      {getProviderIcon(p)}
                      <span className="ml-1">{getProviderName(p)}</span>
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button 
                onClick={handleConfirmLinking}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('auth.linking')}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    {t('auth.linkGoogleAccount')}
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/signup')}
                disabled={isLoading}
                className="w-full"
              >
                {t('auth.createSeparateAccount')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Account management mode
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('profile.linkAccounts')}
        </CardTitle>
        <CardDescription>
          {t('auth.manageAuthenticationMethods')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Linked Providers */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">{t('auth.currentlyLinked')}</h4>
          
          {/* Debug Information */}
          <Alert className="border-gray-200 bg-gray-50">
            <AlertCircle className="w-4 h-4 text-gray-600" />
            <AlertDescription className="text-gray-700">
              <strong>Debug Info:</strong>
              <div className="mt-1 font-mono text-xs">
                <div>Session Email: {session?.user?.email || 'Not available'}</div>
                <div>Session Provider: {session?.provider || 'Unknown'}</div>
                <div>Session Status: {session ? 'Active' : 'None'}</div>
              </div>
            </AlertDescription>
          </Alert>
          
          {linkedProviders.length === 0 ? (
            <p className="text-sm text-gray-500">{t('auth.noLinkedAccountsFound')}</p>
          ) : (
            linkedProviders.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getProviderIcon(provider.provider)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getProviderName(provider.provider)}</span>
                      {provider.is_primary && (
                        <Badge variant="default" className="text-xs">{t('auth.primary')}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{provider.provider_email}</p>
                    <p className="text-xs text-gray-400">
                      {t('auth.linkedOn', { date: new Date(provider.linked_at).toLocaleDateString() })}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlinkProvider(provider.provider)}
                  disabled={isLoading || linkedProviders.length <= 1}
                  className="text-red-600 hover:text-red-700"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Available Providers to Link */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">{t('auth.linkAdditionalAccounts')}</h4>
          
          {/* Development Notice */}
          <Alert className="mb-3 border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Development Status:</strong> Account linking APIs are not yet implemented. 
              You need to create the API routes first before this feature will work.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            {!linkedProviders.some(p => p.provider === 'google') && (
              <>
                <Alert className="mb-3 border-amber-200 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Email Requirement:</strong> Your Google account email must match your system email (manager@seaside.com) for linking to work.
                    <br />Current session: <code>{session?.user?.email || 'Not available'}</code>
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.error('Account linking APIs are not yet implemented. Please create the API routes first.')
                  }}
                  disabled={false}
                  className="w-full justify-start"
                >
                  <FaGoogle className="w-4 h-4 mr-2" />
                  {t('auth.linkGoogleAccount')} (Development Mode)
                </Button>
              </>
            )}
          </div>
          
          <p className="text-xs text-gray-500">
            {t('auth.linkingAccountsDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}