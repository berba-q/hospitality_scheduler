// src/app/swaps/page.tsx
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
  Search
} from 'lucide-react'
import { SwapManagementDashboard } from '@/components/swap/SwapManagementDashboard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface GlobalSwapSummary {
  total_facilities: number
  total_pending_swaps: number
  total_urgent_swaps: number
  total_emergency_swaps: number
  swaps_today: number
  swaps_this_week: number
  auto_assignment_success_rate: number
  average_approval_time: number
}

interface FacilitySwapSummary {
  facility_id: string
  facility_name: string
  facility_type: string
  pending_swaps: number
  urgent_swaps: number
  emergency_swaps: number
  recent_completions: number
  staff_count: number
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = [
  { id: 0, name: 'Morning', time: '6:00 AM - 2:00 PM', color: 'bg-yellow-100 text-yellow-800' },
  { id: 1, name: 'Afternoon', time: '2:00 PM - 10:00 PM', color: 'bg-blue-100 text-blue-800' },
  { id: 2, name: 'Evening', time: '10:00 PM - 6:00 AM', color: 'bg-purple-100 text-purple-800' }
]

export default function GlobalSwapsPage() {
  const { isManager, isAuthenticated, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  
  const [globalSummary, setGlobalSummary] = useState<GlobalSwapSummary | null>(null)
  const [facilitySummaries, setFacilitySummaries] = useState<FacilitySwapSummary[]>([])
  const [allSwapRequests, setAllSwapRequests] = useState([])
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && isAuthenticated && isManager) {
      loadGlobalSwapData()
    }
  }, [authLoading, isAuthenticated, isManager])

  const loadGlobalSwapData = async () => {
    setLoading(true)
    try {
      // Load global summary and all facility data
      const [summary, facilities, allSwaps] = await Promise.all([
        apiClient.get('/swaps/global-summary'),
        apiClient.get('/swaps/facilities-summary'),
        apiClient.get('/swaps/all')
      ])
      
      setGlobalSummary(summary)
      setFacilitySummaries(facilities)
      setAllSwapRequests(allSwaps)
    } catch (error) {
      console.error('Failed to load global swap data:', error)
      toast.error('Failed to load swap data')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveSwap = async (swapId: string, approved: boolean, notes?: string) => {
    try {
      await apiClient.put(`/swaps/${swapId}/manager-decision`, {
        approved,
        notes
      })
      await loadGlobalSwapData() // Refresh all data
      toast.success(`Swap request ${approved ? 'approved' : 'declined'}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to process approval')
    }
  }

  const handleRetryAutoAssignment = async (swapId: string, avoidStaffIds?: string[]) => {
    try {
      await apiClient.post(`/swaps/${swapId}/retry-auto-assignment`, {
        avoid_staff_ids: avoidStaffIds || []
      })
      await loadGlobalSwapData()
      toast.success('Auto-assignment retried')
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry assignment')
    }
  }

  // Filter swap requests based on selected facility and filters
  const filteredSwapRequests = allSwapRequests.filter(swap => {
    if (selectedFacility && swap.facility_id !== selectedFacility) return false
    if (urgencyFilter && swap.urgency !== urgencyFilter) return false
    if (statusFilter && swap.status !== statusFilter) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        swap.requesting_staff?.full_name?.toLowerCase().includes(searchLower) ||
        swap.target_staff?.full_name?.toLowerCase().includes(searchLower) ||
        swap.reason?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated || !isManager) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Manager access required to view swap management.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Global Swap Management</h1>
            <p className="text-gray-600 mt-1">
              Manage shift swaps across all facilities from one central location
            </p>
          </div>
          <Button onClick={loadGlobalSwapData} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {globalSummary?.total_facilities || 0}
                  </div>
                  <div className="text-sm text-gray-600">Active Facilities</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {globalSummary?.total_pending_swaps || 0}
                  </div>
                  <div className="text-sm text-gray-600">Pending Swaps</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {globalSummary?.total_urgent_swaps || 0}
                  </div>
                  <div className="text-sm text-gray-600">Urgent Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {globalSummary?.auto_assignment_success_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Auto Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({globalSummary?.total_pending_swaps || 0})
            </TabsTrigger>
            <TabsTrigger value="urgent">
              Urgent ({globalSummary?.total_urgent_swaps || 0})
            </TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Facility Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Facility Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {facilitySummaries.map((facility) => (
                    <div
                      key={facility.facility_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedFacility(facility.facility_id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{facility.facility_name}</div>
                          <div className="text-sm text-gray-600">
                            {facility.facility_type} • {facility.staff_count} staff
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">{facility.pending_swaps}</div>
                          <div className="text-xs text-gray-500">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-orange-600">{facility.urgent_swaps}</div>
                          <div className="text-xs text-gray-500">Urgent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-red-600">{facility.emergency_swaps}</div>
                          <div className="text-xs text-gray-500">Emergency</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-6">
            {/* Filters */}
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
                  <Select value={selectedFacility || ''} onValueChange={setSelectedFacility}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Facilities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Facilities</SelectItem>
                      {facilitySummaries.map((facility) => (
                        <SelectItem key={facility.facility_id} value={facility.facility_id}>
                          {facility.facility_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Swap Management Dashboard */}
            <SwapManagementDashboard
              facility={selectedFacility ? facilitySummaries.find(f => f.facility_id === selectedFacility) : null}
              swapRequests={filteredSwapRequests.filter(swap => swap.status === 'pending')}
              swapSummary={{
                facility_id: selectedFacility || 'all',
                pending_swaps: filteredSwapRequests.filter(swap => swap.status === 'pending').length,
                urgent_swaps: filteredSwapRequests.filter(swap => ['high', 'emergency'].includes(swap.urgency)).length,
                auto_swaps_needing_assignment: 0,
                specific_swaps_awaiting_response: 0,
                recent_completions: 0
              }}
              days={DAYS}
              shifts={SHIFTS}
              onApproveSwap={handleApproveSwap}
              onRetryAutoAssignment={handleRetryAutoAssignment}
              onViewSwapHistory={(swapId) => console.log('View history:', swapId)}
              onRefresh={loadGlobalSwapData}
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
                urgent_swaps: allSwapRequests.filter(swap => ['high', 'emergency'].includes(swap.urgency)).length,
                auto_swaps_needing_assignment: 0,
                specific_swaps_awaiting_response: 0,
                recent_completions: 0
              }}
              days={DAYS}
              shifts={SHIFTS}
              onApproveSwap={handleApproveSwap}
              onRetryAutoAssignment={handleRetryAutoAssignment}
              onViewSwapHistory={(swapId) => console.log('View history:', swapId)}
              onRefresh={loadGlobalSwapData}
            />
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities" className="space-y-6">
            <div className="grid gap-6">
              {facilitySummaries.map((facility) => (
                <Card key={facility.facility_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {facility.facility_name}
                      </div>
                      <Badge variant="outline">{facility.facility_type}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{facility.staff_count}</div>
                        <div className="text-sm text-gray-600">Staff Members</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{facility.pending_swaps}</div>
                        <div className="text-sm text-gray-600">Pending Swaps</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{facility.urgent_swaps}</div>
                        <div className="text-sm text-gray-600">Urgent</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{facility.recent_completions}</div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}