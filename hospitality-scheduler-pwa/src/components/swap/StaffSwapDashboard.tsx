// hospitality-scheduler-pwa/src/components/swap/StaffSwapDashboard.tsx
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
  BarChart3,
  CalendarOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

// Import existing components
import SwapDetailModal from '@/components/swap/SwapDetailModal'
import { StaffSwapRequestDialog } from '@/components/swap/StaffSwapRequestDialog'
import { PersonalStatsCards } from '@/components/swap/PersonalStatsCards'
import { NotificationBanner } from '@/components/notification/NotificationBanner'
import { QuickActionsTab } from '@/components/swap/QuickActionsTab'
import { SwapRequestsList } from '@/components/swap/SwapRequestsList'

// Import new components
import { TimeOffRequestModal } from '@/components/availability/TimeOffRequestModal'
import { TeamReliabilityBadges } from '@/components/gamification/TeamReliabilityBadges'
import { ReliabilityProgressCard } from '@/components/gamification/ReliabilityProgressCard'
import { TeamSupportInsights } from '@/components/gamification/TeamSupportInsights'

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
    availableToHelp: 0,
    totalHelped: 0,
    teamRating: 0
  })
  const [teamInsights, setTeamInsights] = useState({
    busyDays: [],
    needyShifts: [],
    teamCoverage: 0,
    yourContribution: 0,
    recentTrends: ''
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState('quick-actions')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showNotifications, setShowNotifications] = useState(true)
  
  // Modal state
  const [selectedSwap, setSelectedSwap] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState(null)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load all swap-related data
      const [swapsData, statsData, teamData] = await Promise.all([
        apiClient.getSwapRequests(),
        apiClient.getStaffDashboardStats(),
        apiClient.getTeamInsights(user.facility_id).catch(() => ({
          busyDays: ['Friday', 'Saturday', 'Sunday'],
          needyShifts: ['Evening', 'Weekend Morning'],
          teamCoverage: 78,
          yourContribution: 12,
          recentTrends: 'Team coverage has improved this month'
        }))
      ])

      setSwapRequests(swapsData)
      setUpcomingShifts(statsData.upcomingShifts || [])
      
      // Enhanced personal stats with gamification
      const enhancedStats = {
        ...statsData,
        totalRequests: swapsData.filter(s => s.requesting_staff_id === user.id).length,
        availableToHelp: swapsData.filter(s => 
          s.status === 'pending' && 
          s.target_staff_id === user.id
        ).length
      }
      
      setPersonalStats(enhancedStats)
      setTeamInsights(teamData)
      
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
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

  const handleQuickSwapRequest = (shift) => {
    if (shift) {
      setSelectedShiftForSwap({
        day: shift.day,
        shift: shift.shift,
        date: shift.date,
        shiftName: shift.shift_name || shift.shiftName,
        shiftTime: shift.shift_time || shift.shiftTime
      })
    } else {
      setSelectedShiftForSwap({
        day: 0,
        shift: 0,
        date: new Date().toISOString().split('T')[0],
        shiftName: 'New Swap Request',
        shiftTime: 'Select during request'
      })
    }
    setShowCreateModal(true)
  }

  const handleRequestSwapClick = () => {
    const basicAssignment = {
      day: 0,
      shift: 0,
      date: new Date().toISOString().split('T')[0],
      shiftName: 'New Swap Request',
      shiftTime: 'Select during request'
    }
    setSelectedShiftForSwap(basicAssignment)
    setShowCreateModal(true)
  }

  const handleCreateSwap = async (swapData) => {
    try {
      const requestData = {
        ...swapData,
        original_day: selectedShiftForSwap?.day,
        original_shift: selectedShiftForSwap?.shift,
        facility_id: user.facility_id
      }
      
      await apiClient.createSwapRequest(requestData)
      await loadAllData()
      setShowCreateModal(false)
      setSelectedShiftForSwap(null)
      toast.success('Swap request created successfully!')
    } catch (error) {
      console.error('Failed to create swap:', error)
      toast.error('Failed to create swap request')
    }
  }

  const handleTimeOffRequest = async (requestData) => {
    try {
      await apiClient.createTimeOffRequest(user.staffId, requestData)
      toast.success('Time off request submitted!')
      // Optionally refresh data if needed
    } catch (error) {
      console.error('Failed to submit time off request:', error)
      throw error
    }
  }

  // Filter and sort swaps
  const filteredSwaps = swapRequests.filter(swap => {
    const matchesSearch = searchTerm === '' || 
      swap.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      swap.requesting_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || swap.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Calculate counts for tabs
  const myRequestsCount = swapRequests.filter(s => s.requesting_staff_id === user.id).length
  const forMeCount = swapRequests.filter(s => s.target_staff_id === user.id && s.status === 'pending').length
  const actionNeeded = swapRequests.filter(s => 
    s.status === 'pending' && 
    ((s.target_staff_id === user.id && s.target_staff_accepted === null) ||
     (s.swap_type === 'auto' && !s.assigned_staff_id))
  )
  const historyCount = swapRequests.filter(s => 
    s.status === 'executed' || s.status === 'declined' || s.status === 'cancelled'
  ).length

  const urgentExpiring = swapRequests.filter(s => 
    s.status === 'pending' && 
    s.urgency === 'emergency' && 
    s.expires_at && 
    new Date(s.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000)
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
          <p className="text-gray-600">Manage your shifts and support your team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowTimeOffModal(true)}
            className="gap-2"
          >
            <CalendarOff className="w-4 h-4" />
            Request Time Off
          </Button>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notifications */}
          <NotificationBanner 
            actionNeeded={actionNeeded}
            urgentExpiring={urgentExpiring}
            showNotifications={showNotifications}
            onDismiss={() => setShowNotifications(false)}
          />

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

            {/* Other tabs with SwapRequestsList */}
            <TabsContent value="my-requests">
              <SwapRequestsList 
                swaps={filteredSwaps.filter(s => s.requesting_staff_id === user.id)}
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
                emptyMessage="No swap requests yet"
                emptySubMessage="When you need coverage, your requests will appear here"
              />
            </TabsContent>

            <TabsContent value="for-me">
              <SwapRequestsList 
                swaps={filteredSwaps.filter(s => s.target_staff_id === user.id)}
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
                emptyMessage="No requests for you"
                emptySubMessage="When colleagues need your help, requests will appear here"
                prioritizeUrgent={true}
              />
            </TabsContent>

            <TabsContent value="action-needed">
              <SwapRequestsList 
                swaps={actionNeeded}
                user={user}
                onSwapClick={handleSwapClick}
                onSwapResponse={handleSwapResponse}
                onCancelSwap={handleCancelSwap}
                showFilters={false}
                emptyMessage="No action needed"
                emptySubMessage="Check back later for new requests that need your attention"
                prioritizeUrgent={true}
              />
            </TabsContent>

            <TabsContent value="history">
              <SwapRequestsList 
                swaps={filteredSwaps.filter(s => 
                  s.status === 'executed' || s.status === 'declined' || s.status === 'cancelled'
                )}
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
                emptyMessage="No history yet"
                emptySubMessage="Your completed, declined, and cancelled swaps will appear here"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Stats and Gamification */}
        <div className="space-y-6">
          {/* Personal Stats */}
          <PersonalStatsCards stats={personalStats} />

          {/* Team Reliability Progress */}
          <ReliabilityProgressCard stats={personalStats} />

          {/* Team Reliability Badges */}
          <TeamReliabilityBadges stats={personalStats} />

          {/* Team Support Insights */}
          <TeamSupportInsights insights={teamInsights} />
        </div>
      </div>

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
          setShowCreateModal(false)
          setSelectedShiftForSwap(null)
        }}
        assignmentDetails={selectedShiftForSwap}
        onSubmitSwap={handleCreateSwap}
        availableStaff={[]}
      />

      <TimeOffRequestModal
        isOpen={showTimeOffModal}
        onClose={() => setShowTimeOffModal(false)}
        onSubmit={handleTimeOffRequest}
        userStaffId={user.staffId}
      />
    </div>
  )
}

export default StaffSwapDashboard