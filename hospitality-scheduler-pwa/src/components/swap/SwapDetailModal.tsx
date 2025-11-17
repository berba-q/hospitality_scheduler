// SwapDetailModal Component - shows comprehensive swap details and allows user actions

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  User,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  History,
  FileText
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/useTranslations'
import { WorkflowStatusIndicator, WorkflowStepper } from './WorkflowStatusIndicator'
import * as SwapTypes from '@/types/swaps'
import * as ApiTypes from '@/types/api'
import * as AuthTypes from '@/types/auth'
import { ApiClient } from '@/lib/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SHIFTS = ['Morning (6AM-2PM)', 'Afternoon (2PM-10PM)', 'Evening (10PM-6AM)']

interface SwapDetailModalProps {
  swap: SwapTypes.SwapRequest | null
  open: boolean
  onClose: () => void
  onSwapResponse: (swapId: string, accepted: boolean, notes: string) => Promise<void>
  onCancelSwap: (swapId: string, reason: string) => Promise<void>
  user: AuthTypes.User | null
  apiClient: ApiClient
}

function SwapDetailModal({ swap, open, onClose, onSwapResponse, onCancelSwap, user, apiClient }: SwapDetailModalProps) {
  const { t } = useTranslations()
  const [swapHistory, setSwapHistory] = useState<ApiTypes.SwapHistoryRead[]>([])
  const [responseNotes, setResponseNotes] = useState<string>('')
  const [cancelReason, setCancelReason] = useState<string>('')
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)
  const [showResponseForm, setShowResponseForm] = useState<boolean>(false)
  const [showCancelForm, setShowCancelForm] = useState<boolean>(false)
  const [responseType, setResponseType] = useState<'accept' | 'decline' | null>(null)
  const [isResponding, setIsResponding] = useState<boolean>(false)

  const loadSwapHistory = useCallback(async (): Promise<void> => {
    if (!swap) return

    try {
      setLoadingHistory(true)
      const history = await apiClient.getSwapHistory(swap.id)
      // Handle both array response and object with history property
      const historyArray: ApiTypes.SwapHistoryRead[] = Array.isArray(history)
        ? history as ApiTypes.SwapHistoryRead[]
        : (history as { history?: ApiTypes.SwapHistoryRead[] }).history || []
      setSwapHistory(historyArray)
    } catch (error) {
      console.error('Failed to load swap history:', error)
      // Don't show error toast for history, it's not critical
    } finally {
      setLoadingHistory(false)
    }
  }, [swap, apiClient])

  useEffect(() => {
    if (open && swap) {
      loadSwapHistory()
    }
  }, [open, swap, loadSwapHistory])

  if (!swap) return null

  const userId = user?.staff_id || user?.id

  //  Ensure swap has required fields
  const safeSwap: SwapTypes.SwapRequest = {
    ...swap,
    status: swap.status || SwapTypes.SwapStatus.Pending,
    swap_type: swap.swap_type || 'auto',
    reason: swap.reason || t('swaps.noReasonProvided'),
    created_at: swap.created_at || new Date().toISOString(),
    urgency: swap.urgency || SwapTypes.SwapUrgency.Normal,
    notification_sent: swap.notification_sent ?? false,
    role_verification_required: swap.role_verification_required ?? false,
    requires_manager_final_approval: swap.requires_manager_final_approval ?? false,
    role_override_applied: swap.role_override_applied ?? false,
  }

  // Calculate user permissions and states
  const isMyRequest = safeSwap.requesting_staff_id === userId
  const isForMe = safeSwap.target_staff_id === userId
  const canRespond = isForMe && safeSwap.status === SwapTypes.SwapStatus.Pending && safeSwap.target_staff_accepted === null
  const canCancel = isMyRequest && [SwapTypes.SwapStatus.Pending, SwapTypes.SwapStatus.ManagerApproved].includes(safeSwap.status)

  // Map statuses for display
  const mapStatusForWorkflow = (status: SwapTypes.SwapStatus): SwapTypes.SwapStatus => {
    const statusMap: Record<string, SwapTypes.SwapStatus> = {
      'pending': SwapTypes.SwapStatus.Pending,
      'manager_approved': SwapTypes.SwapStatus.ManagerApproved,
      'executed': SwapTypes.SwapStatus.Executed,
      'declined': SwapTypes.SwapStatus.Declined,
      'cancelled': SwapTypes.SwapStatus.Cancelled,
      'staff_accepted': SwapTypes.SwapStatus.StaffAccepted,
    }
    return statusMap[status] || SwapTypes.SwapStatus.Pending
  }

  const handleResponse = async (accepted: boolean): Promise<void> => {
    if (isResponding) return

    setIsResponding(true)
    try {
      await onSwapResponse(safeSwap.id, accepted, responseNotes)
      toast.success(
        accepted
          ? t('swaps.swapAcceptedSuccessfully')
          : t('swaps.swapDeclinedSuccessfully')
      )
      onClose()
    } catch {
      toast.error(
        accepted
          ? t('swaps.failedAcceptSwap')
          : t('swaps.failedDeclineSwap')
      )
    } finally {
      setIsResponding(false)
    }
  }

  const handleCancel = async (): Promise<void> => {
    if (isResponding) return

    setIsResponding(true)
    try {
      await onCancelSwap(safeSwap.id, cancelReason)
      toast.success(t('swaps.swapCancelledSuccessfully'))
      onClose()
    } catch {
      toast.error(t('swaps.failedCancelSwap'))
    } finally {
      setIsResponding(false)
    }
  }

  // Get workflow state
  const currentStatus = mapStatusForWorkflow(safeSwap.status)
  const availableActions: string[] = canRespond ? ['accept', 'decline'] : canCancel ? ['cancel'] : []

  const handleActionClick = (action: string): void => {
    switch (action) {
      case 'accept':
        handleResponse(true)
        break
      case 'decline':
        setShowResponseForm(true)
        setResponseType('decline')
        break
      case 'cancel':
        setShowCancelForm(true)
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5" />
            {t('swaps.swapRequestDetails')}
          </DialogTitle>
        </DialogHeader>

        {/* Workflow indicator & stepper */}
        <div className="mb-6 space-y-4">
          <WorkflowStatusIndicator
            swap={safeSwap}
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
            currentStatus={currentStatus}
            swapType={safeSwap.swap_type}
          />
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t('swaps.details')}</TabsTrigger>
            <TabsTrigger value="people">{t('swaps.peopleInvolved')}</TabsTrigger>
            <TabsTrigger value="history">{t('swaps.historyTimeline')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Swap Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('swaps.requestOverview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status and Priority Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={
                      safeSwap.status === SwapTypes.SwapStatus.Pending ? 'bg-yellow-100 text-yellow-800' :
                      safeSwap.status === SwapTypes.SwapStatus.ManagerApproved ? 'bg-green-100 text-green-800' :
                      safeSwap.status === SwapTypes.SwapStatus.Executed ? 'bg-blue-100 text-blue-800' :
                      safeSwap.status === SwapTypes.SwapStatus.Declined ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  >
                    {t(`status.${safeSwap.status}`) || safeSwap.status}
                  </Badge>

                  <Badge
                    className={
                      safeSwap.urgency === SwapTypes.SwapUrgency.Emergency ? 'bg-red-100 text-red-800' :
                      safeSwap.urgency === SwapTypes.SwapUrgency.High ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  >
                    {t(`swaps.${safeSwap.urgency}Priority`) || safeSwap.urgency}
                  </Badge>

                  <Badge className="bg-purple-100 text-purple-800">
                    {safeSwap.swap_type === 'auto' ? t('swaps.autoSwap') : t('swaps.specificSwap')}
                  </Badge>
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('swaps.requestedBy')}</label>
                    <p className="text-sm font-medium">
                      {safeSwap.requesting_staff?.full_name || t('common.unknown')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('swaps.requestDate')}</label>
                    <p className="text-sm font-medium">
                      {new Date(safeSwap.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {safeSwap.target_staff?.full_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('swaps.targetStaff')}</label>
                      <p className="text-sm font-medium">{safeSwap.target_staff.full_name}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('swaps.facility')}</label>
                    <p className="text-sm font-medium">
                      {safeSwap.facility?.name || safeSwap.facility_name || t('common.unknown')}
                    </p>
                  </div>
                </div>

                {/* Shift Information */}
                <div className="space-y-3">
                  <h4 className="font-medium">{t('swaps.shiftDetails')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-500">{t('common.day')}:</span>
                        <span className="text-sm font-medium ml-1">
                          {safeSwap.original_day !== null ? DAYS[safeSwap.original_day] : t('swaps.anyDay')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-500">{t('common.shift')}:</span>
                        <span className="text-sm font-medium ml-1">
                          {safeSwap.original_shift !== null ? SHIFTS[safeSwap.original_shift] : t('swaps.anyShift')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {safeSwap.reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('swaps.reason')}</label>
                    <p className="text-sm bg-gray-50 p-3 rounded-md">{safeSwap.reason}</p>
                  </div>
                )}

                {/* Notes */}
                {(safeSwap.staff_notes || safeSwap.manager_notes) && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('common.notes')}</label>
                    {safeSwap.staff_notes && (
                      <p className="text-sm bg-gray-50 p-3 rounded-md mb-2">
                        <span className="font-medium">{t('swaps.staffNotes')}: </span>
                        {safeSwap.staff_notes}
                      </p>
                    )}
                    {safeSwap.manager_notes && (
                      <p className="text-sm bg-gray-50 p-3 rounded-md">
                        <span className="font-medium">{t('swaps.managerNotes')}: </span>
                        {safeSwap.manager_notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="people" className="space-y-6">
            {/* People Involved */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {t('swaps.staffInvolved')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Requesting Staff */}
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{t('swaps.requester')}</h4>
                    <p className="text-sm text-gray-600">{safeSwap.requesting_staff?.full_name || t('common.unknown')}</p>
                    <p className="text-xs text-gray-500">{t('swaps.initiatedRequest')}</p>
                  </div>
                </div>

                {/* Target Staff */}
                {safeSwap.target_staff?.full_name && (
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{t('swaps.targetStaff')}</h4>
                      <p className="text-sm text-gray-600">{safeSwap.target_staff.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {safeSwap.target_staff_accepted === true ? t('swaps.hasAccepted') :
                         safeSwap.target_staff_accepted === false ? t('swaps.hasDeclined') :
                         t('swaps.pendingResponse')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Assigned Staff (for auto swaps) */}
                {safeSwap.assigned_staff?.full_name && (
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{t('swaps.assignedStaff')}</h4>
                      <p className="text-sm text-gray-600">{safeSwap.assigned_staff.full_name}</p>
                      <p className="text-xs text-gray-500">{t('swaps.systemAssigned')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* History Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t('swaps.requestHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (!swapHistory || swapHistory.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">{t('swaps.noDetailedHistory')}</p>
                    <p className="text-xs text-gray-400">
                      {t('swaps.mayBeDemoData')}
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
                              {event.action?.replace('_', ' ') || t('swaps.unknownAction')}
                            </p>
                            <span className="text-xs text-gray-500">
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : t('swaps.unknownDate')}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-gray-600">{String(event.notes)}</p>
                          )}
                          {event.actor_name && (
                            <p className="text-xs text-gray-500">
                              {t('common.by')} {String(event.actor_name)}
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

        {/* Response Form */}
        {showResponseForm && responseType === 'decline' && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">{t('swaps.declineSwapRequest')}</h4>
              <Textarea
                placeholder={t('swaps.optionalReasonForDeclining')}
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleResponse(false)}
                  variant="destructive"
                  disabled={isResponding}
                >
                  {isResponding ? t('common.declining') : t('common.decline')}
                </Button>
                <Button 
                  onClick={() => {
                    setShowResponseForm(false)
                    setResponseType(null)
                    setResponseNotes('')
                  }}
                  variant="outline"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel Form */}
        {showCancelForm && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">{t('swaps.cancelSwapRequest')}</h4>
              <Textarea
                placeholder={t('swaps.reasonForCancelling')}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleCancel}
                  variant="destructive"
                  disabled={isResponding || !cancelReason.trim()}
                >
                  {isResponding ? t('common.cancelling') : t('common.cancel')}
                </Button>
                <Button 
                  onClick={() => {
                    setShowCancelForm(false)
                    setCancelReason('')
                  }}
                  variant="outline"
                >
                  {t('common.close')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✅ Action buttons at bottom if user can respond */}
        {canRespond && !showResponseForm && (
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => handleResponse(true)}
              className="flex-1"
              variant="default"
              disabled={isResponding}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isResponding ? t('swaps.accepting') : t('swaps.acceptAssignment')}
            </Button>
            <Button 
              onClick={() => handleResponse(false)}
              className="flex-1"
              variant="destructive"
              disabled={isResponding}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isResponding ? t('swaps.declining') : t('swaps.declineAssignment')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SwapDetailModal