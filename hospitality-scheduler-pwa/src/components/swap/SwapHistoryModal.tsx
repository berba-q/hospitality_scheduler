// SwapHistoryModal.tsx - Shows complete timeline and history for a swap
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/hooks/useTranslations'
import {
  History,
  User,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  MessageSquare,
  AlertTriangle,
  Zap,
  X,
  Activity
} from 'lucide-react'
import * as SwapTypes from '@/types/swaps'
import * as ApiTypes from '@/types/api'

interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
}

interface SwapHistoryModalProps {
  open: boolean
  onClose: () => void
  swapId: string | null
  onLoadSwapHistory: (swapId: string) => Promise<{
    swap: SwapTypes.SwapRequest
    history: ApiTypes.SwapHistoryEntry[]
  }>
  days: string[]
  shifts: Shift[]
}

export function SwapHistoryModal({
  open,
  onClose,
  swapId,
  onLoadSwapHistory,
  days,
  shifts
}: SwapHistoryModalProps) {
  const { t } = useTranslations()
  const [swap, setSwap] = useState<SwapTypes.SwapRequest | null>(null)
  const [history, setHistory] = useState<ApiTypes.SwapHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  // ACTION_CONFIG with translations
  const getActionConfig = (action: string) => {
    type LucideIcon = typeof ArrowLeftRight

    interface ActionConfig {
      icon: LucideIcon
      color: string
      bgColor: string
      label: string
      description: string
    }

    const ACTION_CONFIG: Record<string, ActionConfig> = {
      requested: {
        icon: ArrowLeftRight,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: t('swaps.requestCreated'),
        description: t('swaps.swapRequestSubmitted')
      },
      manager_approved: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: t('swaps.managerApproved'),
        description: t('swaps.managerApprovedRequest')
      },
      manager_declined: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: t('swaps.managerDeclined'),
        description: t('swaps.managerRejectedRequest')
      },
      staff_accepted: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: t('status.staffAccepted'),
        description: t('swaps.targetStaffAcceptedSwap')
      },
      staff_declined: {
        icon: XCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        label: t('workflow.staffDeclined'),
        description: t('swaps.targetStaffDeclinedSwap')
      },
      auto_assigned: {
        icon: Zap,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        label: t('swaps.autoAssigned'),
        description: t('swaps.systemFoundCoverageAutomatically')
      },
      completed: {
        icon: CheckCircle,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        label: t('swaps.completed'),
        description: t('swaps.swapSuccessfullyExecuted')
      },
      cancelled: {
        icon: XCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: t('swaps.cancelled'),
        description: t('swaps.requestWasCancelled')
      }
    }

    const defaultConfig: ActionConfig = {
      icon: Activity,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: t('swaps.actionPerformed')
    }

    return ACTION_CONFIG[action] || defaultConfig
  }

  const loadHistory = useCallback(async () => {
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
  }, [swapId, onLoadSwapHistory])

  useEffect(() => {
    if (open && swapId) {
      loadHistory()
    }
  }, [open, swapId, loadHistory])

  if (!swapId) return null

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return t('swaps.justNow')
    if (diffInHours < 24) return t('swaps.hoursAgo', { hours: diffInHours })
    if (diffInHours < 168) return t('swaps.daysAgo', { days: Math.floor(diffInHours / 24) })
    return date.toLocaleDateString()
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
                <h2 className="text-xl font-semibold">{t('swaps.swapRequestHistory')}</h2>
                <p className="text-sm text-gray-600">{t('swaps.completeTimelineAndDetails')}</p>
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
              {/* Swap Overview */}
              {swap && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowLeftRight className="h-5 w-5" />
                      {t('swaps.swapOverview')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('swaps.requestedBy')}</label>
                        <p className="font-medium">{swap.requesting_staff?.full_name || t('common.unknown')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('swaps.requestDate')}</label>
                        <p className="font-medium">{new Date(swap.created_at).toLocaleDateString()}</p>
                      </div>
                      {swap.target_staff && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">{t('swaps.targetStaff')}</label>
                          <p className="font-medium">{swap.target_staff.full_name}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">{t('swaps.facility')}</label>
                        <p className="font-medium">{swap.facility?.name || t('common.unknown')}</p>
                      </div>
                    </div>

                    {/* Shift Details */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('swaps.shiftDetails')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500">{t('swaps.originalShift')}</label>
                          <p className="font-medium text-gray-900">
                            {days[swap.original_day]} - {shifts[swap.original_shift]?.name || t('common.unknown')}
                          </p>
                          {shifts[swap.original_shift] && (
                            <p className="text-xs text-gray-600">
                              {shifts[swap.original_shift].start_time} - {shifts[swap.original_shift].end_time}
                            </p>
                          )}
                        </div>
                        {swap.swap_type === 'specific' && swap.target_day !== undefined && swap.target_shift !== undefined && (
                          <div>
                            <label className="text-xs font-medium text-gray-500">{t('swaps.targetShift')}</label>
                            <p className="font-medium text-gray-900">
                              {days[swap.target_day]} - {shifts[swap.target_shift]?.name || t('common.unknown')}
                            </p>
                            {shifts[swap.target_shift] && (
                              <p className="text-xs text-gray-600">
                                {shifts[swap.target_shift].start_time} - {shifts[swap.target_shift].end_time}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {swap.reason && (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-gray-500">{t('swaps.reason')}</label>
                          <p className="text-sm text-gray-700 mt-1">{swap.reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getActionConfig(swap.status).bgColor} ${getActionConfig(swap.status).color}`}>
                        </div>
                        <Badge className={`${getActionConfig(swap.status).bgColor} ${getActionConfig(swap.status).color}`}>
                          {getActionConfig(swap.status).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline" className="capitalize">
                          {t(`swaps.${swap.urgency}Priority`) || swap.urgency} {t('swaps.priority')}
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
                    {t('swaps.actionTimeline')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {history.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('swaps.noHistoryAvailable')}</h3>
                        <p className="text-gray-600">{t('swaps.unableLoadHistorySwapRequest')}</p>
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
                                    {formatTimeAgo(entry.timestamp)}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-2">{config.description}</p>

                                {entry.actor_name && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {t('common.by')} {entry.actor_name}
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