// app/swaps/page.tsx - Updated to support both staff and managers
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

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
  Search,
  Eye,
  ChevronRight,
  X,
  Download,
  BarChart3,
  Plus,
  Calendar
} from 'lucide-react'

// Component Imports
import { SwapManagementDashboard } from '@/components/swap/SwapManagementDashboard'
import { FacilityDetailModal } from '@/components/swap/FacilityDetailModal'
import { SwapHistoryModal } from '@/components/swap/SwapHistoryModal'
import { AdvancedSearchModal } from '@/components/swap/AdvancedSearchModal'
import { StaffAnalyticsDashboard } from '@/components/swap/StaffAnalyticsDashboard'
import { ExportReportModal, useExportFunctionality } from '@/components/swap/ExportReportModal'

// Staff Components (create these for staff-specific functionality)
function StaffSwapDashboard() {
  const { user } = useAuth()
  const apiClient = useApiClient()
  const [mySwapRequests, setMySwapRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMySwapRequests()
  }, [])

  const loadMySwapRequests = async () => {
    try {
      setLoading(true)
      const swaps = await apiClient.getMySwapRequests()
      setMySwapRequests(swaps)
    } catch (error) {
      console.error('Failed to load swap requests:', error)
      toast.error('Failed to load your swap requests')
    } finally {
      setLoading(false)
    }
  }

  const handleNewSwapRequest = () => {
    toast.info('Swap request form coming soon!')
    // TODO: Open swap request modal
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your swap requests...</p>
        </div>
      </div>
    )
  }

  const pendingSwaps = mySwapRequests.filter(swap => swap.status === 'pending')
  const awaitingMyResponse = mySwapRequests.filter(swap => 
    swap.can_respond && swap.status === 'manager_approved'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Swap Requests</h1>
          <p className="text-gray-600 mt-1">Manage your shift swaps and coverage requests</p>
        </div>
        <Button onClick={handleNewSwapRequest} className="gap-2">
          <Plus className="w-4 h-4" />
          Request Swap
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSwaps.length}</p>
                <p className="text-sm text-gray-600">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{awaitingMyResponse.length}</p>
                <p className="text-sm text-gray-600">Need My Response</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mySwapRequests.filter(s => s.status === 'completed').length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swap Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>My Swap Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {mySwapRequests.length === 0 ? (
            <div className="text-center py-8">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No swap requests yet</p>
              <p className="text-sm text-gray-500">Create your first swap request to get started</p>
              <Button onClick={handleNewSwapRequest} className="mt-4">
                Request Your First Swap
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {mySwapRequests.map((swap) => (
                <div key={swap.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={
                          swap.status === 'pending' ? 'destructive' : 
                          swap.status === 'completed' ? 'default' : 'secondary'
                        }>
                          {swap.status}
                        </Badge>
                        {swap.urgency !== 'normal' && (
                          <Badge variant="outline" className={
                            swap.urgency === 'emergency' ? 'border-red-300 text-red-700' :
                            swap.urgency === 'high' ? 'border-orange-300 text-orange-700' :
                            'border-gray-300 text-gray-700'
                          }>
                            {swap.urgency}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{swap.reason}</p>
                      <p className="text-sm text-gray-600">
                        {swap.user_role === 'requester' ? 'You requested' : 
                         swap.user_role === 'target' ? 'You were asked' : 
                         'You were assigned'} • Created {new Date(swap.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {swap.can_respond && (
                        <>
                          <Button size="sm" variant="outline">
                            Accept
                          </Button>
                          <Button size="sm" variant="outline">
                            Decline
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SwapsPage() {
  // ============================================================================
  // HOOKS & AUTH
  // ============================================================================
  const { isManager, isAuthenticated, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  const { showExportModal, setShowExportModal, handleExport } = useExportFunctionality(apiClient)

  // ============================================================================
  // MAIN DATA STATE (Manager Only)
  // ============================================================================
  const [globalSummary, setGlobalSummary] = useState(null)
  const [facilitySummaries, setFacilitySummaries] = useState([])
  const [allSwapRequests, setAllSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // ============================================================================
  // UI STATE & FILTERS (Manager Only)
  // ============================================================================
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedFacility, setSelectedFacility] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSwaps, setSelectedSwaps] = useState<string[]>([])
  const [advancedFilters, setAdvancedFilters] = useState({})

  // ============================================================================
  // MODAL STATES (Manager Only)
  // ============================================================================
  const [selectedFacilityForDetail, setSelectedFacilityForDetail] = useState(null)
  const [showFacilityModal, setShowFacilityModal] = useState(false)
  const [showSwapHistory, setShowSwapHistory] = useState(false)
  const [selectedSwapForHistory, setSelectedSwapForHistory] = useState(null)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [staffAnalyticsFacility, setStaffAnalyticsFacility] = useState(null)

  // ============================================================================
  // LOAD MANAGER DATA
  // ============================================================================
  useEffect(() => {
    if (!authLoading && isAuthenticated && isManager) {
      loadManagerData()
    } else if (!authLoading && isAuthenticated) {
      // For staff, no initial data loading needed
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
    setSelectedSwapForHistory(swapId)
    setShowSwapHistory(true)
  }

  const handleFacilityClick = (facility: any) => {
    setSelectedFacilityForDetail(facility)
    setShowFacilityModal(true)
  }

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
  // STAFF VIEW - Simple swap management for staff
  // ============================================================================
  if (!isManager) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <StaffSwapDashboard />
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
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Swap Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage shift swaps across all facilities
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowExportModal(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={loadManagerData}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Manager Dashboard Content - existing implementation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="facilities">By Facility</TabsTrigger>
              <TabsTrigger value="staff-analytics">Staff Analytics</TabsTrigger>
              <TabsTrigger value="all-requests">All Requests</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {globalSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                          <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{globalSummary.total_pending}</p>
                          <p className="text-sm text-gray-600">Pending Swaps</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{globalSummary.urgent_swaps}</p>
                          <p className="text-sm text-gray-600">Urgent Requests</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{globalSummary.completed_today}</p>
                          <p className="text-sm text-gray-600">Completed Today</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{facilitySummaries.length}</p>
                          <p className="text-sm text-gray-600">Active Facilities</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Other tabs would continue with existing manager functionality... */}
            
          </Tabs>

          {/* Modals */}
          {showExportModal && (
            <ExportReportModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              onExport={handleExport}
              swapRequests={allSwapRequests}
              facilities={facilitySummaries}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}