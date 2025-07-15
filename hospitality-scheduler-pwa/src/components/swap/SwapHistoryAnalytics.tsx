// components/swap/SwapHistoryAnalytics.tsx - Simple analytics for swap history
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Calendar,
  Users,
  Award
} from 'lucide-react'

interface SwapHistoryAnalyticsProps {
  isOpen: boolean
  onClose: () => void
  swapRequests: any[]
  user: any
}

export function SwapHistoryAnalytics({ isOpen, onClose, swapRequests, user }: SwapHistoryAnalyticsProps) {
  // Calculate analytics
  const myRequests = swapRequests.filter(s => s.requesting_staff_id === user.id)
  const requestsForMe = swapRequests.filter(s => s.target_staff_id === user.id)
  
  const completedRequests = myRequests.filter(s => s.status === 'executed').length
  const declinedRequests = myRequests.filter(s => s.status === 'declined').length
  const successRate = myRequests.length > 0 ? Math.round((completedRequests / myRequests.length) * 100) : 0
  
  const acceptedForOthers = requestsForMe.filter(s => s.target_staff_accepted === true).length
  const declinedForOthers = requestsForMe.filter(s => s.target_staff_accepted === false).length
  const helpfulnessRate = requestsForMe.length > 0 ? Math.round((acceptedForOthers / requestsForMe.length) * 100) : 0
  
  // Monthly breakdown (last 6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleDateString('en-US', { month: 'short' })
    
    const monthRequests = myRequests.filter(s => {
      const swapDate = new Date(s.created_at)
      return swapDate.getMonth() === date.getMonth() && swapDate.getFullYear() === date.getFullYear()
    })
    
    monthlyData.push({
      month: monthName,
      requests: monthRequests.length,
      completed: monthRequests.filter(s => s.status === 'executed').length
    })
  }
  
  // Urgency breakdown
  const urgencyBreakdown = {
    emergency: myRequests.filter(s => s.urgency === 'emergency').length,
    high: myRequests.filter(s => s.urgency === 'high').length,
    normal: myRequests.filter(s => s.urgency === 'normal').length,
    low: myRequests.filter(s => s.urgency === 'low').length
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Your Swap Analytics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{myRequests.length}</p>
                    <p className="text-sm text-gray-600">Total Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{successRate}%</p>
                    <p className="text-sm text-gray-600">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{helpfulnessRate}%</p>
                    <p className="text-sm text-gray-600">Helpfulness Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{acceptedForOthers}</p>
                    <p className="text-sm text-gray-600">Times Helped</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request vs Help Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Requests Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{completedRequests}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Declined</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${Math.round((declinedRequests / myRequests.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{declinedRequests}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${Math.round(((myRequests.length - completedRequests - declinedRequests) / myRequests.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{myRequests.length - completedRequests - declinedRequests}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Helping Others</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Accepted</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${helpfulnessRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{acceptedForOthers}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Declined</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${Math.round((declinedForOthers / requestsForMe.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{declinedForOthers}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">No Response Yet</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full" 
                        style={{ width: `${Math.round(((requestsForMe.length - acceptedForOthers - declinedForOthers) / requestsForMe.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{requestsForMe.length - acceptedForOthers - declinedForOthers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Request Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium w-12">{month.month}</span>
                    <div className="flex-1 mx-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div 
                            className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium" 
                            style={{ width: `${Math.max((month.requests / Math.max(...monthlyData.map(m => m.requests))) * 100, 10)}%` }}
                          >
                            {month.requests > 0 && month.requests}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-16">
                          {month.completed}/{month.requests} done
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Urgency Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Urgency Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{urgencyBreakdown.emergency}</div>
                  <div className="text-sm text-red-600">Emergency</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700">{urgencyBreakdown.high}</div>
                  <div className="text-sm text-orange-600">High</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{urgencyBreakdown.normal}</div>
                  <div className="text-sm text-blue-600">Normal</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-700">{urgencyBreakdown.low}</div>
                  <div className="text-sm text-gray-600">Low</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {successRate >= 80 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Great Success Rate!</p>
                      <p className="text-xs text-green-600">Your requests are being approved at a high rate. Keep up the good work!</p>
                    </div>
                  </div>
                )}
                
                {helpfulnessRate >= 80 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Award className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Team Player!</p>
                      <p className="text-xs text-blue-600">You're very helpful to your colleagues. Your team appreciates you!</p>
                    </div>
                  </div>
                )}

                {urgencyBreakdown.emergency > urgencyBreakdown.normal && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Consider Planning Ahead</p>
                      <p className="text-xs text-yellow-600">You have many emergency requests. Planning shifts in advance might help reduce urgency.</p>
                    </div>
                  </div>
                )}

                {helpfulnessRate < 50 && requestsForMe.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <Users className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Help Your Team More</p>
                      <p className="text-xs text-orange-600">Consider accepting more requests to help your colleagues when possible.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}