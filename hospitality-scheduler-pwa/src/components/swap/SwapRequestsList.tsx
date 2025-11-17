// components/swap/SwapRequestsList.tsx - Enhanced version with filters and better UX
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslations } from '@/hooks/useTranslations'
import {
  Search,
  ArrowLeftRight,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
  Trash2
} from 'lucide-react'
import * as SwapTypes from '@/types/swaps'
import * as AuthTypes from '@/types/auth'

interface SwapRequestsListProps {
  swaps: SwapTypes.SwapRequest[]
  user: AuthTypes.User
  onSwapClick: (swap: SwapTypes.SwapRequest) => void
  onSwapResponse: (swapId: string, accepted: boolean) => void
  onCancelSwap: (swapId: string, reason?: string) => void
  showFilters?: boolean
  searchTerm?: string
  setSearchTerm?: (term: string) => void
  statusFilter?: string
  setStatusFilter?: (status: string) => void
  sortBy?: string
  setSortBy?: (sort: string) => void
  emptyMessage?: string
  emptySubMessage?: string
  prioritizeUrgent?: boolean
}

export function SwapRequestsList({
  swaps,
  user,
  onSwapClick,
  onSwapResponse,
  onCancelSwap,
  showFilters = true,
  searchTerm = '',
  setSearchTerm,
  statusFilter = 'all',
  setStatusFilter,
  sortBy = 'created_at',
  setSortBy,
  emptyMessage,
  emptySubMessage,
  prioritizeUrgent = false
}: SwapRequestsListProps) {
  const { t } = useTranslations()

  const getSwapActions = (swap: SwapTypes.SwapRequest) => {
    const isMyRequest = swap.requesting_staff_id === user.id
    const isForMe = swap.target_staff_id === user.id
    const canRespond = isForMe && swap.status === 'pending' && swap.target_staff_accepted === null
    const canCancel = isMyRequest && ['pending', 'manager_approved'].includes(swap.status)

    return { isMyRequest, isForMe, canRespond, canCancel }
  }

  const urgencyColors: Record<string, string> = {
    'emergency': 'border-l-red-500 bg-red-50',
    'high': 'border-l-orange-500 bg-orange-50',
    'normal': 'border-l-blue-500 bg-blue-50',
    'low': 'border-l-gray-500 bg-gray-50'
  }

  // Prioritize urgent swaps if enabled
  const displaySwaps = prioritizeUrgent
    ? [...swaps].sort((a, b) => {
        const urgencyOrder: Record<string, number> = {
          emergency: 0,
          high: 1,
          normal: 2,
          low: 3
        }
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      })
    : swaps

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('swaps.searchRequests')}
              value={searchTerm}
              onChange={(e) => setSearchTerm?.(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('swaps.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('swaps.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('status.pending')}</SelectItem>
              <SelectItem value="manager_approved">{t('status.approved')}</SelectItem>
              <SelectItem value="executed">{t('status.completed')}</SelectItem>
              <SelectItem value="declined">{t('status.rejected')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('common.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">{t('swaps.newestFirst')}</SelectItem>
              <SelectItem value="urgency">{t('swaps.mostUrgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Swap List */}
      {displaySwaps.length === 0 ? (
        <div className="text-center py-16">
          <ArrowLeftRight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {emptyMessage || t('swaps.noSwapRequests')}
          </h3>
          <p className="text-gray-600">
            {emptySubMessage || t('swaps.noRequestsFound')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displaySwaps.map((swap) => {
            const actions = getSwapActions(swap)
            const needsMyAction = actions.isForMe && swap.status === 'pending' && swap.target_staff_accepted === null
            
            return (
              <Card 
                key={swap.id}
                className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${
                  urgencyColors[swap.urgency]
                } ${needsMyAction ? 'ring-2 ring-blue-200 border-blue-300' : ''}`}
                onClick={() => onSwapClick(swap)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          className={
                            swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            swap.status === 'manager_approved' ? 'bg-green-100 text-green-800' :
                            swap.status === 'executed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {t(`status.${swap.status}`) || swap.status}
                        </Badge>
                        
                        <Badge 
                          className={
                            swap.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                            swap.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {t(`swaps.${swap.urgency}Priority`) || swap.urgency}
                        </Badge>

                        {swap.swap_type && (
                          <Badge className="bg-purple-100 text-purple-800">
                            {swap.swap_type === 'auto' ? t('swaps.autoSwap') : t('swaps.specificSwap')}
                          </Badge>
                        )}

                        {needsMyAction && (
                          <Badge className="bg-blue-100 text-blue-800 animate-pulse">
                            {t('swaps.actionRequired')}
                          </Badge>
                        )}
                      </div>

                      {/* Main Content */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {actions.isMyRequest ? t('swaps.myRequest') : 
                             actions.isForMe ? t('swaps.requestedForMe') : 
                             t('swaps.teamRequest')}
                          </span>
                        </div>

                        {/* Shift Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {swap.original_day ? t('common.day', { day: swap.original_day + 1 }) : t('swaps.anyDay')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {swap.original_shift ? t('common.shift', { shift: swap.original_shift + 1 }) : t('swaps.anyShift')}
                            </span>
                          </div>
                        </div>

                        {/* Reason */}
                        {swap.reason && (
                          <p className="text-sm text-gray-700 italic">
                            &quot;{swap.reason}&quot;
                          </p>
                        )}

                        {/* Target Info */}
                        {swap.target_staff?.full_name && (
                          <div className="text-sm">
                            <span className="text-gray-500">{t('swaps.targetStaff')}:</span>
                            <span className="font-medium ml-1">{swap.target_staff.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      {actions.canRespond && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSwapResponse(swap.id, true)
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('common.accept')}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSwapResponse(swap.id, false)
                            }}
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {t('common.decline')}
                          </Button>
                        </>
                      )}

                      {actions.canCancel && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCancelSwap(swap.id)
                          }}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t('common.cancel')}
                        </Button>
                      )}

                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSwapClick(swap)
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t('common.view')}
                      </Button>

                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {t('swaps.requested')} {new Date(swap.created_at).toLocaleDateString()}
                      </span>
                      {swap.updated_at && swap.updated_at !== swap.created_at && (
                        <span>
                          {t('swaps.updated')} {new Date(swap.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}