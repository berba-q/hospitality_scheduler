//src/hooks/useSwapRequests.ts // swap request api hooks
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

// Types for better TypeScript support
interface SwapFilters {
  status?: string
  urgency?: string
  swap_type?: string
  limit?: number
}

interface SwapSummary {
  facility_id: string
  pending_swaps: number
  urgent_swaps: number
  auto_swaps_needing_assignment: number
  specific_swaps_awaiting_response: number
  recent_completions: number
}

export function useSwapRequests(facilityId?: string) {
  console.log('=== useSwapRequests HOOK INITIALIZED ===')
  console.log('Initial facilityId:', facilityId)
  console.log('typeof initial facilityId:', typeof facilityId)
  console.log('===========================================')

  const [swapRequests, setSwapRequests] = useState([])
  const [swapSummary, setSwapSummary] = useState<SwapSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  // Enhanced load function with better error handling
  const loadSwapRequests = useCallback(async (filters?: SwapFilters) => {
    console.log('=== LOAD SWAP REQUESTS CALLED ===')
    console.log('facilityId parameter:', facilityId)
    console.log('typeof facilityId:', typeof facilityId)
    console.log('facilityId === undefined:', facilityId === undefined)
    console.log('facilityId === null:', facilityId === null)
    console.log('Boolean(facilityId):', Boolean(facilityId))
    console.log('filters:', filters)
    
    setLoading(true)
    setError(null)
    
    try {
      if (facilityId) {
        console.log('TAKING MANAGER PATH - Loading facility-specific data for facilityId:', facilityId)
        
        // Load facility-specific data
        const [requests, summary] = await Promise.all([
          apiClient.getFacilitySwaps(facilityId, filters),
          apiClient.getFacilitySwapSummary(facilityId)
        ])
        
        console.log('MANAGER: Facility swaps loaded:', requests?.length || 0, 'requests')
        console.log('MANAGER: Facility summary loaded:', summary)
        setSwapRequests(requests)
        setSwapSummary(summary)
      } else {
        console.log('TAKING STAFF PATH - No facilityId provided, loading personal swaps (staff mode)')
        console.log('About to call apiClient.getMySwapRequests')
        
        // For staff without facility context, get their personal swaps only
        try {
          const personalSwaps = await apiClient.getMySwapRequests(filters?.status, filters?.limit || 50)
          console.log('STAFF: Personal swaps loaded:', personalSwaps?.length || 0, 'requests')
          setSwapRequests(personalSwaps)
          setSwapSummary(null) // Staff don't need facility summaries
        } catch (error) {
          console.warn('Could not load personal swap requests:', error)
          setSwapRequests([])
          setSwapSummary(null)
        }
      }
    } catch (error: any) {
      console.error('Failed to load swap requests:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
      setError(error.message || 'Failed to load swap requests')
      setSwapRequests([])
      setSwapSummary(null)
    } finally {
      setLoading(false)
      console.log('=== LOAD SWAP REQUESTS COMPLETED ===')
    }
  }, [facilityId, apiClient])

  // Load with filters
  const loadWithFilters = useCallback(async (filters: SwapFilters) => {
    return loadSwapRequests(filters)
  }, [loadSwapRequests])

  // Create swap request
  const createSwapRequest = async (swapData: any) => {
    try {
      const response = await apiClient.createSwapRequest(swapData)
      await loadSwapRequests() // Refresh data
      toast.success('Swap request created successfully!')
      return response
    } catch (error: any) {
      console.error('Failed to create swap request:', error)
      toast.error('Failed to create swap request')
      throw error
    }
  }

  // Approve/decline swap
  const approveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    try {
      const response = await apiClient.approveSwap(swapId, approved, notes)
      await loadSwapRequests() // Refresh data
      toast.success(approved ? 'Swap approved successfully!' : 'Swap declined')
      return response
    } catch (error: any) {
      console.error('Failed to process swap decision:', error)
      toast.error('Failed to process swap decision')
      throw error
    }
  }

  // Retry auto assignment
  const retryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]) => {
    try {
      const response = await apiClient.retryAutoAssignment(swapId, avoidStaffIds)
      await loadSwapRequests() // Refresh data
      toast.success('Auto-assignment retry initiated')
      return response
    } catch (error: any) {
      console.error('Failed to retry auto assignment:', error)
      toast.error('Failed to retry auto assignment')
      throw error
    }
  }

  // Staff response to swap
  const respondToSwap = async (swapId: string, accepted: boolean, notes?: string) => {
    try {
      const response = await apiClient.respondToSwap(swapId, accepted, notes)
      await loadSwapRequests() // Refresh data
      toast.success(accepted ? 'Swap accepted!' : 'Swap declined')
      return response
    } catch (error: any) {
      console.error('Failed to respond to swap:', error)
      toast.error('Failed to respond to swap')
      throw error
    }
  }

  // NEW: Get specific swap details
  const getSwapDetails = async (swapId: string) => {
    try {
      return await apiClient.getSwapRequest(swapId)
    } catch (error: any) {
      console.error('Failed to get swap details:', error)
      toast.error('Failed to load swap details')
      throw error
    }
  }

  // NEW: Get swap history
  const getSwapHistory = async (swapId: string) => {
    try {
      const [swapDetails, history] = await Promise.all([
        apiClient.getSwapRequest(swapId),
        apiClient.getSwapHistory(swapId)
      ])
      return { swap: swapDetails, history }
    } catch (error: any) {
      console.error('Failed to get swap history:', error)
      toast.error('Failed to load swap history')
      throw error
    }
  }

  // NEW: Update swap request
  const updateSwapRequest = async (swapId: string, updateData: any) => {
    try {
      const response = await apiClient.updateSwapRequest(swapId, updateData)
      await loadSwapRequests() // Refresh data
      toast.success('Swap request updated successfully!')
      return response
    } catch (error: any) {
      console.error('Failed to update swap request:', error)
      toast.error('Failed to update swap request')
      throw error
    }
  }

  // NEW: Cancel swap request
  const cancelSwapRequest = async (swapId: string, reason?: string) => {
    try {
      const response = await apiClient.cancelSwapRequest(swapId, reason)
      await loadSwapRequests() // Refresh data
      toast.success('Swap request cancelled')
      return response
    } catch (error: any) {
      console.error('Failed to cancel swap request:', error)
      toast.error('Failed to cancel swap request')
      throw error
    }
  }

  // NEW: Bulk approve swaps (for managers)
  const bulkApproveSwaps = async (swapIds: string[], approved: boolean, notes?: string) => {
    try {
      const response = await apiClient.bulkApproveSwaps(swapIds, approved, notes)
      await loadSwapRequests() // Refresh data
      toast.success(`${swapIds.length} swaps ${approved ? 'approved' : 'declined'} successfully!`)
      return response
    } catch (error: any) {
      console.error('Failed to bulk approve swaps:', error)
      toast.error('Failed to process bulk operation')
      throw error
    }
  }

  // NEW: Search swaps
  const searchSwaps = async (query: string, filters?: any) => {
    try {
      return await apiClient.searchSwaps(query, filters)
    } catch (error: any) {
      console.error('Failed to search swaps:', error)
      toast.error('Failed to search swaps')
      throw error
    }
  }

  // NEW: Get swap analytics
  const getSwapAnalytics = async (options?: {
    start_date?: string
    end_date?: string
    group_by?: 'day' | 'week' | 'month'
  }) => {
    if (!facilityId) {
      throw new Error('Facility ID required for analytics')
    }
    
    try {
      return await apiClient.getSwapAnalytics(facilityId, options)
    } catch (error: any) {
      console.error('Failed to get swap analytics:', error)
      toast.error('Failed to load analytics')
      throw error
    }
  }

  // NEW: Load facility-specific swaps (for drill-down)
  const loadFacilitySwaps = async (targetFacilityId: string) => {
    try {
      const [requests, summary] = await Promise.all([
        apiClient.getFacilitySwaps(targetFacilityId),
        apiClient.getFacilitySwapSummary(targetFacilityId)
      ])
      return { requests, summary }
    } catch (error: any) {
      console.error('Failed to load facility swaps:', error)
      toast.error('Failed to load facility swap details')
      throw error
    }
  }

  // NEW: Get staff swap statistics
  const getStaffSwapStats = async (staffId: string, options?: {
    start_date?: string
    end_date?: string
  }) => {
    try {
      return await apiClient.getStaffSwapStats(staffId, options)
    } catch (error: any) {
      console.error('Failed to get staff swap stats:', error)
      toast.error('Failed to load staff statistics')
      throw error
    }
  }

  // Computed values for better UX
  const pendingSwaps = swapRequests.filter((swap: any) => swap.status === 'pending')
  const urgentSwaps = swapRequests.filter((swap: any) => ['high', 'emergency'].includes(swap.urgency))
  const completedSwaps = swapRequests.filter((swap: any) => swap.status === 'executed')
  const approvedSwaps = swapRequests.filter((swap: any) => 
    ['manager_approved', 'staff_accepted', 'assigned'].includes(swap.status)
  )

  // Load data on mount and when facilityId changes
  useEffect(() => {
    console.log('=== useSwapRequests useEffect TRIGGERED ===')
    console.log('facilityId in useEffect:', facilityId)
    console.log('typeof facilityId in useEffect:', typeof facilityId)
    console.log('loadSwapRequests function reference:', loadSwapRequests)
    
    // Only call loadSwapRequests if facilityId is not undefined
    // This prevents the initial call with undefined facilityId
    if (facilityId !== undefined) {
      console.log('facilityId is valid, calling loadSwapRequests')
      loadSwapRequests()
    } else {
      console.log('facilityId is undefined, skipping loadSwapRequests call')
    }
    
    console.log('=== useSwapRequests useEffect COMPLETED ===')
  }, [loadSwapRequests, facilityId])

  return {
    // Data
    swapRequests,
    swapSummary,
    loading,
    error,
    
    // Computed values
    pendingSwaps,
    urgentSwaps,
    completedSwaps,
    approvedSwaps,
    
    // Core operations
    createSwapRequest,
    approveSwap,
    retryAutoAssignment,
    respondToSwap,
    refresh: loadSwapRequests,
    
    // Enhanced operations
    getSwapDetails,
    getSwapHistory,
    updateSwapRequest,
    cancelSwapRequest,
    bulkApproveSwaps,
    searchSwaps,
    getSwapAnalytics,
    loadFacilitySwaps,
    getStaffSwapStats,
    
    // Filtering
    loadWithFilters,
    
    // Utility
    clearError: () => setError(null)
  }
}

// NEW: Global swap requests hook for managers
export function useGlobalSwapRequests() {
  const [globalSummary, setGlobalSummary] = useState(null)
  const [facilitiesSummary, setFacilitiesSummary] = useState([])
  const [allSwapRequests, setAllSwapRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadGlobalData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [summary, facilities, allSwaps] = await Promise.all([
        apiClient.getGlobalSwapSummary(),
        apiClient.getFacilitiesSwapSummary(),
        apiClient.getAllSwapRequests()
      ])
      
      setGlobalSummary(summary)
      setFacilitiesSummary(facilities)
      setAllSwapRequests(allSwaps)
    } catch (error: any) {
      console.error('Failed to load global swap data:', error)
      setError(error.message || 'Failed to load global swap data')
      toast.error('Failed to load swap management data')
    } finally {
      setLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    loadGlobalData()
  }, [loadGlobalData])

  return {
    globalSummary,
    facilitiesSummary,
    allSwapRequests,
    loading,
    error,
    refresh: loadGlobalData,
    clearError: () => setError(null)
  }
}