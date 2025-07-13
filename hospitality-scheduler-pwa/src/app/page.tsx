// Main swaps management page
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
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
  Plus
} from 'lucide-react'
import { SwapManagementDashboard } from '@/components/swap/SwapManagementDashboard'
import { FacilityDetailModal } from '@/components/swap/FacilityDetailModal'
import { SwapHistoryModal } from '@/components/swap/SwapHistoryModal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'

// Import the new components
import { AdvancedSearchModal } from '@/components/swap/AdvancedSearchModal'
import { AnalyticsTab } from '@/components/swap/AnalyticsTab'

export default function GlobalSwapsPage() {
  const { isManager, isAuthenticated, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  
  // Main data state
  const [globalSummary, setGlobalSummary] = useState(null)
  const [facilitySummaries, setFacilitySummaries] = useState([])
  const [allSwapRequests, setAllSwapRequests] = useState([])
  
  // Filter state
  const [selectedFacility, setSelectedFacility] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Bulk operations state
  const [selectedSwaps, setSelectedSwaps] = useState<string[]>([])
  
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({})

  // Export functionality
  //const { showExportModal, setShowExportModal, handleExport } = useExportFunctionality(apiClient, allSwapRequests)

  // Modal states
  const [showFacilityDetail, setShowFacilityDetail] = useState(false)
  const [selectedFacilityData, setSelectedFacilityData] = useState(null)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  const [selectedSwapId, setSelectedSwapId] = useState(null)

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const SHIFTS = [
    { id: 0, name: 'Morning', time: '6:00 AM - 2:00 PM', color: 'bg-yellow-100 text-yellow-800' },
    { id: 1, name: 'Afternoon', time: '2:00 PM - 10:00 PM', color: 'bg-blue-100 text-blue-800' },
    { id: 2, name: 'Evening', time: '10:00 PM - 6:00 AM', color: 'bg-purple-100 text-purple-800' }
  ]

  useEffect(() => {
    if (!authLoading && isAuthenticated && isManager) {
      loadGlobalSwapData()
    }
  }, [authLoading, isAuthenticated, isManager])

  const loadGlobalSwapData = async () => {
    try {
      setLoading(true)
      const [summary, facilities, allSwaps] = await Promise.all([
        apiClient.getGlobalSwapSummary(),
        apiClient.getFacilitiesSwapSummary(),
        apiClient.getAllSwapRequests()
      ])
      
      setGlobalSummary(summary)
      setFacilitySummaries(facilities)
      setAllSwapRequests(allSwaps)
    } catch (error) {
      console.error('Failed to load swap data:', error)
      toast.error('Failed to load swap management data')
    } finally {
      setLoading(false)
    }
  }

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
      await loadGlobalSwapData()
      setSelectedSwaps([])
      toast.success(`${selectedSwaps.length} swap${selectedSwaps.length > 1 ? 's' : ''} ${approved ? 'approved' : 'declined'}`)
    } catch (error) {
      console.error('Bulk operation failed:', error)
      toast.error('Failed to process bulk operation')
    }
  }

  const handleApproveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    try {
      await apiClient.approveSwap(swapId, approved, notes)
      await loadGlobalSwapData() // Refresh all data
      toast.success(approved ? 'Swap approved successfully!' : 'Swap declined')
    } catch (error) {
      console.error('Failed to approve swap:', error)
      toast.error('Failed to process swap decision')
    }
  }

  const handleRetryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]) => {
    try {
      await apiClient.retryAutoAssignment(swapId, avoidStaffIds)
      await loadGlobalSwapData()
      toast.success('Auto-assignment retry initiated')
    } catch (error) {
      console.error('Failed to retry auto assignment:', error)
      toast.error('Failed to retry auto assignment')
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
        // Use the advanced search API if query is provided
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
        // If no query, just refresh and apply filters
        await loadGlobalSwapData()
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
    await loadGlobalSwapData()
    toast.success('Filters cleared')
  }

  // Update swap handlers
  const handleUpdateSwap = async (swapId: string, updates: any) => {
    try {
      await apiClient.updateSwapRequest(swapId, updates)
      await loadGlobalSwapData()
      toast.success('Swap request updated successfully')
    } catch (error) {
      console.error('Failed to update swap:', error)
      toast.error('Failed to update swap request')
    }
  }

  const handleCancelSwap = async (swapId: string, reason?: string) => {
    try {
      await apiClient.cancelSwapRequest(swapId, reason)
      await loadGlobalSwapData()
      toast.success('Swap request cancelled')
    } catch (error) {
      console.error('Failed to cancel swap:', error)
      toast.error('Failed to cancel swap request')
    }
  }

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

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading swap management data...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isManager) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Manager Access Required</h3>
          <p className="text-gray-600">You need manager permissions to access swap management.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Global Swap Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage shift swaps across all facilities from one central location
              </p>
            </div>
            {/* 
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowExportModal(true)} 
                variant="outline" 
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button onClick={loadGlobalSwapData} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          */}

          {/* Global Summary Stats */}
          {globalSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <Card>
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
                </CardContent>
              </Card>

              <Card>
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
                </CardContent>
              </Card>

              <Card>
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
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{globalSummary.auto_assignment_success_rate}%</p>
                      <p className="text-sm text-gray-600">Auto Success Rate</p>
                    </div>
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
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">
                Overview
                {filteredSwapRequests.length !== allSwapRequests.length && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {filteredSwapRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="urgent">
                Urgent ({urgentCount})
              </TabsTrigger>
              <TabsTrigger value="facilities">
                Facilities ({facilitySummaries.length})
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-1" />
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
                        placeholder="Search by staff name, reason..."
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
                      <option value="">All</option>
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
                onRefresh={loadGlobalSwapData}
                selectedSwaps={selectedSwaps}
                onSelectSwap={handleSelectSwap}
                onSelectAll={handleSelectAll}
                onUpdateSwap={handleUpdateSwap}
                onCancelSwap={handleCancelSwap}
              />
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-6">
              <SwapManagementDashboard
                facility={null}
                swapRequests={allSwapRequests.filter(swap => swap.status === 'pending')}
                swapSummary={{
                  facility_id: 'pending',
                  pending_swaps: pendingCount,
                  urgent_swaps: allSwapRequests.filter(swap => swap.status === 'pending' && ['high', 'emergency'].includes(swap.urgency)).length,
                  auto_swaps_needing_assignment: allSwapRequests.filter(swap => 
                    swap.status === 'pending' && swap.swap_type === 'auto' && !swap.assigned_staff_id
                  ).length,
                  specific_swaps_awaiting_response: allSwapRequests.filter(swap =>
                    swap.status === 'pending' && swap.swap_type === 'specific' && swap.target_staff_accepted === null
                  ).length,
                  recent_completions: 0
                }}
                days={DAYS}
                shifts={SHIFTS}
                onApproveSwap={handleApproveSwap}
                onRetryAutoAssignment={handleRetryAutoAssignment}
                onViewSwapHistory={handleViewSwapHistory}
                onRefresh={loadGlobalSwapData}
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
                onRefresh={loadGlobalSwapData}
                selectedSwaps={selectedSwaps}
                onSelectSwap={handleSelectSwap}
                onSelectAll={handleSelectAll}
                onUpdateSwap={handleUpdateSwap}
                onCancelSwap={handleCancelSwap}
              />
            </TabsContent>

            {/* Enhanced Facilities Tab */}
            <TabsContent value="facilities" className="space-y-6">
              <div className="grid gap-6">
                {facilitySummaries.map((facility) => (
                  <Card 
                    key={facility.facility_id} 
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300"
                    onClick={() => handleFacilityClick(facility)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {facility.facility_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{facility.facility_type}</Badge>
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
                      
                      {/* Quick Action Indicators */}
                      <div className="mt-4 flex items-center justify-between">
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
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

            {/* Analytics Tab */}
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
                <ArrowLeftRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Swap Requests</h3>
                <p className="text-gray-600 mb-4">
                  No swap requests have been created yet. Staff can create swap requests from their schedule view.
                </p>
                <Button variant="outline" onClick={loadGlobalSwapData}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      
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
      {/*
      <ExportReportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        facilitySummaries={facilitySummaries}
        allSwapRequests={allSwapRequests}
        onExport={handleExport}
      />
      */}</div>
    </AppLayout>
  )
}