// components/swap/SwapRequestsList.tsx - Enhanced version with filters and better UX
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

interface SwapRequestsListProps {
  swaps: any[]
  user: any
  onSwapClick: (swap: any) => void
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
  emptyMessage = "No swap requests",
  emptySubMessage = "No requests found",
  prioritizeUrgent = false
}: SwapRequestsListProps) {

  const getSwapActions = (swap) => {
    const isMyRequest = swap.requesting_staff_id === user.id
    const isForMe = swap.target_staff_id === user.id
    const canRespond = isForMe && swap.status === 'pending' && swap.target_staff_accepted === null
    const canCancel = isMyRequest && ['pending', 'manager_approved'].includes(swap.status)

    return { isMyRequest, isForMe, canRespond, canCancel }
  }

  const urgencyColors = {
    'emergency': 'border-l-red-500 bg-red-50',
    'high': 'border-l-orange-500 bg-orange-50',
    'normal': 'border-l-blue-500 bg-blue-50',
    'low': 'border-l-gray-500 bg-gray-50'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm?.(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="manager_approved">Approved</SelectItem>
              <SelectItem value="executed">Completed</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Newest First</SelectItem>
              <SelectItem value="urgency">Most Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Swap List */}
      {swaps.length === 0 ? (
        <div className="text-center py-16">
          <ArrowLeftRight className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-gray-600">{emptySubMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {swaps.map((swap) => {
            const actions = getSwapActions(swap)
            const needsMyAction = actions.isForMe && swap.status === 'pending' && swap.target_staff_accepted === null
            
            return (
              <Card 
                key={swap.id}
                className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${
                  urgencyColors[swap.urgency]
                } ${needsMyAction ? 'ring-2 ring-yellow-200' : ''}`}
                onClick={() => onSwapClick(swap)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {actions.isMyRequest && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            My Request
                          </Badge>
                        )}
                        {actions.isForMe && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            For Me
                          </Badge>
                        )}
                        {needsMyAction && (
                          <Badge className="bg-yellow-500 text-white animate-pulse">
                            Action Needed
                          </Badge>
                        )}
                        <Badge className={`${
                          swap.urgency === 'emergency' ? 'bg-red-500 text-white' :
                          swap.urgency === 'high' ? 'bg-orange-500 text-white' :
                          swap.urgency === 'normal' ? 'bg-blue-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {swap.urgency}
                        </Badge>
                      </div>

                      <p className="font-medium mb-2">{swap.reason}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">From:</span> {swap.requesting_staff_name}
                        </div>
                        {swap.target_staff_name && (
                          <div>
                            <span className="font-medium">To:</span> {swap.target_staff_name}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Original:</span> {
                            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][swap.original_day]
                          } - {['Morning', 'Afternoon', 'Evening'][swap.original_shift]}
                        </div>
                        {swap.swap_type === 'specific' && swap.target_day !== null && (
                          <div>
                            <span className="font-medium">Requested:</span> {
                              ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][swap.target_day]
                            } - {['Morning', 'Afternoon', 'Evening'][swap.target_shift]}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(swap.created_at).toLocaleDateString()}
                        </span>
                        {swap.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires: {new Date(swap.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSwapClick(swap)
                        }}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>

                      {actions.canRespond && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSwapResponse(swap.id, true)
                            }}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSwapResponse(swap.id, false)
                            }}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {actions.canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCancelSwap(swap.id)
                          }}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Cancel
                        </Button>
                      )}

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          swap.status === 'pending' ? 'text-yellow-600 border-yellow-300' :
                          swap.status === 'executed' ? 'text-green-600 border-green-300' :
                          swap.status === 'declined' ? 'text-red-600 border-red-300' :
                          'text-gray-600 border-gray-300'
                        }>
                          {swap.status.replace('_', ' ')}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
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