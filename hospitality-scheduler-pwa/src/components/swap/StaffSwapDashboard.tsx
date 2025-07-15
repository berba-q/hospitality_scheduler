// components/swap/StaffSwapDashboard.tsx - Fixed version with working request button and swap counts
'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeftRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare,
  History,
  Plus,
  Filter,
  Search,
  Bell,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Star,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

// Import your existing components
import SwapDetailModal from '@/components/swap/SwapDetailModal'
import { StaffSwapRequestDialog } from '@/components/swap/StaffSwapRequestDialog'

// Import the sub-components we created
import { PersonalStatsCards } from '@/components/swap/PersonalStatsCards'
import { NotificationBanner } from '@/components/notification/NotificationBanner'
import { QuickActionsTab } from '@/components/swap/QuickActionsTab'
import { SwapRequestsList } from '@/components/swap/SwapRequestsList'

interface StaffSwapDashboardProps {
  user: any
  apiClient: any
}

function StaffSwapDashboard({ user, apiClient }: StaffSwapDashboardProps) {
  // Core data state
  const [swapRequests, setSwapRequests] = useState([])
  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [swapHistory, setSwapHistory] = useState([])
  const [personalStats, setPersonalStats] = useState({
    totalRequests: 0,
    acceptanceRate: 0,
    helpfulnessScore: 0,
    currentStreak: 0,
    thisWeekShifts: 0,
    avgResponseTime: 'N/A',
    availableToHelp: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState('quick-actions')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [showNotifications, setShowNotifications] = useState(true)
  
  // Modal states
  const [selectedSwap, setSelectedSwap] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState(null)

  useEffect(() => {
    console.log('🎬 Component mounted, starting data load...')
    console.log('👤 User in useEffect:', user)
    console.log('🔌 ApiClient methods available:', Object.keys(apiClient || {}))
    loadAllData()
  }, [])

  const loadAllData = async () => {
    console.log('🔄 Starting to load all swap data...')
    console.log('👤 Current user:', user)
    
    try {
      setLoading(true)
      
      // Load core swap requests using your existing API endpoint
      // This endpoint handles the email-to-staff mapping on the backend
      console.log('📡 Calling apiClient.getMySwapRequests...')
      console.log('🔍 API call details:', {
        apiClientExists: !!apiClient,
        methodExists: !!apiClient?.getMySwapRequests,
        userEmail: user?.email,
        userTenantId: user?.tenantId
      })
      
      const swaps = await apiClient.getMySwapRequests(undefined, 100)
      
      console.log('✅ Raw swap data received:', swaps)
      console.log('📊 Swap data details:', {
        totalCount: swaps?.length || 0,
        isArray: Array.isArray(swaps),
        firstSwap: swaps?.[0],
        swapTypes: swaps?.map(s => s.swap_type),
        statuses: swaps?.map(s => s.status),
        userRoles: swaps?.map(s => s.user_role), // This comes from your backend
        canRespondFlags: swaps?.map(s => s.can_respond)
      })
      
      setSwapRequests(swaps || [])

      // Calculate real stats using the user_role field from your backend
      calculatePersonalStatsFromSwaps(swaps || [])

      // Try to load enhanced data if available
      try {
        console.log('🚀 Attempting to load enhanced data...')
        
        const shifts = await apiClient.getMyUpcomingShifts?.() || []
        console.log('📅 Upcoming shifts:', shifts)
        setUpcomingShifts(shifts)
        
        // Only override with API stats if they exist and have real data
        const apiStats = await apiClient.getMySwapStats?.()
        console.log('📈 API stats received:', apiStats)
        
        if (apiStats && apiStats.totalRequests > 0) {
          console.log('✅ Using API stats (has real data)')
          setPersonalStats(apiStats)
        } else {
          console.log('⚠️ API stats empty or zero, keeping calculated stats')
        }

        // Load swap history if endpoint exists
        const history = await apiClient.getMySwapHistory?.() || []
        console.log('📜 Swap history:', history)
        setSwapHistory(history)
        
      } catch (enhancedError) {
        console.log('⚠️ Enhanced features not available:', enhancedError.message)
        console.log('📝 Using calculated stats from real data instead')
      }
      
    } catch (error) {
      console.error('❌ Failed to load swap data:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      toast.error('Failed to load swap requests: ' + error.message)
    } finally {
      setLoading(false)
      console.log('🏁 Data loading completed')
    }
  }

  // Calculate real personal stats from swap data using backend's user_role field
  const calculatePersonalStatsFromSwaps = (swaps) => {
    console.log('🧮 Calculating personal stats from swaps...')
    console.log('📊 Input data:', {
      swapsCount: swaps?.length || 0,
      userEmail: user?.email,
      userExists: !!user?.email,
      swapDetails: swaps?.map(s => ({ 
        id: s.id, 
        user_role: s.user_role, 
        status: s.status,
        can_respond: s.can_respond,
        target_staff_accepted: s.target_staff_accepted
      }))
    })
    
    if (!user?.email) {
      console.log('⚠️ No user email available, cannot calculate stats')
      setPersonalStats({
        totalRequests: 0,
        acceptanceRate: 0,
        helpfulnessScore: 0,
        currentStreak: 0,
        thisWeekShifts: 0,
        avgResponseTime: 'N/A',
        availableToHelp: 0
      })
      return
    }

    if (!swaps || swaps.length === 0) {
      console.log('⚠️ No swap data available, setting all stats to zero')
      setPersonalStats({
        totalRequests: 0,
        acceptanceRate: 0,
        helpfulnessScore: 0,
        currentStreak: 0,
        thisWeekShifts: 0,
        avgResponseTime: 'N/A',
        availableToHelp: 0
      })
      return
    }

    // Use the user_role field that your backend provides instead of trying to match IDs
    const myRequests = swaps.filter(s => s.user_role === 'requester')
    const requestsForMe = swaps.filter(s => s.user_role === 'target')
    const assignedToMe = swaps.filter(s => s.user_role === 'assigned')
    const pendingForMe = swaps.filter(s => s.can_respond === true)
    
    console.log('📈 Filtering results using backend user_role:', {
      totalSwaps: swaps.length,
      myRequests: myRequests.length,
      requestsForMe: requestsForMe.length,
      assignedToMe: assignedToMe.length,
      pendingForMe: pendingForMe.length,
      myRequestDetails: myRequests.map(s => ({ id: s.id, status: s.status, reason: s.reason })),
      requestsForMeDetails: requestsForMe.map(s => ({ id: s.id, status: s.status, accepted: s.target_staff_accepted }))
    })
    
    // Calculate acceptance rate (how often I accept when asked to cover for others)
    const acceptedByMe = requestsForMe.filter(s => 
      s.target_staff_accepted === true || s.status === 'staff_accepted' || s.status === 'executed'
    )
    const declinedByMe = requestsForMe.filter(s => 
      s.target_staff_accepted === false || s.status === 'staff_declined'
    )
    const acceptanceRate = requestsForMe.length > 0 
      ? Math.round((acceptedByMe.length / requestsForMe.length) * 100) 
      : 0
    
    console.log('🎯 Acceptance calculation:', {
      requestsForMe: requestsForMe.length,
      acceptedByMe: acceptedByMe.length,
      declinedByMe: declinedByMe.length,
      acceptanceRate: acceptanceRate + '%',
      acceptedDetails: acceptedByMe.map(s => ({ id: s.id, status: s.status, accepted: s.target_staff_accepted }))
    })
    
    // Calculate helpfulness score (combination of accepting requests for me and completing assigned tasks)
    const completedForOthers = [...requestsForMe, ...assignedToMe].filter(s => 
      s.status === 'executed' || s.status === 'completed'
    )
    const totalOpportunities = requestsForMe.length + assignedToMe.length
    const helpfulnessScore = totalOpportunities > 0 
      ? Math.round((completedForOthers.length / totalOpportunities) * 100) 
      : 0
    
    console.log('🤝 Helpfulness calculation:', {
      totalOpportunities,
      completedForOthers: completedForOthers.length,
      helpfulnessScore: helpfulnessScore + '%',
      completedDetails: completedForOthers.map(s => ({ id: s.id, status: s.status, user_role: s.user_role }))
    })
    
    // Calculate current streak (recent consecutive acceptances)
    const recentRequestsForMe = requestsForMe
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10) // Last 10 requests
    
    let currentStreak = 0
    for (const request of recentRequestsForMe) {
      if (request.target_staff_accepted === true || request.status === 'staff_accepted' || request.status === 'executed') {
        currentStreak++
      } else if (request.target_staff_accepted === false || request.status === 'staff_declined') {
        break // Streak broken
      }
      // Skip pending requests (don't break streak)
    }
    
    console.log('🔥 Streak calculation:', {
      recentRequests: recentRequestsForMe.length,
      currentStreak,
      recentDecisions: recentRequestsForMe.map(r => ({ 
        id: r.id, 
        accepted: r.target_staff_accepted,
        status: r.status,
        created: r.created_at
      }))
    })
    
    // Calculate average response time for responded requests
    const respondedRequests = requestsForMe.filter(s => 
      s.target_staff_accepted !== null && s.updated_at && s.created_at
    )
    
    let avgResponseTime = 'N/A'
    if (respondedRequests.length > 0) {
      const totalResponseTimeHours = respondedRequests.reduce((total, request) => {
        const created = new Date(request.created_at)
        const responded = new Date(request.updated_at)
        const diffHours = (responded.getTime() - created.getTime()) / (1000 * 60 * 60)
        return total + diffHours
      }, 0)
      
      const avgHours = totalResponseTimeHours / respondedRequests.length
      if (avgHours < 1) {
        avgResponseTime = `${Math.round(avgHours * 60)} minutes`
      } else if (avgHours < 24) {
        avgResponseTime = `${avgHours.toFixed(1)} hours`
      } else {
        avgResponseTime = `${Math.round(avgHours / 24)} days`
      }
    }

    console.log('⏱️ Response time calculation:', {
      respondedRequests: respondedRequests.length,
      avgResponseTime
    })

    const calculatedStats = {
      totalRequests: myRequests.length,
      acceptanceRate,
      helpfulnessScore,
      currentStreak,
      thisWeekShifts: 0, // Would need schedule data to calculate
      avgResponseTime,
      availableToHelp: pendingForMe.length
    }

    console.log('📊 Final calculated stats:', calculatedStats)
    setPersonalStats(calculatedStats)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
    toast.success('Data refreshed!')
  }

  const handleSwapClick = (swap) => {
    setSelectedSwap(swap)
    setShowDetailModal(true)
  }

  const handleSwapResponse = async (swapId, accepted, notes = '') => {
    try {
      await apiClient.respondToSwap(swapId, accepted, notes)
      await loadAllData()
      setShowDetailModal(false)
      toast.success(accepted ? 'Swap request accepted!' : 'Swap request declined')
    } catch (error) {
      console.error('Failed to respond to swap:', error)
      toast.error('Failed to respond to swap request')
    }
  }

  const handleCancelSwap = async (swapId, reason = '') => {
    try {
      await apiClient.cancelSwapRequest(swapId, reason)
      await loadAllData()
      setShowDetailModal(false)
      toast.success('Swap request cancelled')
    } catch (error) {
      console.error('Failed to cancel swap:', error)
      toast.error('Failed to cancel swap request')
    }
  }

  // Fixed: Proper handling of quick swap request
  const handleQuickSwapRequest = (shift) => {
    console.log('Quick swap request triggered with shift:', shift)
    
    if (shift) {
      // If a specific shift is provided (from upcoming shifts)
      setSelectedShiftForSwap({
        day: shift.day,
        shift: shift.shift,
        date: shift.date,
        shiftName: shift.shift_name || shift.shiftName,
        shiftTime: shift.shift_time || shift.shiftTime
      })
    } else {
      // If no shift provided (general request button), create a dummy shift for now
      // In a real app, you might want to show a shift selector first
      setSelectedShiftForSwap({
        day: 0, // Monday
        shift: 0, // Morning
        date: new Date().toISOString().split('T')[0],
        shiftName: 'General Request',
        shiftTime: 'Any shift'
      })
    }
    
    console.log('Opening modal with assignment details:', selectedShiftForSwap)
    setShowCreateModal(true)
  }

  // Alternative: Simple request button that always opens the modal
  const handleRequestSwapClick = () => {
    console.log('Request swap button clicked')
    
    // Create basic assignment details for the modal
    const basicAssignment = {
      day: 0, // Default to Monday
      shift: 0, // Default to Morning
      date: new Date().toISOString().split('T')[0],
      shiftName: 'New Swap Request',
      shiftTime: 'Select during request'
    }
    
    setSelectedShiftForSwap(basicAssignment)
    setShowCreateModal(true)
  }

  // Fixed: Proper handling of swap creation
  const handleCreateSwap = async (swapData) => {
    try {
      const requestData = {
        ...swapData,
        original_day: selectedShiftForSwap?.day,
        original_shift: selectedShiftForSwap?.shift,
        // Add any additional required fields
        facility_id: user.facility_id // If available
      }
      
      // Debug logging
      console.log('Creating swap request with data:', requestData)
      
      await apiClient.createSwapRequest(requestData)
      await loadAllData()
      setShowCreateModal(false)
      setSelectedShiftForSwap(null)
      toast.success('Swap request created successfully!')
    } catch (error) {
      console.error('Failed to create swap:', error)
      toast.error(error.message || 'Failed to create swap request')
    }
  }

  // Enhanced stats calculation using actual data
  useEffect(() => {
    if (swapRequests.length > 0 && user?.id) {
      calculatePersonalStatsFromSwaps(swapRequests)
    }
  }, [swapRequests, user?.id])

  // Filter and sort logic
  const getFilteredSwaps = () => {
    let filtered = swapRequests

    // Filter by tab using the user_role field from your backend
    switch (activeTab) {
      case 'my-requests':
        filtered = filtered.filter(swap => swap.user_role === 'requester')
        break
      case 'for-me':
        filtered = filtered.filter(swap => swap.user_role === 'target')
        break
      case 'action-needed':
        filtered = filtered.filter(swap => swap.can_respond === true)
        break
      case 'history':
        // Show completed/declined swaps
        filtered = filtered.filter(swap => 
          ['executed', 'completed', 'declined', 'cancelled', 'staff_declined'].includes(swap.status)
        )
        break
      default:
        break
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(swap => swap.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(swap => 
        swap.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.requesting_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.target_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'urgency':
          const urgencyOrder = { 'emergency': 0, 'high': 1, 'normal': 2, 'low': 3 }
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    console.log('🔍 Tab filtering results:', {
      activeTab,
      totalSwaps: swapRequests.length,
      filteredCount: filtered.length,
      swapRoles: swapRequests.map(s => ({ id: s.id, user_role: s.user_role, status: s.status })),
      filteredIds: filtered.map(s => s.id)
    })

    return filtered
  }

  // Get notifications - fix the logic
  const getNotifications = () => {
    const actionNeeded = swapRequests.filter(swap => swap.can_respond === true)
    
    const urgentExpiring = swapRequests.filter(swap => 
      swap.expires_at && 
      new Date(swap.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
      ['pending', 'manager_approved'].includes(swap.status)
    )

    console.log('🔔 Notifications calculated:', {
      actionNeeded: actionNeeded.length,
      urgentExpiring: urgentExpiring.length,
      actionNeededSwaps: actionNeeded.map(s => ({ id: s.id, user_role: s.user_role, can_respond: s.can_respond }))
    })

    return { actionNeeded, urgentExpiring }
  }

  const filteredSwaps = getFilteredSwaps()
  const { actionNeeded, urgentExpiring } = getNotifications()

  // Calculate swap counts for tab badges using user_role
  const myRequestsCount = swapRequests.filter(s => s.user_role === 'requester').length
  const forMeCount = swapRequests.filter(s => s.user_role === 'target').length
  const historyCount = swapRequests.filter(s => 
    ['executed', 'completed', 'declined', 'cancelled', 'staff_declined'].includes(s.status)
  ).length

  // Debug logging - this should run every render
  console.log('🎯 CURRENT RENDER STATE:', {
    activeTab,
    swapRequestsTotal: swapRequests.length,
    myRequestsCount,
    forMeCount,
    historyCount,
    actionNeededCount: actionNeeded.length,
    filteredSwapsCount: filteredSwaps.length,
    rawSwapData: swapRequests.map(s => ({ 
      id: s.id, 
      user_role: s.user_role, 
      status: s.status,
      can_respond: s.can_respond 
    }))
  })

  // Additional debug for the specific "My Requests" tab
  if (activeTab === 'my-requests') {
    console.log('🔍 MY REQUESTS TAB DEBUG:', {
      activeTab,
      totalSwaps: swapRequests.length,
      myRequestsFiltered: swapRequests.filter(s => s.user_role === 'requester'),
      filteredSwapsResult: filteredSwaps,
      shouldShowSwaps: filteredSwaps.length > 0
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your swap dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personalized Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Hey {user.name?.split(' ')[0] || user.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your shifts and help your team with swap requests
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>📋 {personalStats.totalRequests} requests made</span>
            <span>✅ {swapRequests.filter(s => s.status === 'executed').length} completed</span>
            <span>⏳ {actionNeeded.length} need response</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleRequestSwapClick} 
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Plus className="w-4 h-4" />
            Request Swap
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <NotificationBanner 
        actionNeeded={actionNeeded}
        urgentExpiring={urgentExpiring}
        showNotifications={showNotifications}
        onDismiss={() => setShowNotifications(false)}
      />

      {/* Personal Stats */}
      <PersonalStatsCards stats={personalStats} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="my-requests" className="relative">
            My Requests
            {myRequestsCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs">
                {myRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="for-me" className="relative">
            For Me
            {forMeCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-green-600 text-white text-xs">
                {forMeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="action-needed" className="relative">
            Action Needed
            {actionNeeded.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-red-600 text-white text-xs animate-pulse">
                {actionNeeded.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="relative">
            History
            {historyCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-gray-600 text-white text-xs">
                {historyCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions">
          <QuickActionsTab 
            upcomingShifts={upcomingShifts}
            actionNeeded={actionNeeded}
            personalStats={personalStats}
            onQuickSwapRequest={handleQuickSwapRequest}
            onSwapResponse={handleSwapResponse}
            onSwapClick={handleSwapClick}
          />
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="my-requests">
          <SwapRequestsList 
            swaps={filteredSwaps}
            user={user}
            onSwapClick={handleSwapClick}
            onSwapResponse={handleSwapResponse}
            onCancelSwap={handleCancelSwap}
            showFilters={true}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            emptyMessage="You haven't made any swap requests yet"
            emptySubMessage="Create your first swap request to get started"
          />
        </TabsContent>

        {/* For Me Tab */}
        <TabsContent value="for-me">
          <SwapRequestsList 
            swaps={filteredSwaps}
            user={user}
            onSwapClick={handleSwapClick}
            onSwapResponse={handleSwapResponse}
            onCancelSwap={handleCancelSwap}
            showFilters={true}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            emptyMessage="No one has requested a swap with you yet"
            emptySubMessage="When colleagues need your specific shifts, they'll appear here"
          />
        </TabsContent>

        {/* Action Needed Tab */}
        <TabsContent value="action-needed">
          <SwapRequestsList 
            swaps={filteredSwaps}
            user={user}
            onSwapClick={handleSwapClick}
            onSwapResponse={handleSwapResponse}
            onCancelSwap={handleCancelSwap}
            showFilters={false}
            emptyMessage="All caught up! No action needed"
            emptySubMessage="Check back later for new requests that need your attention"
            prioritizeUrgent={true}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Swap History</h3>
                <p className="text-sm text-gray-600">View your past swap requests and outcomes</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowHistoryModal(true)}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                View Analytics
              </Button>
            </div>
            
            <SwapRequestsList 
              swaps={filteredSwaps}
              user={user}
              onSwapClick={handleSwapClick}
              onSwapResponse={handleSwapResponse}
              onCancelSwap={handleCancelSwap}
              showFilters={true}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              emptyMessage="No swap history yet"
              emptySubMessage="Your completed, declined, and cancelled swaps will appear here"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedSwap && (
        <SwapDetailModal 
          swap={selectedSwap}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onSwapResponse={handleSwapResponse}
          onCancelSwap={handleCancelSwap}
          user={user}
          apiClient={apiClient}
        />
      )}

      <StaffSwapRequestDialog
        isOpen={showCreateModal}
        onClose={() => {
          console.log('Closing modal')
          setShowCreateModal(false)
          setSelectedShiftForSwap(null)
        }}
        assignmentDetails={selectedShiftForSwap}
        onSubmitSwap={handleCreateSwap}
        availableStaff={[]} // You can implement this later
      />
    </div>
  )
}

export default StaffSwapDashboard