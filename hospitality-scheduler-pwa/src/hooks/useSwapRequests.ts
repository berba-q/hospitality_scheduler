// This hook manages the state and API interactions for swap requests 
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApiClient, useAuth } from '@/hooks/useApi'
import { toast } from 'sonner'

// Import proper types
import { SwapRequest, SwapStatus, SwapUrgency } from '@/types/swaps'
import type { 
  ConflictAnalysis,
  SwapDecisionResponse,
  SwapStaffResponse
} from '@/types/api'
import type { 
  WorkflowStatus,
  SwapSummary,
  SwapValidationResult
} from '@/lib/api'

// Enhanced types for better TypeScript support
interface SwapFilters {
  status?: SwapStatus | string
  urgency?: SwapUrgency | string
  swap_type?: 'specific' | 'auto'
  limit?: number
  role_compatibility?: 'all' | 'compatible_only' | 'overrides_only'
}

// API Response types - Fixed to match backend
interface SwapResponse {
  success: boolean
  message: string
  data?: SwapRequest
}

interface BulkApprovalResponse {
  total_processed: number
  successful: number
  failed: number
  role_verification_failures?: number
  results?: Array<{
    swap_id: string
    success: boolean
    error?: string
    role_issue?: string
  }>
  errors?: string[]
}

// For bulk retry operations  
interface BulkRetryResponse {
  total_processed: number
  successful_assignments: number
  failed_assignments: number
  role_compatibility_issues?: number
  results?: Array<{
    swap_id: string
    success: boolean
    assigned_staff_id?: string
    assigned_staff_name?: string
    role_match_level?: string
    error?: string
  }>
}

interface SwapRecommendationData {
  requesting_staff_id: string
  original_day: number
  original_shift: number
  zone_id?: string
  urgency?: SwapUrgency
}

interface SwapNotificationOptions {
  send_whatsapp?: boolean
  send_push?: boolean
  send_email?: boolean
}

interface ManagerDecisionData {
  approved: boolean
  notes?: string
  notification_options?: SwapNotificationOptions
}

interface StaffResponseData {
  accepted: boolean
  notes?: string
  confirm_availability?: boolean
  availability_confirmed?: boolean
}

interface FinalApprovalData {
  approved: boolean
  notes?: string
  override_role_verification?: boolean
  role_override_reason?: string
}

interface RoleCompatibilityData {
  facility_id: string
  zone_id: string
  staff_id: string
  original_shift_day: number
  original_shift_number: number
}

interface SwapAnalyticsOptions {
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month'
  include_role_analysis?: boolean
}

interface BulkApprovalData {
  swap_ids: string[]
  approved: boolean
  notes?: string
  ignore_role_mismatches?: boolean
  role_override_reason?: string
}

interface BulkRetryData {
  swap_ids: string[]
  avoid_staff_ids?: string[]
  require_exact_role_match?: boolean
  allow_manager_override?: boolean
}

export function useSwapRequests(facilityId?: string) {
  console.log('=== useSwapRequests HOOK INITIALIZED ===')
  
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [swapSummary, setSwapSummary] = useState<SwapSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflowStatuses, setWorkflowStatuses] = useState<Record<string, WorkflowStatus>>({})

  const apiClient = useApiClient()
  const { isLoading: authLoading, isAuthenticated } = useAuth()

  // load function with workflow status
  const loadSwapRequests = useCallback(async (filters?: SwapFilters) => {
    console.log('=== LOAD SWAP REQUESTS CALLED ===')
    console.log('facilityId:', facilityId, 'filters:', filters)
    
    if (authLoading || !apiClient || !isAuthenticated) {
      console.log('Skipping API call - auth not ready:', { authLoading, hasApiClient: !!apiClient, isAuthenticated })
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      if (facilityId) {
        console.log('MANAGER PATH - Loading facility data')
        
        // Load enhanced facility-specific data
        const [requests, summary] = await Promise.all([
          apiClient.getFacilitySwaps(facilityId, {
          status: filters?.status as SwapStatus,
          urgency: filters?.urgency as SwapUrgency,
          limit: filters?.limit
        }),
          apiClient.getSwapSummary(facilityId)
        ])
        
        console.log('Enhanced facility data loaded:', {
          requests: requests?.length || 0,
          summary: summary
        })
        
        setSwapRequests(requests || [])
        setSwapSummary(summary)
        
        // Load workflow statuses for active swaps
        if (requests && requests.length > 0) {
          const activeSwaps = requests.filter((swap: SwapRequest) => 
            ![SwapStatus.Executed, SwapStatus.Declined, SwapStatus.Cancelled].includes(swap.status)
          )
          
          const workflowPromises = activeSwaps.map(async (swap: SwapRequest) => {
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
          const personalSwaps = await apiClient.getMySwapRequests(filters?.status as SwapStatus, filters?.limit || 50)
          console.log('Personal swaps loaded:', personalSwaps?.length || 0)
          setSwapRequests(personalSwaps || [])
          setSwapSummary(null)
          setWorkflowStatuses({})
        } catch (error) {
          console.warn('Could not load personal swap requests:', error)
          setSwapRequests([])
          setSwapSummary(null)
          setWorkflowStatuses({})
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load swap requests'
      console.error('Failed to load enhanced swap requests:', error)
      setError(errorMessage)
      setSwapRequests([])
      setSwapSummary(null)
      setWorkflowStatuses({})
    } finally {
      setLoading(false)
    }
  }, [facilityId, apiClient, authLoading, isAuthenticated])

  // ==================== ENHANCED WORKFLOW OPERATIONS ====================

  // Enhanced manager approval with workflow awareness
  const approveSwap = useCallback(async (swapId: string, approved: boolean, notes?: string): Promise<SwapRequest> => {
    // Check if API client is ready
    if (!apiClient) {
      toast.error('Authentication not ready. Please wait and try again.')
      throw new Error('API client not available')
    }

    try {
      console.log(`=== APPROVING SWAP ${swapId} ===`)
      console.log('Approved:', approved, 'Notes:', notes)
      
      // Backend returns SwapDecisionResponse, not SwapRequest directly
      const response: SwapDecisionResponse = await apiClient.ManagerSwapDecision(swapId, { 
        approved, 
        notes,
        notification_options: {
          send_whatsapp: true,
          send_push: true,
          send_email: false
        }
      } as ManagerDecisionData)
      
      console.log('Manager decision response:', response)
      
      // FIXED: Update the swap's status based on the response
      setSwapRequests(prevSwaps => {
        const newSwaps = prevSwaps.map(swap => 
          swap.id === swapId ? { 
            ...swap, 
            status: response.new_status,
            manager_approved: approved,
            manager_notes: notes,
            updated_at: response.updated_at
          } : swap
        )
        
        console.log('Updated swaps array length:', newSwaps.length)
        console.log('Updated swap in array:', newSwaps.find(s => s.id === swapId))
        
        return newSwaps
      })
      
      // Refresh the summary data to ensure counts are accurate
      if (facilityId) {
        try {
          const summary = await apiClient.getSwapSummary(facilityId)
          console.log('Updated summary:', summary)
          setSwapSummary(summary)
        } catch (summaryError) {
          console.warn('Failed to refresh summary:', summaryError)
          // If summary refresh fails, do a full reload to ensure consistency
          setTimeout(() => loadSwapRequests(), 1000)
        }
      }
      
      toast.success(approved ? 'Swap approved - finding coverage...' : 'Swap declined')
      
      // Return the updated swap request
      const updatedSwap = swapRequests.find(s => s.id === swapId)
      if (updatedSwap) {
        return {
          ...updatedSwap,
          status: response.new_status,
          manager_approved: approved,
          manager_notes: notes,
          updated_at: response.updated_at
        }
      }
      
      // Fallback: fetch the updated swap
      return await apiClient.getSwapRequest(swapId)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process swap decision'
      console.error('Failed to process enhanced swap decision:', error)
      toast.error('Failed to process swap decision')
      throw new Error(errorMessage)
    }
  }, [apiClient, facilityId, loadSwapRequests, swapRequests])

  // NEW: Respond to potential assignment (for auto swaps)
  const respondToPotentialAssignment = useCallback(async (
    swapId: string, 
    accepted: boolean, 
    notes?: string
  ): Promise<SwapResponse> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response: SwapStaffResponse = await apiClient.respondToPotentialAssignment(swapId, {
        accepted,
        notes,
        availability_confirmed: true
      } as StaffResponseData)
      
      await loadSwapRequests()
      toast.success(accepted ? 'Assignment accepted!' : 'Assignment declined')
      
      return {
        success: true,
        message: response.message
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to respond to assignment'
      console.error('Failed to respond to potential assignment:', error)
      toast.error('Failed to respond to assignment')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  // Enhanced staff response for specific swaps
  const respondToSwap = useCallback(async (
    swapId: string, 
    accepted: boolean, 
    notes?: string
  ): Promise<SwapResponse> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response: SwapStaffResponse = await apiClient.RespondToSwap(swapId, {
        accepted,
        notes,
        confirm_availability: true
      } as StaffResponseData)
      
      await loadSwapRequests()
      toast.success(accepted ? 'Swap accepted!' : 'Swap declined')
      
      return {
        success: true,
        message: response.message
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to respond to swap'
      console.error('Failed to respond to swap:', error)
      toast.error('Failed to respond to swap')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  //  Manager final approval
  const managerFinalApproval = useCallback(async (
    swapId: string,
    approved: boolean,
    notes?: string,
    overrideRoleVerification?: boolean,
    roleOverrideReason?: string
  ): Promise<SwapResponse> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response: SwapDecisionResponse = await apiClient.managerFinalApproval(swapId, {
        approved,
        notes,
        override_role_verification: overrideRoleVerification,
        role_override_reason: roleOverrideReason
      } as FinalApprovalData)
      
      await loadSwapRequests()
      toast.success(approved ? 'Swap executed successfully!' : 'Final approval denied')
      
      return {
        success: true,
        message: response.message
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process final approval'
      console.error('Failed to process final approval:', error)
      toast.error('Failed to process final approval')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  // ==================== ROLE VERIFICATION OPERATIONS ====================

  // NEW: Check role compatibility
  const checkRoleCompatibility = useCallback(async (data: RoleCompatibilityData) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.checkRoleCompatibility(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify role compatibility'
      console.error('Failed to check role compatibility:', error)
      toast.error('Failed to verify role compatibility')
      throw new Error(errorMessage)
    }
  }, [apiClient])

  // NEW: Get role audit for swap
  const getSwapRoleAudit = useCallback(async (swapId: string) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getSwapRoleAudit(swapId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load role audit information'
      console.error('Failed to get role audit:', error)
      toast.error('Failed to load role audit information')
      throw new Error(errorMessage)
    }
  }, [apiClient])

  // ==================== WORKFLOW STATUS OPERATIONS ====================

  // NEW: Get workflow status for specific swap
  const getWorkflowStatus = useCallback(async (swapId: string): Promise<WorkflowStatus | null> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const status = await apiClient.getSwapWorkflowStatus(swapId)
      setWorkflowStatuses(prev => ({
        ...prev,
        [swapId]: status
      }))
      return status
    } catch (error) {
      console.error('Failed to get workflow status:', error)
      return null
    }
  }, [apiClient])

  // NEW: Get available actions for swap
  const getAvailableActions = useCallback(async (swapId: string) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getAvailableSwapActions(swapId)
    } catch (error) {
      console.error('Failed to get available actions:', error)
      return null
    }
  }, [apiClient])

  // ==================== VALIDATION OPERATIONS ====================

  // NEW: Validate swap request before creation
  const validateSwapRequest = useCallback(async (swapData: {
    schedule_id: string
    requesting_staff_id: string
    original_day: number
    original_shift: number
    original_zone_id?: string
    swap_type: 'specific' | 'auto'
    target_staff_id?: string
    target_day?: number
    target_shift?: number
    role_verification_required?: boolean
  }): Promise<SwapValidationResult> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.validateSwapRequest(swapData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      console.error('Failed to validate swap request:', error)
      return {
        is_valid: false,
        errors: [{ error_code: 'VALIDATION_FAILED', error_message: errorMessage }],
        warnings: [],
        role_verification_passed: false,
        zone_requirements_met: false,
        skill_requirements_met: false,
        staff_available: false,
        no_conflicts: false,
        within_work_limits: false
      }
    }
  }, [apiClient])

  // NEW: Get swap conflicts and suggestions
  const getSwapConflicts = useCallback(async (
    scheduleId: string, 
    day: number, 
    shift: number
  ): Promise<ConflictAnalysis> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getSwapConflicts(scheduleId, day, shift)
    } catch (error) {
      console.error('Failed to get swap conflicts:', error)
      return { has_conflicts: false, conflicts: [], alternative_suggestions: [] }
    }
  }, [apiClient])

  // ==================== ENHANCED ANALYTICS ====================

  // Enhanced analytics with role information
  const getAnalytics = useCallback(async (options?: SwapAnalyticsOptions) => {
    if (!facilityId) {
      throw new Error('Facility ID required for analytics')
    }
    
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getSwapAnalytics(facilityId, {
        ...options,
        include_role_analysis: true
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics'
      console.error('Failed to get enhanced analytics:', error)
      toast.error('Failed to load analytics')
      throw new Error(errorMessage)
    }
  }, [facilityId, apiClient])

  // NEW: Get workflow timing analytics
  const getWorkflowTimingAnalytics = useCallback(async (days: number = 30) => {
    if (!facilityId) {
      throw new Error('Facility ID required for timing analytics')
    }
    
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getWorkflowTimingAnalytics(facilityId, days)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load timing analytics'
      console.error('Failed to get timing analytics:', error)
      toast.error('Failed to load timing analytics')
      throw new Error(errorMessage)
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
  ): Promise<BulkApprovalResponse> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response = await apiClient.bulkApproveSwaps({
        swap_ids: swapIds,
        approved,
        notes,
        ignore_role_mismatches: ignoreRoleMismatches,
        role_override_reason: roleOverrideReason
      } as BulkApprovalData)
      
      await loadSwapRequests()
      
      const successCount = response.successful
      const roleIssues = response.role_verification_failures || 0
      
      if (roleIssues > 0) {
        toast.warning(`${successCount} swaps processed successfully, ${roleIssues} had role compatibility issues`)
      } else {
        toast.success(`${successCount} swaps ${approved ? 'approved' : 'declined'} successfully!`)
      }
      
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process bulk operation'
      console.error('Failed to bulk approve with role check:', error)
      toast.error('Failed to process bulk operation')
      throw new Error(errorMessage)
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
  ): Promise<BulkRetryResponse> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response = await apiClient.bulkRetryAutoAssignments({
        swap_ids: swapIds,
        ...options
      } as BulkRetryData)
      
      await loadSwapRequests()
      
      const successCount = response.successful_assignments || 0
      const roleIssues = response.role_compatibility_issues || 0
      
      if (roleIssues > 0) {
        toast.warning(`${successCount} assignments successful, ${roleIssues} had role compatibility issues`)
      } else {
        toast.success(`${successCount} auto-assignments completed successfully!`)
      }
      
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry assignments'
      console.error('Failed to bulk retry assignments:', error)
      toast.error('Failed to retry assignments')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  // ==================== ENHANCED UTILITIES ====================

  // NEW: Get swap recommendations
  const getSwapRecommendations = useCallback(async (data: SwapRecommendationData) => {
    if (!facilityId) {
      throw new Error('Facility ID required for recommendations')
    }
    
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getSwapRecommendations(facilityId, data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recommendations'
      console.error('Failed to get swap recommendations:', error)
      toast.error('Failed to load recommendations')
      throw new Error(errorMessage)
    }
  }, [facilityId, apiClient])

  // Enhanced create swap with validation
  const createSwapRequest = useCallback(async (
    swapData: {
      schedule_id: string
      requesting_staff_id: string
      original_day: number
      original_shift: number
      original_zone_id?: string
      swap_type: 'specific' | 'auto'
      target_staff_id?: string
      target_day?: number
      target_shift?: number
      reason: string
      urgency: SwapUrgency
      role_verification_required?: boolean
    }, 
    notificationOptions?: SwapNotificationOptions,
    validateFirst?: boolean
  ): Promise<{ success: boolean; response?: SwapRequest; validation?: SwapValidationResult }> => {
    try {
      // Optional validation before creation
      if (validateFirst) {
        const validationData = {
          schedule_id: swapData.schedule_id,
          requesting_staff_id: swapData.requesting_staff_id,
          original_day: swapData.original_day,
          original_shift: swapData.original_shift,
          original_zone_id: swapData.original_zone_id,
          swap_type: swapData.swap_type,
          target_staff_id: swapData.target_staff_id,
          target_day: swapData.target_day,
          target_shift: swapData.target_shift,
          role_verification_required: swapData.role_verification_required
        }
        const validation = await validateSwapRequest(validationData)
        if (!validation.is_valid) {
          const errorMessages = validation.errors.map(e => e.error_message).join(', ')
          toast.error(`Validation failed: ${errorMessages}`)
          return { success: false, validation }
        }
        
        if (validation.warnings.length > 0) {
          toast.warning(`Warnings: ${validation.warnings.join(', ')}`)
        }
      }
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response = await apiClient.createSwapRequest(swapData, notificationOptions)
      await loadSwapRequests()
      toast.success('Swap request created and notifications sent!')
      return { success: true, response }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create swap request'
      console.error('Failed to create enhanced swap request:', error)
      toast.error('Failed to create swap request')
      throw new Error(errorMessage)
    }
  }, [validateSwapRequest, loadSwapRequests, apiClient])

  // DEBUG
  useEffect(() => {
    console.log('=== SwapRequests State Changed ===')
    console.log('Total swaps:', swapRequests.length)
    console.log('Pending swaps:', swapRequests.filter(s => s.status === SwapStatus.Pending).length)
    console.log('Manager approved swaps:', swapRequests.filter(s => s.status === SwapStatus.ManagerApproved).length)
    console.log('Potential assignments:', swapRequests.filter(s => s.status === SwapStatus.PotentialAssignment).length)
    console.log('All statuses:', [...new Set(swapRequests.map(s => s.status))])
  }, [swapRequests])

  // ==================== ENHANCED COMPUTED VALUES ====================

  // Enhanced computed values with workflow states
  const pendingSwaps = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => swap.status === SwapStatus.Pending), 
    [swapRequests]
  )

  const urgentSwaps = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => [SwapUrgency.High, SwapUrgency.Emergency].includes(swap.urgency)), 
    [swapRequests]
  )

  const completedSwaps = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => swap.status === SwapStatus.Executed), 
    [swapRequests]
  )

  // NEW: Workflow-specific computed values
  const potentialAssignments = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => swap.status === SwapStatus.PotentialAssignment), 
    [swapRequests]
  )

  const awaitingStaffResponse = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => 
      [SwapStatus.ManagerApproved, SwapStatus.PotentialAssignment].includes(swap.status)
    ), [swapRequests]
  )

  const awaitingFinalApproval = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => swap.status === SwapStatus.StaffAccepted), 
    [swapRequests]
  )

  const roleOverrides = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => swap.role_override_applied === true), 
    [swapRequests]
  )

  const roleCompatible = useMemo(() => 
    swapRequests.filter((swap: SwapRequest) => 
      swap.role_override_applied === false && swap.assigned_staff_id
    ), [swapRequests]
  )

  // ==================== EXISTING OPERATIONS (KEPT FOR COMPATIBILITY) ====================

  const retryAutoAssignment = useCallback(async (swapId: string, avoidStaffIds?: string[]) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response = await apiClient.retryAutoAssignment(swapId, avoidStaffIds)
      await loadSwapRequests()
      toast.success('Auto-assignment retry initiated')
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry auto assignment'
      console.error('Failed to retry auto assignment:', error)
      toast.error('Failed to retry auto assignment')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  const getSwapDetails = useCallback(async (swapId: string): Promise<SwapRequest> => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      return await apiClient.getSwapRequest(swapId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load swap details'
      console.error('Failed to get swap details:', error)
      toast.error('Failed to load swap details')
      throw new Error(errorMessage)
    }
  }, [apiClient])

  const getSwapHistory = useCallback(async (swapId: string) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const [swapDetails, history] = await Promise.all([
        apiClient.getSwapRequest(swapId),
        apiClient.getSwapHistory(swapId)
      ])
      return { swap: swapDetails, history }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load swap history'
      console.error('Failed to get swap history:', error)
      toast.error('Failed to load swap history')
      throw new Error(errorMessage)
    }
  }, [apiClient])

  const updateSwapRequest = useCallback(async (swapId: string, updateData: Partial<SwapRequest>) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response = await apiClient.updateSwapRequest(swapId, updateData)
      await loadSwapRequests()
      toast.success('Swap request updated successfully!')
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update swap request'
      console.error('Failed to update swap request:', error)
      toast.error('Failed to update swap request')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  const cancelSwapRequest = useCallback(async (swapId: string, reason?: string) => {
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const response = await apiClient.cancelSwapRequest(swapId, reason)
      await loadSwapRequests()
      toast.success('Swap request cancelled')
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel swap request'
      console.error('Failed to cancel swap request:', error)
      toast.error('Failed to cancel swap request')
      throw new Error(errorMessage)
    }
  }, [loadSwapRequests, apiClient])

  // Load data on mount and when facilityId changes
  useEffect(() => {
    console.log('=== Enhanced useSwapRequests useEffect ===')
    console.log('Auth state:', { authLoading, isAuthenticated, hasApiClient: !!apiClient })
    
    // FIXED: Only load when auth is ready and apiClient exists
    if (!authLoading && isAuthenticated && apiClient && facilityId !== undefined) {
      loadSwapRequests()
    }
  }, [loadSwapRequests, authLoading, isAuthenticated, apiClient, facilityId])

  return {
    // ==================== DATA ====================
    swapRequests,
    swapSummary,
    workflowStatuses,
    loading: loading || authLoading,
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

    // ==================== STATE MANAGEMENT ====================
    isReady: !authLoading && !!apiClient && isAuthenticated,
    
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
  const [globalSummary, setGlobalSummary] = useState<{
  tenant_id: string
  total_swaps: number
  pending_swaps: number
  completed_swaps: number
  failed_swaps: number
  success_rate: number
  generated_at: string
} | null>(null)

const [facilitiesSummary, setFacilitiesSummary] = useState<Array<{
  facility_id: string
  facility_name: string
  pending_swaps: number
  total_swaps: number
  success_rate: number
}>>([])
  const [allSwapRequests, setAllSwapRequests] = useState<SwapRequest[]>([])
  const [workflowAnalytics, setWorkflowAnalytics] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiClient = useApiClient()

  const loadGlobalData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
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
        const facilitiesWithActivity = facilities.filter((f) => f.pending_swaps > 0)
        
        if (facilitiesWithActivity.length > 0) {
          try {
            const analyticsPromises = facilitiesWithActivity.map(async (facility) => {
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
              }, {} as Record<string, unknown>)
            
            setWorkflowAnalytics(analyticsMap)
          } catch (error) {
            console.warn('Failed to load workflow analytics:', error)
          }
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load global swap data'
      console.error('Failed to load enhanced global swap data:', error)
      setError(errorMessage)
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
  const [availableActions, setAvailableActions] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const apiClient = useApiClient()

  const loadWorkflowStatus = useCallback(async () => {
    if (!swapId) return
    
    setLoading(true)
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
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
  const [compatibilityCache, setCompatibilityCache] = useState<Record<string, unknown>>({})
  const apiClient = useApiClient()

  const checkCompatibility = useCallback(async (data: RoleCompatibilityData) => {
    const cacheKey = `${data.facility_id}-${data.zone_id}-${data.staff_id}-${data.original_shift_day}-${data.original_shift_number}`
    
    if (compatibilityCache[cacheKey]) {
      return compatibilityCache[cacheKey]
    }
    
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
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