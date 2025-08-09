// FacilityDetailModal.tsx - Shows detailed swap breakdown for a specific facility
'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from '@/hooks/useTranslations'
import { 
  Building, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowLeftRight,
  Calendar,
  TrendingUp,
  X,
  Eye,
  History
} from 'lucide-react'
import { SwapManagementDashboard } from './SwapManagementDashboard'

interface FacilityDetailModalProps {
  open: boolean
  onClose: () => void
  facility: {
    facility_id: string
    facility_name: string
    facility_type: string
    pending_swaps: number
    urgent_swaps: number
    emergency_swaps: number
    recent_completions: number
    staff_count: number
  } | null
  onLoadFacilitySwaps: (facilityId: string) => Promise<any[]>
  onApproveSwap: (swapId: string, approved: boolean, notes?: string) => Promise<void>
  onRetryAutoAssignment: (swapId: string, avoidStaffIds?: string[]) => Promise<void>
  onViewSwapHistory: (swapId: string) => void
  days: string[]
  shifts: any[]
}

export function FacilityDetailModal({
  open,
  onClose,
  facility,
  onLoadFacilitySwaps,
  onApproveSwap,
  onRetryAutoAssignment,
  onViewSwapHistory,
  days,
  shifts
}: FacilityDetailModalProps) {
  const { t } = useTranslations()
  const [facilitySwaps, setFacilitySwaps] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  useEffect(() => {
    if (open && facility) {
      loadFacilitySwaps()
    }
  }, [open, facility])

  const loadFacilitySwaps = async () => {
    if (!facility) return
    
    setLoading(true)
    try {
      const swaps = await onLoadFacilitySwaps(facility.facility_id)
      setFacilitySwaps(swaps)
    } catch (error) {
      console.error('Failed to load facility swaps:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!facility) return null

  // Calculate facility metrics
  const totalSwaps = facilitySwaps.length
  const pendingCount = facilitySwaps.filter(s => s.status === 'pending').length
  const approvedCount = facilitySwaps.filter(s => ['manager_approved', 'staff_accepted', 'assigned'].includes(s.status)).length
  const completedCount = facilitySwaps.filter(s => s.status === 'executed').length
  const urgentCount = facilitySwaps.filter(s => ['high', 'emergency'].includes(s.urgency)).length

  // Recent activity (last 7 days)
  const recentSwaps = facilitySwaps.filter(s => {
    const swapDate = new Date(s.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return swapDate >= weekAgo
  })

  const metrics = [
    {
      id: 'pending',
      label: t('swaps.pendingReview'),
      value: pendingCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: t('swaps.swapsWaitingApproval')
    },
    {
      id: 'approved',
      label: t('swaps.approvedActive'),
      value: approvedCount,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: t('swaps.approvedSwapsInProgress')
    },
    {
      id: 'urgent',
      label: t('swaps.urgentRequests'),
      value: urgentCount,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: t('swaps.highPrioritySwaps')
    },
    {
      id: 'completed',
      label: t('swaps.completed'),
      value: completedCount,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: t('swaps.successfullyExecutedSwaps')
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="3xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{facility.facility_name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="capitalize">{facility.facility_type}</span>
                  <span>•</span>
                  <span>{facility.staff_count} {t('swaps.staffMembers')}</span>
                  <span>•</span>
                  <span>{totalSwaps} {t('swaps.totalSwaps')}</span>
                </div>
              </div>
            </div>
            
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-6">
          {/* Facility Metrics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Card 
                  key={metric.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedMetric === metric.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
                >
                  <CardContent className="p-4">
                    <div className={`rounded-lg ${metric.bgColor} p-3 mb-3`}>
                      <Icon className={`h-6 w-6 ${metric.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                      <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('swaps.recentActivity')} ({t('swaps.lastSevenDays')})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{recentSwaps.length}</p>
                    <p className="text-sm text-gray-600">{t('swaps.newRequests')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {recentSwaps.filter(s => s.status === 'executed').length}
                    </p>
                    <p className="text-sm text-gray-600">{t('status.completed')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {recentSwaps.filter(s => s.status === 'pending').length}
                    </p>
                    <p className="text-sm text-gray-600">{t('status.pending')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('swaps.staffSwapInsights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Most Active Staff */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('swaps.mostActiveRequesters')}</h4>
                  <div className="space-y-2">
                    {(() => {
                      const staffActivity = facilitySwaps.reduce((acc, swap) => {
                        const staffName = swap.requesting_staff?.full_name || t('common.unknown')
                        acc[staffName] = (acc[staffName] || 0) + 1
                        return acc
                      }, {})
                      
                      const topStaff = Object.entries(staffActivity)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                      
                      return topStaff.map(([name, count], index) => (
                        <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{name}</span>
                          <Badge variant="outline">{count} {t('swaps.requests')}</Badge>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Success Rate */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('swaps.approvalRate')}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${totalSwaps > 0 ? ((completedCount + approvedCount) / totalSwaps) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {totalSwaps > 0 ? Math.round(((completedCount + approvedCount) / totalSwaps) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('swaps.swapsApprovedOrCompleted', { 
                      approved: completedCount + approvedCount, 
                      total: totalSwaps 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Swap Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('swaps.facilitySwapManagement')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFacilitySwaps}
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('common.refresh')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <SwapManagementDashboard
                  facility={facility}
                  swapRequests={facilitySwaps}
                  swapSummary={{
                    facility_id: facility.facility_id,
                    pending_swaps: pendingCount,
                    urgent_swaps: urgentCount,
                    auto_swaps_needing_assignment: 0,
                    specific_swaps_awaiting_response: 0,
                    recent_completions: completedCount
                  }}
                  days={days}
                  shifts={shifts}
                  onApproveSwap={onApproveSwap}
                  onRetryAutoAssignment={onRetryAutoAssignment}
                  onViewSwapHistory={onViewSwapHistory}
                  onRefresh={loadFacilitySwaps}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}