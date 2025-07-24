// File: hospitality-scheduler-pwa/src/hooks/useApi.ts
// Hooks for using API client and authentication in Next.js with NextAuth.js

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { createAuthenticatedApiClient, apiClient } from '@/lib/api'

export function useApiClient() {
  const { data: session, status } = useSession()
  
  return useMemo(() => {
    // Return null while session is loading
    // This forces components to wait and show loading states
    if (status === 'loading') {
      return null
    }
    
    // Return authenticated client if we have a session
    if (session?.accessToken) {
      return createAuthenticatedApiClient(session.accessToken)
    }
    
    // Return unauthenticated client only if definitely no session
    return apiClient
  }, [session?.accessToken, status])
}

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isManager: session?.user?.isManager || false,
    tenantId: session?.user?.tenantId,
    accessToken: session?.accessToken,
    provider: session?.provider,
  }
}

// Helper hook for safer API calls
export function useSafeApiClient() {
  const apiClient = useApiClient()
  const { isLoading } = useAuth()
  
  const makeApiCall = async (apiFunction: () => Promise<any>) => {
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