// hospitality-scheduler-pwa/src/components/gamification/TeamSupportInsights.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users
  //Clock,
  //TrendingUp,
  //Calendar,
  //AlertTriangle
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import type { TeamInsights } from '@/types/api'

interface TeamSupportInsightsProps {
  insights: TeamInsights
}

export function TeamSupportInsights({ insights }: TeamSupportInsightsProps) {
  const { t } = useTranslations()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4" />
          {t('staff.teamInsights')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Team Coverage Status */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              insights.teamCoverage >= 80 ? 'bg-green-500' :
              insights.teamCoverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs font-medium">{t('staff.teamCoverage')}</span>
          </div>
          <span className="text-sm font-bold">{insights.teamCoverage}%</span>
        </div>

        {/* High-Need Periods */}
        {insights.busyDays.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">{t('gamification.daysNeedHelp')}</p>
            <div className="flex flex-wrap gap-1">
              {insights.busyDays.map((day) => (
                <Badge key={day} variant="outline" className="text-xs bg-orange-50 text-orange-700">
                  {day}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Shift Insights */}
        {insights.needyShifts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">{t('gamification.shiftsNeedSupport')}</p>
            <div className="flex flex-wrap gap-1">
              {insights.needyShifts.map((shift) => (
                <Badge key={shift.name} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {shift.name} ({shift.frequency})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Your Contribution */}
        <div className="p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-green-800">{t('staff.yourContribution')}</span>
            <span className="text-sm font-bold text-green-900">{insights.yourContribution}%</span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            {t('swaps.teamSwapCoverage')}
          </p>
        </div>

        {/* Recent Trend */}
        {insights.recentTrends && (
          <div className="text-center">
            <p className="text-xs text-gray-600">{insights.recentTrends}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}