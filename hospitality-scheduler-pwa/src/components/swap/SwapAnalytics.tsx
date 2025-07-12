// Analytics Tab Component for Global Swaps Page
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Calendar, Users, Clock, AlertTriangle } from 'lucide-react'

interface AnalyticsTabProps {
  facilitySummaries: any[]
  allSwapRequests: any[]
  apiClient: any
}

export function AnalyticsTab({ facilitySummaries, allSwapRequests, apiClient }: AnalyticsTabProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>('')
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Calculate real-time metrics from current data
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

    // Success rate calculation
    const completedSwaps = allSwapRequests.filter(swap => swap.status === 'completed')
    const successRate = allSwapRequests.length > 0 
      ? (completedSwaps.length / allSwapRequests.length * 100).toFixed(1)
      : 0

    // Average response time (mock calculation)
    const avgResponseTime = completedSwaps.length > 0 
      ? (completedSwaps.reduce((acc, swap) => {
          const created = new Date(swap.created_at)
          const completed = new Date(swap.completed_at || swap.updated_at)
          return acc + (completed.getTime() - created.getTime())
        }, 0) / completedSwaps.length / (1000 * 60 * 60)).toFixed(1) // Convert to hours
      : 0

    return {
      totalSwaps: allSwapRequests.length,
      recentSwaps: recentSwaps.length,
      monthlySwaps: monthlySwaps.length,
      successRate: parseFloat(successRate),
      avgResponseTime: parseFloat(avgResponseTime),
      emergencySwaps: allSwapRequests.filter(swap => swap.urgency === 'emergency').length
    }
  }

  const metrics = calculateMetrics()

  // Swap trends by day (last 30 days)
  const generateTrendData = () => {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySwaps = allSwapRequests.filter(swap => 
        swap.created_at.startsWith(dateStr)
      )
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        swaps: daySwaps.length,
        urgent: daySwaps.filter(swap => ['high', 'emergency'].includes(swap.urgency)).length
      })
    }
    return data
  }

  // Swap distribution by facility
  const generateFacilityData = () => {
    return facilitySummaries.map(facility => ({
      name: facility.facility_name,
      pending: facility.pending_swaps,
      urgent: facility.urgent_swaps,
      emergency: facility.emergency_swaps,
      total: facility.pending_swaps + facility.urgent_swaps + facility.emergency_swaps
    }))
  }

  // Urgency distribution for pie chart
  const generateUrgencyData = () => {
    const urgencyCounts = allSwapRequests.reduce((acc, swap) => {
      acc[swap.urgency] = (acc[swap.urgency] || 0) + 1
      return acc
    }, {})

    const colors = {
      emergency: '#ef4444',
      high: '#f97316', 
      normal: '#3b82f6',
      low: '#10b981'
    }

    return Object.entries(urgencyCounts).map(([urgency, count]) => ({
      name: urgency.charAt(0).toUpperCase() + urgency.slice(1),
      value: count,
      color: colors[urgency] || '#6b7280'
    }))
  }

  const trendData = generateTrendData()
  const facilityData = generateFacilityData()
  const urgencyData = generateUrgencyData()

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{metrics.totalSwaps}</p>
              <p className="text-xs text-gray-600">Total Swaps</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
              <p className="text-xs text-gray-600">Success Rate</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{metrics.avgResponseTime}h</p>
              <p className="text-xs text-gray-600">Avg Response</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{metrics.recentSwaps}</p>
              <p className="text-xs text-gray-600">This Week</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{metrics.monthlySwaps}</p>
              <p className="text-xs text-gray-600">This Month</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{metrics.emergencySwaps}</p>
              <p className="text-xs text-gray-600">Emergency</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Swap Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Swap Trends (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="swaps" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="urgent" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Urgency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Urgency Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={urgencyData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Facility Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Facility Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={facilityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pending" stackId="a" fill="#3b82f6" name="Pending" />
              <Bar dataKey="urgent" stackId="a" fill="#f97316" name="Urgent" />
              <Bar dataKey="emergency" stackId="a" fill="#ef4444" name="Emergency" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}