'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, AlertTriangle, Users, Clock } from 'lucide-react'

interface AnalyticsTabProps {
  facilitySummaries: any[]
  allSwapRequests: any[]
  apiClient: any
}

export function AnalyticsTab({ facilitySummaries, allSwapRequests }: AnalyticsTabProps) {
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
            <p className="text-xs text-gray-600">Total Swaps</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
            <p className="text-xs text-gray-600">Success Rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{metrics.recentSwaps}</p>
            <p className="text-xs text-gray-600">This Week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{metrics.monthlySwaps}</p>
            <p className="text-xs text-gray-600">This Month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{metrics.emergencySwaps}</p>
            <p className="text-xs text-gray-600">Emergency</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{facilitySummaries.length}</p>
            <p className="text-xs text-gray-600">Facilities</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgency Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Urgency Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.urgencyBreakdown).map(([urgency, count]) => (
              <div key={urgency} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{urgency}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Facility Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Facility Performance (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.facilityPerformance.slice(0, 10).map((facility, index) => (
              <div key={facility.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium">{facility.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-yellow-600">{facility.pending} pending</span>
                  <span className="text-orange-600">{facility.urgent} urgent</span>
                  <span className="text-red-600">{facility.emergency} emergency</span>
                  <span className="font-bold text-gray-900">{facility.total} total</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Weekly Activity</p>
                <p className="text-sm text-blue-700">
                  {metrics.recentSwaps} swap requests in the last 7 days
                </p>
              </div>
            </div>
            
            {metrics.emergencySwaps > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Emergency Attention</p>
                  <p className="text-sm text-red-700">
                    {metrics.emergencySwaps} emergency swap requests require immediate attention
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Success Rate</p>
                <p className="text-sm text-green-700">
                  {metrics.successRate}% of swap requests are successfully completed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
