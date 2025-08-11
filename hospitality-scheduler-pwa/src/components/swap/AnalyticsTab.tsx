'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, AlertTriangle, Users, Clock } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface AnalyticsTabProps {
  facilitySummaries: any[]
  allSwapRequests: any[]
  apiClient: any
}

export function AnalyticsTab({ facilitySummaries, allSwapRequests }: AnalyticsTabProps) {
  const { t } = useTranslations()

  // Calculate metrics
  const calculateMetrics = () => {
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentSwaps = allSwapRequests.filter(swap => 
      new Date(swap.created_at) >= lastWeek
    )
    
    const monthlySwaps = allSwapRequests.filter(swap => 
      new Date(swap.created_at) >= lastMonth
    )

    const completedSwaps = allSwapRequests.filter(swap => swap.status === 'completed')
    const successRate = allSwapRequests.length > 0 
      ? (completedSwaps.length / allSwapRequests.length * 100).toFixed(1)
      : 0

    // Urgency breakdown
    const urgencyBreakdown = allSwapRequests.reduce((acc, swap) => {
      acc[swap.urgency] = (acc[swap.urgency] || 0) + 1
      return acc
    }, {})

    // Facility performance
    const facilityPerformance = facilitySummaries.map(facility => ({
      name: facility.facility_name,
      pending: facility.pending_swaps,
      urgent: facility.urgent_swaps,
      emergency: facility.emergency_swaps,
      total: facility.pending_swaps + facility.urgent_swaps + facility.emergency_swaps
    })).sort((a, b) => b.total - a.total)

    return {
      totalSwaps: allSwapRequests.length,
      recentSwaps: recentSwaps.length,
      monthlySwaps: monthlySwaps.length,
      successRate: parseFloat(successRate),
      urgencyBreakdown,
      facilityPerformance,
      emergencySwaps: allSwapRequests.filter(swap => swap.urgency === 'emergency').length
    }
  }

  const metrics = calculateMetrics()

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{metrics.totalSwaps}</p>
            <p className="text-xs text-gray-600">{t('swaps.totalSwaps')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
            <p className="text-xs text-gray-600">{t('swaps.successRate')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{metrics.recentSwaps}</p>
            <p className="text-xs text-gray-600">{t('swaps.recentSwaps')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{metrics.monthlySwaps}</p>
            <p className="text-xs text-gray-600">{t('swaps.thisMonth')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{metrics.emergencySwaps}</p>
            <p className="text-xs text-gray-600">{t('swaps.emergency')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{metrics.facilityPerformance.length}</p>
            <p className="text-xs text-gray-600">{t('swaps.activeFacilities')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgency Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('swaps.urgencyBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.urgencyBreakdown).map(([urgency, count]) => (
                <div key={urgency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      urgency === 'emergency' ? 'bg-red-500' :
                      urgency === 'high' ? 'bg-orange-500' :
                      urgency === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <span className="capitalize">{t(`swaps.${urgency}Priority`)}</span>
                  </div>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
              {Object.keys(metrics.urgencyBreakdown).length === 0 && (
                <p className="text-gray-500 text-sm">{t('common.noDataAvailable')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Facility Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('swaps.facilityPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.facilityPerformance.slice(0, 5).map((facility, index) => (
                <div key={facility.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{facility.name}</span>
                    <span className="text-sm text-gray-600">
                      {facility.total} {t('swaps.swapRequests')}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {facility.pending > 0 && (
                      <div className="h-2 bg-blue-500 rounded" style={{ width: `${(facility.pending / facility.total) * 100}%` }} />
                    )}
                    {facility.urgent > 0 && (
                      <div className="h-2 bg-orange-500 rounded" style={{ width: `${(facility.urgent / facility.total) * 100}%` }} />
                    )}
                    {facility.emergency > 0 && (
                      <div className="h-2 bg-red-500 rounded" style={{ width: `${(facility.emergency / facility.total) * 100}%` }} />
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>{t('swaps.pending')}: {facility.pending}</span>
                    <span>{t('swaps.urgent')}: {facility.urgent}</span>
                    <span>{t('swaps.emergency')}: {facility.emergency}</span>
                  </div>
                </div>
              ))}
              {metrics.facilityPerformance.length === 0 && (
                <p className="text-gray-500 text-sm">{t('common.noDataAvailable')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Facilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('swaps.topPerformingFacilities')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.facilityPerformance.slice(0, 3).map((facility, index) => (
                <div key={facility.name} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{facility.name}</p>
                    <p className="text-xs text-gray-600">{facility.total} {t('swaps.swapRequests')}</p>
                  </div>
                </div>
              ))}
              {metrics.facilityPerformance.length === 0 && (
                <p className="text-gray-500 text-sm">{t('common.noDataAvailable')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('swaps.recentActivityTrends')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('swaps.lastWeek')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.recentSwaps}</span>
                  {metrics.recentSwaps > metrics.totalSwaps / 4 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('swaps.lastMonth')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.monthlySwaps}</span>
                  {metrics.monthlySwaps > metrics.totalSwaps / 2 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('swaps.completionRate')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.successRate}%</span>
                  {metrics.successRate > 75 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('swaps.performanceSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{metrics.successRate}%</p>
                <p className="text-sm text-gray-600">{t('swaps.overallSuccessRate')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{metrics.totalSwaps}</p>
                  <p className="text-xs text-gray-600">{t('swaps.totalRequests')}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{metrics.emergencySwaps}</p>
                  <p className="text-xs text-gray-600">{t('swaps.emergencyRequests')}</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-gray-600 text-center">
                  {metrics.recentSwaps > 0 
                    ? t('swaps.activityIncreasing') 
                    : t('swaps.activityStable')
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}