// src/components/swap/SwapManagementDashboard.tsx
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeftRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Users,
  Calendar,
  Eye,
  RotateCcw,
  History,
  Zap,
  Building,
  TrendingUp,
  User
} from 'lucide-react'
import { toast } from 'sonner'

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
  status: 'pending' | 'approved' | 'declined' | 'completed' | 'cancelled'
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
}

const URGENCY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  normal: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  emergency: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
}

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  declined: { color: 'bg-red-100 text-red-800', icon: XCircle },
  completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
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
  onRefresh
}: SwapManagementDashboardProps) {
  const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [loading, setLoading] = useState('')

  // Filter swaps by different categories
  const pendingSwaps = swapRequests.filter(swap => swap.status === 'pending')
  const urgentSwaps = pendingSwaps.filter(swap => ['high', 'emergency'].includes(swap.urgency))

  const handleApproval = async (swapId: string, approved: boolean) => {
    setLoading(swapId)
    try {
      await onApproveSwap(swapId, approved, approvalNotes)
      setSelectedSwap(null)
      setApprovalNotes('')
      toast.success(`Swap request ${approved ? 'approved' : 'declined'}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to process approval')
    } finally {
      setLoading('')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const SwapCard = ({ swap }: { swap: SwapRequest }) => {
    const urgencyConfig = URGENCY_CONFIG[swap.urgency]
    const statusConfig = STATUS_CONFIG[swap.status]
    const UrgencyIcon = urgencyConfig.icon
    const StatusIcon = statusConfig.icon

    return (
      <Card className={`cursor-pointer transition-all hover:shadow-md ${
        swap.urgency === 'emergency' ? 'border-red-300 bg-red-50' : 
        swap.urgency === 'high' ? 'border-orange-300 bg-orange-50' : ''
      }`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-gray-500" />
                <Badge className={statusConfig.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {swap.status}
                </Badge>
                <Badge className={urgencyConfig.color}>
                  <UrgencyIcon className="h-3 w-3 mr-1" />
                  {swap.urgency}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(swap.created_at)}
              </div>
            </div>

            {/* Staff Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{swap.requesting_staff.full_name}</span>
                <Badge variant="outline" className="text-xs">
                  {swap.requesting_staff.role}
                </Badge>
              </div>

              {/* Original Assignment */}
              <div className="text-sm text-gray-600 ml-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{days[swap.original_day]} - {shifts[swap.original_shift]?.name}</span>
                </div>
              </div>

              {/* Swap Details */}
              {swap.swap_type === 'specific' && swap.target_staff && (
                <div className="ml-6 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowLeftRight className="h-3 w-3 text-green-600" />
                    <span>With {swap.target_staff.full_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    {days[swap.target_day!]} - {shifts[swap.target_shift!]?.name}
                  </div>
                  {swap.target_staff_accepted !== null && (
                    <Badge className={swap.target_staff_accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {swap.target_staff_accepted ? 'Accepted' : 'Declined'} by staff
                    </Badge>
                  )}
                </div>
              )}

              {swap.swap_type === 'auto' && (
                <div className="ml-6 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-3 w-3 text-purple-600" />
                    <span>Auto-assignment requested</span>
                  </div>
                  {swap.assigned_staff && (
                    <div className="text-xs text-gray-600 ml-4">
                      Assigned to: {swap.assigned_staff.full_name}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
              <span className="font-medium">Reason: </span>
              {swap.reason}
            </div>

            {/* Manager Notes */}
            {swap.manager_notes && (
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                <span className="font-medium">Manager Notes: </span>
                {swap.manager_notes}
              </div>
            )}

            {/* Actions */}
            {swap.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSwap(swap)
                  }}
                  className="flex-1"
                >
                  Review
                </Button>
                {swap.swap_type === 'auto' && swap.manager_approved && !swap.assigned_staff && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRetryAutoAssignment(swap.id)
                    }}
                    disabled={loading === swap.id}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewSwapHistory(swap.id)
                  }}
                >
                  <History className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{swapSummary.pending_swaps}</div>
                <div className="text-xs text-gray-500">Pending Swaps</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{swapSummary.urgent_swaps}</div>
                <div className="text-xs text-gray-500">Urgent Swaps</div>
             </div>
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardContent className="p-4">
           <div className="flex items-center gap-2">
             <Zap className="h-4 w-4 text-purple-500" />
             <div>
               <div className="text-2xl font-bold">{swapSummary.auto_swaps_needing_assignment}</div>
               <div className="text-xs text-gray-500">Need Assignment</div>
             </div>
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardContent className="p-4">
           <div className="flex items-center gap-2">
             <CheckCircle className="h-4 w-4 text-green-500" />
             <div>
               <div className="text-2xl font-bold">{swapSummary.recent_completions}</div>
               <div className="text-xs text-gray-500">Recent Completions</div>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>

     {/* Swap Management Tabs */}
     <Tabs defaultValue="pending" className="w-full">
       <div className="flex items-center justify-between">
         <TabsList>
           <TabsTrigger value="pending">
             Pending ({pendingSwaps.length})
           </TabsTrigger>
           <TabsTrigger value="urgent">
             Urgent ({urgentSwaps.length})
           </TabsTrigger>
           <TabsTrigger value="all">
             All Swaps
           </TabsTrigger>
         </TabsList>
         <Button variant="outline" size="sm" onClick={onRefresh}>
           <RotateCcw className="h-4 w-4 mr-2" />
           Refresh
         </Button>
       </div>

       <TabsContent value="pending" className="space-y-4">
         {pendingSwaps.length === 0 ? (
           <Card>
             <CardContent className="p-8 text-center">
               <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
               <h3 className="text-lg font-medium mb-2">All caught up!</h3>
               <p className="text-gray-500">No pending swap requests at the moment.</p>
             </CardContent>
           </Card>
         ) : (
           <div className="grid gap-4">
             {pendingSwaps.map(swap => (
               <SwapCard key={swap.id} swap={swap} />
             ))}
           </div>
         )}
       </TabsContent>

       <TabsContent value="urgent" className="space-y-4">
         {urgentSwaps.length === 0 ? (
           <Card>
             <CardContent className="p-8 text-center">
               <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
               <h3 className="text-lg font-medium mb-2">No urgent swaps</h3>
               <p className="text-gray-500">All urgent requests have been handled.</p>
             </CardContent>
           </Card>
         ) : (
           <div className="grid gap-4">
             {urgentSwaps.map(swap => (
               <SwapCard key={swap.id} swap={swap} />
             ))}
           </div>
         )}
       </TabsContent>

       <TabsContent value="all" className="space-y-4">
         <div className="grid gap-4">
           {swapRequests.map(swap => (
             <SwapCard key={swap.id} swap={swap} />
           ))}
         </div>
       </TabsContent>
     </Tabs>

     {/* Approval Modal */}
     {selectedSwap && (
       <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Eye className="h-5 w-5" />
               Review Swap Request
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-6">
             {/* Swap Details */}
             <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <Badge className={STATUS_CONFIG[selectedSwap.status].color}>
                   {selectedSwap.status}
                 </Badge>
                 <Badge className={URGENCY_CONFIG[selectedSwap.urgency].color}>
                   {selectedSwap.urgency}
                 </Badge>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label className="text-xs text-gray-500">Requesting Staff</Label>
                   <div className="font-medium">{selectedSwap.requesting_staff.full_name}</div>
                   <div className="text-sm text-gray-600">{selectedSwap.requesting_staff.role}</div>
                 </div>
                 <div>
                   <Label className="text-xs text-gray-500">Original Shift</Label>
                   <div className="font-medium">
                     {days[selectedSwap.original_day]} - {shifts[selectedSwap.original_shift]?.name}
                   </div>
                   <div className="text-sm text-gray-600">
                     {shifts[selectedSwap.original_shift]?.time}
                   </div>
                 </div>
               </div>

               {selectedSwap.target_staff && (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label className="text-xs text-gray-500">Target Staff</Label>
                     <div className="font-medium">{selectedSwap.target_staff.full_name}</div>
                     <div className="text-sm text-gray-600">{selectedSwap.target_staff.role}</div>
                   </div>
                   <div>
                     <Label className="text-xs text-gray-500">Target Shift</Label>
                     <div className="font-medium">
                       {days[selectedSwap.target_day!]} - {shifts[selectedSwap.target_shift!]?.name}
                     </div>
                     <div className="text-sm text-gray-600">
                       {shifts[selectedSwap.target_shift!]?.time}
                     </div>
                   </div>
                 </div>
               )}

               <div>
                 <Label className="text-xs text-gray-500">Reason</Label>
                 <div className="bg-gray-50 p-3 rounded mt-1">
                   {selectedSwap.reason}
                 </div>
               </div>

               {selectedSwap.target_staff_accepted !== null && (
                 <div>
                   <Label className="text-xs text-gray-500">Staff Response</Label>
                   <Badge className={selectedSwap.target_staff_accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                     {selectedSwap.target_staff_accepted ? 'Accepted' : 'Declined'}
                   </Badge>
                 </div>
               )}
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