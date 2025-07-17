// File: hospitality-scheduler-pwa/src/hooks/useApi.ts
// Hooks for using API client and authentication in Next.js with NextAuth.js

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { createAuthenticatedApiClient, apiClient } from '@/lib/api'

export function useApiClient() {
  const { data: session } = useSession()
  
  return useMemo(() => {
    if (session?.accessToken) {
      return createAuthenticatedApiClient(session.accessToken)
    }
    return apiClient
  }, [session?.accessToken])
  
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