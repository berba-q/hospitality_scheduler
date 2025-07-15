// app/swaps/page.tsx - swaps management pages
'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

// Import manager components
import { ExportReportModal, useExportFunctionality } from '@/components/swap/ExportReportModal'
import { SwapManagementDashboard } from '@/components/swap/SwapManagementDashboard'
import { FacilityDetailModal } from '@/components/swap/FacilityDetailModal'
import { SwapHistoryModal } from '@/components/swap/SwapHistoryModal'
import { AdvancedSearchModal } from '@/components/swap/AdvancedSearchModal'
import { AnalyticsTab } from '@/components/swap/AnalyticsTab'

// Import enhanced staff component
import StaffSwapDashboard from '@/components/swap/StaffSwapDashboard'

// Icons
import { 
  ArrowLeftRight, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Building,
  Users,
  TrendingUp,
  RotateCcw,
  Filter,
  Search,
  Eye,
  ChevronRight,
  X,
  Download,
  BarChart3,
  Plus,
  Zap,
  Target,
  Brain
} from 'lucide-react'
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SwapsPage() {
  // ============================================================================
  // HOOKS & AUTH
  // ============================================================================
  const { isManager, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const apiClient = useApiClient()
  const { showExportModal, setShowExportModal, handleExport } = useExportFunctionality(apiClient)

  // ============================================================================
  // MANAGER DATA STATE
  // ============================================================================
  const [globalSummary, setGlobalSummary] = useState(null)
  const [facilitySummaries, setFacilitySummaries] = useState([])
  const [allSwapRequests, setAllSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // ============================================================================
  // MANAGER UI STATE
  // ============================================================================
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedFacility, setSelectedFacility] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Bulk operations state
  const [selectedSwaps, setSelectedSwaps] = useState<string[]>([])

  // Modal states
  const [showFacilityDetail, setShowFacilityDetail] = useState(false)
  const [selectedFacilityData, setSelectedFacilityData] = useState(null)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  const [selectedSwapId, setSelectedSwapId] = useState(null)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

    // Advanced search state
  const [advancedFilters, setAdvancedFilters] = useState({})

  //CONSTATNS
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const SHIFTS = [
    { id: 0, name: 'Morning', time: '6:00 AM - 2:00 PM', color: 'bg-yellow-100 text-yellow-800' },
    { id: 1, name: 'Afternoon', time: '2:00 PM - 10:00 PM', color: 'bg-blue-100 text-blue-800' },
    { id: 2, name: 'Evening', time: '10:00 PM - 6:00 AM', color: 'bg-purple-100 text-purple-800' }
  ]

  // ============================================================================
  // LOAD MANAGER DATA
  // ============================================================================
  useEffect(() => {
    if (!authLoading && isAuthenticated && isManager) {
      loadManagerData()
    } else if (!authLoading && isAuthenticated) {
      // For staff, no initial data loading needed in main page
      setLoading(false)
    }
  }, [authLoading, isAuthenticated, isManager])

  const loadManagerData = async () => {
    try {
      setLoading(true)
      const [summaryData, facilitiesData, swapsData] = await Promise.all([
        apiClient.getGlobalSwapSummary(),
        apiClient.getFacilitiesSwapSummary(),
        apiClient.getAllSwapRequests(200)
      ])
      
      setGlobalSummary(summaryData)
      setFacilitySummaries(facilitiesData)
      setAllSwapRequests(swapsData)
    } catch (error) {
      console.error('Failed to load swap management data:', error)
      toast.error('Failed to load swap data')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // MANAGER ACTION HANDLERS
  // ============================================================================
  const handleFacilityClick = (facility) => {
    setSelectedFacilityData(facility)
    setShowFacilityDetail(true)
  }

  const loadFacilitySwaps = async (facilityId: string) => {
    try {
      const response = await apiClient.getSwapRequests({ facility_id: facilityId })
      return response
    } catch (error) {
      console.error('Failed to load facility swaps:', error)
      toast.error('Failed to load facility swap details')
      return []
    }
  }

  const loadSwapHistory = async (swapId: string) => {
    try {
      const [swapDetail, history] = await Promise.all([
        apiClient.getSwapRequest(swapId),
        apiClient.getSwapHistory(swapId)
      ])
      return { swap: swapDetail, history }
    } catch (error) {
      console.error('Failed to load swap history:', error)
      toast.error('Failed to load swap history')
      return { swap: null, history: [] }
    }
  }

  // Bulk operations
  const handleSelectSwap = (swapId: string, selected: boolean) => {
    if (selected) {
      setSelectedSwaps([...selectedSwaps, swapId])
    } else {
      setSelectedSwaps(selectedSwaps.filter(id => id !== swapId))
    }
  }

  const handleSelectAll = (swaps: any[]) => {
    const eligibleSwaps = swaps.filter(swap => swap.status === 'pending').map(swap => swap.id)
    setSelectedSwaps(eligibleSwaps)
  }

  const handleClearSelection = () => {
    setSelectedSwaps([])
  }

  const handleBulkApprove = async (approved: boolean, notes?: string) => {
    if (selectedSwaps.length === 0) {
      toast.error('No swaps selected')
      return
    }

    try {
      await apiClient.bulkApproveSwaps(selectedSwaps, approved, notes)
      await loadManagerData()
      setSelectedSwaps([])
      toast.success(`${selectedSwaps.length} swap${selectedSwaps.length > 1 ? 's' : ''} ${approved ? 'approved' : 'declined'}`)
    } catch (error) {
      console.error('Bulk operation failed:', error)
      toast.error('Failed to process bulk operation')
    }
  }
  
  const handleApproveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    try {
      await apiClient.managerSwapDecision(swapId, { approved, notes })
      toast.success(approved ? 'Swap request approved' : 'Swap request declined')
      loadManagerData()
    } catch (error) {
      console.error('Failed to update swap:', error)
      toast.error('Failed to update swap request')
    }
  }

  const handleRetryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]) => {
    try {
      await apiClient.retryAutoAssignment(swapId, avoidStaffIds)
      toast.success('Auto-assignment retried')
      loadManagerData()
    } catch (error) {
      console.error('Failed to retry assignment:', error)
      toast.error('Failed to retry auto-assignment')
    }
  }

  const handleViewSwapHistory = (swapId: string) => {
    setSelectedSwapId(swapId)
    setShowSwapHistory(true)
  }

  // Advanced search handler
  const handleAdvancedSearch = async (filters: any) => {
    try {
      setAdvancedFilters(filters)
      if (filters.query && filters.query.trim()) {
        const results = await apiClient.searchSwapsAdvanced(filters.query, {
          facility_id: filters.facility_id,
          status: filters.status,
          urgency: filters.urgency,
          swap_type: filters.swap_type,
          date_from: filters.date_from,
          date_to: filters.date_to
        })
        setAllSwapRequests(results)
        toast.success(`Found ${results.length} matching swap requests`)
      } else {
        await loadManagerData()
        toast.success('Filters applied')
      }
    } catch (error) {
      console.error('Advanced search failed:', error)
      toast.error('Search failed')
    }
  }

  const handleClearFilters = async () => {
    setAdvancedFilters({})
    setSelectedFacility('')
    setUrgencyFilter('')
    setSearchTerm('')
    await loadManagerData()
    toast.success('Filters cleared')
  }

  const handleUpdateSwap = async (swapId: string, updates: any) => {
    try {
      await apiClient.updateSwapRequest(swapId, updates)
      await loadManagerData()
      toast.success('Swap request updated successfully')
    } catch (error) {
      console.error('Failed to update swap:', error)
      toast.error('Failed to update swap request')
    }
  }

  const handleCancelSwap = async (swapId: string, reason?: string) => {
    try {
      await apiClient.cancelSwapRequest(swapId, reason)
      await loadManagerData()
      toast.success('Swap request cancelled')
    } catch (error) {
      console.error('Failed to cancel swap:', error)
      toast.error('Failed to cancel swap request')
    }
  }

  // ============================================================================
  // DERIVED DATA
  // ============================================================================
  // Filter swaps based on facility, urgency, search term, and advanced filters
  const filteredSwapRequests = allSwapRequests.filter(swap => {
    const facilityMatch = !selectedFacility || swap.facility_id === selectedFacility
    const urgencyMatch = !urgencyFilter || swap.urgency === urgencyFilter
    const searchMatch = !searchTerm || 
      swap.requesting_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      swap.target_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      swap.reason.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Apply advanced filters if any
    const advancedMatch = Object.keys(advancedFilters).length === 0 || 
      ((!advancedFilters.status || advancedFilters.status === swap.status) &&
       (!advancedFilters.urgency || advancedFilters.urgency === swap.urgency) &&
       (!advancedFilters.facility_id || swap.facility_id === advancedFilters.facility_id) &&
       (!advancedFilters.swap_type || swap.swap_type === advancedFilters.swap_type))
    
    return facilityMatch && urgencyMatch && searchMatch && advancedMatch
  })

  // Calculate counts for tabs
  const pendingCount = allSwapRequests.filter(s => s.status === 'pending').length
  const urgentCount = allSwapRequests.filter(s => ['high', 'emergency'].includes(s.urgency)).length
  const emergencyCount = allSwapRequests.filter(s => s.urgency === 'emergency').length

  // Smart insights for managers
  const criticalFacilities = facilitySummaries.filter(f => f.emergency_swaps > 0 || f.urgent_swaps > 5)
  const needsAttentionFacilities = facilitySummaries.filter(f => f.pending_swaps > 10)

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (authLoading || (isManager && loading)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">
              {authLoading ? 'Checking permissions...' : 'Loading swap management data...'}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ============================================================================
  // STAFF VIEW - Enhanced experience using components
  // ============================================================================
  if (!isManager) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <StaffSwapDashboard 
              user={user} 
              apiClient={apiClient} 
            />
          </div>
        </div>
      </AppLayout>
    )
  }

  // ============================================================================
  // MANAGER VIEW - Full swap management interface
  // ============================================================================
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Swap Management Command Center
              </h1>
              <p className="text-gray-600 mt-1">
                Manage shift swaps across all facilities with intelligent insights and automation
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowExportModal(true)} 
                variant="outline" 
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button onClick={loadManagerData} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Critical Alerts - Show urgent items that need immediate attention */}
          {(emergencyCount > 0 || criticalFacilities.length > 0) && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-red-800">Immediate Attention Required: </span>
                    {emergencyCount > 0 && (
                      <span className="text-red-600">{emergencyCount} emergency swap{emergencyCount > 1 ? 's' : ''}</span>
                    )}
                    {emergencyCount > 0 && criticalFacilities.length > 0 && <span>, </span>}
                    {criticalFacilities.length > 0 && (
                      <span className="text-red-600">{criticalFacilities.length} facility{criticalFacilities.length > 1 ? 's' : ''} in critical state</span>
                    )}
                  </div>
                  <Button size="sm" variant="destructive">
                    <Zap className="h-4 w-4 mr-1" />
                    Take Action
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Global Summary Stats - Enhanced with actionable indicators */}
          {globalSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{globalSummary.total_facilities}</p>
                      <p className="text-sm text-gray-600">Active Facilities</p>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      All Online
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{globalSummary.total_pending_swaps}</p>
                      <p className="text-sm text-gray-600">Pending Swaps</p>
                    </div>
                  </div>
                  {pendingCount > 20 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                        High Volume
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{globalSummary.total_urgent_swaps}</p>
                      <p className="text-sm text-gray-600">Urgent Requests</p>
                    </div>
                  </div>
                  {emergencyCount > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        {emergencyCount} Emergency
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(globalSummary.auto_assignment_success_rate || 0)}%
                      </p>
                      <p className="text-sm text-gray-600">Auto Success Rate</p>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        globalSummary.auto_assignment_success_rate >= 80 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {globalSummary.auto_assignment_success_rate >= 80 ? 'Excellent' : 'Needs Work'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active Filters Indicator */}
          {(Object.keys(advancedFilters).length > 0 || selectedFacility || urgencyFilter || searchTerm) && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Active filters: Showing {filteredSwapRequests.length} of {allSwapRequests.length} swap requests
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearFilters}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="gap-2">
                <Eye className="h-4 w-4" />
                Overview
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {urgentCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="urgent" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Urgent ({urgentCount})
              </TabsTrigger>
              <TabsTrigger value="facilities" className="gap-2">
                <Building className="h-4 w-4" />
                Facilities ({facilitySummaries.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Enhanced Search and Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <Input
                        placeholder="Search by staff name, reason, facility..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={selectedFacility || ''} onValueChange={setSelectedFacility} className="w-48">
                      <option value="">All Facilities</option>
                      {facilitySummaries.map((facility) => (
                        <option key={facility.facility_id} value={facility.facility_id}>
                          {facility.facility_name}
                        </option>
                      ))}
                    </Select>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter} className="w-32">
                      <option value="">All Urgency</option>
                      <option value="emergency">Emergency</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </Select>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAdvancedSearch(true)}
                      className="gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Advanced
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Actions */}
              {selectedSwaps.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {selectedSwaps.length} swap{selectedSwaps.length > 1 ? 's' : ''} selected
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleBulkApprove(true)}
                          className="text-green-700 border-green-200 hover:bg-green-100"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve All
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleBulkApprove(false)}
                          className="text-red-700 border-red-200 hover:bg-red-100"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline All
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={handleClearSelection}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Swap Management Dashboard */}
              <SwapManagementDashboard
                facility={selectedFacility ? facilitySummaries.find(f => f.facility_id === selectedFacility) : null}
                swapRequests={filteredSwapRequests}
                swapSummary={{
                  facility_id: selectedFacility || 'all',
                  pending_swaps: filteredSwapRequests.filter(swap => swap.status === 'pending').length,
                  urgent_swaps: filteredSwapRequests.filter(swap => ['high', 'emergency'].includes(swap.urgency)).length,
                  auto_swaps_needing_assignment: filteredSwapRequests.filter(swap => 
                    swap.swap_type === 'auto' && swap.status === 'pending' && !swap.assigned_staff_id
                  ).length,
                  specific_swaps_awaiting_response: filteredSwapRequests.filter(swap =>
                    swap.swap_type === 'specific' && swap.status === 'pending' && swap.target_staff_accepted === null
                  ).length,
                  recent_completions: filteredSwapRequests.filter(swap => 
                    swap.status === 'completed' && 
                    new Date(swap.completed_at || swap.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length
                }}
                days={DAYS}
                shifts={SHIFTS}
                onApproveSwap={handleApproveSwap}
                onRetryAutoAssignment={handleRetryAutoAssignment}
                onViewSwapHistory={handleViewSwapHistory}
                onRefresh={loadManagerData}
                selectedSwaps={selectedSwaps}
                onSelectSwap={handleSelectSwap}
                onSelectAll={handleSelectAll}
                onUpdateSwap={handleUpdateSwap}
                onCancelSwap={handleCancelSwap}
              />
            </TabsContent>

            {/* Urgent Tab */}
            <TabsContent value="urgent" className="space-y-6">
              <SwapManagementDashboard
                facility={null}
                swapRequests={allSwapRequests.filter(swap => ['high', 'emergency'].includes(swap.urgency))}
                swapSummary={{
                  facility_id: 'urgent',
                  pending_swaps: allSwapRequests.filter(swap => swap.status === 'pending' && ['high', 'emergency'].includes(swap.urgency)).length,
                  urgent_swaps: urgentCount,
                  auto_swaps_needing_assignment: allSwapRequests.filter(swap => 
                    ['high', 'emergency'].includes(swap.urgency) && swap.swap_type === 'auto' && !swap.assigned_staff_id
                  ).length,
                  specific_swaps_awaiting_response: allSwapRequests.filter(swap =>
                    ['high', 'emergency'].includes(swap.urgency) && swap.swap_type === 'specific' && swap.target_staff_accepted === null
                  ).length,
                  recent_completions: 0
                }}
                days={DAYS}
                shifts={SHIFTS}
                onApproveSwap={handleApproveSwap}
                onRetryAutoAssignment={handleRetryAutoAssignment}
                onViewSwapHistory={handleViewSwapHistory}
                onRefresh={loadManagerData}
                selectedSwaps={selectedSwaps}
                onSelectSwap={handleSelectSwap}
                onSelectAll={handleSelectAll}
                onUpdateSwap={handleUpdateSwap}
                onCancelSwap={handleCancelSwap}
              />
            </TabsContent>

            {/* Enhanced Facilities Tab */}
            <TabsContent value="facilities" className="space-y-6">
              {/* Facility Performance Overview */}
              {needsAttentionFacilities.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Target className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>
                        <span className="font-semibold">High Activity Detected: </span>
                        {needsAttentionFacilities.length} facility{needsAttentionFacilities.length > 1 ? 's have' : ' has'} elevated swap volumes
                      </span>
                      <Button size="sm" variant="outline">
                        Review Workload Distribution
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6">
                {facilitySummaries.map((facility) => {
                  // Calculate health score for visual indicators
                  const totalSwaps = facility.pending_swaps + facility.urgent_swaps + facility.emergency_swaps
                  const swapRate = totalSwaps / Math.max(facility.staff_count, 1)
                  const healthStatus = facility.emergency_swaps > 0 ? 'critical' : 
                                     facility.urgent_swaps > 5 ? 'warning' : 
                                     facility.pending_swaps > 10 ? 'attention' : 'good'
                  
                  const statusColors = {
                    critical: 'border-red-300 bg-red-50',
                    warning: 'border-orange-300 bg-orange-50', 
                    attention: 'border-yellow-300 bg-yellow-50',
                    good: 'border-green-300 bg-green-50'
                  }

                  return (
                    <Card 
                      key={facility.facility_id} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 ${statusColors[healthStatus]}`}
                      onClick={() => handleFacilityClick(facility)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            {facility.facility_name}
                            {healthStatus === 'critical' && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                CRITICAL
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{facility.facility_type}</Badge>
                            <Badge 
                              variant={
                                healthStatus === 'critical' ? 'destructive' :
                                healthStatus === 'warning' ? 'default' :
                                healthStatus === 'attention' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {Math.round(swapRate * 10) / 10} swaps/staff
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{facility.staff_count}</p>
                            <p className="text-sm text-gray-600">Staff</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600">{facility.pending_swaps}</p>
                            <p className="text-sm text-gray-600">Pending</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">{facility.urgent_swaps}</p>
                            <p className="text-sm text-gray-600">Urgent</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{facility.emergency_swaps}</p>
                            <p className="text-sm text-gray-600">Emergency</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{facility.recent_completions}</p>
                            <p className="text-sm text-gray-600">Completed</p>
                          </div>
                        </div>
                        
                        {/* Health Indicator Bar */}
                        <div className="mt-4 mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Facility Health</span>
                            <span>{healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                healthStatus === 'critical' ? 'bg-red-500' :
                                healthStatus === 'warning' ? 'bg-orange-500' :
                                healthStatus === 'attention' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.max(20, Math.min(100, 100 - (swapRate * 20)))}%` 
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Quick Action Indicators */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {facility.pending_swaps > 0 && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Needs Review
                              </Badge>
                            )}
                            {facility.emergency_swaps > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Emergency
                              </Badge>
                            )}
                            {healthStatus === 'good' && totalSwaps === 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                All Clear
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Empty state for facilities */}
              {facilitySummaries.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Facilities Found</h3>
                    <p className="text-gray-600">No facilities are currently configured for swap management.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Analytics Tab - Using your existing component */}
            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsTab
                facilitySummaries={facilitySummaries}
                allSwapRequests={allSwapRequests}
                apiClient={apiClient}
              />
            </TabsContent>
          </Tabs>

          {/* Empty state for when no swaps exist */}
          {allSwapRequests.length === 0 && !loading && (
            <Card className="mt-8">
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Systems Green!</h3>
                <p className="text-gray-600 mb-4">
                  No swap requests to manage at the moment. Your team operations are running smoothly.
                </p>
                <Button variant="outline" onClick={loadManagerData}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* All Modals - Using your existing components */}
      
      {/* Facility Detail Modal */}
      <FacilityDetailModal
        open={showFacilityDetail}
        onClose={() => setShowFacilityDetail(false)}
        facility={selectedFacilityData}
        onLoadFacilitySwaps={loadFacilitySwaps}
        onApproveSwap={handleApproveSwap}
        onRetryAutoAssignment={handleRetryAutoAssignment}
        onViewSwapHistory={handleViewSwapHistory}
        days={DAYS}
        shifts={SHIFTS}
      />

      {/* Swap History Modal */}
      <SwapHistoryModal
        open={showSwapHistory}
        onClose={() => setShowSwapHistory(false)}
        swapId={selectedSwapId}
        onLoadSwapHistory={loadSwapHistory}
        days={DAYS}
        shifts={SHIFTS}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        open={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        facilities={facilitySummaries}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        facilitySummaries={facilitySummaries}
        allSwapRequests={allSwapRequests}
        onExport={handleExport}
      />
    </AppLayout>
  )
}