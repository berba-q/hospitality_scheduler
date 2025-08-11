// components/swap/QuickActionsTab.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, CheckCircle } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface QuickActionsTabProps {
  upcomingShifts: any[]
  actionNeeded: any[]
  personalStats: any
  onQuickSwapRequest: (shift: any) => void
  onSwapResponse: (swapId: string, accepted: boolean) => void
  onSwapClick: (swap: any) => void
}

export function QuickActionsTab({
  upcomingShifts,
  actionNeeded,
  personalStats,
  onQuickSwapRequest,
  onSwapResponse,
  onSwapClick
}: QuickActionsTabProps) {
  const { t } = useTranslations()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upcoming Shifts - Quick Swap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('swaps.yourUpcomingShifts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">{t('swaps.noUpcomingShiftsScheduled')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingShifts.slice(0, 4).map((shift, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{shift.day_name}</p>
                    <p className="text-sm text-gray-600">
                      {shift.shift_name} • {shift.date}
                    </p>
                    {shift.is_today && (
                      <Badge className="mt-1 bg-blue-100 text-blue-800">{t('common.today')}</Badge>
                    )}
                    {shift.is_tomorrow && (
                      <Badge className="mt-1 bg-green-100 text-green-800">{t('common.tomorrow')}</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickSwapRequest(shift)}
                  >
                    {t('swaps.requestSwap')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available to Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('swaps.teamNeedsHelp')}
            <Badge className="bg-green-100 text-green-800">
              {personalStats.availableToHelp} {t('swaps.available')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionNeeded.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-600">{t('swaps.noTeamRequestsRightNow')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('swaps.checkBackLaterForRequests')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionNeeded.slice(0, 3).map((swap) => (
                <div 
                  key={swap.id} 
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSwapClick(swap)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{swap.requesting_staff_name}</span>
                    <Badge className={
                      swap.urgency === 'emergency' ? 'bg-red-500 text-white' :
                      swap.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                      swap.urgency === 'normal' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {t(`swaps.${swap.urgency}Priority`)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <p>{swap.reason}</p>
                    <p className="text-xs mt-1">
                      {swap.shift_name} • {swap.date}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSwapResponse(swap.id, true)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {t('common.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSwapResponse(swap.id, false)
                      }}
                    >
                      {t('common.decline')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSwapClick(swap)
                      }}
                    >
                      {t('common.viewDetails')}
                    </Button>
                  </div>
                </div>
              ))}
              
              {actionNeeded.length > 3 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    {t('swaps.viewAllRequests')} ({actionNeeded.length - 3} {t('common.more')})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}