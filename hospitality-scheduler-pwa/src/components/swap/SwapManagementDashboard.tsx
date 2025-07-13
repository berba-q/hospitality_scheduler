// Swap management dashboard for schedules page
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  ArrowLeftRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Users,
  Calendar,
  RotateCcw,
  History,
  User,
  Search,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  StopCircle,
  TrendingUp,
  Hourglass,
  ExternalLink,
  MessageCircle,
  Award,
  Building
} from 'lucide-react'
import { toast } from 'sonner'

// Interfaces
interface SwapRequest {
  id: string
  schedule_id: string
  requesting_staff: {
    id: string
    full_name: string
    role: string
  }
  target_staff?: {
    id: string
    full_name: string
    role: string
  }
  assigned_staff?: {
    id: string
    full_name: string
    role: string
  }
  original_day: number
  original_shift: number
  target_day?: number
  target_shift?: number
  swap_type: 'specific' | 'auto'
  reason: string
  urgency: 'low' | 'normal' | 'high' | 'emergency'
  status: 'pending' | 'manager_approved' | 'staff_accepted' | 'staff_declined' | 'assigned' | 'executed' | 'declined' | 'assignment_failed' | 'cancelled'
  target_staff_accepted?: boolean
  manager_approved?: boolean
  manager_notes?: string
  created_at: string
  expires_at?: string
}

interface SwapSummary {
  facility_id: string
  pending_swaps: number
  urgent_swaps: number
  auto_swaps_needing_assignment: number
  specific_swaps_awaiting_response: number
  recent_completions: number
}

interface SwapManagementDashboardProps {
  facility: any
  swapRequests: SwapRequest[]
  swapSummary: SwapSummary
  days: string[]
  shifts: any[]
  onApproveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
  onRetryAutoAssignment: (swapId: string, avoidStaffIds?: string[]) => Promise<void>
  onViewSwapHistory: (swapId: string) => void
  onRefresh: () => void
  onFacilityClick?: (facility: any) => void
}

// Configuration objects
const URGENCY_CONFIG = {
  low: { 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    icon: Clock,
    label: 'Low Priority'
  },
  normal: { 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: Clock,
    label: 'Normal'
  },
  high: { 
    color: 'bg-orange-100 text-orange-700 border-orange-200', 
    icon: AlertTriangle,
    label: 'High Priority'
  },
  emergency: { 
    color: 'bg-red-100 text-red-700 border-red-200', 
    icon: AlertTriangle,
    label: 'Emergency'
  }
}

const STATUS_CONFIG = {
  pending: { 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    icon: Hourglass,
    label: 'Pending Review',
    description: 'Waiting for manager decision'
  },
  manager_approved: { 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: CheckCircle,
    label: 'Manager Approved',
    description: 'Approved by manager'
  },
  staff_accepted: { 
    color: 'bg-green-100 text-green-700 border-green-200', 
    icon: PlayCircle,
    label: 'Staff Accepted',
    description: 'Staff agreed to swap'
  },
  assigned: { 
    color: 'bg-purple-100 text-purple-700 border-purple-200', 
    icon: Users,
    label: 'Coverage Assigned',
    description: 'Auto-assignment successful'
  },
  executed: { 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    icon: CheckCircle,
    label: 'Completed',
    description: 'Successfully executed'
  },
  declined: { 
    color: 'bg-red-100 text-red-700 border-red-200', 
    icon: XCircle,
    label: 'Declined',
    description: 'Manager rejected request'
  },
  staff_declined: { 
    color: 'bg-orange-100 text-orange-700 border-orange-200', 
    icon: PauseCircle,
    label: 'Staff Declined',
    description: 'Staff member declined'
  },
  assignment_failed: { 
    color: 'bg-red-100 text-red-700 border-red-200', 
    icon: AlertTriangle,
    label: 'Assignment Failed',
    description: 'Could not find coverage'
  },
  cancelled: { 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    icon: StopCircle,
    label: 'Cancelled',
    description: 'Request was cancelled'
  }
}

export function SwapManagementDashboard({
  facility,
  swapRequests,
  swapSummary,
  days,
  shifts,
  onApproveSwap,
  onRetryAutoAssignment,
  onViewSwapHistory,
  onRefresh,
  onFacilityClick
}: SwapManagementDashboardProps) {
  const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [loading, setLoading] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTab, setSelectedTab] = useState('pending')

  // Filter swaps by different categories
  const pendingSwaps = swapRequests.filter(swap => swap.status === 'pending')
  const approvedSwaps = swapRequests.filter(swap => 
    ['manager_approved', 'staff_accepted', 'assigned'].includes(swap.status)
  )
  const inProgressSwaps = swapRequests.filter(swap => 
    ['staff_accepted', 'assigned'].includes(swap.status)
  )
  const completedSwaps = swapRequests.filter(swap => 
    ['executed'].includes(swap.status)
  )
  const allHistorySwaps = swapRequests.filter(swap => 
    ['executed', 'declined', 'staff_declined', 'cancelled'].includes(swap.status)
  )

  // Search and filter logic
  const filterSwaps = (swaps: SwapRequest[]) => {
    return swaps.filter(swap => {
      const matchesSearch = !searchTerm || 
        swap.requesting_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.target_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.assigned_staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        swap.reason.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || swap.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }

  const handleApproval = async (swapId: string, approved: boolean) => {
    setLoading(swapId)
    try {
      await onApproveSwap(swapId, approved, approvalNotes)
      setSelectedSwap(null)
      setApprovalNotes('')
      
      if (approved) {
        const swap = swapRequests.find(s => s.id === swapId)
        if (swap?.swap_type === 'specific') {
          toast.success(`Swap approved! Waiting for ${swap.target_staff?.full_name || 'staff'} to respond.`)
        } else {
          toast.success('Swap approved! Finding coverage...')
        }
      } else {
        toast.success('Swap request declined.')
      }
    } catch (error) {
      console.error('Failed to approve swap:', error)
      toast.error('Failed to process swap decision')
    } finally {
      setLoading('')
    }
  }

  const renderSwapCard = (swap: SwapRequest) => {
    const statusConfig = STATUS_CONFIG[swap.status] || STATUS_CONFIG.pending
    const StatusIcon = statusConfig.icon
    const urgencyConfig = URGENCY_CONFIG[swap.urgency]
    const UrgencyIcon = urgencyConfig.icon

    return (
      <Card key={swap.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          {/* Header with Status and Actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <StatusIcon className="h-4 w-4 text-gray-600" />
                </div>
                <Badge className={`${statusConfig.color} border`} variant="outline">
                  {statusConfig.label}
                </Badge>
              </div>
              <Badge className={`${urgencyConfig.color} border`} variant="outline">
                <UrgencyIcon className="h-3 w-3 mr-1" />
                {urgencyConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewSwapHistory(swap.id)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
              >
                <History className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {new Date(swap.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Staff Information */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{swap.requesting_staff?.full_name}</span>
                  <Badge variant="outline" className="text-xs bg-gray-50">
                    {swap.requesting_staff?.role}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">Requesting staff member</p>
              </div>
            </div>

            {/* Swap Type Specific Information */}
            {swap.swap_type === 'specific' && swap.target_staff && (
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="h-4 w-4 text-gray-400 ml-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{swap.target_staff.full_name}</span>
                      <Badge variant="outline" className="text-xs bg-gray-50">
                        {swap.target_staff.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Target staff member</p>
                  </div>
                </div>
              </div>
            )}

            {swap.swap_type === 'auto' && swap.assigned_staff && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center ml-4">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{swap.assigned_staff.full_name}</span>
                    <Badge variant="outline" className="text-xs bg-gray-50">
                      {swap.assigned_staff.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Auto-assigned coverage</p>
                </div>
              </div>
            )}
          </div>

          {/* Shift Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Shift Details</p>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Original:</span> {days[swap.original_day]} - {shifts[swap.original_shift]?.name}
                  </p>
                  {swap.swap_type === 'specific' && swap.target_day !== undefined && swap.target_shift !== undefined && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Target:</span> {days[swap.target_day]} - {shifts[swap.target_shift]?.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Reason</p>
                <p className="text-sm text-gray-600 mt-1">{swap.reason}</p>
              </div>
            </div>
          </div>

          {/* Manager Notes */}
          {swap.manager_notes && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-200">
              <p className="text-sm font-medium text-blue-900">Manager Notes</p>
              <p className="text-sm text-blue-700 mt-1">{swap.manager_notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              {statusConfig.description}
            </div>
            
            {swap.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSwap(swap)}
                  disabled={loading === swap.id}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedSwap(swap)}
                  disabled={loading === swap.id}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            )}

            {swap.status === 'assignment_failed' && swap.swap_type === 'auto' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetryAutoAssignment(swap.id)}
                disabled={loading === swap.id}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry Assignment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Improved Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                  <Hourglass className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{pendingSwaps.length}</p>
                  <p className="text-sm font-medium text-amber-600 mt-1">Pending Review</p>
                  <p className="text-xs text-gray-500">Awaiting manager decision</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{approvedSwaps.length}</p>
                  <p className="text-sm font-medium text-blue-600 mt-1">Approved</p>
                  <p className="text-xs text-gray-500">Ready for execution</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                  <PlayCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{inProgressSwaps.length}</p>
                  <p className="text-sm font-medium text-purple-600 mt-1">In Progress</p>
                  <p className="text-xs text-gray-500">Being executed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{completedSwaps.length}</p>
                  <p className="text-sm font-medium text-emerald-600 mt-1">Completed</p>
                  <p className="text-xs text-gray-500">Successfully executed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improved Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by staff name, reason, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="manager_approved">Approved</option>
                <option value="staff_accepted">Staff Accepted</option>
                <option value="executed">Completed</option>
                <option value="declined">Declined</option>
              </Select>
              <Button variant="outline" onClick={onRefresh} className="h-10 border-gray-200">
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improved Tabs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-600" />
              Swap Requests for {facility?.name}
            </CardTitle>
            {facility && onFacilityClick && (
              <Button variant="ghost" size="sm" onClick={() => onFacilityClick(facility)}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <div className="px-6 py-4 border-b border-gray-100">
              <TabsList className="h-12 p-1 bg-gray-50 rounded-lg w-full grid grid-cols-5">
                <TabsTrigger 
                  value="pending" 
                  className="flex items-center space-x-2 px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  <span>Pending</span>
                  {pendingSwaps.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5">
                      {pendingSwaps.length}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="approved" 
                  className="flex items-center space-x-2 px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  <span>Approved</span>
                  {approvedSwaps.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5">
                      {approvedSwaps.length}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="in-progress" 
                  className="flex items-center space-x-2 px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  <span>In Progress</span>
                  {inProgressSwaps.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5">
                      {inProgressSwaps.length}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="completed" 
                  className="flex items-center space-x-2 px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  <span>Completed</span>
                  {completedSwaps.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5">
                      {completedSwaps.length}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="history" 
                  className="flex items-center space-x-2 px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                >
                  <span>History</span>
                  {allHistorySwaps.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5">
                      {allHistorySwaps.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <TabsContent value="pending" className="mt-0">
                <div className="space-y-4">
                  {filterSwaps(pendingSwaps).map(renderSwapCard)}
                  {filterSwaps(pendingSwaps).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Swaps</h3>
                      <p className="text-gray-600 max-w-sm mx-auto">
                        All caught up! No swap requests require your attention at the moment.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="approved" className="mt-0">
                <div className="space-y-4">
                  {filterSwaps(approvedSwaps).map(renderSwapCard)}
                  {filterSwaps(approvedSwaps).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Swaps</h3>
                      <p className="text-gray-600 max-w-sm mx-auto">
                        No swaps are currently approved and waiting for execution.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="in-progress" className="mt-0">
                <div className="space-y-4">
                  {filterSwaps(inProgressSwaps).map(renderSwapCard)}
                  {filterSwaps(inProgressSwaps).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PlayCircle className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Swaps In Progress</h3>
                      <p className="text-gray-600 max-w-sm mx-auto">
                        No swaps are currently being executed or awaiting staff response.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-0">
                <div className="space-y-4">
                  {filterSwaps(completedSwaps).map(renderSwapCard)}
                  {filterSwaps(completedSwaps).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Swaps</h3>
                      <p className="text-gray-600 max-w-sm mx-auto">
                        No swaps have been completed yet. Completed swaps will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="space-y-4">
                  {filterSwaps(allHistorySwaps).map(renderSwapCard)}
                  {filterSwaps(allHistorySwaps).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data</h3>
                      <p className="text-gray-600 max-w-sm mx-auto">
                        Historical swap data will appear here once swaps are completed or declined.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={!!selectedSwap} onOpenChange={() => setSelectedSwap(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Review Swap Request
            </DialogTitle>
          </DialogHeader>
          
          {selectedSwap && (
            <div className="space-y-4">
              {/* Swap Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    {selectedSwap.requesting_staff?.full_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {selectedSwap.requesting_staff?.role}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {days[selectedSwap.original_day]} - {shifts[selectedSwap.original_shift]?.name}
                  </span>
                </div>

                {selectedSwap.swap_type === 'specific' && selectedSwap.target_staff && (
                  <>
                    <div className="flex items-center gap-2 my-2">
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Swapping with</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {selectedSwap.target_staff.full_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {selectedSwap.target_staff.role}
                      </Badge>
                    </div>
                  </>
                )}

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600">{selectedSwap.reason}</p>
                </div>
              </div>

              {/* Urgency Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Priority:</span>
                <Badge className={URGENCY_CONFIG[selectedSwap.urgency].color} variant="outline">
                  
                  {URGENCY_CONFIG[selectedSwap.urgency].label}
                </Badge>
              </div>

              {/* Notes Input */}
              <div className="space-y-2">
                <Label htmlFor="approval-notes" className="text-sm font-medium text-gray-700">
                  Manager Notes (Optional)
                </Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes about this decision..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="min-h-[80px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedSwap(null)}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedSwap && handleApproval(selectedSwap.id, false)}
              disabled={loading === selectedSwap?.id}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Decline
            </Button>
            <Button
              onClick={() => selectedSwap && handleApproval(selectedSwap.id, true)}
              disabled={loading === selectedSwap?.id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}