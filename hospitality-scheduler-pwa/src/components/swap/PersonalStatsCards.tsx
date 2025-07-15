// components/swap/PersonalStatsCards.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ThumbsUp, Target, Zap, Clock } from 'lucide-react'

interface PersonalStatsCardsProps {
  stats: {
    helpfulnessScore: number
    acceptanceRate: number
    currentStreak: number
    avgResponseTime: string
  }
}

export function PersonalStatsCards({ stats }: PersonalStatsCardsProps) {
  // Helper function to get color based on score
  const getScoreColor = (score: number, thresholds = { good: 70, great: 85 }) => {
    if (score >= thresholds.great) return 'green'
    if (score >= thresholds.good) return 'blue' 
    if (score > 0) return 'orange'
    return 'gray'
  }

  const helpfulnessColor = getScoreColor(stats.helpfulnessScore)
  const acceptanceColor = getScoreColor(stats.acceptanceRate)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className={`border-${helpfulnessColor}-200 bg-${helpfulnessColor}-50`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-${helpfulnessColor}-100 rounded-lg flex items-center justify-center`}>
              <ThumbsUp className={`w-5 h-5 text-${helpfulnessColor}-600`} />
            </div>
            <div>
              <p className={`text-2xl font-bold text-${helpfulnessColor}-800`}>
                {stats.helpfulnessScore}%
              </p>
              <p className={`text-sm text-${helpfulnessColor}-600`}>Helpfulness Score</p>
              {stats.helpfulnessScore === 0 && (
                <p className="text-xs text-gray-500">No data yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-${acceptanceColor}-200 bg-${acceptanceColor}-50`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-${acceptanceColor}-100 rounded-lg flex items-center justify-center`}>
              <Target className={`w-5 h-5 text-${acceptanceColor}-600`} />
            </div>
            <div>
              <p className={`text-2xl font-bold text-${acceptanceColor}-800`}>
                {stats.acceptanceRate}%
              </p>
              <p className={`text-sm text-${acceptanceColor}-600`}>Acceptance Rate</p>
              {stats.acceptanceRate === 0 && (
                <p className="text-xs text-gray-500">No requests yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-800">{stats.currentStreak}</p>
              <p className="text-sm text-purple-600">Helping Streak</p>
              {stats.currentStreak === 0 && (
                <p className="text-xs text-gray-500">Start helping!</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.avgResponseTime}</p>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              {stats.avgResponseTime === 'N/A' && (
                <p className="text-xs text-gray-500">No responses yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}