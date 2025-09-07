// src/components/schedule/StaffScheduleFilter.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { User, Users, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface StaffScheduleFilterProps {
  isStaff: boolean
  showMyShiftsOnly: boolean
  onToggleMyShiftsOnly: (value: boolean) => void
  myAssignmentCount?: number
  totalAssignmentCount?: number
  staffName?: string
}

export function StaffScheduleFilter({
  isStaff,
  showMyShiftsOnly,
  onToggleMyShiftsOnly,
  myAssignmentCount = 0,
  totalAssignmentCount = 0,
  staffName = 'You'
}: StaffScheduleFilterProps) {
  const { t } = useTranslations()
  
  if (!isStaff) {
    return null // Don't show for managers
  }

  // Handle default staffName translation
  const displayName = staffName === 'You' ? t('common.you') : staffName

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <User className="w-5 h-5" />
          {t('schedule.staffViewOptions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="my-shifts-only"
                checked={showMyShiftsOnly}
                onCheckedChange={onToggleMyShiftsOnly}
              />
              <Label htmlFor="my-shifts-only" className="text-blue-900 font-medium">
                {t('schedule.showMyShiftsOnly')}
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              {showMyShiftsOnly ? (
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  <Eye className="w-3 h-3 mr-1" />
                  {myAssignmentCount} {t('common.myShifts')}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  <Users className="w-3 h-3 mr-1" />
                  {totalAssignmentCount} {t('common.totalShifts')}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-blue-700">{t('common.viewingAs')}: {displayName}</p>
            <p className="text-xs text-blue-600">
              {showMyShiftsOnly ? t('schedule.yourAssignmentsOnly') : t('schedule.allFacilityAssignments')}
            </p>
          </div>
        </div>
        
        {!showMyShiftsOnly && (
          <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              {t('schedule.youreViewingFullSchedule')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}