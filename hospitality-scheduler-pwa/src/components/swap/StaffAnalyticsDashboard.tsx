'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Star, 
  Clock,
  Award,
  BarChart3,
  Target,
  Zap,
  User
} from 'lucide-react'

interface StaffAnalyticsProps {
  facilityId: string
  apiClient: any
}

export function StaffAnalyticsDashboard({ facilityId, apiClient }: StaffAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  useEffect(() => {
    loadAnalytics()
  }, [facilityId, selectedPeriod])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getComprehensiveSwapAnalytics(facilityId, selectedPeriod)
      setAnalyticsData(data)
    } catch (error) {
      console.error('Failed to load staff analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-gray-200 rounded-t-lg"></CardHeader>
            <CardContent className="h-32 bg-gray-100"></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No analytics data available</p>
          <Button onClick={loadAnalytics} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Staff Analytics</h2>
        <div className="flex gap-2">
          {[7, 30, 60, 90].map(days => (
            <Button
              key={days}
              variant={selectedPeriod === days ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(days)}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      {/* Top Requesting Staff */}
      <TopRequestingStaffCard data={analyticsData.topRequesters} />

      {/* Problem Patterns Alert */}
      <ProblemPatternsCard data={analyticsData.problems} />

      {/* Reasons Analysis */}
      <SwapReasonsCard data={analyticsData.reasons} />

      {/* Staff Performance */}
      <StaffPerformanceCard data={analyticsData.performance} />
    </div>
  )
}

function TopRequestingStaffCard({ data }) {
  const topRequesters = data?.top_requesters || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Top Requesting Staff ({data?.period_days || 30} Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topRequesters.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No swap requests in this period</p>
        ) : (
          <div className="space-y-4">
            {topRequesters.slice(0, 5).map((staff, index) => (
              <div key={staff.staff_id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{staff.staff_name}</p>
                    <p className="text-sm text-gray-500">{staff.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {staff.total_requests} requests
                    </Badge>
                    <Badge 
                      variant={staff.success_rate >= 70 ? "default" : staff.success_rate >= 50 ? "secondary" : "destructive"}
                    >
                      {staff.success_rate.toFixed(0)}% approved
                    </Badge>
                  </div>
                  {staff.most_common_reason && (
                    <p className="text-xs text-gray-400 mt-1 max-w-40 truncate">
                      "{staff.most_common_reason}"
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{data.summary?.total_unique_requesters || 0}</p>
                  <p className="text-sm text-gray-600">Unique Requesters</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{data.summary?.total_requests_period || 0}</p>
                  <p className="text-sm text-gray-600">Total Requests</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{data.summary?.avg_success_rate?.toFixed(0) || 0}%</p>
                  <p className="text-sm text-gray-600">Avg Success Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProblemPatternsCard({ data }) {
  // Based on the console logs, we can see the data structure
  const problems = data?.problem_patterns || {}
  const highFreqRequesters = problems.high_frequency_requesters || []
  const emergencyUsers = problems.frequent_emergency_users || []
  const lowSuccessStaff = problems.low_success_staff || []
  
  const hasProblems = highFreqRequesters.length > 0 || emergencyUsers.length > 0 || lowSuccessStaff.length > 0
  
  if (!hasProblems) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Award className="h-5 w-5" />
            Great News! No Problem Patterns Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">Your team is managing swaps efficiently with no concerning patterns.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Problem Patterns Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Frequency Requesters */}
        {highFreqRequesters.length > 0 && (
          <div>
            <h4 className="font-medium text-red-800 mb-2">High Frequency Requesters (>5 requests)</h4>
            <div className="space-y-2">
              {highFreqRequesters.slice(0, 3).map((staff, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{staff.staff_name} ({staff.role})</span>
                  <Badge variant="destructive">{staff.total_requests} requests</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Frequent Emergency Users */}
        {emergencyUsers.length > 0 && (
          <div>
            <h4 className="font-medium text-red-800 mb-2">Frequent Emergency Users</h4>
            <div className="space-y-2">
              {emergencyUsers.slice(0, 3).map((staff, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{staff.staff_name}</span>
                  <Badge variant="destructive">{staff.emergency_requests} emergencies</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Success Rate */}
        {lowSuccessStaff.length > 0 && (
          <div>
            <h4 className="font-medium text-red-800 mb-2">Low Success Rate (<50%)</h4>
            <div className="space-y-2">
              {lowSuccessStaff.slice(0, 3).map((staff, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{staff.staff_name}</span>
                  <Badge variant="destructive">{staff.success_rate.toFixed(0)}% approved</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-white rounded border-l-4 border-red-400">
          <p className="text-sm text-red-700">
            <strong>Recommendation:</strong> Consider one-on-one meetings with highlighted staff to understand their challenges and provide support.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function SwapReasonsCard({ data }) {
  const reasons = data?.reason_analysis || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Most Common Swap Reasons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reasons.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No reasons data available</p>
        ) : (
          <div className="space-y-3">
            {reasons.slice(0, 8).map((reason, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {reason.reason}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{reason.count} times</span>
                    <Badge 
                      variant={reason.success_rate >= 70 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {reason.success_rate.toFixed(0)}% success
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={reason.percentage} className="flex-1 h-2" />
                  <span className="text-xs text-gray-500 w-12">
                    {reason.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                <strong>Insight:</strong> {reasons[0]?.reason || 'Personal matters'} is the most common reason 
                with {reasons[0]?.success_rate?.toFixed(0) || 0}% approval rate.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StaffPerformanceCard({ data }) {
  const performers = data?.staff_performance || []
  const topPerformers = performers.slice(0, 5)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-600" />
          Staff Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topPerformers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No performance data available</p>
        ) : (
          <div className="space-y-4">
            {topPerformers.map((staff, index) => (
              <div key={staff.staff_id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-white ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{staff.staff_name}</p>
                    <p className="text-sm text-gray-500">{staff.role}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {staff.overall_helpfulness_score.toFixed(0)}% helpful
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {staff.times_requested_as_target + staff.times_assigned_auto} opportunities
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Coverage Heroes
              </h4>
              <p className="text-sm text-yellow-700">
                {data?.summary?.most_helpful_staff || 'Top performer'} leads the team in helping colleagues with swap coverage.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}