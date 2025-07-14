// SwapDetailModal Component - shows comprehensive swap details

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
      setSwapHistory(history.history || [])
    } catch (error) {
      console.error('Failed to load swap history:', error)
      // Don't show error toast for history, it's not critical
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleResponse = async (accepted) => {
    try {
      await onSwapResponse(swap.id, accepted, responseNotes)
      setResponseNotes('')
      setShowResponseForm(false)
      setResponseType(null)
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const handleCancel = async () => {
    try {
      await onCancelSwap(swap.id, cancelReason)
      setCancelReason('')
      setShowCancelForm(false)
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  if (!swap) return null

  const isMyRequest = swap.requesting_staff_id === user.id
  const isForMe = swap.target_staff_id === user.id
  const canRespond = isForMe && swap.status === 'pending' && swap.target_staff_accepted === null
  const canCancel = isMyRequest && ['pending', 'manager_approved'].includes(swap.status)

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'manager_approved': 'bg-green-100 text-green-800',
      'staff_accepted': 'bg-green-100 text-green-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'executed': 'bg-green-100 text-green-800',
      'declined': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getUrgencyColor = (urgency) => {
    const colors = {
      'emergency': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'normal': 'bg-blue-500 text-white',
      'low': 'bg-gray-500 text-white'
    }
    return colors[urgency] || 'bg-gray-500 text-white'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5" />
            Swap Request Details
            <div className="flex gap-2 ml-auto">
              <Badge className={getStatusColor(swap.status)}>
                {swap.status.replace('_', ' ')}
              </Badge>
              <Badge className={getUrgencyColor(swap.urgency)}>
                {swap.urgency}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

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
                        {DAYS[swap.original_day]}
                      </p>
                      <p className="text-red-600">
                        {SHIFTS[swap.original_shift]}
                      </p>
                      <p className="text-sm text-red-500 mt-1">
                        Shift to be covered
                      </p>
                    </div>
                  </div>

                  {/* Target Shift */}
                  {swap.swap_type === 'specific' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Requested Shift</h4>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-medium text-green-800">
                          {swap.target_day !== null ? DAYS[swap.target_day] : 'Any Day'}
                        </p>
                        <p className="text-green-600">
                          {swap.target_shift !== null ? SHIFTS[swap.target_shift] : 'Any Shift'}
                        </p>
                        <p className="text-sm text-green-500 mt-1">
                          Desired shift in return
                        </p>
                      </div>
                    </div>
                  )}

                  {swap.swap_type === 'auto' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Auto Assignment</h4>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-medium text-blue-800">
                          System will find coverage
                        </p>
                        <p className="text-blue-600">
                          No specific shift requested
                        </p>
                        <p className="text-sm text-blue-500 mt-1">
                          Manager will assign someone
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reason for Swap</h4>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-800">{swap.reason}</p>
                  </div>
                </div>

                {/* Manager Notes */}
                {swap.manager_notes && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Manager Notes</h4>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">{swap.manager_notes}</p>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">{new Date(swap.created_at).toLocaleString()}</p>
                  </div>
                  {swap.expires_at && (
                    <div>
                      <p className="text-gray-600">Expires</p>
                      <p className="font-medium text-orange-600">
                        {new Date(swap.expires_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {swap.completed_at && (
                    <div>
                      <p className="text-gray-600">Completed</p>
                      <p className="font-medium text-green-600">
                        {new Date(swap.completed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {(canRespond || canCancel) && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {canRespond && !showResponseForm && (
                      <>
                        <Button
                          onClick={() => {
                            setResponseType('accept')
                            setShowResponseForm(true)
                          }}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept Swap Request
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setResponseType('decline')
                            setShowResponseForm(true)
                          }}
                          className="gap-2 text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline Swap Request
                        </Button>
                      </>
                    )}

                    {canCancel && !showCancelForm && (
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelForm(true)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel My Request
                      </Button>
                    )}
                  </div>

                  {/* Response Form */}
                  {showResponseForm && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h4 className="font-medium mb-3">
                        {responseType === 'accept' ? 'Accept' : 'Decline'} Swap Request
                      </h4>
                      <Textarea
                        placeholder={`Add a note about your ${responseType}ance (optional)...`}
                        value={responseNotes}
                        onChange={(e) => setResponseNotes(e.target.value)}
                        className="mb-3"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResponse(responseType === 'accept')}
                          className={responseType === 'accept' ? 
                            'bg-green-600 hover:bg-green-700' : 
                            'bg-red-600 hover:bg-red-700'
                          }
                        >
                          Confirm {responseType === 'accept' ? 'Accept' : 'Decline'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowResponseForm(false)
                            setResponseNotes('')
                            setResponseType(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Cancel Form */}
                  {showCancelForm && (
                    <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
                      <h4 className="font-medium mb-3 text-red-800">Cancel Swap Request</h4>
                      <Textarea
                        placeholder="Reason for cancellation (optional)..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="mb-3"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCancel}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Confirm Cancellation
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCancelForm(false)
                            setCancelReason('')
                          }}
                        >
                          Keep Request
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
                      <h4 className="font-medium">{swap.requesting_staff_name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-600">{swap.requesting_staff_role || 'Staff Member'}</p>
                      {isMyRequest && (
                        <Badge className="mt-2 bg-blue-100 text-blue-800">This is you</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target Staff (for specific swaps) */}
              {swap.swap_type === 'specific' && swap.target_staff_id && (
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
                        <h4 className="font-medium">{swap.target_staff_name || 'Unknown'}</h4>
                        <p className="text-sm text-gray-600">{swap.target_staff_role || 'Staff Member'}</p>
                        {isForMe && (
                          <Badge className="mt-2 bg-green-100 text-green-800">This is you</Badge>
                        )}
                        {swap.target_staff_accepted !== null && (
                          <Badge className={`mt-2 ${swap.target_staff_accepted ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {swap.target_staff_accepted ? 'Accepted' : 'Declined'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assigned Staff (for auto swaps) */}
              {swap.swap_type === 'auto' && swap.assigned_staff_id && (
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
                        <h4 className="font-medium">{swap.assigned_staff_name || 'Unknown'}</h4>
                        <p className="text-sm text-gray-600">{swap.assigned_staff_role || 'Staff Member'}</p>
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
                ) : swapHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No history available</p>
                ) : (
                  <div className="space-y-4">
                    {swapHistory.map((event, index) => (
                      <div key={event.id || index} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 rounded-full" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm capitalize">
                              {event.action?.replace('_', ' ')}
                            </p>
                            <span className="text-xs text-gray-500">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          {event.notes && (
                            <p className="text-sm text-gray-600">{event.notes}</p>
                          )}
                          {event.actor_staff_name && (
                            <p className="text-xs text-gray-500">
                              by {event.actor_staff_name}
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
      </DialogContent>
    </Dialog>
  )
}

export default SwapDetailModal