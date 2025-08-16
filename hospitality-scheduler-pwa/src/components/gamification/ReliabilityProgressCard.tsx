// hospitality-scheduler-pwa/src/components/gamification/ReliabilityProgressCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  //Users, 
 // Clock, 
  Heart,
  CheckCircle2
  //AlertCircle
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface ReliabilityProgressCardProps {
  stats: {
    acceptanceRate: number
    avgResponseTime: string
    helpfulnessScore: number
    currentStreak: number
    totalHelped: number
    teamRating: number
  }
}

export function ReliabilityProgressCard({ stats }: ReliabilityProgressCardProps) {
  const { t } = useTranslations()

  // Calculate overall reliability score
  const reliabilityScore = Math.round(
    (stats.acceptanceRate * 0.4) + 
    (stats.helpfulnessScore * 0.3) + 
    (Math.min(stats.currentStreak * 10, 100) * 0.2) +
    (Math.min(stats.teamRating, 100) * 0.1)
  )

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: t('gamification.exceptional'), color: 'bg-green-100 text-green-800' }
    if (score >= 80) return { label: t('gamification.reliable'), color: 'bg-blue-100 text-blue-800' }
    if (score >= 60) return { label: t('gamification.developing'), color: 'bg-yellow-100 text-yellow-800' }
    return { label: t('gamification.building'), color: 'bg-gray-100 text-gray-800' }
  }

  const scoreBadge = getScoreBadge(reliabilityScore)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('gamification.teamReliability')}
          </div>
          <Badge className={scoreBadge.color} variant="outline">
            {scoreBadge.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(reliabilityScore)}`}>
            {reliabilityScore}
          </div>
          <p className="text-xs text-gray-600">{t('staff.reliabilityScore')}</p>
          <Progress value={reliabilityScore} className="mt-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">{t('swaps.responseRate')}</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{stats.acceptanceRate}%</div>
          </div>
          
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-800">{t('gamification.timesHelped')}</span>
            </div>
            <div className="text-lg font-bold text-green-900">{stats.totalHelped}</div>
          </div>
        </div>

        {/* Current Streak */}
        {stats.currentStreak > 0 && (
          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-amber-700">🔥</span>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-amber-800">{t('staff.currentStreak')}</p>
                <p className="text-sm font-bold text-amber-900">{stats.currentStreak} {t('gamification.inARow')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Encouragement Message */}
        <div className="text-center">
          {reliabilityScore >= 80 ? (
            <p className="text-xs text-green-700">
              {t('gamification.valuedTeamMember')}
            </p>
          ) : reliabilityScore >= 60 ? (
            <p className="text-xs text-blue-700">
              {t('gamification.buildingRelationships')}
            </p>
          ) : (
            <p className="text-xs text-gray-600">
              {t('gamification.everyHelpMatters')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}