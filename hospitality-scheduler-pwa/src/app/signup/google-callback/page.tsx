'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslations } from '@/hooks/useTranslations'

export default function GoogleCallbackPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { t } = useTranslations()
    const [error, setError] = useState('')

    useEffect(() => {
        const processInvitation = async () => {
            // Only proceed if authenticated with Google (initial step)
            if (status !== 'authenticated') return

            const token = sessionStorage.getItem('invitation_token')
            if (!token) {
                // No token found, maybe just a normal login? Redirect to dashboard
                router.push('/dashboard')
                return
            }

            try {
                // Call backend to accept invitation
                const response = await fetch('/api/v1/invitations/accept', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token,
                        signup_method: 'google',
                    }),
                })

                if (response.ok) {
                    const data = await response.json()

                    // Clear token from storage
                    sessionStorage.removeItem('invitation_token')

                    // Now sign in again using the backend token to update the session
                    if (data.access_token) {
                        await signIn('token-login', {
                            token: data.access_token,
                            callbackUrl: '/dashboard',
                            redirect: true
                        })
                    } else {
                        // Fallback if no token returned (shouldn't happen with my fix)
                        router.push('/dashboard')
                    }
                } else {
                    const data = await response.json()
                    setError(data.detail || 'Failed to accept invitation')
                }
            } catch (err) {
                console.error('Invitation processing error:', err)
                setError('An unexpected error occurred')
            }
        }

        if (status === 'authenticated') {
            processInvitation()
        } else if (status === 'unauthenticated') {
            // Should not happen if redirected here after Google login
            router.push('/login')
        }
    }, [status, router])

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md border-red-200 bg-red-50">
                    <CardContent className="pt-6 text-center text-red-800">
                        <p>{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="mt-4 text-sm underline"
                        >
                            Back to Login
                        </button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Setting up your account...</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
