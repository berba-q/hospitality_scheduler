// swap management dash component
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
  TrendingUp
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
  onFacilityClick?: (facility: any) => void // Optional prop for facility drill-down
}

// Configuration objects
const URGENCY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  normal: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  emergency: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
}

const STATUS_CONFIG = {
  pending: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    label: 'Pending Review',
    description: 'Waiting for manager review'
  },
  manager_approved: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: CheckCircle,
    label: 'Manager Approved',
    description: 'Approved, waiting for staff response or auto-assignment'
  },
  staff_accepted: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: PlayCircle,
    label: 'In Progress',
    description: 'Staff accepted, swap being executed'
  },
  assigned: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    icon: Users,
    label: 'Coverage Assigned',
    description: 'Auto-assignment successful'
  },
  executed: { 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
    icon: CheckCircle,
    label: 'Completed',
    description: 'Swap executed successfully'
  },
  declined: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: XCircle,
    label: 'Declined',
    description: 'Manager rejected the request'
  },
  staff_declined: { 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: PauseCircle,
    label: 'Staff Declined',
    description: 'Staff member declined the swap'
  },
  assignment_failed: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: AlertTriangle,
    label: 'Assignment Failed',
    description: 'Could not find coverage'
  },
  cancelled: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
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
        // Find the swap to customize message
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
      <Card key={swap.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                <Badge className={statusConfig.color} variant="outline">
                  {statusConfig.label}
                </Badge>
              </div>
              <Badge className={urgencyConfig.color} variant="outline">
                <UrgencyIcon className="h-3 w-3 mr-1" />
                {swap.urgency.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewSwapHistory(swap.id)}
                className="h-8 w-8 p-0"
              >
                <History className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500">
                {new Date(swap.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Swap Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{swap.requesting_staff?.full_name}</span>
              <Badge variant="outline" className="text-xs">
                {swap.requesting_staff?.role}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {days[swap.original_day]} - {shifts[swap.original_shift]?.name}
              </span>
              {swap.swap_type === 'specific' && swap.target_staff && (
                <>
                  <ArrowLeftRight className="h-4 w-4 mx-2" />
                  <span>
                    {swap.target_staff.full_name} ({days[swap.target_day!]} - {shifts[swap.target_shift!]?.name})
                  </span>
                </>
              )}
              {swap.swap_type === 'auto' && swap.assigned_staff && (
                <>
                  <ChevronRight className="h-4 w-4 mx-2" />
                  <span>Covered by {swap.assigned_staff.full_name}</span>
                </>
              )}
            </div>

            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
              <span className="font-medium">Reason: </span>
              {swap.reason}
            </div>

            {swap.manager_notes && (
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                <span className="font-medium">Manager Notes: </span>
                {swap.manager_notes}
              </div>
            )}
          </div>

          {/* Actions based on status */}
          {swap.status === 'pending' && (
            <div className="flex gap-2 pt-3 border-t mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSwap(swap)}
                className="flex-1"
              >
                Review & Decide
              </Button>
            </div>
          )}

          {swap.status === 'assignment_failed' && swap.swap_type === 'auto' && (
            <div className="flex gap-2 pt-3 border-t mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetryAutoAssignment(swap.id)}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry Assignment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendingSwaps.length}</p>
                <p className="text-sm text-gray-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{approvedSwaps.length}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{inProgressSwaps.length}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{completedSwaps.length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by staff name or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} className="w-48">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="manager_approved">Approved</option>
              <option value="staff_accepted">Staff Accepted</option>
              <option value="executed">Completed</option>
              <option value="declined">Declined</option>
            </Select>
            <Button variant="outline" onClick={onRefresh}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending">
            Pending ({pendingSwaps.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedSwaps.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress ({inProgressSwaps.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedSwaps.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({allHistorySwaps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {filterSwaps(pendingSwaps).map(renderSwapCard)}
            {filterSwaps(pendingSwaps).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Swaps</h3>
                  <p className="text-gray-600">All caught up! No swap requests require your attention.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <div className="grid gap-4">
            {filterSwaps(approvedSwaps).map(renderSwapCard)}
            {filterSwaps(approvedSwaps).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Swaps</h3>
                  <p className="text-gray-600">No swaps are currently approved and waiting for execution.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="grid gap-4">
            {filterSwaps(inProgressSwaps).map(renderSwapCard)}
            {filterSwaps(inProgressSwaps).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Swaps In Progress</h3>
                  <p className="text-gray-600">No swaps are currently being executed.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {filterSwaps(completedSwaps).map(renderSwapCard)}
            {filterSwaps(completedSwaps).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Swaps</h3>
                  <p className="text-gray-600">No swaps have been completed recently.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4">
            {filterSwaps(allHistorySwaps).map(renderSwapCard)}
            {filterSwaps(allHistorySwaps).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No History</h3>
                  <p className="text-gray-600">No completed or cancelled swaps to show.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Manager Decision Modal */}
      {selectedSwap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Review Swap Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Swap details display */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Request Details</h4>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm">
                      <strong>{selectedSwap.requesting_staff?.full_name}</strong> wants to swap their 
                      <strong> {days[selectedSwap.original_day]} {shifts[selectedSwap.original_shift]?.name}</strong> shift
                      {selectedSwap.swap_type === 'specific' && selectedSwap.target_staff && (
                        <> with <strong>{selectedSwap.target_staff.full_name}</strong>'s 
                        <strong> {days[selectedSwap.target_day!]} {shifts[selectedSwap.target_shift!]?.name}</strong> shift</>
                      )}
                    </p>
                    <p className="text-sm mt-2"><strong>Reason:</strong> {selectedSwap.reason}</p>
                  </div>
                </div>

                {/* Manager Notes */}
                <div className="space-y-2">
                  <Label>Manager Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this decision..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSwap(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(selectedSwap.id, false)}
                  disabled={loading === selectedSwap.id}
                  className="flex-1"
                >
                  {loading === selectedSwap.id ? 'Declining...' : 'Decline'}
                </Button>
                <Button
                  onClick={() => handleApproval(selectedSwap.id, true)}
                  disabled={loading === selectedSwap.id}
                  className="flex-1"
                >
                  {loading === selectedSwap.id ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}