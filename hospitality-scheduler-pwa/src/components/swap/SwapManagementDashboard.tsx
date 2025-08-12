// Enhanced SwapManagementDashboard with Final Approval handling
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
import { BulkSwapManager } from './ManagerFinalApprovalModal'
import { useTranslations } from '@/hooks/useTranslations'
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
  Building,
  Shield,
  Zap
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
  status: 'pending' | 'manager_approved' | 'staff_accepted' | 'staff_declined' | 'assigned' | 'executed' | 'declined' | 'assignment_failed' | 'cancelled' | 'manager_final_approval'
  target_staff_accepted?: boolean
  assigned_staff_accepted?: boolean
  manager_approved?: boolean
  manager_final_approved?: boolean
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
  manager_approval_needed?: number
  potential_assignments?: number
  staff_responses_needed?: number
  manager_final_approval_needed?: number
  role_compatible_assignments?: number
  role_override_assignments?: number
  failed_role_verifications?: number
  average_approval_time_hours?: number
  average_staff_response_time_hours?: number
  pending_over_24h?: number
}

interface SwapManagementDashboardProps {
  facility: any
  swapRequests: SwapRequest[]
  swapSummary: SwapSummary
  days: string[]
  shifts: any[]
  onApproveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
  onFinalApproval: (swapId: string, approved: boolean, notes?: string) => Promise<void>
  onRetryAutoAssignment: (swapId: string, avoidStaffIds?: string[]) => Promise<void>
  onViewSwapHistory: (swapId: string) => void
  onRefresh: () => void
  onFacilityClick?: (facility: any) => void
}

export function SwapManagementDashboard({
  facility,
  swapRequests,
  swapSummary,
  days,
  shifts,
  onApproveSwap,
  onFinalApproval,
  onRetryAutoAssignment,
  onViewSwapHistory,
  onRefresh,
  onFacilityClick
}: SwapManagementDashboardProps) {
  const { t } = useTranslations()
  
  const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [loading, setLoading] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTab, setSelectedTab] = useState('pending')
  const [selectedSwaps, setSelectedSwaps] = useState<string[]>([])
  const [actionType, setActionType] = useState<'initial' | 'final'>('initial')

  // Enhanced status configuration with translations
  const getStatusConfig = () => ({
    pending: { 
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
      icon: Clock,
      label: t('swaps.pendingApproval'),
      description: t('swaps.awaitingManagerDecision')
    },
    manager_approved: { 
      color: 'bg-blue-100 text-blue-700 border-blue-200', 
      icon: CheckCircle,
      label: t('common.approved'),
      description: t('swaps.approvedByManager')
    },
    potential_assignment: { 
      color: 'bg-purple-100 text-purple-700 border-purple-200', 
      icon: User,
      label: t('swaps.awaitingStaff'),
      description: t('swaps.waitingForStaffResponse')
    },
    staff_accepted: { 
      color: 'bg-green-100 text-green-700 border-green-200', 
      icon: CheckCircle,
      label: t('workflow.staffAccepted'),
      description: t('swaps.staffAcceptedAssignment')
    },
    manager_final_approval: { 
      color: 'bg-orange-100 text-orange-700 border-orange-200', 
      icon: Shield,
      label: t('swaps.finalApprovalRequired'),
      description: t('swaps.readyForExecution')
    },
    executed: { 
      color: 'bg-green-100 text-green-700 border-green-200', 
      icon: CheckCircle,
      label: t('common.completed'),
      description: t('swaps.successfullyCompleted')
    },
    declined: { 
      color: 'bg-red-100 text-red-700 border-red-200', 
      icon: XCircle,
      label: t('common.declined'),
      description: t('swaps.requestWasDeclined')
    },
    staff_declined: { 
      color: 'bg-red-100 text-red-700 border-red-200', 
      icon: XCircle,
      label: t('workflow.staffDeclined'),
      description: t('swaps.staffDeclinedAssignment')
    },
    assignment_failed: { 
      color: 'bg-red-100 text-red-700 border-red-200', 
      icon: AlertTriangle,
      label: t('swaps.assignmentFailed'),
      description: t('swaps.couldNotFindCoverage')
    },
    cancelled: { 
      color: 'bg-gray-100 text-gray-700 border-gray-200', 
      icon: StopCircle,
      label: t('common.cancelled'),
      description: t('swaps.requestWasCancelled')
    }
  })

  // Enhanced categorization including final approval
  const NEEDS_MANAGER_ACTION = ['pending', 'manager_final_approval']
  const NEEDS_STAFF_ACTION = ['manager_approved', 'potential_assignment'] 
  const ACTIONABLE_STATUSES = [...NEEDS_MANAGER_ACTION, ...NEEDS_STAFF_ACTION]
  const COMPLETED_STATUSES = ['executed', 'declined', 'staff_declined', 'cancelled', 'assignment_failed']

  const enhancedSummary = swapSummary

  // ✅ NEW: Enhanced filtering with final approval separation
  const pendingInitialApproval = swapRequests.filter(swap => 
    swap.status === 'pending'
  )

  const pendingFinalApproval = swapRequests.filter(swap => 
    swap.status === 'manager_final_approval'
  )

  const managerActionNeeded = swapRequests.filter(swap => 
    NEEDS_MANAGER_ACTION.includes(swap.status)
  )

  const staffActionNeeded = swapRequests.filter(swap =>
    NEEDS_STAFF_ACTION.includes(swap.status)
  )

  const urgentSwaps = swapRequests.filter(swap => 
    NEEDS_MANAGER_ACTION.includes(swap.status) && swap.urgency === 'emergency'
  )

  const inProgressSwaps = swapRequests.filter(swap => 
    ['staff_accepted', 'manager_final_approval'].includes(swap.status)
  )

  const completedSwaps = swapRequests.filter(swap => 
    swap.status === 'executed'
  )

  const allHistorySwaps = swapRequests.filter(swap => 
    COMPLETED_STATUSES.includes(swap.status)
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

  // ✅ Enhanced approval handler with final approval detection
  const handleApproval = async (swapId: string, approved: boolean) => {
    setLoading(swapId)
    try {
      const swap = swapRequests.find(s => s.id === swapId)
      
      if (swap?.status === 'manager_final_approval') {
        // This is a final approval
        await onFinalApproval(swapId, approved, approvalNotes)
        toast.success(approved ? t('swaps.swapExecutedSuccessfully') : t('swaps.swapDeclinedSuccessfully'))
      } else {
        // This is an initial approval
        await onApproveSwap(swapId, approved, approvalNotes)
        
        if (approved) {
          if (swap?.swap_type === 'specific') {
            toast.success(t('swaps.swapApprovedFinding', { name: swap.target_staff?.full_name || t('common.staff') }))
          } else {
            toast.success(t('swaps.swapApprovedFinding'))
          }
        } else {
          toast.success(t('swaps.swapDeclinedSuccessfully'))
        }
      }
      
      setSelectedSwap(null)
      setApprovalNotes('')
    } catch (error) {
      console.error('Failed to approve swap:', error)
      toast.error(t('swaps.failedDeclineSwap'))
    } finally {
      setLoading('')
    }
  }

  // ✅ Helper to get action button text
  const getActionButtonText = (swap: SwapRequest) => {
    if (swap.status === 'manager_final_approval') {
      return t('swaps.execute')
    }
    return t('common.approve')
  }

  // ✅ Helper to get approval dialog title
  const getApprovalDialogTitle = () => {
    if (selectedSwap?.status === 'manager_final_approval') {
      return t('swaps.finalApprovalExecuteSwap')
    }
    return t('swaps.approveSwapRequest')
  }

  // Render individual swap card
  const renderSwapCard = (swap: SwapRequest) => {
    const statusConfig = getStatusConfig()
    const config = statusConfig[swap.status] || statusConfig.pending
    const StatusIcon = config.icon

    return (
      <Card key={swap.id} className="group hover:shadow-lg transition-all duration-200 border-l-4" 
            style={{ borderLeftColor: config.color.includes('yellow') ? '#f59e0b' : 
                                        config.color.includes('blue') ? '#3b82f6' :
                                        config.color.includes('purple') ? '#8b5cf6' :
                                        config.color.includes('green') ? '#10b981' :
                                        config.color.includes('orange') ? '#f97316' :
                                        config.color.includes('red') ? '#ef4444' : '#6b7280' }}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={config.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                
                {/* ✅ Special highlighting for final approval */}
                {swap.status === 'manager_final_approval' && (
                  <Badge className="bg-orange-500 text-white animate-pulse">
                    <Zap className="h-3 w-3 mr-1" />
                    {t('swaps.actionRequired')}
                  </Badge>
                )}
                
                {swap.urgency === 'emergency' && (
                  <Badge className="bg-red-500 text-white">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {t('swaps.urgent')}
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">
                {swap.requesting_staff.full_name} → {
                  swap.swap_type === 'auto' 
                    ? (swap.assigned_staff?.full_name || t('swaps.autoAssignment')) 
                    : (swap.target_staff?.full_name || t('common.notSpecified'))
                }
              </h3>

              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{t('swaps.original')}:</span> {days[swap.original_day]} {shifts[swap.original_shift]?.name}
                {swap.target_day !== undefined && swap.target_shift !== undefined && (
                  <>
                    <br />
                    <span className="font-medium">{t('swaps.target')}:</span> {days[swap.target_day]} {shifts[swap.target_shift]?.name}
                  </>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {swap.reason}
              </p>

              {/* ✅ Enhanced status-specific information */}
              {swap.status === 'manager_final_approval' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">{t('swaps.readyForExecution')}</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    {t('swaps.readyForExecutionDescription')}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{t('common.created')}: {new Date(swap.created_at).toLocaleDateString()}</span>
                {swap.expires_at && (
                  <span className="text-orange-600">
                    {t('swaps.expires')}: {new Date(swap.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 ml-4">
              {(swap.status === 'pending' || swap.status === 'manager_final_approval') && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSwap(swap)
                      setActionType(swap.status === 'manager_final_approval' ? 'final' : 'initial')
                    }}
                    disabled={loading === swap.id}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {swap.status === 'manager_final_approval' ? t('swaps.deny') : t('swaps.decline')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedSwap(swap)
                      setActionType(swap.status === 'manager_final_approval' ? 'final' : 'initial')
                    }}
                    disabled={loading === swap.id}
                    className={swap.status === 'manager_final_approval' 
                      ? "bg-orange-600 hover:bg-orange-700" 
                      : "bg-blue-600 hover:bg-blue-700"}
                  >
                    {swap.status === 'manager_final_approval' ? (
                      <>
                        <Shield className="h-4 w-4 mr-1" />
                        {t('swaps.execute')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('common.approve')}
                      </>
                    )}
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
                  {t('swaps.retryAssignment')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* ✅ Enhanced Summary Cards with Final Approval */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Initial Approval */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('swaps.initialApproval')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingInitialApproval.length}</div>
            <div className="text-xs text-gray-500">{t('swaps.newRequests')}</div>
          </CardContent>
        </Card>

        {/* ✅ NEW: Final Approval Card */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Shield className="h-4 w-4" />
              {t('swaps.finalApproval')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {pendingFinalApproval.length}
            </div>
            <div className="text-xs text-gray-500">{t('swaps.readyToExecute')}</div>
            {pendingFinalApproval.length > 0 && (
              <div className="text-xs text-orange-600 font-medium mt-1">
                {t('swaps.actionRequired')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Responses */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('swaps.staffResponses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enhancedSummary?.staff_responses_needed ?? 0}</div>
            <div className="text-xs text-gray-500">{t('swaps.awaitingStaff')}</div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('swaps.recentCompletions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enhancedSummary?.recent_completions ?? 0}</div>
            <div className="text-xs text-gray-500">{t('swaps.lastSevenDays')}</div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Alert for Final Approvals */}
      {pendingFinalApproval.length > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">{t('swaps.finalApprovalRequiredAlert')}</h3>
                <p className="text-sm text-orange-600">
                  {t('swaps.swapsReadyForExecution', { 
                    count: pendingFinalApproval.length,
                    plural: pendingFinalApproval.length > 1 ? 's' : ''
                  })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setSelectedTab('final-approval')}
                className="ml-auto bg-orange-600 hover:bg-orange-700"
              >
                {t('swaps.reviewNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('swaps.searchByStaffOrReason')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-1" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* ✅ Enhanced Tabs with Final Approval */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending" className="relative">
            {t('swaps.pending')}
            {pendingInitialApproval.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-amber-600 text-white text-xs">
                {pendingInitialApproval.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="final-approval" className="relative">
            {t('swaps.finalApproval')}
            {pendingFinalApproval.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-orange-600 text-white text-xs animate-pulse">
                {pendingFinalApproval.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="staff-action" className="relative">
            {t('swaps.staffAction')}
            {staffActionNeeded.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full bg-purple-600 text-white text-xs">
                {staffActionNeeded.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="in-progress">{t('swaps.inProgress')}</TabsTrigger>
          <TabsTrigger value="completed">{t('swaps.completed')}</TabsTrigger>
          <TabsTrigger value="history">{t('swaps.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="space-y-4">
            {filterSwaps(pendingInitialApproval).length > 0 ? (
              filterSwaps(pendingInitialApproval).map(renderSwapCard)
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('swaps.noPendingRequests')}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ✅ NEW: Final Approval Tab */}
        <TabsContent value="final-approval" className="space-y-4">
          <div className="space-y-4">
            {filterSwaps(pendingFinalApproval).length > 0 ? (
              filterSwaps(pendingFinalApproval).map(renderSwapCard)
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('swaps.noSwapsAwaitingFinalApproval')}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="staff-action" className="space-y-4">
          <div className="space-y-4">
            {filterSwaps(staffActionNeeded).length > 0 ? (
              filterSwaps(staffActionNeeded).map(renderSwapCard)
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('swaps.noItemsAwaitingStaffAction')}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="space-y-4">
            {filterSwaps(inProgressSwaps).length > 0 ? (
              filterSwaps(inProgressSwaps).map(renderSwapCard)
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <Hourglass className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('swaps.noSwapsInProgress')}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="space-y-4">
            {filterSwaps(completedSwaps).length > 0 ? (
              filterSwaps(completedSwaps).map(renderSwapCard)
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('swaps.noCompletedSwaps')}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {filterSwaps(allHistorySwaps).length > 0 ? (
              filterSwaps(allHistorySwaps).map(renderSwapCard)
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('swaps.noHistoricalRecords')}</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ✅ Enhanced Approval Dialog */}
      <Dialog open={!!selectedSwap} onOpenChange={() => setSelectedSwap(null)}>
        <DialogContent size='3xl'>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSwap?.status === 'manager_final_approval' ? (
                <>
                  <Shield className="h-5 w-5 text-orange-600" />
                  {t('swaps.finalApprovalExecuteSwap')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  {t('swaps.approveSwapRequest')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedSwap && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">{t('swaps.requesting')}:</span>
                    <p>{selectedSwap.requesting_staff.full_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      {selectedSwap.swap_type === 'auto' ? t('swaps.assigned') + ':' : t('swaps.target') + ':'}
                    </span>
                    <p>
                      {selectedSwap.swap_type === 'auto' 
                        ? (selectedSwap.assigned_staff?.full_name || t('swaps.autoAssignment')) 
                        : (selectedSwap.target_staff?.full_name || t('common.notSpecified'))
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{t('swaps.originalShift')}:</span>
                    <p>{days[selectedSwap.original_day]} {shifts[selectedSwap.original_shift]?.name}</p>
                  </div>
                  {selectedSwap.target_day !== undefined && (
                    <div>
                      <span className="font-medium text-gray-600">{t('swaps.targetShift')}:</span>
                      <p>{days[selectedSwap.target_day]} {shifts[selectedSwap.target_shift!]?.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedSwap.status === 'manager_final_approval' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-800 mb-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">{t('swaps.readyForExecution')}</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    {t('swaps.readyForExecutionDetails', { 
                      name: selectedSwap.assigned_staff?.full_name || selectedSwap.target_staff?.full_name 
                    })}
                  </p>
                </div>
              )}

              <div>
                <span className="font-medium text-gray-600">{t('swaps.reason')}:</span>
                <p className="mt-1 text-gray-900">{selectedSwap.reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-notes">
                  {selectedSwap.status === 'manager_final_approval' 
                    ? t('swaps.executionNotesOptional') 
                    : t('swaps.managerNotesOptional')}
                </Label>
                <Textarea
                  id="approval-notes"
                  placeholder={selectedSwap.status === 'manager_final_approval' 
                    ? t('swaps.addExecutionNotes')
                    : t('swaps.addManagerNotes')}
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
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedSwap && handleApproval(selectedSwap.id, false)}
              disabled={loading === selectedSwap?.id}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              {selectedSwap?.status === 'manager_final_approval' ? t('swaps.denyExecution') : t('swaps.decline')}
            </Button>
            <Button
              onClick={() => selectedSwap && handleApproval(selectedSwap.id, true)}
              disabled={loading === selectedSwap?.id}
              className={selectedSwap?.status === 'manager_final_approval' 
                ? "bg-orange-600 hover:bg-orange-700" 
                : "bg-blue-600 hover:bg-blue-700"}
            >
              {selectedSwap?.status === 'manager_final_approval' ? (
                <>
                  <Shield className="h-4 w-4 mr-1" />
                  {t('swaps.executeSwap')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t('common.approve')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}