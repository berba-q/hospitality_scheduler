
// This hook manages the state and API interactions for swap requests 
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

// Enhanced types for better TypeScript support
interface SwapFilters {
  status?: string
  urgency?: string
  swap_type?: string
  limit?: number
  role_compatibility?: 'all' | 'compatible_only' | 'overrides_only'
}

interface SwapSummary {
  facility_id: string
  // Basic counts
  pending_swaps: number
  urgent_swaps: number
  recent_completions: number
  
  // Enhanced workflow counts  
  manager_approval_needed: number
  potential_assignments: number
  staff_responses_needed: number
  manager_final_approval_needed: number
  auto_swaps_needing_assignment: number
  specific_swaps_awaiting_response: number
  
  // Role verification stats
  role_compatible_assignments: number
  role_override_assignments: number
  failed_role_verifications: number
  
  // Timing metrics
  average_approval_time_hours?: number
  average_staff_response_time_hours?: number
  pending_over_24h: number
}

interface WorkflowStatus {
  current_status: string
  next_action_required: string
  next_action_by: 'manager' | 'staff' | 'system'
  can_execute: boolean
  blocking_reasons: string[]
  estimated_completion?: string
}

export function useSwapRequests(facilityId?: string) {
  console.log('=== useSwapRequests HOOK INITIALIZED ===')
  
  const [swapRequests, setSwapRequests] = useState([])
  const [swapSummary, setSwapSummary] = useState<SwapSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflowStatuses, setWorkflowStatuses] = useState<Record<string, WorkflowStatus>>({})
  const apiClient = useApiClient()

  // load function with workflow status
  const loadSwapRequests = useCallback(async (filters?: SwapFilters) => {
    console.log('=== LOAD SWAP REQUESTS CALLED ===')
    console.log('facilityId:', facilityId, 'filters:', filters)
    
    setLoading(true)
    setError(null)
    
    try {
      if (facilityId) {
        console.log('MANAGER PATH - Loading facility data')
        
        // Load enhanced facility-specific data
        const [requests, summary] = await Promise.all([
          apiClient.getFacilitySwaps(facilityId, filters),
          apiClient.getSwapSummary(facilityId)
        ])
        
        console.log('Enhanced facility data loaded:', {
          requests: requests?.length || 0,
          summary: summary
        })
        
        setSwapRequests(requests)
        setSwapSummary(summary)
        
        // Load workflow statuses for active swaps
        if (requests && requests.length > 0) {
          const activeSwaps = requests.filter((swap: any) => 
            !['executed', 'declined', 'cancelled'].includes(swap.status)
          )
          
          const workflowPromises = activeSwaps.map(async (swap: any) => {
            try {
              const status = await apiClient.getSwapWorkflowStatus(swap.id)
              return { swapId: swap.id, status }
            } catch (error) {
              console.warn(`Failed to load workflow status for swap ${swap.id}:`, error)
              return null
            }
          })
          
          const workflowResults = await Promise.all(workflowPromises)
          const workflowStatusMap: Record<string, WorkflowStatus> = {}
          
          workflowResults.forEach(result => {
            if (result) {
              workflowStatusMap[result.swapId] = result.status
            }
          })
          
          setWorkflowStatuses(workflowStatusMap)
        }
        
      } else {
        console.log('STAFF PATH - Loading personal swaps')
        
        try {
          const personalSwaps = await apiClient.getMySwapRequests(filters?.status, filters?.limit || 50)
          console.log('Personal swaps loaded:', personalSwaps?.length || 0)
          setSwapRequests(personalSwaps)
          setSwapSummary(null)
          setWorkflowStatuses({})
        } catch (error) {
          console.warn('Could not load personal swap requests:', error)
          setSwapRequests([])
          setSwapSummary(null)
          setWorkflowStatuses({})
        }
      }
    } catch (error: any) {
      console.error('Failed to load enhanced swap requests:', error)
      setError(error.message || 'Failed to load swap requests')
      setSwapRequests([])
      setSwapSummary(null)
      setWorkflowStatuses({})
    } finally {
      setLoading(false)
    }
  }, [facilityId, apiClient])

  // ==================== ENHANCED WORKFLOW OPERATIONS ====================

  // Enhanced manager approval with workflow awareness
  const approveSwap = useCallback(async (swapId: string, approved: boolean, notes?: string) => {
    try {
      const response = await apiClient.ManagerSwapDecision(swapId, { 
        approved, 
        notes,
        notification_options: {
          send_whatsapp: true,
          send_push: true,
          send_email: false
        }
      })
      
      await loadSwapRequests()
      toast.success(approved ? 'Swap approved - finding coverage...' : 'Swap declined')
      return response
    } catch (error: any) {
      console.error('Failed to process enhanced swap decision:', error)
      toast.error('Failed to process swap decision')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // NEW: Respond to potential assignment (for auto swaps)
  const respondToPotentialAssignment = useCallback(async (
    swapId: string, 
    accepted: boolean, 
    notes?: string
  ) => {
    try {
      const response = await apiClient.respondToPotentialAssignment(swapId, {
        accepted,
        notes,
        availability_confirmed: true
      })
      
      await loadSwapRequests()
      toast.success(accepted ? 'Assignment accepted!' : 'Assignment declined')
      return response
    } catch (error: any) {
      console.error('Failed to respond to potential assignment:', error)
      toast.error('Failed to respond to assignment')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // Enhanced staff response for specific swaps
  const respondToSwap = useCallback(async (
    swapId: string, 
    accepted: boolean, 
    notes?: string
  ) => {
    try {
      const response = await apiClient.RespondToSwap(swapId, {
        accepted,
        notes,
        confirm_availability: true
      })
      
      await loadSwapRequests()
      toast.success(accepted ? 'Swap accepted!' : 'Swap declined')
      return response
    } catch (error: any) {
      console.error('Failed to respond to swap:', error)
      toast.error('Failed to respond to swap')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // NEW: Manager final approval
  const managerFinalApproval = useCallback(async (
    swapId: string,
    approved: boolean,
    notes?: string,
    overrideRoleVerification?: boolean,
    roleOverrideReason?: string
  ) => {
    try {
      const response = await apiClient.managerFinalApproval(swapId, {
        approved,
        notes,
        override_role_verification: overrideRoleVerification,
        role_override_reason: roleOverrideReason
      })
      
      await loadSwapRequests()
      toast.success(approved ? 'Swap executed successfully!' : 'Final approval denied')
      return response
    } catch (error: any) {
      console.error('Failed to process final approval:', error)
      toast.error('Failed to process final approval')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // ==================== ROLE VERIFICATION OPERATIONS ====================

  // NEW: Check role compatibility
  const checkRoleCompatibility = useCallback(async (data: {
    facility_id: string
    zone_id: string
    staff_id: string
    original_shift_day: number
    original_shift_number: number
  }) => {
    try {
      return await apiClient.checkRoleCompatibility(data)
    } catch (error: any) {
      console.error('Failed to check role compatibility:', error)
      toast.error('Failed to verify role compatibility')
      throw error
    }
  }, [apiClient])

  // NEW: Get role audit for swap
  const getSwapRoleAudit = useCallback(async (swapId: string) => {
    try {
      return await apiClient.getSwapRoleAudit(swapId)
    } catch (error: any) {
      console.error('Failed to get role audit:', error)
      toast.error('Failed to load role audit information')
      throw error
    }
  }, [apiClient])

  // ==================== WORKFLOW STATUS OPERATIONS ====================

  // NEW: Get workflow status for specific swap
  const getWorkflowStatus = useCallback(async (swapId: string) => {
    try {
      const status = await apiClient.getSwapWorkflowStatus(swapId)
      setWorkflowStatuses(prev => ({
        ...prev,
        [swapId]: status
      }))
      return status
    } catch (error: any) {
      console.error('Failed to get workflow status:', error)
      return null
    }
  }, [apiClient])

  // NEW: Get available actions for swap
  const getAvailableActions = useCallback(async (swapId: string) => {
    try {
      return await apiClient.getAvailableSwapActions(swapId)
    } catch (error: any) {
      console.error('Failed to get available actions:', error)
      return null
    }
  }, [apiClient])

  // ==================== VALIDATION OPERATIONS ====================

  // NEW: Validate swap request before creation
  const validateSwapRequest = useCallback(async (swapData: any) => {
    try {
      return await apiClient.validateSwapRequest(swapData)
    } catch (error: any) {
      console.error('Failed to validate swap request:', error)
      return {
        is_valid: false,
        errors: [{ error_code: 'VALIDATION_FAILED', error_message: error.message }],
        warnings: []
      }
    }
  }, [apiClient])

  // NEW: Get swap conflicts and suggestions
  const getSwapConflicts = useCallback(async (
    scheduleId: string, 
    day: number, 
    shift: number
  ) => {
    try {
      return await apiClient.getSwapConflicts(scheduleId, day, shift)
    } catch (error: any) {
      console.error('Failed to get swap conflicts:', error)
      return { has_conflicts: false, conflicts: [], alternative_suggestions: [] }
    }
  }, [apiClient])

  // ==================== ENHANCED ANALYTICS ====================

  // Enhanced analytics with role information
  const getAnalytics = useCallback(async (options?: {
    start_date?: string
    end_date?: string
    group_by?: 'day' | 'week' | 'month'
  }) => {
    if (!facilityId) {
      throw new Error('Facility ID required for analytics')
    }
    
    try {
      return await apiClient.getSwapAnalytics(facilityId, {
        ...options,
        include_role_analysis: true
      })
    } catch (error: any) {
      console.error('Failed to get enhanced analytics:', error)
      toast.error('Failed to load analytics')
      throw error
    }
  }, [facilityId, apiClient])

  // NEW: Get workflow timing analytics
  const getWorkflowTimingAnalytics = useCallback(async (days: number = 30) => {
    if (!facilityId) {
      throw new Error('Facility ID required for timing analytics')
    }
    
    try {
      return await apiClient.getWorkflowTimingAnalytics(facilityId, days)
    } catch (error: any) {
      console.error('Failed to get timing analytics:', error)
      toast.error('Failed to load timing analytics')
      throw error
    }
  }, [facilityId, apiClient])

  // ==================== BULK OPERATIONS ====================

  // Enhanced bulk operations with role verification
  const bulkApprove = useCallback(async (
    swapIds: string[],
    approved: boolean,
    notes?: string,
    ignoreRoleMismatches?: boolean,
    roleOverrideReason?: string
  ) => {
    try {
      const response = await apiClient.bulkApproveSwaps({
        swap_ids: swapIds,
        approved,
        notes,
        ignore_role_mismatches: ignoreRoleMismatches,
        role_override_reason: roleOverrideReason
      })
      
      await loadSwapRequests()
      
      const successCount = response.successful
      const roleIssues = response.role_verification_failures
      
      if (roleIssues > 0) {
        toast.warning(`${successCount} swaps processed successfully, ${roleIssues} had role compatibility issues`)
      } else {
        toast.success(`${successCount} swaps ${approved ? 'approved' : 'declined'} successfully!`)
      }
      
      return response
    } catch (error: any) {
      console.error('Failed to bulk approve with role check:', error)
      toast.error('Failed to process bulk operation')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // NEW: Bulk retry with role filtering
  const bulkRetry = useCallback(async (
    swapIds: string[],
    options?: {
      avoid_staff_ids?: string[]
      require_exact_role_match?: boolean
      allow_manager_override?: boolean
    }
  ) => {
    try {
      const response = await apiClient.bulkRetryAutoAssignments({
        swap_ids: swapIds,
        ...options
      })
      
      await loadSwapRequests()
      
      const successCount = response.successful_assignments
      const roleIssues = response.role_compatibility_issues
      
      if (roleIssues > 0) {
        toast.warning(`${successCount} assignments successful, ${roleIssues} had role compatibility issues`)
      } else {
        toast.success(`${successCount} auto-assignments completed successfully!`)
      }
      
      return response
    } catch (error: any) {
      console.error('Failed to bulk retry assignments:', error)
      toast.error('Failed to retry assignments')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // ==================== ENHANCED UTILITIES ====================

  // NEW: Get swap recommendations
  const getSwapRecommendations = useCallback(async (data: {
    requesting_staff_id: string
    original_day: number
    original_shift: number
    zone_id?: string
    urgency?: string
  }) => {
    if (!facilityId) {
      throw new Error('Facility ID required for recommendations')
    }
    
    try {
      return await apiClient.getSwapRecommendations(facilityId, data)
    } catch (error: any) {
      console.error('Failed to get swap recommendations:', error)
      toast.error('Failed to load recommendations')
      throw error
    }
  }, [facilityId, apiClient])

  // Enhanced create swap with validation
  const createSwapRequest = useCallback(async (
    swapData: any, 
    notificationOptions?: any,
    validateFirst?: boolean
  ) => {
    try {
      // Optional validation before creation
      if (validateFirst) {
        const validation = await validateSwapRequest(swapData)
        if (!validation.is_valid) {
          const errorMessages = validation.errors.map(e => e.error_message).join(', ')
          toast.error(`Validation failed: ${errorMessages}`)
          return { success: false, validation }
        }
        
        if (validation.warnings.length > 0) {
          toast.warning(`Warnings: ${validation.warnings.join(', ')}`)
        }
      }
      
      const response = await apiClient.createSwapRequest(swapData, notificationOptions)
      await loadSwapRequests()
      toast.success('Swap request created and notifications sent!')
      return { success: true, response }
    } catch (error: any) {
      console.error('Failed to create enhanced swap request:', error)
      toast.error('Failed to create swap request')
      throw error
    }
  }, [validateSwapRequest, loadSwapRequests, apiClient])

  // ==================== ENHANCED COMPUTED VALUES ====================

  // Enhanced computed values with workflow states
  const pendingSwaps = swapRequests.filter((swap: any) => swap.status === 'pending')
  const urgentSwaps = swapRequests.filter((swap: any) => ['high', 'emergency'].includes(swap.urgency))
  const completedSwaps = swapRequests.filter((swap: any) => swap.status === 'executed')
  
  // NEW: Workflow-specific computed values
  const potentialAssignments = swapRequests.filter((swap: any) => swap.status === 'potential_assignment')
  const awaitingStaffResponse = swapRequests.filter((swap: any) => 
    ['manager_approved', 'potential_assignment'].includes(swap.status)
  )
  const awaitingFinalApproval = swapRequests.filter((swap: any) => swap.status === 'staff_accepted')
  const roleOverrides = swapRequests.filter((swap: any) => swap.role_match_override === true)
  const roleCompatible = swapRequests.filter((swap: any) => 
    swap.role_match_override === false && swap.assigned_staff_id
  )

  // ==================== EXISTING OPERATIONS (KEPT FOR COMPATIBILITY) ====================

  const retryAutoAssignment = useCallback(async (swapId: string, avoidStaffIds?: string[]) => {
    try {
      const response = await apiClient.retryAutoAssignment(swapId, avoidStaffIds)
      await loadSwapRequests()
      toast.success('Auto-assignment retry initiated')
      return response
    } catch (error: any) {
      console.error('Failed to retry auto assignment:', error)
      toast.error('Failed to retry auto assignment')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  const getSwapDetails = useCallback(async (swapId: string) => {
    try {
      return await apiClient.getSwapRequest(swapId)
    } catch (error: any) {
      console.error('Failed to get swap details:', error)
      toast.error('Failed to load swap details')
      throw error
    }
  }, [apiClient])

  const getSwapHistory = useCallback(async (swapId: string) => {
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
  }, [apiClient])

  const updateSwapRequest = useCallback(async (swapId: string, updateData: any) => {
    try {
      const response = await apiClient.updateSwapRequest(swapId, updateData)
      await loadSwapRequests()
      toast.success('Swap request updated successfully!')
      return response
    } catch (error: any) {
      console.error('Failed to update swap request:', error)
      toast.error('Failed to update swap request')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  const cancelSwapRequest = useCallback(async (swapId: string, reason?: string) => {
    try {
      const response = await apiClient.cancelSwapRequest(swapId, reason)
      await loadSwapRequests()
      toast.success('Swap request cancelled')
      return response
    } catch (error: any) {
      console.error('Failed to cancel swap request:', error)
      toast.error('Failed to cancel swap request')
      throw error
    }
  }, [loadSwapRequests, apiClient])

  // Load data on mount and when facilityId changes
  useEffect(() => {
    console.log('=== Enhanced useSwapRequests useEffect ===')
    if (facilityId !== undefined) {
      loadSwapRequests()
    }
  }, [loadSwapRequests, facilityId])

  return {
    // ==================== DATA ====================
    swapRequests,
    swapSummary,
    workflowStatuses,
    loading,
    error,
    
    // ==================== COMPUTED VALUES ====================
    // Basic
    pendingSwaps,
    urgentSwaps,
    completedSwaps,
    
    // Enhanced workflow
    potentialAssignments,
    awaitingStaffResponse,
    awaitingFinalApproval,
    roleOverrides,
    roleCompatible,
    
    // ==================== ENHANCED WORKFLOW OPERATIONS ====================
    respondToPotentialAssignment,
    managerFinalApproval,
    getWorkflowStatus,
    getAvailableActions,
    
    // ==================== ROLE VERIFICATION OPERATIONS ====================
    checkRoleCompatibility,
    getSwapRoleAudit,
    
    // ==================== VALIDATION OPERATIONS ====================
    validateSwapRequest,
    getSwapConflicts,
    getSwapRecommendations,
    
    // ==================== ENHANCED ANALYTICS ====================
    getAnalytics,
    getWorkflowTimingAnalytics,
    
    // ==================== BULK OPERATIONS ====================
    bulkApprove,
    bulkRetry,
    
    // ==================== CORE OPERATIONS (ENHANCED) ====================
    createSwapRequest,
    approveSwap,
    respondToSwap,
    
    // ==================== EXISTING OPERATIONS (COMPATIBILITY) ====================
    retryAutoAssignment,
    getSwapDetails,
    getSwapHistory,
    updateSwapRequest,
    cancelSwapRequest,
    
    // ==================== UTILITY ====================
    refresh: loadSwapRequests,
    loadWithFilters: loadSwapRequests,
    clearError: () => setError(null)
  }
}

// ==================== ENHANCED GLOBAL HOOK ====================

export function useGlobalSwapRequests() {
  const [globalSummary, setGlobalSummary] = useState(null)
  const [facilitiesSummary, setFacilitiesSummary] = useState([])
  const [allSwapRequests, setAllSwapRequests] = useState([])
  const [workflowAnalytics, setWorkflowAnalytics] = useState(null)
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
      
      // Load enhanced analytics for facilities with activity
      if (facilities && facilities.length > 0) {
        const facilitiesWithActivity = facilities.filter((f: any) => f.total_swaps > 0)
        
        if (facilitiesWithActivity.length > 0) {
          try {
            const analyticsPromises = facilitiesWithActivity.map(async (facility: any) => {
              try {
                const analytics = await apiClient.getWorkflowTimingAnalytics(facility.facility_id, 30)
                return { facilityId: facility.facility_id, analytics }
              } catch (error) {
                console.warn(`Failed to load analytics for facility ${facility.facility_id}:`, error)
                return null
              }
            })
            
            const analyticsResults = await Promise.all(analyticsPromises)
            const analyticsMap = analyticsResults
              .filter(result => result !== null)
              .reduce((acc, result) => {
                if (result) {
                  acc[result.facilityId] = result.analytics
                }
                return acc
              }, {} as Record<string, any>)
            
            setWorkflowAnalytics(analyticsMap)
          } catch (error) {
            console.warn('Failed to load workflow analytics:', error)
          }
        }
      }
      
    } catch (error: any) {
      console.error('Failed to load enhanced global swap data:', error)
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
    workflowAnalytics,
    loading,
    error,
    refresh: loadGlobalData,
    clearError: () => setError(null)
  }
}

// ==================== UTILITY HOOKS ====================

// NEW: Hook for workflow status management
export function useSwapWorkflowStatus(swapId: string) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null)
  const [availableActions, setAvailableActions] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const apiClient = useApiClient()

  const loadWorkflowStatus = useCallback(async () => {
    if (!swapId) return
    
    setLoading(true)
    try {
      const [status, actions] = await Promise.all([
        apiClient.getSwapWorkflowStatus(swapId),
        apiClient.getAvailableSwapActions(swapId)
      ])
      
      setWorkflowStatus(status)
      setAvailableActions(actions)
    } catch (error) {
      console.error('Failed to load workflow status:', error)
    } finally {
      setLoading(false)
    }
  }, [swapId, apiClient])

  useEffect(() => {
    loadWorkflowStatus()
  }, [loadWorkflowStatus])

  return {
    workflowStatus,
    availableActions,
    loading,
    refresh: loadWorkflowStatus
  }
}

// NEW: Hook for role compatibility checking
export function useRoleCompatibility() {
  const [compatibilityCache, setCompatibilityCache] = useState<Record<string, any>>({})
  const apiClient = useApiClient()

  const checkCompatibility = useCallback(async (data: {
    facility_id: string
    zone_id: string
    staff_id: string
    original_shift_day: number
    original_shift_number: number
  }) => {
    const cacheKey = `${data.facility_id}-${data.zone_id}-${data.staff_id}-${data.original_shift_day}-${data.original_shift_number}`
    
    if (compatibilityCache[cacheKey]) {
      return compatibilityCache[cacheKey]
    }
    
    try {
      const result = await apiClient.checkRoleCompatibility(data)
      setCompatibilityCache(prev => ({
        ...prev,
        [cacheKey]: result
      }))
      return result
    } catch (error) {
      console.error('Failed to check role compatibility:', error)
      return null
    }
  }, [compatibilityCache, apiClient])

  const clearCache = useCallback(() => {
    setCompatibilityCache({})
  }, [])

  return {
    checkCompatibility,
    clearCache,
    compatibilityCache
  }
}