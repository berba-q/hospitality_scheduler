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
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/dialog'

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
  Brain,
  Settings,
  Shield
} from 'lucide-react'
// NEW – enum types and helper components
import { SwapStatus, SwapUrgency } from '@/types/swaps'
import {WorkflowStatusIndicator} from '@/components/swap/WorkflowStatusIndicator'
import {ManagerFinalApprovalModal} from '@/components/swap/ManagerFinalApprovalModal'
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
  const [showDetailedTools, setShowDetailedTools] = useState(false)
  const [detailedToolsTab, setDetailedToolsTab] = useState('all')
  const [showManagerModal, setShowManagerModal] = useState(false)

    // Advanced search state
  const [advancedFilters, setAdvancedFilters] = useState({})

  //CONSTATNS
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const SHIFTS = [
    { id: 0, name: 'Morning', time: '6:00 AM - 2:00 PM', color: 'bg-yellow-100 text-yellow-800' },
    { id: 1, name: 'Afternoon', time: '2:00 PM - 10:00 PM', color: 'bg-blue-100 text-blue-800' },
    { id: 2, name: 'Evening', time: '10:00 PM - 6:00 AM', color: 'bg-purple-100 text-purple-800' }
  ]

  const NEEDS_MANAGER_ACTION = ['pending', 'manager_final_approval']
  const NEEDS_STAFF_ACTION = ['manager_approved', 'potential_assignment'] 
  const COMPLETED_STATUSES = ['executed', 'declined', 'staff_declined', 'cancelled', 'assignment_failed']
  const ACTIONABLE_STATUSES = [...NEEDS_MANAGER_ACTION, ...NEEDS_STAFF_ACTION]

  const pendingInitialApproval = allSwapRequests.filter(swap => swap.status === 'pending')
  const pendingFinalApproval = allSwapRequests.filter(swap => swap.status === 'manager_final_approval')
  const urgentFinalApprovals = pendingFinalApproval.filter(swap => 
    [SwapUrgency.Emergency, SwapUrgency.High].includes(swap.urgency as SwapUrgency)
  )



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
      console.log('Loading facility swaps for:', facilityId)
      
      // Use getSwapRequestsWithFilters with proper parameter structure
      const response = await apiClient.getSwapRequestsWithFilters({
        facility_id: facilityId,
        limit: 100
      })
      
      console.log('Facility swaps loaded:', response?.length || 0, 'swaps')
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
    const eligibleSwaps = swaps.filter(swap => swap.status === SwapStatus.manager_final_approval).map(swap => swap.id)
    setSelectedSwaps(eligibleSwaps)
  }

  const handleClearSelection = () => {
    setSelectedSwaps([])
  }

  
  const handleApproveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    try {
      await apiClient.ManagerSwapDecision(swapId, { approved, notes })
      toast.success(approved ? 'Swap request approved' : 'Swap request declined')
      await loadManagerData()
    } catch (error) {
      console.error('Failed to update swap:', error)
      toast.error('Failed to update swap request')
    }
  }

  const handleFinalApproval = async (swapId: string, approved: boolean, notes?: string) => {
    try {
      console.log('🎯 Processing final approval:', { swapId, approved, notes })
      
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      await apiClient.managerFinalApproval(swapId, {
        approved,
        notes,
        override_role_verification: false,
        role_override_reason: undefined
      })
      
      await loadManagerData()
      toast.success(approved ? 'Swap executed successfully!' : 'Final approval denied')
      
    } catch (error) {
      console.error('❌ Failed to process final approval:', error)
      const errorMessage = error?.message || 'Failed to process final approval'
      toast.error(errorMessage)
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

  const handleTakeAction = () => {
    const emergencySwaps = allSwapRequests.filter(swap => 
      (swap.urgency === SwapUrgency.Emergency || swap.urgency === SwapUrgency.High) && 
      NEEDS_MANAGER_ACTION.includes(swap.status)
    )
    
    if (emergencySwaps.length === 0) {
      toast.info('No emergency swaps need attention')
      return
    }
    
    if (emergencySwaps.length <= 5) {
      setSelectedSwaps(emergencySwaps.map(swap => swap.id))
      toast.success(`Selected ${emergencySwaps.length} urgent swaps - review below`)
    } else {
      setDetailedToolsTab('all')
      setShowDetailedTools(true)
      setUrgencyFilter(SwapUrgency.Emergency)
      toast.success(`Found ${emergencySwaps.length} urgent swaps - opened detailed view`)
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
  const pendingCount = allSwapRequests.filter(s => NEEDS_MANAGER_ACTION.includes(s.status)).length
  const urgentCount = allSwapRequests.filter(s => 
    [SwapUrgency.High, SwapUrgency.Emergency].includes(s.urgency as SwapUrgency) &&
    NEEDS_MANAGER_ACTION.includes(s.status) 
  ).length
  const emergencyCount = allSwapRequests.filter(s => 
    s.urgency === SwapUrgency.Emergency && 
    NEEDS_MANAGER_ACTION.includes(s.status)
  ).length

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
                Swap Management
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
          {(emergencyCount > 0 || urgentFinalApprovals.length > 0 || criticalFacilities.length > 0) && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-red-800">Immediate Attention Required: </span>
                    {emergencyCount > 0 && (
                      <span className="text-red-600">{emergencyCount} emergency swap{emergencyCount > 1 ? 's' : ''}</span>
                    )}
                    {emergencyCount > 0 && urgentFinalApprovals.length > 0 && <span>, </span>}
                    {urgentFinalApprovals.length > 0 && (
                      <span className="text-orange-600">{urgentFinalApprovals.length} urgent final approval{urgentFinalApprovals.length > 1 ? 's' : ''}</span>
                    )}
                    {(emergencyCount > 0 || urgentFinalApprovals.length > 0) && criticalFacilities.length > 0 && <span>, </span>}
                    {criticalFacilities.length > 0 && (
                      <span className="text-red-600">{criticalFacilities.length} facility{criticalFacilities.length > 1 ? 's' : ''} in critical state</span>
                    )}
                  </div>
                  <Button size="sm" 
                    variant="destructive"
                    onClick={handleTakeAction}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Take Action
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

           {/*  Final Approval Alert - Separate prominent alert */}
          {pendingFinalApproval.length > 0 && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <Shield className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-orange-800">Final Approval Required: </span>
                    <span className="text-orange-600">
                      {pendingFinalApproval.length} swap{pendingFinalApproval.length > 1 ? 's' : ''} ready for execution
                    </span>
                    <span className="text-orange-600 ml-2 text-sm">
                      (Staff have accepted and are waiting for you to execute)
                    </span>
                  </div>
                  <Button size="sm" 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      setDetailedToolsTab('all')
                      setShowDetailedTools(true)
                    }}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Review Final Approvals
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
                      <p className="text-2xl font-bold text-gray-900">{pendingInitialApproval.length}</p>
                      <p className="text-sm text-gray-600">Pending Initial</p>
                    </div>
                  </div>
                  {pendingInitialApproval.length > 20 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                        High Volume
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/*  Final Approval Card */}
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Shield className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-2xl font-bold text-gray-900">{pendingFinalApproval.length}</p>
                      <p className="text-sm text-gray-600">Final Approval</p>
                    </div>
                  </div>
                  {pendingFinalApproval.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="text-xs bg-orange-600 text-white animate-pulse">
                        Execute Ready
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
        {/* MAIN CONTENT PAGE */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* LEFT: Action Queue - What needs immediate attention */}
            <div className="xl:col-span-2 space-y-4">
              
              {/* Emergency & High Priority Section */}
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Immediate Action Required
                    </div>
                    <Badge variant="destructive">
                      {allSwapRequests.filter(swap => 
                        (swap.urgency === SwapUrgency.Emergency || swap.urgency === SwapUrgency.High) && 
                        NEEDS_MANAGER_ACTION.includes(swap.status)
                      ).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allSwapRequests
                      .filter(swap => 
                          [SwapUrgency.Emergency, SwapUrgency.High].includes(swap.urgency as SwapUrgency) && 
                          NEEDS_MANAGER_ACTION.includes(swap.status)
                        )
                      .slice(0, 8)
                      .map((swap) => (
                        <div key={swap.id} className="flex items-center justify-between p-3 bg-white rounded border">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={selectedSwaps.includes(swap.id)}
                              onChange={(e) => handleSelectSwap(swap.id, e.target.checked)}
                              className="rounded"
                            />
                            <WorkflowStatusIndicator swap={swap} compact />
                            <div>
                              <p className="font-medium text-sm">{swap.requesting_staff?.full_name}</p>
                              <p className="text-xs text-gray-600 truncate max-w-48">{swap.reason}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={swap.urgency === SwapUrgency.Emergency ? 'destructive' : 'secondary'} className="text-xs">
                                    {swap.urgency}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {facilitySummaries.find(f => f.facility_id === swap.facility_id)?.facility_name}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-700 border-green-200 h-7 px-2 text-xs"
                              onClick={() => handleApproveSwap(swap.id, true)}
                            >
                              ✓
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-700 border-red-200 h-7 px-2 text-xs"
                              onClick={() => handleApproveSwap(swap.id, false)}
                            >
                              ✗
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs"
                              onClick={() => handleViewSwapHistory(swap.id)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Quick Bulk Actions for Emergency/High Priority */}
                  {selectedSwaps.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <Button
                        size="sm"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => setShowManagerModal(true)}
                      >
                        Review &amp; Final Approve ({selectedSwaps.length})
                      </Button>
                    </div>
                  )}
                  {allSwapRequests.filter(s => 
                      [SwapUrgency.Emergency, SwapUrgency.High].includes(s.urgency as SwapUrgency) && 
                      ACTIONABLE_STATUSES.includes(s.status)
                    ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm font-medium">No urgent requests!</p>
                      <p className="text-xs">All systems running smoothly.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Approval Queue - Regular pending requests */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      Quick Approval Queue
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {allSwapRequests.filter(s => 
                            NEEDS_MANAGER_ACTION.includes(s.status) && 
                            ![SwapUrgency.Emergency, SwapUrgency.High].includes(s.urgency as SwapUrgency)
                          ).length}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const regularPending = allSwapRequests
                              .filter(swap => 
                                NEEDS_MANAGER_ACTION.includes(swap.status) && 
                                ![SwapUrgency.Emergency, SwapUrgency.High].includes(swap.urgency as SwapUrgency)
                              )
                            .map(swap => swap.id)
                          setSelectedSwaps(regularPending)
                        }}
                      >
                        Select All
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allSwapRequests
                      .filter(swap => 
                          NEEDS_MANAGER_ACTION.includes(swap.status) && 
                          ![SwapUrgency.Emergency, SwapUrgency.High].includes(swap.urgency as SwapUrgency)
                        )
                      .slice(0, 6)
                      .map((swap) => (
                        <div key={swap.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={selectedSwaps.includes(swap.id)}
                              onChange={(e) => handleSelectSwap(swap.id, e.target.checked)}
                              className="rounded"
                            />
                            <WorkflowStatusIndicator swap={swap} compact />
                            <div>
                              <p className="font-medium text-sm">{swap.requesting_staff?.full_name}</p>
                              <p className="text-xs text-gray-600 truncate max-w-48">{swap.reason}</p>
                              <span className="text-xs text-gray-500">
                                {facilitySummaries.find(f => f.facility_id === swap.facility_id)?.facility_name}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 text-green-600"
                              onClick={() => handleApproveSwap(swap.id, true)}
                            >
                              ✓
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 text-red-600"
                              onClick={() => handleApproveSwap(swap.id, false)}
                            >
                              ✗
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {allSwapRequests.filter(s => 
                      NEEDS_MANAGER_ACTION.includes(s.status) && 
                      ![SwapUrgency.Emergency, SwapUrgency.High].includes(s.urgency as SwapUrgency)
                    ).length > 6 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => setActiveTab('detailed')}
                    >
                      View All {allSwapRequests.filter(s => 
                          NEEDS_MANAGER_ACTION.includes(s.status) && 
                          ![SwapUrgency.Emergency, SwapUrgency.High].includes(s.urgency as SwapUrgency)
                        ).length} Pending
                    </Button>
                  )}

                  {allSwapRequests.filter(s => 
                      NEEDS_MANAGER_ACTION.includes(s.status) && 
                      ![SwapUrgency.Emergency, SwapUrgency.High].includes(s.urgency as SwapUrgency)
                    ).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No pending approvals</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Awaiting Staff Response */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Awaiting Staff Response
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {allSwapRequests.filter(s => NEEDS_STAFF_ACTION.includes(s.status)).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allSwapRequests
                      .filter(swap => NEEDS_STAFF_ACTION.includes(swap.status))
                      .slice(0, 6)
                      .map((swap) => (
                        <div key={swap.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div className="flex items-center gap-3">
                            <WorkflowStatusIndicator swap={swap} compact />
                            <div>
                              <p className="font-medium text-sm">{swap.requesting_staff?.full_name}</p>
                              <p className="text-xs text-gray-600 truncate max-w-48">{swap.reason}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="text-xs bg-blue-100 text-blue-800">
                                  {swap.status === 'potential_assignment' ? 'Finding Coverage' : 'Waiting Response'}
                                </Badge>
                                {swap.assigned_staff && (
                                  <span className="text-xs text-blue-600">
                                    → {swap.assigned_staff.full_name}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {facilitySummaries.find(f => f.facility_id === swap.facility_id)?.facility_name}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 text-xs"
                              onClick={() => handleViewSwapHistory(swap.id)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {allSwapRequests.filter(s => NEEDS_STAFF_ACTION.includes(s.status)).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-sm font-medium">All caught up!</p>
                      <p className="text-xs">No swaps waiting for staff response.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Strategic Overview Sidebar */}
            <div className="space-y-4">
              
              {/* Facility Status Tower */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5" />
                    Facility Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {facilitySummaries
                      .sort((a, b) => {
                        // Sort by priority: emergency > urgent > pending > quiet
                        const aPriority = a.emergency_swaps * 1000 + a.urgent_swaps * 100 + a.pending_swaps
                        const bPriority = b.emergency_swaps * 1000 + b.urgent_swaps * 100 + b.pending_swaps
                        return bPriority - aPriority
                      })
                      .map((facility) => {
                        const status = facility.emergency_swaps > 0 ? 'emergency' : 
                                    facility.urgent_swaps > 3 ? 'urgent' : 
                                    facility.pending_swaps > 5 ? 'busy' : 
                                    facility.pending_swaps > 0 ? 'active' : 'quiet'
                        
                        return (
                          <div 
                            key={facility.facility_id}
                            className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                              status === 'emergency' ? 'bg-red-100 border border-red-200' :
                              status === 'urgent' ? 'bg-orange-100 border border-orange-200' :
                              status === 'busy' ? 'bg-yellow-100 border border-yellow-200' :
                              status === 'active' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                            }`}
                            onClick={() => handleFacilityClick(facility)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{facility.facility_name}</p>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {facility.emergency_swaps > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {facility.emergency_swaps} Emergency
                                    </Badge>
                                  )}
                                  {facility.urgent_swaps > 0 && (
                                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                      {facility.urgent_swaps} Urgent
                                    </Badge>
                                  )}
                                  {facility.pending_swaps > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {facility.pending_swaps} Pending
                                    </Badge>
                                  )}
                                  {status === 'quiet' && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                      All Clear
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => setActiveTab('facilities')}
                  >
                    Detailed Facility Analysis
                  </Button>
                </CardContent>
              </Card>

              {/* System Performance Metrics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    System Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Auto-Assignment</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          (globalSummary?.auto_assignment_success_rate || 0) >= 0.8 ? 'bg-green-500' :
                          (globalSummary?.auto_assignment_success_rate || 0) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">
                          {Math.round((globalSummary?.auto_assignment_success_rate || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Today's Volume</span>
                      <span className="font-medium">{globalSummary?.swaps_today || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Week</span>
                      <span className="font-medium">{globalSummary?.swaps_this_week || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Approval Time</span>
                      <span className="font-medium">{globalSummary?.average_approval_time || 0}h</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Full Analytics
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Insights */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-4 w-4" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {criticalFacilities.length > 0 && (
                      <div className="p-2 bg-red-50 rounded text-xs">
                        <p className="font-medium text-red-800">High Alert</p>
                        <p className="text-red-600">{criticalFacilities.length} facilities need immediate attention</p>
                      </div>
                    )}
                    {needsAttentionFacilities.length > 0 && (
                      <div className="p-2 bg-yellow-50 rounded text-xs">
                        <p className="font-medium text-yellow-800">Watch List</p>
                        <p className="text-yellow-600">{needsAttentionFacilities.length} facilities have high volumes</p>
                      </div>
                    )}
                    {pendingCount > 20 && (
                      <div className="p-2 bg-blue-50 rounded text-xs">
                        <p className="font-medium text-blue-800">Heavy Load</p>
                        <p className="text-blue-600">Consider bulk approval for efficiency</p>
                      </div>
                    )}
                    {pendingCount === 0 && urgentCount === 0 && (
                      <div className="p-2 bg-green-50 rounded text-xs">
                        <p className="font-medium text-green-800">All Clear</p>
                        <p className="text-green-600">No pending requests requiring attention</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* DETAILED MANAGEMENT TOOLS- For deep dive work */}
          {/* Floating Action Menu - Bottom Right */}
          <div className="fixed bottom-6 right-6 z-40">
            <div className="flex flex-col items-end gap-3">
              {/* Quick action buttons that appear on hover */}
              <div className="flex flex-col gap-2 opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white shadow-lg border-blue-200 text-blue-700 hover:bg-blue-50 hover:scale-105 transition-all"
                  onClick={() => {
                    setDetailedToolsTab('analytics')
                    setShowDetailedTools(true)
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white shadow-lg border-green-200 text-green-700 hover:bg-green-50 hover:scale-105 transition-all"
                  onClick={() => {
                    setDetailedToolsTab('facilities')
                    setShowDetailedTools(true)
                  }}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Facilities
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white shadow-lg border-purple-200 text-purple-700 hover:bg-purple-50 hover:scale-105 transition-all"
                  onClick={() => {
                    setDetailedToolsTab('all')
                    setShowDetailedTools(true)
                  }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  All Requests
                </Button>
              </div>
              
              {/* Main floating button - BETTER ICON */}
              <div className="group">
                <Button
                  size="lg"
                  className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                  onClick={() => setShowDetailedTools(true)}
                  title="Advanced Management Tools"
                >
                  {/* Better icon options - choose one: */}
                  <Settings className="h-6 w-6" /> {/* Option 1: Settings/Tools */}
                  {/* <MoreHorizontal className="h-6 w-6" /> */} {/* Option 2: More options */}
                  {/* <Zap className="h-6 w-6" /> */} {/* Option 3: Power/Advanced */}
                  {/* <Target className="h-6 w-6" /> */} {/* Option 4: Precision/Focus */}
                </Button>
              </div>
            </div>
          </div>

          {/* Detailed Tools Modal */}
          <Dialog open={showDetailedTools} onOpenChange={setShowDetailedTools}>
            <DialogContent size="2xl" 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[96vw] h-[96vh] max-w-none max-h-none overflow-hidden flex flex-col bg-white rounded-lg shadow-2xl"
              style={{
                width: 'calc(100vw - 6rem)',
                height: 'calc(100vh - 6rem)',
                maxWidth: 'none',
                maxHeight: 'none'
              }}
            >
              <DialogHeader className="flex-shrink-0 border-b pb-6 px-8 pt-6">
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Settings className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Advanced Management Tools</h2>
                      <p className="text-base text-gray-600 mt-1">Deep analysis, bulk operations, and comprehensive reporting</p>
                    </div>
                  </div>
                  
                  {/* Large tab selector */}
                  <Tabs value={detailedToolsTab} onValueChange={setDetailedToolsTab} className="w-auto">
                    <TabsList className="grid w-full grid-cols-3 h-12">
                      <TabsTrigger value="all" className="gap-3 px-6 text-base">
                        <Search className="h-5 w-5" />
                        All Requests
                      </TabsTrigger>
                      <TabsTrigger value="facilities" className="gap-3 px-6 text-base">
                        <Building className="h-5 w-5" />
                        Facility Deep Dive
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="gap-3 px-6 text-base">
                        <BarChart3 className="h-5 w-5" />
                        Analytics & Reports
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-auto px-8 py-6">
                {/* All Requests Tab - MASSIVE SIZE */}
                {detailedToolsTab === 'all' && (
                  <div className="space-y-8 h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">All Swap Requests</h3>
                        <p className="text-lg text-gray-600 mt-2">Advanced search, filtering, and bulk operations - {filteredSwapRequests.length} requests found</p>
                      </div>
                      <div className="flex gap-4">
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={() => setShowAdvancedSearch(true)}
                          className="gap-3 px-6 py-3"
                        >
                          <Filter className="h-5 w-5" />
                          Advanced Filters
                        </Button>
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={() => setShowExportModal(true)}
                          className="gap-3 px-6 py-3"
                        >
                          <Download className="h-5 w-5" />
                          Export Report
                        </Button>
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={handleClearFilters}
                          className="gap-3 px-6 py-3"
                        >
                          <X className="h-5 w-5" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                    
                    {/* Large Search and Filters */}
                    <Card className="shadow-lg">
                      <CardHeader className="pb-6">
                        <CardTitle className="text-xl">Search & Filter Controls</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="md:col-span-2">
                            <Input
                              placeholder="Search by staff name, reason, facility..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full h-12 text-base"
                            />
                          </div>
                          <Select value={selectedFacility || ''} onValueChange={setSelectedFacility}>
                            <option value="">All Facilities</option>
                            {facilitySummaries.map((facility) => (
                              <option key={facility.facility_id} value={facility.facility_id}>
                                {facility.facility_name}
                              </option>
                            ))}
                          </Select>
                          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                            <option value="">All Priority Levels</option>
                            <option value="emergency">Emergency</option>
                            <option value="high">High Priority</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low Priority</option>
                          </Select>
                        </div>
                        
                        {/* Active Filters Display */}
                        {(selectedFacility || urgencyFilter || searchTerm || Object.keys(advancedFilters).length > 0) && (
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-medium text-blue-900">
                                Active Filters: Showing {filteredSwapRequests.length} of {allSwapRequests.length} requests
                              </span>
                              <Button variant="ghost" size="lg" onClick={handleClearFilters} className="text-blue-600">
                                Clear All Filters
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Results Area - Takes massive remaining space */}
                    <div className="flex-1 min-h-[600px] bg-gray-50 rounded-lg p-6">
                      <SwapManagementDashboard
                        facility={selectedFacility ? facilitySummaries.find(f => f.facility_id === selectedFacility) : null}
                        swapRequests={filteredSwapRequests}
                        swapSummary={{
                          facility_id: selectedFacility || 'all',
                          pending_swaps: filteredSwapRequests.filter(swap => swap.status === SwapStatus.manager_final_approval).length,
                          urgent_swaps: filteredSwapRequests.filter(swap => [SwapUrgency.High, SwapUrgency.Emergency].includes(swap.urgency)).length,
                          auto_swaps_needing_assignment: filteredSwapRequests.filter(swap => 
                            swap.swap_type === 'auto' && swap.status === SwapStatus.manager_final_approval && !swap.assigned_staff_id
                          ).length,
                          specific_swaps_awaiting_response: filteredSwapRequests.filter(swap =>
                            swap.swap_type === 'specific' && swap.status === SwapStatus.manager_final_approval && swap.target_staff_accepted === null
                          ).length,
                          recent_completions: filteredSwapRequests.filter(swap => 
                            swap.status === 'completed' && 
                            new Date(swap.completed_at || swap.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ).length
                        }}
                        days={DAYS}
                        shifts={SHIFTS}
                        onApproveSwap={handleApproveSwap}
                        onFinalApproval={handleFinalApproval}
                        onRetryAutoAssignment={handleRetryAutoAssignment}
                        onViewSwapHistory={handleViewSwapHistory}
                        onRefresh={loadManagerData}
                        selectedSwaps={selectedSwaps}
                        onSelectSwap={handleSelectSwap}
                        onSelectAll={handleSelectAll}
                        onUpdateSwap={handleUpdateSwap}
                        onCancelSwap={handleCancelSwap}
                      />
                    </div>
                  </div>
                )}

                {/* Facility Deep Dive Tab - MASSIVE SIZE */}
                {detailedToolsTab === 'facilities' && (
                  <div className="space-y-8 h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">Facility Performance Analysis</h3>
                        <p className="text-lg text-gray-600 mt-2">Detailed facility performance analysis and management - {facilitySummaries.length} facilities</p>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="text-base px-4 py-2">
                          {facilitySummaries.filter(f => f.emergency_swaps > 0).length} Critical
                        </Badge>
                        <Badge variant="outline" className="text-base px-4 py-2">
                          {facilitySummaries.filter(f => f.urgent_swaps > 3).length} High Priority
                        </Badge>
                        <Badge variant="outline" className="text-base px-4 py-2">
                          {facilitySummaries.filter(f => f.pending_swaps === 0).length} All Clear
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Large facility grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {facilitySummaries.map((facility) => {
                        const totalSwaps = facility.pending_swaps + facility.urgent_swaps + facility.emergency_swaps
                        const swapRatio = totalSwaps / Math.max(facility.staff_count, 1)
                        
                        const getStatus = () => {
                          if (facility.emergency_swaps > 0) return 'emergency'
                          if (facility.urgent_swaps > 3) return 'urgent'
                          if (facility.pending_swaps > 8) return 'attention'
                          if (totalSwaps > 0) return 'active'
                          return 'quiet'
                        }
                        
                        const status = getStatus()
                        
                        const statusConfig = {
                          emergency: { color: 'border-red-300 bg-red-50', headerColor: 'text-red-800' },
                          urgent: { color: 'border-orange-300 bg-orange-50', headerColor: 'text-orange-800' },
                          attention: { color: 'border-yellow-300 bg-yellow-50', headerColor: 'text-yellow-800' },
                          active: { color: 'border-blue-300 bg-blue-50', headerColor: 'text-blue-800' },
                          quiet: { color: 'border-green-300 bg-green-50', headerColor: 'text-green-800' }
                        }
                        
                        const config = statusConfig[status]
                        
                        return (
                          <Card 
                            key={facility.facility_id} 
                            className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${config.color} h-48`}
                            onClick={() => {
                              handleFacilityClick(facility)
                              setShowDetailedTools(false)
                            }}
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                    <Building className="h-6 w-6 text-gray-700" />
                                  </div>
                                  <div>
                                    <h3 className={`text-lg font-semibold ${config.headerColor}`}>
                                      {facility.facility_name}
                                    </h3>
                                    <p className="text-sm text-gray-600 capitalize">
                                      {facility.facility_type} • {facility.staff_count} staff
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                                  <p className="text-xl font-bold text-gray-900">{facility.pending_swaps}</p>
                                  <p className="text-xs text-gray-600">Pending</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                                  <p className="text-xl font-bold text-orange-600">{facility.urgent_swaps}</p>
                                  <p className="text-xs text-gray-600">Urgent</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                                  <p className="text-xl font-bold text-red-600">{facility.emergency_swaps}</p>
                                  <p className="text-xs text-gray-600">Emergency</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg shadow-sm">
                                  <p className="text-xl font-bold text-green-600">{facility.recent_completions}</p>
                                  <p className="text-xs text-gray-600">Resolved</p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Workload per Staff</span>
                                  <span className="font-medium">{swapRatio.toFixed(1)} swaps/person</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div 
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                      swapRatio > 1 ? 'bg-red-500' :
                                      swapRatio > 0.5 ? 'bg-orange-500' :
                                      swapRatio > 0.2 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(10, swapRatio * 50))}%` }}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Analytics Tab - MASSIVE SIZE */}
                {detailedToolsTab === 'analytics' && (
                  <div className="h-full">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold">Analytics & Reports</h3>
                      <p className="text-lg text-gray-600 mt-2">Comprehensive analytics, trends, and performance insights</p>
                    </div>
                    
                    <div className="h-full min-h-[700px]">
                      <AnalyticsTab
                        facilitySummaries={facilitySummaries}
                        allSwapRequests={allSwapRequests}
                        apiClient={apiClient}
                      />
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        </div>
      </div>
      
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

      {/* Manager Final Approval Modal */}
      <ManagerFinalApprovalModal
        open={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        swaps={allSwapRequests.filter(s => selectedSwaps.includes(s.id))}
        onDecision={async () => {
          await loadManagerData()
          setSelectedSwaps([])
          setShowManagerModal(false)
        }}
      />
    </AppLayout>
  )
}