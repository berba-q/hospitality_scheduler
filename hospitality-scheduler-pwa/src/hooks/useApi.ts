// File: hospitality-scheduler-pwa/src/hooks/useApi.ts
// Hooks for using API client and authentication in Next.js with NextAuth.js

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { createAuthenticatedApiClient, apiClient } from '@/lib/api'
import type { User } from '@/types/auth'

export function useApiClient() {
  const { data: session, status } = useSession()

  // Cast session to our extended type with custom properties
  const customSession = session as {
    user?: User
    accessToken?: string
    provider?: string
  } | null

  return useMemo(() => {
    // Return null while session is loading
    // This forces components to wait and show loading states
    if (status === 'loading') {
      return null
    }

    // Return authenticated client if we have a session
    if (customSession?.accessToken) {
      return createAuthenticatedApiClient(customSession.accessToken)
    }

    // Return unauthenticated client only if definitely no session
    return apiClient
  }, [customSession?.accessToken, status])
}

export function useAuth() {
  const { data: session, status } = useSession()

  // Cast session to our extended type with custom properties
  const customSession = session as {
    user?: User
    accessToken?: string
    provider?: string
  } | null

  return {
    user: customSession?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isManager: customSession?.user?.isManager || false,
    tenantId: customSession?.user?.tenantId,
    accessToken: customSession?.accessToken,
    provider: customSession?.provider,
  }
}

// Helper hook for safer API calls
export function useSafeApiClient() {
  const apiClient = useApiClient()
  const { isLoading } = useAuth()
  
  const makeApiCall = async <T>(apiFunction: () => Promise<T>): Promise<T> => {
    if (isLoading || !apiClient) {
      throw new Error('Cannot make API calls while authentication is loading')
    }
    return apiFunction()
  }
  
  return {
    apiClient,
    isReady: !isLoading && !!apiClient,
    makeApiCall
  }
}

// Re-export for convenience
export { ApiClient, createAuthenticatedApiClient, apiClient } from '@/lib/api'