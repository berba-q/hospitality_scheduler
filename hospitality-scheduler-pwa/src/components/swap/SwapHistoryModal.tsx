// SwapHistoryModal.tsx - Shows complete timeline and history for a swap
'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  History, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  ArrowLeftRight,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Users,
  Zap,
  X,
  Activity
} from 'lucide-react'

interface SwapHistoryEntry {
  id: string
  swap_request_id: string
  action: string
  actor_staff_id?: string
  actor_staff_name?: string
  notes?: string
  created_at: string
}

interface SwapHistoryModalProps {
  open: boolean
  onClose: () => void
  swapId: string | null
  onLoadSwapHistory: (swapId: string) => Promise<{
    swap: any
    history: SwapHistoryEntry[]
  }>
  days: string[]
  shifts: any[]
}

const ACTION_CONFIG = {
  requested: {
    icon: ArrowLeftRight,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Request Created',
    description: 'Swap request was submitted'
  },
  manager_approved: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Manager Approved',
    description: 'Manager approved the request'
  },
  manager_declined: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Manager Declined',
    description: 'Manager rejected the request'
  },
  staff_accepted: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Staff Accepted',
    description: 'Target staff accepted the swap'
  },
  staff_declined: {
    icon: XCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Staff Declined',
    description: 'Target staff declined the swap'
  },
  auto_assigned: {
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Auto Assigned',
    description: 'System found coverage automatically'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: 'Completed',
    description: 'Swap was successfully executed'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Cancelled',
    description: 'Request was cancelled'
  }
}

export function SwapHistoryModal({
  open,
  onClose,
  swapId,
  onLoadSwapHistory,
  days,
  shifts
}: SwapHistoryModalProps) {
  const [swap, setSwap] = useState<any>(null)
  const [history, setHistory] = useState<SwapHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && swapId) {
      loadHistory()
    }
  }, [open, swapId])

  const loadHistory = async () => {
    if (!swapId) return
    
    setLoading(true)
    try {
      const data = await onLoadSwapHistory(swapId)
      setSwap(data.swap)
      setHistory(data.history)
    } catch (error) {
      console.error('Failed to load swap history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!swapId) return null

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || {
      icon: Activity,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Action performed'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Swap Request History</h2>
                <p className="text-sm text-gray-600">Complete timeline and details</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Swap Details Summary */}
              {swap && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowLeftRight className="h-5 w-5" />
                      Swap Request Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Requester Info */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Requesting Staff</h4>
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
                        </div>
                      </div>

                      {/* Target Info */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          {swap.swap_type === 'specific' ? 'Target Staff' : 'Coverage Type'}
                        </h4>
                        {swap.swap_type === 'specific' && swap.target_staff ? (
                          <>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{swap.target_staff.full_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {swap.target_staff.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {days[swap.target_day]} - {shifts[swap.target_shift]?.name}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">Auto Assignment</span>
                            <Badge variant="outline" className="text-xs">
                              System Coverage
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Reason</h4>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{swap.reason}</p>
                      </div>
                    </div>

                    {/* Current Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">Current Status:</h4>
                        <Badge className={`${getActionConfig(swap.status).bgColor} ${getActionConfig(swap.status).color}`}>
                          {getActionConfig(swap.status).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline" className="capitalize">
                          {swap.urgency} Priority
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Action Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {history.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No History Available</h3>
                        <p className="text-gray-600">Unable to load history for this swap request.</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        {history.map((entry, index) => {
                          const config = getActionConfig(entry.action)
                          const Icon = config.icon
                          const isLast = index === history.length - 1
                          
                          return (
                            <div key={entry.id} className="relative flex items-start gap-4">
                              {/* Timeline dot */}
                              <div className={`relative z-10 w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`h-5 w-5 ${config.color}`} />
                              </div>
                              
                              {/* Content */}
                              <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-gray-900">{config.label}</h4>
                                  <span className="text-sm text-gray-500">
                                    {formatTimeAgo(entry.created_at)}
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                                
                                {entry.actor_staff_name && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      by {entry.actor_staff_name}
                                    </span>
                                  </div>
                                )}
                                
                                {entry.notes && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                                    <MessageSquare className="h-3 w-3 inline mr-1" />
                                    {entry.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}