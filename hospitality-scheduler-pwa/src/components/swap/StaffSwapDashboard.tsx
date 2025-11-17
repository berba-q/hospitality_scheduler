//staff swap dashboard
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Clock,
  User,
  ArrowLeftRight,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Eye,
  Activity,
  Award,
  Zap,
  ThumbsUp,
  History,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/useTranslations'
import * as SwapTypes from '@/types/swaps'
import * as AuthTypes from '@/types/auth'
import * as ScheduleTypes from '@/types/schedule'

// Import existing components
import SwapDetailModal from '@/components/swap/SwapDetailModal'
import { StaffSwapRequestDialog } from '@/components/swap/StaffSwapRequestDialog'
import { SwapRequestsList } from '@/components/swap/SwapRequestsList'
import { PotentialAssignmentCard } from './WorkflowStatusIndicator'

// API Client interface
interface ApiClient {
  getFacilities: () => Promise<Array<{ id: string; name: string }>>
  getFacilitySchedules: (facilityId: string) => Promise<ScheduleTypes.Schedule[]>
  getStaffSwapRequests: () => Promise<SwapTypes.SwapRequest[] | { data: SwapTypes.SwapRequest[] }>
  getStaffDashboardStats: () => Promise<PersonalStats & { upcomingShifts: UpcomingShift[] }>
  respondToPotentialAssignment: (swapId: string, data: { accepted: boolean; notes?: string; availability_confirmed?: boolean }) => Promise<void>
  RespondToSwap: (swapId: string, data: { accepted: boolean; notes?: string; confirm_availability?: boolean }) => Promise<void>
  cancelSwapRequest: (swapId: string, reason?: string) => Promise<void>
  createSwapRequest: (swapData: unknown) => Promise<unknown>
}

// Personal stats interface
interface PersonalStats {
  totalRequests: number
  acceptanceRate: number
  helpfulnessScore: number
  currentStreak: number
  thisWeekShifts: number
  avgResponseTime: string
  availableToHelp: number
  totalHelped: number
  teamRating: number
}

// Upcoming shift interface
interface UpcomingShift {
  id: string
  date: string
  shift_name: string
  start_time: string
  end_time: string
  facility_name: string
  zone?: string
}

// Extended swap request with computed fields
interface ExtendedSwapRequest extends SwapTypes.SwapRequest {
  status: SwapTypes.SwapStatus
  isAutoAssignment: boolean
  isForCurrentUser: boolean
  canRespond: boolean
  user_role?: 'requester' | 'target' | 'assigned'
  assigned_staff_accepted?: boolean | null
}

interface StaffSwapDashboardProps {
  user: AuthTypes.User & { staffId?: string }
  apiClient: ApiClient
}

// Helper function to normalize status values
const normalizeSwapStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'potential_assignment': 'awaiting_target',
    'assigned': 'awaiting_target',
    'manager_approved': 'awaiting_target', // For specific swaps
  }
  
  return statusMap[status] || status
}

// Helper function to determine if user is assigned to a swap
const isUserAssignedToSwap = (swap: ExtendedSwapRequest, userId: string): boolean => {
  // Check if user is target staff for specific swaps
  if (swap.swap_type === 'specific' && swap.target_staff_id === userId) {
    return true
  }

  // Check if user is auto-assigned staff
  if (swap.swap_type === 'auto' && swap.assigned_staff_id === userId) {
    return true
  }

  // Fallback: check user_role from backend
  if (swap.user_role === 'target' || swap.user_role === 'assigned') {
    return true
  }

  return false
}

//  Helper function to determine if user can respond to a swap
const canUserRespondToSwap = (swap: ExtendedSwapRequest, userId: string): boolean => {
  const normalizedStatus = normalizeSwapStatus(swap.status)

  // Must be assigned to the swap
  if (!isUserAssignedToSwap(swap, userId)) {
    return false
  }

  // Must be in a respondable status
  const respondableStatuses = ['pending', 'awaiting_target', 'manager_approved']
  if (!respondableStatuses.includes(normalizedStatus)) {
    return false
  }

  // Check if already responded
  if (swap.swap_type === 'specific' && swap.target_staff_accepted !== null) {
    return false
  }

  if (swap.swap_type === 'auto' && swap.assigned_staff_accepted !== null) {
    return false
  }

  return true
}

function StaffSwapDashboard({ user, apiClient }: StaffSwapDashboardProps) {
  const { data: session } = useSession()
  const { t } = useTranslations()

  // Core data state
  const [swapRequests, setSwapRequests] = useState<ExtendedSwapRequest[]>([])
  const [, setUpcomingShifts] = useState<UpcomingShift[]>([])
  const [personalStats, setPersonalStats] = useState<PersonalStats>({
    totalRequests: 0,
    acceptanceRate: 0,
    helpfulnessScore: 0,
    currentStreak: 0,
    thisWeekShifts: 0,
    avgResponseTime: 'N/A',
    availableToHelp: 0,
    totalHelped: 0,
    teamRating: 85
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleTypes.Schedule | null>(null)
  const [currentWeek, setCurrentWeek] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState('overview')

  // Modal state
  const [selectedSwap, setSelectedSwap] = useState<ExtendedSwapRequest | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<{
    day: number
    shift: number
    date: string
    shiftName: string
    shiftTime: string
  } | null>(null)

  //  user ID handling and assignment detection
  const userId = user?.staffId || user?.id

  const potentialAssignments = swapRequests.filter(swap => {
    //  awaiting target response
    if (swap.status !== SwapTypes.SwapStatus.PotentialAssignment &&
        swap.status !== SwapTypes.SwapStatus.ManagerApproved) {
      return false
    }

    // assigned to this user
    return isUserAssignedToSwap(swap, userId)
  })

  console.log(' ===== DEBUGGING DISABLED BUTTONS =====')
console.log('Current user:', user)
console.log(' User ID:', userId)
console.log('Potential assignments:', potentialAssignments.length)

// Debug the first assignment in detail
if (potentialAssignments.length > 0) {
  const assignment = potentialAssignments[0]
  console.log('Assignment Details:')
  console.log('   Swap ID:', assignment.id)
  console.log('   Swap Type:', assignment.swap_type)
  console.log('   Status:', assignment.status)
  console.log('   Assigned Staff ID:', assignment.assigned_staff_id)
  console.log('   Assigned Staff Accepted:', assignment.assigned_staff_accepted)
  console.log('   Your ID:', userId)
  console.log('   IDs Match?', userId === assignment.assigned_staff_id)
  console.log('   Already Responded?', assignment.assigned_staff_accepted !== null)

  // Check what's blocking buttons
  const canRespond = (userId === assignment.assigned_staff_id) && (assignment.assigned_staff_accepted === null)
  console.log('CAN RESPOND?', canRespond)
} else {
  console.log('No potential assignments found!')
}
console.log(' ===== END DEBUGGING =====')

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      console.log('Loading staff swap data...')

      // Load current schedule context
      try {
        const facilitiesData = await apiClient.getFacilities()
        if (facilitiesData && facilitiesData.length > 0) {
          const facility = facilitiesData[0] // Get user's facility

          // Get current week's schedule
          const schedulesData = await apiClient.getFacilitySchedules(facility.id)
          if (schedulesData && schedulesData.length > 0) {
            const currentSched = schedulesData[0] // Get most recent schedule
            setCurrentSchedule(currentSched)
            setCurrentWeek(currentSched.week_start)
            console.log('Current schedule context:', {
              id: currentSched.id,
              week: currentSched.week_start
            })
          }
        }
      } catch (schedError) {
        console.warn('Could not load schedule context:', schedError)
      }

      // Load swap requests
      const swapsData = await apiClient.getStaffSwapRequests()
      console.log('Raw swaps response:', swapsData)

      const swapArray = Array.isArray(swapsData) ? swapsData : (swapsData?.data || [])

      // ✅ NEW: Process and normalize swap statuses
      const processedSwaps: ExtendedSwapRequest[] = swapArray.map((swap): ExtendedSwapRequest => {
        // Type assertion for backend fields not in the base SwapRequest type
        const swapWithExtras = swap as SwapTypes.SwapRequest & {
          user_role?: 'requester' | 'target' | 'assigned'
          assigned_staff_accepted?: boolean | null
        }

        const extendedSwap: ExtendedSwapRequest = {
          ...swap,
          status: swap.status as SwapTypes.SwapStatus,
          isAutoAssignment: swap.swap_type === 'auto',
          isForCurrentUser: false,
          canRespond: false,
          user_role: swapWithExtras.user_role,
          assigned_staff_accepted: swapWithExtras.assigned_staff_accepted ?? null
        }

        extendedSwap.isForCurrentUser = isUserAssignedToSwap(extendedSwap, userId)
        extendedSwap.canRespond = canUserRespondToSwap(extendedSwap, userId)

        return extendedSwap
      })

      setSwapRequests(processedSwaps)

      console.log('✅ Processed swap requests:', processedSwaps.length)
      if (processedSwaps.length > 0) {
        console.log('📋 Sample processed swap:', processedSwaps[0])
        console.log('🎯 Auto-assignments for user:', processedSwaps.filter(s => s.isAutoAssignment && s.isForCurrentUser).length)
      }

      // Load additional staff data if available
      try {
        const statsData = await apiClient.getStaffDashboardStats()
        setUpcomingShifts(statsData?.upcomingShifts || [])
        setPersonalStats(prev => ({
          ...prev,
          ...statsData,
          totalRequests: processedSwaps.length
        }))
      } catch (error) {
        console.warn(' Stats API not available:', error)
        // Set basic stats from swap data
        setPersonalStats(prev => ({
          ...prev,
          totalRequests: processedSwaps.length
        }))
      }

    } catch (error) {
      console.error(' Failed to load data:', error)
      toast.error(t('errors.failedToLoad'))
      setSwapRequests([])
    } finally {
      setLoading(false)
    }
  }, [apiClient, userId, t])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const filteredAndCategorizedData = useMemo(() => {
    console.log('🔍 Starting data categorization...')
    console.log('👤 User for filtering:', { id: user?.id, staff_id: user?.staff_id })
    console.log('📊 Swap requests to filter:', swapRequests.length)
    
    if (!swapRequests?.length) {
      console.log('⚠️ No swap requests to filter')
      return {
        myRequests: [],
        forMe: [],
        actionNeeded: [],
        history: [],
        all: []
      }
    }

    console.log('🆔 Using user ID for filtering:', userId)

    // Log sample swap data structure
    if (swapRequests.length > 0) {
      console.log('📋 Sample swap data structure:', {
        requesting_staff_id: swapRequests[0]?.requesting_staff_id,
        target_staff_id: swapRequests[0]?.target_staff_id,
        assigned_staff_id: swapRequests[0]?.assigned_staff_id,
        status: swapRequests[0]?.status,
        user_role: swapRequests[0]?.user_role,
        isAutoAssignment: swapRequests[0]?.isAutoAssignment,
        isForCurrentUser: swapRequests[0]?.isForCurrentUser,
        canRespond: swapRequests[0]?.canRespond
      })
    }

    const categorized = {
      // ✅ UPDATED: Better filtering for user's requests
      myRequests: swapRequests.filter(swap => {
        const isMyRequest = swap.user_role === 'requester' || 
                           swap.requesting_staff_id === userId ||
                           swap.requesting_staff_id === user?.id
        return isMyRequest
      }),
      
      // ✅ UPDATED: Better filtering for requests directed at user
      forMe: swapRequests.filter(swap => {
        return swap.isForCurrentUser || 
               swap.user_role === 'target' || 
               swap.user_role === 'assigned'
      }),
      
      // ✅ UPDATED: Better filtering for action needed
      actionNeeded: swapRequests.filter(swap => {
        return swap.canRespond && swap.isForCurrentUser
      }),
      
      // Historical requests
      history: swapRequests.filter(swap => {
        const isHistory = [
          SwapTypes.SwapStatus.Executed,
          SwapTypes.SwapStatus.Declined,
          SwapTypes.SwapStatus.Cancelled,
          SwapTypes.SwapStatus.StaffDeclined,
          SwapTypes.SwapStatus.AssignmentDeclined
        ].includes(swap.status)
        return isHistory
      }),
      
      // All requests involving me
      all: swapRequests.filter(swap => {
        const involvesMe = (swap.user_role && ['requester', 'target', 'assigned'].includes(swap.user_role)) ||
                          swap.requesting_staff_id === userId ||
                          swap.requesting_staff_id === user?.id ||
                          swap.isForCurrentUser
        return involvesMe
      })
    }

    console.log('📈 Final categorized data:', {
      myRequests: categorized.myRequests.length,
      forMe: categorized.forMe.length,
      actionNeeded: categorized.actionNeeded.length,
      history: categorized.history.length,
      all: categorized.all.length,
      autoAssignments: categorized.forMe.filter(s => s.isAutoAssignment).length
    })

    return categorized
  }, [swapRequests, user?.id, user?.staff_id, userId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
    toast.success(t('messages.dataRefreshed'))
  }

  const handleSwapClick = (swap: ExtendedSwapRequest) => {
    setSelectedSwap(swap)
    setShowDetailModal(true)
  }

  // ✅ COMPLETELY FIXED: Smart API method detection and calling
  const handleSwapResponse = async (swapId: string, accepted: boolean, notes: string = '') => {
    try {
      console.log('🔄 Dashboard handling swap response:', { swapId, accepted, notes })
      
      // Find the swap to determine type and status
      const swap = swapRequests.find(s => s.id === swapId)
      if (!swap) {
        throw new Error(t('errors.swapNotFound'))
      }

      console.log('🔍 Swap details for response:', {
        id: swap.id,
        type: swap.swap_type,
        status: swap.status,
        originalStatus: swapRequests.find(s => s.id === swapId)?.status
      })

      // ✅ Detect swap type and status to use correct API method
      if (swap.swap_type === 'auto' &&
          [SwapTypes.SwapStatus.PotentialAssignment, SwapTypes.SwapStatus.ManagerApproved].includes(swap.status)) {

        // ✅ For auto assignments awaiting response, use respondToPotentialAssignment
        console.log('🔄 Using respondToPotentialAssignment for auto swap')
        await apiClient.respondToPotentialAssignment(swapId, {
          accepted,
          notes,
          availability_confirmed: true
        })

      } else if (swap.swap_type === 'specific' &&
                 [SwapTypes.SwapStatus.Pending, SwapTypes.SwapStatus.ManagerApproved].includes(swap.status)) {

        console.log('Using RespondToSwap for specific swap')
        await apiClient.RespondToSwap(swapId, {
          accepted,
          notes,
          confirm_availability: true
        })
        
      } else {
        throw new Error(`${t('errors.cannotRespond')}: ${swap.status} ${t('common.with')} ${swap.swap_type}`)
      }

      // Refresh data after successful response
      await loadAllData()
      
      //  Close modal if it's open
      setShowDetailModal(false)
      
      //  Show success toast
      toast.success(accepted ? t('messages.swapAccepted') : t('messages.swapDeclined'))
      
    } catch (error) {
      console.error(' Failed to respond to swap:', error)

      //  Show specific error message
      const errorMessage = (error instanceof Error ? error.message : null) || t('errors.failedToRespond')
      toast.error(errorMessage)

      // Re-throw error so calling components can handle it
      throw error
    }
  }

  const handleCancelSwap = async (swapId: string, reason = '') => {
    try {
      await apiClient.cancelSwapRequest(swapId, reason)
      await loadAllData()
      setShowDetailModal(false)
      toast.success(t('messages.swapCancelled'))
    } catch (error) {
      console.error('Failed to cancel swap:', error)
      toast.error(t('errors.failedToCancelSwap'))
    }
  }

  const handleCreateSwap = async (swapData: unknown) => {
    try {
      console.log('🔍 AUTH DEBUG: Current user from useAuth:', user)
      console.log('🔍 AUTH DEBUG: Session data:', session)
      console.log('🔍 AUTH DEBUG: User ID being used:', user?.id)
      console.log('🔍 AUTH DEBUG: Staff ID being used:', user?.staff_id)
      console.log('Creating swap with data:', swapData)
      
      const result = await apiClient.createSwapRequest(swapData)
      
      console.log('Swap created successfully:', result)
      
      await loadAllData()
      setShowCreateModal(false)
      setSelectedShiftForSwap(null)
      toast.success(t('messages.swapRequestCreated'))
      
    } catch (error) {
      console.error(' Failed to create swap:', error)
      toast.error((error instanceof Error ? error.message : null) || t('errors.failedToCreateSwap'))
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loadingSwaps')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {t('swaps.shiftManagement')}
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {t('swaps.manageShiftsSubtitle')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2 hover:bg-blue-50 border-blue-200"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {t('swaps.requestSwap')}
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">{t('swaps.myRequests')}</p>
                  <p className="text-3xl font-bold">{filteredAndCategorizedData.myRequests.length}</p>
                </div>
                <ArrowLeftRight className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">{t('swaps.requestsForMe')}</p>
                  <p className="text-3xl font-bold">{filteredAndCategorizedData.forMe.length}</p>
                  {/* ✅ NEW: Show auto-assignments count */}
                  {filteredAndCategorizedData.forMe.filter(s => s.isAutoAssignment).length > 0 && (
                    <p className="text-green-100 text-xs">
                      {filteredAndCategorizedData.forMe.filter(s => s.isAutoAssignment).length} {t('swaps.autoAssignments')}
                    </p>
                  )}
                </div>
                <User className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">{t('swaps.actionNeeded')}</p>
                  <p className="text-3xl font-bold">{filteredAndCategorizedData.actionNeeded.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">{t('swaps.completionRate')}</p>
                  <p className="text-3xl font-bold">{personalStats.acceptanceRate || 0}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5 bg-gray-100">
                    <TabsTrigger value="overview">{t('swaps.swapsOverview')}</TabsTrigger>
                    <TabsTrigger value="my-requests" className="relative">
                      {t('swaps.myRequests')}
                      {filteredAndCategorizedData.myRequests.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs">
                          {filteredAndCategorizedData.myRequests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="for-me" className="relative">
                      {t('swaps.forMe')}
                      {filteredAndCategorizedData.forMe.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-green-600 text-white text-xs">
                          {filteredAndCategorizedData.forMe.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="action-needed" className="relative">
                      {t('swaps.actionNeeded')}
                      {filteredAndCategorizedData.actionNeeded.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-red-600 text-white text-xs animate-pulse">
                          {filteredAndCategorizedData.actionNeeded.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="relative">
                      {t('swaps.swapHistory')}
                      {filteredAndCategorizedData.history.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-gray-600 text-white text-xs">
                          {filteredAndCategorizedData.history.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Action Needed Alert */}
                    {filteredAndCategorizedData.actionNeeded.length > 0 && (
                      <Card className="border-l-4 border-l-red-500 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <div>
                              <h3 className="font-medium text-red-800">{t('swaps.actionRequired')}</h3>
                              <p className="text-sm text-red-600">
                                {t('swaps.youHaveSwapRequests', { 
                                  count: filteredAndCategorizedData.actionNeeded.length 
                                })}
                                {/* ✅ NEW: Show auto-assignment indicator */}
                                {filteredAndCategorizedData.actionNeeded.filter(s => s.isAutoAssignment).length > 0 && (
                                  <span className="ml-1">
                                    ({filteredAndCategorizedData.actionNeeded.filter(s => s.isAutoAssignment).length} {t('swaps.autoAssignments')})
                                  </span>
                                )}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setActiveTab('action-needed')}
                              className="ml-auto bg-red-600 hover:bg-red-700"
                            >
                              {t('common.reviewNow')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <ArrowLeftRight className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <h3 className="font-medium text-blue-800">{t('swaps.totalRequests')}</h3>
                          <p className="text-2xl font-bold text-blue-900">{filteredAndCategorizedData.all.length}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4 text-center">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <h3 className="font-medium text-green-800">{t('common.completed')}</h3>
                          <p className="text-2xl font-bold text-green-900">
                            {filteredAndCategorizedData.all.filter(s => s.status === SwapTypes.SwapStatus.Executed).length}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-4 text-center">
                          <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <h3 className="font-medium text-purple-800">{t('common.pending')}</h3>
                          <p className="text-2xl font-bold text-purple-900">
                            {filteredAndCategorizedData.all.filter(s => s.status === SwapTypes.SwapStatus.Pending).length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* ✅ UPDATED: Coverage Requests with better auto-assignment handling */}
                    {potentialAssignments.length > 0 && (
                      <Card className="border-l-4 border-l-purple-500 bg-purple-50">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            {t('swaps.coverageRequests')}
                            {/* ✅ NEW: Show auto-assignment indicator in title */}
                            {potentialAssignments.filter(s => s.isAutoAssignment).length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {potentialAssignments.filter(s => s.isAutoAssignment).length} {t('swaps.autoAssigned')}
                              </Badge>
                            )}
                          </CardTitle>
                          <Badge>{potentialAssignments.length}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {potentialAssignments.map(assignment => (
                            <div key={assignment.id} className="relative">
                              {/* ✅ NEW: Auto-assignment indicator */}
                              {assignment.isAutoAssignment && (
                                <div className="absolute top-2 right-2 z-10">
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {t('swaps.autoAssigned')}
                                  </Badge>
                                </div>
                              )}
                              <PotentialAssignmentCard
                                swap={assignment}
                                onRespond={handleSwapResponse}
                                loading={false}
                              />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        {t('swaps.recentActivity')}
                      </h3>
                      {filteredAndCategorizedData.all.length > 0 ? (
                        <div className="space-y-3">
                          {filteredAndCategorizedData.all
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map(swap => (
                              <Card key={swap.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSwapClick(swap)}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={
                                          swap.status === SwapTypes.SwapStatus.Pending ? 'bg-yellow-100 text-yellow-800' :
                                          swap.status === SwapTypes.SwapStatus.Executed ? 'bg-green-100 text-green-800' :
                                          swap.status === SwapTypes.SwapStatus.Declined ? 'bg-red-100 text-red-800' :
                                          swap.status === SwapTypes.SwapStatus.PotentialAssignment ? 'bg-purple-100 text-purple-800' :
                                          swap.status === SwapTypes.SwapStatus.ManagerApproved ? 'bg-purple-100 text-purple-800' :
                                          'bg-gray-100 text-gray-800'
                                        }>
                                          {t(`status.${swap.status}`)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {t(`swaps.${swap.user_role}`)}
                                        </Badge>
                                        {/* Auto-assignment indicator */}
                                        {swap.isAutoAssignment && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                            {t('swaps.auto')}
                                          </Badge>
                                        )}
                                        <span className="text-sm text-gray-500">
                                          {new Date(swap.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {swap.reason || t('swaps.noReasonProvided')}
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          }
                        </div>
                      ) : (
                        <Card className="border-dashed border-2 border-gray-200">
                          <CardContent className="p-8 text-center">
                            <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('swaps.noSwapRequests')}</h3>
                            <p className="text-gray-600 mb-4">{t('swaps.noSwapRequestsSubtitle')}</p>
                            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                              <Plus className="w-4 h-4" />
                              {t('swaps.createFirstRequest')}
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="my-requests">
                    <SwapRequestsList 
                      swaps={filteredAndCategorizedData.myRequests}
                      user={user}
                      onSwapClick={handleSwapClick}
                      onSwapResponse={handleSwapResponse}
                      onCancelSwap={handleCancelSwap}
                      showFilters={false}
                      emptyMessage={t('swaps.noSwapRequests')}
                      emptySubMessage={t('swaps.noSwapRequestsSubtitle')}
                    />
                  </TabsContent>

                  <TabsContent value="for-me">
                    <SwapRequestsList 
                      swaps={filteredAndCategorizedData.forMe}
                      user={user}
                      onSwapClick={handleSwapClick}
                      onSwapResponse={handleSwapResponse}
                      onCancelSwap={handleCancelSwap}
                      showFilters={false}
                      emptyMessage={t('swaps.noRequestsForYou')}
                      emptySubMessage={t('swaps.noRequestsForYouSubtitle')}
                      prioritizeUrgent={true}
                    />
                  </TabsContent>

                  <TabsContent value="action-needed">
                    <SwapRequestsList 
                      swaps={filteredAndCategorizedData.actionNeeded}
                      user={user}
                      onSwapClick={handleSwapClick}
                      onSwapResponse={handleSwapResponse}
                      onCancelSwap={handleCancelSwap}
                      showFilters={false}
                      emptyMessage={t('swaps.noActionNeeded')}
                      emptySubMessage={t('swaps.noActionNeededSubtitle')}
                      prioritizeUrgent={true}
                    />
                  </TabsContent>

                  <TabsContent value="history">
                    <SwapRequestsList 
                      swaps={filteredAndCategorizedData.history}
                      user={user}
                      onSwapClick={handleSwapClick}
                      onSwapResponse={handleSwapResponse}
                      onCancelSwap={handleCancelSwap}
                      showFilters={false}
                      emptyMessage={t('swaps.noHistory')}
                      emptySubMessage={t('swaps.noHistorySubtitle')}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Team Stats */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Award className="w-5 h-5" />
                  {t('swaps.teamReliability')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {personalStats.teamRating || 85}
                    </div>
                    <p className="text-indigo-100 text-sm">{t('swaps.reliabilityScore')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-100">{t('swaps.responseRate')}</span>
                      <span className="text-white font-medium">{personalStats.acceptanceRate || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-100">{t('swaps.timesHelped')}</span>
                      <span className="text-white font-medium">{personalStats.totalHelped || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('common.quickActions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start gap-3"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  {t('swaps.requestSwap')}
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('common.refreshData')}
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('history')}
                >
                  <History className="w-4 h-4" />
                  {t('common.viewHistory')}
                </Button>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-medium text-green-800 mb-2">{t('swaps.everyBitHelps')}</h3>
                  <p className="text-sm text-green-600">
                    {t('swaps.supportingTeammates')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedSwap && (
        <SwapDetailModal 
          swap={selectedSwap}
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedSwap(null)
          }}
          onSwapResponse={handleSwapResponse}
          onCancelSwap={handleCancelSwap}
          user={user}
          apiClient={apiClient}
        />
      )}

      <StaffSwapRequestDialog
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedShiftForSwap(null)
        }}
        scheduleId={currentSchedule?.id}
        currentWeek={currentWeek ?? undefined}
        assignmentDetails={selectedShiftForSwap || null}
        onSubmitSwap={handleCreateSwap}
        availableStaff={[]}
      />
    </div>
  )
}

export default StaffSwapDashboard