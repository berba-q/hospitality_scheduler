//staff swap dashboard
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeftRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus,
  RefreshCw,
  Eye,
  Activity,
  Award,
  Zap,
  ThumbsUp,
  History,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// Import existing components
import SwapDetailModal from '@/components/swap/SwapDetailModal'
import { StaffSwapRequestDialog } from '@/components/swap/StaffSwapRequestDialog'
import { SwapRequestsList } from '@/components/swap/SwapRequestsList'

interface StaffSwapDashboardProps {
  user: any
  apiClient: any
}

function StaffSwapDashboard({ user, apiClient }: StaffSwapDashboardProps) {
  const { data: session } = useSession()
  // Core data state
  const [swapRequests, setSwapRequests] = useState([])
  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [personalStats, setPersonalStats] = useState({
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
  const [currentSchedule, setCurrentSchedule] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(null)
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview')
  
  // Modal state
  const [selectedSwap, setSelectedSwap] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState(null)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
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
      setSwapRequests(swapArray)
      
      // Load other data...
      console.log('✅ Processed swap requests:', swapArray.length)
      if (swapArray.length > 0) {
        console.log('📋 Sample swap structure:', swapArray[0])
      }
      
      // Load additional staff data if available
      try {
        const statsData = await apiClient.getStaffDashboardStats()
        setUpcomingShifts(statsData?.upcomingShifts || [])
        setPersonalStats(prev => ({
          ...prev,
          ...statsData,
          totalRequests: swapArray.length
        }))
      } catch (error) {
        console.warn(' Stats API not available:', error)
        // Set basic stats from swap data
        setPersonalStats(prev => ({
          ...prev,
          totalRequests: swapArray.length
        }))
      }
      
    } catch (error) {
      console.error(' Failed to load data:', error)
      toast.error('Failed to load swap data')
      setSwapRequests([])
    } finally {
      setLoading(false)
    }
  }

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

    // ✅ Get the correct user identifier from either field
    const userId = user?.staff_id || user?.id
    console.log('🆔 Using user ID for filtering:', userId)

    // Log sample swap data structure
    if (swapRequests.length > 0) {
      console.log('📋 Sample swap data structure:', {
        requesting_staff_id: swapRequests[0]?.requesting_staff_id,
        target_staff_id: swapRequests[0]?.target_staff_id,
        status: swapRequests[0]?.status,
        user_role: swapRequests[0]?.user_role // This comes from the backend
      })
    }

    const categorized = {
      // 🔥 FIXED: Use the user_role field provided by the backend API
      myRequests: swapRequests.filter(swap => {
        const isMyRequest = swap.user_role === 'requester' || 
                           swap.requesting_staff_id === userId ||
                           swap.requesting_staff_id === user?.id
        console.log(`🔍 Checking if swap ${swap.id} is my request:`, {
          user_role: swap.user_role,
          requesting_staff_id: swap.requesting_staff_id,
          userId,
          result: isMyRequest
        })
        return isMyRequest
      }),
      
      // Requests directed at me
      forMe: swapRequests.filter(swap => {
        const isForMe = swap.user_role === 'target' || 
                       swap.user_role === 'assigned' ||
                       swap.target_staff_id === userId ||
                       swap.target_staff_id === user?.id ||
                       swap.assigned_staff_id === userId ||
                       swap.assigned_staff_id === user?.id
        console.log(`🔍 Checking if swap ${swap.id} is for me:`, {
          user_role: swap.user_role,
          target_staff_id: swap.target_staff_id,
          assigned_staff_id: swap.assigned_staff_id,
          userId,
          result: isForMe
        })
        return isForMe
      }),
      
      // Requests that need my action
      actionNeeded: swapRequests.filter(swap => {
        const needsAction = (swap.user_role === 'target' || swap.user_role === 'assigned') &&
                           ['pending', 'manager_approved'].includes(swap.status) &&
                           swap.can_respond
        console.log(`🔍 Checking if swap ${swap.id} needs action:`, {
          user_role: swap.user_role,
          status: swap.status,
          can_respond: swap.can_respond,
          result: needsAction
        })
        return needsAction
      }),
      
      // Historical requests
      history: swapRequests.filter(swap => {
        const isHistory = ['executed', 'declined', 'cancelled', 'completed'].includes(swap.status)
        return isHistory
      }),
      
      // All requests involving me
      all: swapRequests.filter(swap => {
        const involvesMe = ['requester', 'target', 'assigned'].includes(swap.user_role) ||
                          swap.requesting_staff_id === userId ||
                          swap.requesting_staff_id === user?.id ||
                          swap.target_staff_id === userId ||
                          swap.target_staff_id === user?.id ||
                          swap.assigned_staff_id === userId ||
                          swap.assigned_staff_id === user?.id
        return involvesMe
      })
    }

    console.log('📈 Final categorized data:', {
      myRequests: categorized.myRequests.length,
      forMe: categorized.forMe.length,
      actionNeeded: categorized.actionNeeded.length,
      history: categorized.history.length,
      all: categorized.all.length
    })

    return categorized
  }, [swapRequests, user?.id, user?.staff_id])

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

  const handleCreateSwap = async (swapData) => {
    try {
      console.log('🔍 AUTH DEBUG: Current user from useAuth:', user)
      console.log('🔍 AUTH DEBUG: Session data:', session) // Add session import if needed
      console.log('🔍 AUTH DEBUG: User ID being used:', user?.id)
      console.log('🔍 AUTH DEBUG: Staff ID being used:', user?.staff_id)
      console.log('Creating swap with data:', swapData)
      
      // ✅ FIX: Use the single createSwapRequest method that handles both types
      const result = await apiClient.createSwapRequest(swapData)
      
      console.log('✅ Swap created successfully:', result)
      
      await loadAllData()
      setShowCreateModal(false)
      setSelectedShiftForSwap(null)
      toast.success('Swap request created successfully!')
      
    } catch (error) {
      console.error('❌ Failed to create swap:', error)
      toast.error(error.message || 'Failed to create swap request')
      throw error // Re-throw so dialog can handle it
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your swaps...</p>
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
                Shift Management
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage your shifts and support your team
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
                Refresh
              </Button>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Request Swap
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
                  <p className="text-blue-100 text-sm font-medium">My Requests</p>
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
                  <p className="text-green-100 text-sm font-medium">Requests for Me</p>
                  <p className="text-3xl font-bold">{filteredAndCategorizedData.forMe.length}</p>
                </div>
                <User className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Action Needed</p>
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
                  <p className="text-purple-100 text-sm font-medium">Completion Rate</p>
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
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="my-requests" className="relative">
                      My Requests
                      {filteredAndCategorizedData.myRequests.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs">
                          {filteredAndCategorizedData.myRequests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="for-me" className="relative">
                      For Me
                      {filteredAndCategorizedData.forMe.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-green-600 text-white text-xs">
                          {filteredAndCategorizedData.forMe.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="action-needed" className="relative">
                      Action Needed
                      {filteredAndCategorizedData.actionNeeded.length > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full bg-red-600 text-white text-xs animate-pulse">
                          {filteredAndCategorizedData.actionNeeded.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="relative">
                      History
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
                              <h3 className="font-medium text-red-800">Action Required</h3>
                              <p className="text-sm text-red-600">
                                You have {filteredAndCategorizedData.actionNeeded.length} swap request{filteredAndCategorizedData.actionNeeded.length > 1 ? 's' : ''} waiting for your response
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setActiveTab('action-needed')}
                              className="ml-auto bg-red-600 hover:bg-red-700"
                            >
                              Review Now
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
                          <h3 className="font-medium text-blue-800">Total Requests</h3>
                          <p className="text-2xl font-bold text-blue-900">{filteredAndCategorizedData.all.length}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-4 text-center">
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <h3 className="font-medium text-green-800">Completed</h3>
                          <p className="text-2xl font-bold text-green-900">
                            {filteredAndCategorizedData.all.filter(s => s.status === 'executed').length}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-4 text-center">
                          <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <h3 className="font-medium text-purple-800">Pending</h3>
                          <p className="text-2xl font-bold text-purple-900">
                            {filteredAndCategorizedData.all.filter(s => s.status === 'pending').length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recent Activity
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
                                          swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                          swap.status === 'executed' ? 'bg-green-100 text-green-800' :
                                          swap.status === 'declined' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }>
                                          {swap.status}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {swap.user_role}
                                        </Badge>
                                        <span className="text-sm text-gray-500">
                                          {new Date(swap.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {swap.reason || 'No reason provided'}
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
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No swap requests yet</h3>
                            <p className="text-gray-600 mb-4">When you need coverage, your requests will appear here</p>
                            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                              <Plus className="w-4 h-4" />
                              Create Your First Request
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
                      emptyMessage="No swap requests yet"
                      emptySubMessage="When you need coverage, your requests will appear here"
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
                      emptyMessage="No requests for you"
                      emptySubMessage="When colleagues need your help, requests will appear here"
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
                      emptyMessage="No action needed"
                      emptySubMessage="Check back later for new requests that need your attention"
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
                      emptyMessage="No history yet"
                      emptySubMessage="Your completed, declined, and cancelled swaps will appear here"
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
                  Team Reliability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {personalStats.teamRating || 85}
                    </div>
                    <p className="text-indigo-100 text-sm">Reliability Score</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-100">Response Rate</span>
                      <span className="text-white font-medium">{personalStats.acceptanceRate || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-100">Times Helped</span>
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
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start gap-3"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Request Swap
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Data
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('history')}
                >
                  <History className="w-4 h-4" />
                  View History
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
                  <h3 className="font-medium text-green-800 mb-2">Every bit of help matters</h3>
                  <p className="text-sm text-green-600">
                    Supporting your teammates builds a stronger, more reliable team for everyone.
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
        currentWeek={currentWeek}
        assignmentDetails={selectedShiftForSwap}
        onSubmitSwap={handleCreateSwap}
        availableStaff={[]}
      />
    </div>
  )
}
export default StaffSwapDashboard
