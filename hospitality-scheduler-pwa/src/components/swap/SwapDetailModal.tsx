// SwapDetailModal Component - shows comprehensive swap details and allows user actions

'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeftRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare,
  History,
  MapPin,
  Phone,
  Mail,
  Star,
  TrendingUp,
  FileText
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { WorkflowStatusIndicator, WorkflowStepper } from './WorkflowStatusIndicator'
import { ManagerFinalApprovalModal } from './ManagerFinalApprovalModal'
import { SwapStatus, SwapUrgency } from '@/types/swaps'


const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = ['Morning (6AM-2PM)', 'Afternoon (2PM-10PM)', 'Evening (10PM-6AM)']

function SwapDetailModal({ swap, open, onClose, onSwapResponse, onCancelSwap, user, apiClient }) {
  const [swapHistory, setSwapHistory] = useState([])
  const [responseNotes, setResponseNotes] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [responseType, setResponseType] = useState(null) // 'accept' or 'decline'
  const [isResponding, setIsResponding] = useState(false)

  useEffect(() => {
    if (open && swap) {
      loadSwapHistory()
    }
  }, [open, swap])

  const loadSwapHistory = async () => {
    if (!swap) return
    
    try {
      setLoadingHistory(true)
      const history = await apiClient.getSwapHistory(swap.id)
      setSwapHistory(history.history || history || [])
    } catch (error) {
      console.error('Failed to load swap history:', error)
      // Don't show error toast for history, it's not critical
    } finally {
      setLoadingHistory(false)
    }
  }

  if (!swap) return null

  const userId = user?.staffId || user?.id

  // ✅ DEFENSIVE: Ensure swap has required fields
  const safeSwap = {
    ...swap,
    status: swap.status || 'unknown',
    swap_type: swap.swap_type || 'unknown',
    reason: swap.reason || 'No reason provided',
    created_at: swap.created_at || new Date().toISOString(),
    urgency: swap.urgency || 'normal'
  }

  // ✅ FIXED: Proper logic for determining user roles in swap
  const isMyRequest = safeSwap.requesting_staff_id === userId
  const isTargetStaff = safeSwap.target_staff_id === userId  // For specific swaps
  const isAssignedStaff = safeSwap.assigned_staff_id === userId  // For auto swaps
  const isForMe = isTargetStaff || isAssignedStaff

  // ✅ FIXED: Proper response logic for both swap types
  const canRespond = isForMe && 
    (
      // For specific swaps: target staff can respond when swap is pending
      (safeSwap.swap_type === 'specific' && isTargetStaff && 
       ['pending', 'manager_approved'].includes(safeSwap.status) && 
       safeSwap.target_staff_accepted === null) ||
      
      // For auto swaps: assigned staff can respond when status is potential_assignment/awaiting_target
      (safeSwap.swap_type === 'auto' && isAssignedStaff && 
       ['potential_assignment', 'awaiting_target'].includes(safeSwap.status) && 
       safeSwap.assigned_staff_accepted === null)
    )

  const canCancel = isMyRequest && ['pending', 'manager_approved'].includes(safeSwap.status)

  // ✅ FIXED: Better status mapping for workflow
  const mapStatusForWorkflow = (status) => {
    const statusMap = {
      'potential_assignment': 'awaiting_target',
      'assigned': 'awaiting_target',
      'manager_approved': safeSwap.swap_type === 'auto' ? 'awaiting_target' : 'staff_accepted'
    }
    return statusMap[status] || status
  }

  const workflowStatus = {
    current_status: mapStatusForWorkflow(safeSwap.status) as SwapStatus,
    next_action_required:
      safeSwap.status === 'potential_assignment' || safeSwap.status === 'awaiting_target'
        ? 'staff'
        : safeSwap.status === 'staff_accepted'
        ? 'manager'
        : 'system',
    next_action_by:
      safeSwap.status === 'potential_assignment' || safeSwap.status === 'awaiting_target'
        ? (safeSwap.assigned_staff?.full_name || safeSwap.target_staff?.full_name || 'Staff Member')
        : safeSwap.status === 'staff_accepted'
        ? 'Manager'
        : 'System',
    can_execute: safeSwap.status === 'manager_final_approval',
    blocking_reasons: [],
    estimated_completion: safeSwap.expires_at,
  }

  // ✅ FIXED: Use string array for available actions to prevent object key errors
  const availableActions: string[] = []
  if (canRespond) {
    availableActions.push('accept', 'decline')
  }
  if (canCancel) {
    availableActions.push('cancel')
  }

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'accept':
        handleResponse(true)
        break
      case 'decline':
        handleResponse(false)
        break
      case 'cancel':
        handleCancel()
        break
      default:
        break
    }
  }

  // ✅ COMPLETELY FIXED: Proper API method detection and calling
  const handleResponse = async (accepted: boolean) => {
    if (isResponding) return
    
    try {
      setIsResponding(true)
      
      // Detect swap type and status to use correct API method
      if (safeSwap.swap_type === 'auto' && 
          ['potential_assignment', 'awaiting_target'].includes(safeSwap.status)) {
        
        // ✅ For auto assignments awaiting response, use respondToPotentialAssignment
        console.log('🔄 Calling respondToPotentialAssignment for auto swap')
        await apiClient.respondToPotentialAssignment(safeSwap.id, {
          accepted,
          notes: responseNotes,
          availability_confirmed: true
        })
        
      } else if (safeSwap.swap_type === 'specific' && 
                 ['pending', 'manager_approved'].includes(safeSwap.status)) {
        
        // ✅ For specific swaps, use RespondToSwap (correct capitalization)
        console.log('🔄 Calling RespondToSwap for specific swap')
        await apiClient.RespondToSwap(safeSwap.id, {
          accepted,
          notes: responseNotes,
          confirm_availability: true
        })
        
      } else {
        throw new Error(`Cannot respond to swap in status: ${safeSwap.status} with type: ${safeSwap.swap_type}`)
      }
      
      // ✅ Success handling
      setResponseNotes('')
      setShowResponseForm(false)
      setResponseType(null)
      
      // Show success toast
      toast.success(accepted ? 'Assignment accepted successfully!' : 'Assignment declined')
      
      // Call parent's callback if provided (will refresh data)
      if (onSwapResponse) {
        await onSwapResponse(safeSwap.id, accepted, responseNotes)
      }
      
      // Close modal after successful response
      onClose()
      
    } catch (error) {
      console.error('❌ Response failed:', error)
      
      // Show error toast with specific message
      const errorMessage = error?.message || 'Failed to respond to assignment'
      toast.error(errorMessage)
      
      // Don't close modal on error so user can retry
    } finally {
      setIsResponding(false)
    }
  }

  const handleCancel = async () => {
    try {
      await onCancelSwap(safeSwap.id, cancelReason)
      setCancelReason('')
      setShowCancelForm(false)
      toast.success('Swap request cancelled')
    } catch (error) {
      toast.error('Failed to cancel swap request')
      console.error('Cancel error:', error)
    }
  }

  // ✅ HELPER: Get staff name safely
  const getStaffName = (staffObj, fallbackField) => {
    if (staffObj?.full_name) return staffObj.full_name
    if (staffObj?.name) return staffObj.name
    if (fallbackField) return fallbackField
    return 'Unknown'
  }

  // ✅ HELPER: Get staff role safely  
  const getStaffRole = (staffObj, fallbackField) => {
    if (staffObj?.role) return staffObj.role
    if (fallbackField) return fallbackField
    return 'Staff Member'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5" />
            Swap Request Details
          </DialogTitle>
        </DialogHeader>

        {/* Workflow indicator & stepper */}
        <div className="mb-6 space-y-4">
          <WorkflowStatusIndicator
            swap={safeSwap}
            workflowStatus={workflowStatus}
            availableActions={availableActions}
            onActionClick={handleActionClick}
            apiClient={apiClient}
            onSuccess={() => {
              // Refresh data and close modal on successful workflow action
              if (onSwapResponse) {
                onSwapResponse(safeSwap.id, true, '') // Will refresh data
              }
              onClose()
            }}
          />

          <WorkflowStepper
            currentStatus={mapStatusForWorkflow(safeSwap.status)}
            swapType={safeSwap.swap_type}
          />
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="people">People Involved</TabsTrigger>
            <TabsTrigger value="history">History & Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Swap Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Swap Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Shift */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Original Shift</h4>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-800">
                        {DAYS[safeSwap.original_day] || `Day ${safeSwap.original_day}`}
                      </p>
                      <p className="text-red-600">
                        {SHIFTS[safeSwap.original_shift] || `Shift ${safeSwap.original_shift}`}
                      </p>
                      <p className="text-sm text-red-500 mt-1">
                        Shift to be covered
                      </p>
                    </div>
                  </div>

                  {/* Target Shift */}
                  {safeSwap.swap_type === 'specific' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Requested Shift</h4>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-medium text-green-800">
                          {safeSwap.target_day !== null ? (DAYS[safeSwap.target_day] || `Day ${safeSwap.target_day}`) : 'Any Day'}
                        </p>
                        <p className="text-green-600">
                          {safeSwap.target_shift !== null ? (SHIFTS[safeSwap.target_shift] || `Shift ${safeSwap.target_shift}`) : 'Any Shift'}
                        </p>
                        <p className="text-sm text-green-500 mt-1">
                          Desired shift in return
                        </p>
                      </div>
                    </div>
                  )}

                  {safeSwap.swap_type === 'auto' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Auto Assignment</h4>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-800">
                          {safeSwap.assigned_staff_id ? 'Coverage Assigned' : 'System will find coverage'}
                        </p>
                        <p className="text-blue-600">
                          {safeSwap.assigned_staff_id ? 
                            `Assigned to ${getStaffName(safeSwap.assigned_staff, safeSwap.assigned_staff_name)}` : 
                            'No specific shift requested'}
                        </p>
                        <p className="text-sm text-blue-500 mt-1">
                          {safeSwap.assigned_staff_id ? 
                            'Awaiting staff confirmation' : 
                            'Manager will assign someone'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reason for Swap</h4>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-800">{safeSwap.reason}</p>
                  </div>
                </div>

                {/* Manager Notes */}
                {safeSwap.manager_notes && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Manager Notes</h4>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">{String(safeSwap.manager_notes)}</p>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">{new Date(safeSwap.created_at).toLocaleString()}</p>
                  </div>
                  {safeSwap.expires_at && (
                    <div>
                      <p className="text-gray-600">Expires</p>
                      <p className="font-medium text-orange-600">
                        {new Date(safeSwap.expires_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {safeSwap.completed_at && (
                    <div>
                      <p className="text-gray-600">Completed</p>
                      <p className="font-medium text-green-600">
                        {new Date(safeSwap.completed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="people" className="space-y-6">
            {/* People Involved */}
            <div className="grid gap-4">
              {/* Requesting Staff */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Requesting Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {getStaffName(safeSwap.requesting_staff, safeSwap.requesting_staff_name)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {getStaffRole(safeSwap.requesting_staff, safeSwap.requesting_staff_role)}
                      </p>
                      {isMyRequest && (
                        <Badge className="mt-2 bg-blue-100 text-blue-800">This is you</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target Staff (for specific swaps) */}
              {safeSwap.swap_type === 'specific' && safeSwap.target_staff_id && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Target Staff
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {getStaffName(safeSwap.target_staff, safeSwap.target_staff_name)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getStaffRole(safeSwap.target_staff, safeSwap.target_staff_role)}
                        </p>
                        {isTargetStaff && (
                          <Badge className="mt-2 bg-green-100 text-green-800">This is you</Badge>
                        )}
                        {safeSwap.target_staff_accepted !== null && (
                          <Badge className={`mt-2 ${safeSwap.target_staff_accepted ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {safeSwap.target_staff_accepted ? 'Accepted' : 'Declined'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assigned Staff (for auto swaps) */}
              {safeSwap.swap_type === 'auto' && safeSwap.assigned_staff_id && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Assigned Staff
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {getStaffName(safeSwap.assigned_staff, safeSwap.assigned_staff_name)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getStaffRole(safeSwap.assigned_staff, safeSwap.assigned_staff_role)}
                        </p>
                        {isAssignedStaff && (
                          <Badge className="mt-2 bg-purple-100 text-purple-800">This is you</Badge>
                        )}
                        {safeSwap.assigned_staff_accepted !== null && (
                          <Badge className={`mt-2 ${safeSwap.assigned_staff_accepted ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {safeSwap.assigned_staff_accepted ? 'Accepted' : 'Declined'}
                          </Badge>
                        )}
                        <Badge className="mt-2 bg-purple-100 text-purple-800">
                          Auto-assigned by manager
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Request Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (!swapHistory || swapHistory.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">No detailed history available</p>
                    <p className="text-xs text-gray-400">
                      This may be demo data or a newly created swap request
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {swapHistory.map((event, index) => (
                      <div key={`history-${event.id || `event-${index}`}`} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 rounded-full" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm capitalize">
                              {event.action?.replace('_', ' ') || 'Unknown action'}
                            </p>
                            <span className="text-xs text-gray-500">
                              {event.created_at ? new Date(event.created_at).toLocaleString() : 'Unknown date'}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-gray-600">{String(event.notes)}</p>
                          )}
                          {event.actor_staff_name && (
                            <p className="text-xs text-gray-500">
                              by {String(event.actor_staff_name)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ✅ Action buttons at bottom if user can respond */}
        {canRespond && (
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => handleResponse(true)}
              className="flex-1"
              variant="default"
              disabled={isResponding}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isResponding ? 'Accepting...' : 'Accept Assignment'}
            </Button>
            <Button 
              onClick={() => handleResponse(false)}
              className="flex-1"
              variant="destructive"
              disabled={isResponding}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isResponding ? 'Declining...' : 'Decline Assignment'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SwapDetailModal