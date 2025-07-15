// app/swaps/page.tsx - swaps management pages
'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

// Import existing components
import { SwapManagementDashboard } from '@/components/swap/SwapManagementDashboard'
import { ExportReportModal, useExportFunctionality } from '@/components/swap/ExportReportModal'

// Import enhanced staff component
import StaffSwapDashboard from '@/components/swap/StaffSwapDashboard'

// Icons
import { 
  Clock, 
  CheckCircle,
  Building,
  RotateCcw,
  Download,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

          {/* Manager Dashboard Content */}
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

            {/* Other tabs would use your existing SwapManagementDashboard component */}
            <TabsContent value="facilities" className="space-y-6">
              {facilitySummaries.length > 0 && (
                <SwapManagementDashboard
                  facility={facilitySummaries[0]} // You'd want to implement facility selection
                  swapRequests={allSwapRequests}
                  swapSummary={globalSummary}
                  days={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}
                  shifts={[
                    { id: 0, name: 'Morning', time: '6AM-2PM' },
                    { id: 1, name: 'Afternoon', time: '2PM-10PM' },
                    { id: 2, name: 'Evening', time: '10PM-6AM' }
                  ]}
                  onApproveSwap={handleApproveSwap}
                  onRetryAutoAssignment={handleRetryAutoAssignment}
                  onViewSwapHistory={(swapId) => console.log('View history for:', swapId)}
                  onRefresh={loadManagerData}
                />
              )}
            </TabsContent>

            <TabsContent value="staff-analytics" className="space-y-6">
              <div className="text-center py-8">
                <p className="text-gray-600">Staff analytics would be implemented here</p>
              </div>
            </TabsContent>

            <TabsContent value="all-requests" className="space-y-6">
              <div className="text-center py-8">
                <p className="text-gray-600">All requests view would be implemented here</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Export Modal */}
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