// components/schedule/ScheduleSaveConfirmationDialog.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Save,
  Users,
  Calendar,
  MessageSquare,
  Smartphone,
  FileText,
  AlertTriangle,
  CheckCircle,
  Mail
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import * as ScheduleTypes from '@/types/schedule'
import * as FacilityTypes from '@/types/facility'

interface ScheduleSaveConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (options: SaveConfirmationOptions) => Promise<void>
  schedule: ScheduleTypes.Schedule
  staffList: ScheduleTypes.Staff[]
  facility: FacilityTypes.Facility
  isNewSchedule?: boolean
}

export interface SaveConfirmationOptions {
  generatePdf: boolean
  sendWhatsApp: boolean
  sendPushNotifications: boolean
  sendEmail: boolean
  notifyAllStaff: boolean
  customMessage?: string
}

export function ScheduleSaveConfirmationDialog({
  open,
  onClose,
  onConfirm,
  schedule,
  staffList,
  facility,
  isNewSchedule = false
}: ScheduleSaveConfirmationDialogProps) {
  const { t } = useTranslations()
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<SaveConfirmationOptions>({
    generatePdf: true,
    sendWhatsApp: true,
    sendPushNotifications: true,
    sendEmail: false,
    notifyAllStaff: true
  })

  const affectedStaff = staffList.filter(staff =>
    schedule?.assignments?.some(assignment => assignment.staff_id === staff.id)
  )

  const handleConfirm = async () => {
    try {
      setSaving(true)
      await onConfirm(options)
      onClose()
    } catch (error) {
      console.error('Failed to save schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateOption = (key: keyof SaveConfirmationOptions, value: boolean) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            {isNewSchedule ? t('schedule.publishNewSchedule') : t('schedule.updateSchedule')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Schedule Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{t('schedule.scheduleDetails')}</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>{t('common.facility')}:</strong> {facility?.name || t('facility.unknownFacility')}</p>
                    <p><strong>{t('common.week')}:</strong> {formatWeekRange(schedule?.week_start)}</p>
                    <p><strong>{t('common.assignments')}:</strong> {schedule?.assignments?.length || 0}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{t('schedule.affectedStaff')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {affectedStaff.slice(0, 4).map(staff => (
                      <Badge key={staff.id} variant="outline" className="text-xs">
                        {staff.full_name}
                      </Badge>
                    ))}
                    {affectedStaff.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{affectedStaff.length - 4} {t('common.more')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Options */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('schedule.notificationOptions')}
            </h3>
            
            <div className="space-y-4">
              {/* PDF Generation */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="generate-pdf"
                  checked={options.generatePdf}
                  onCheckedChange={(checked) =>
                    updateOption('generatePdf', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="generate-pdf"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t('schedule.generatePdfSchedule')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('schedule.createPrintablePdf')}
                  </p>
                </div>
              </div>

              {/* WhatsApp Notifications */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-whatsapp"
                  checked={options.sendWhatsApp}
                  onCheckedChange={(checked) =>
                    updateOption('sendWhatsApp', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="send-whatsapp"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    {t('schedule.sendWhatsappMessages')}
                    <Badge variant="secondary" className="text-xs">{t('notifications.critical')}</Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('schedule.sendWhatsappNotificationsWithPdf')}
                  </p>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-push"
                  checked={options.sendPushNotifications}
                  onCheckedChange={(checked) =>
                    updateOption('sendPushNotifications', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="send-push"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    {t('schedule.sendPushNotifications')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('schedule.sendMobilePushNotifications')}
                  </p>
                </div>
              </div>

              {/* Email Notifications */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-email"
                  checked={options.sendEmail}
                  onCheckedChange={(checked) =>
                    updateOption('sendEmail', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="send-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-purple-600" />
                    {t('schedule.sendEmailNotifications')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('schedule.sendEmailNotificationsWithPdf')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for Critical Notifications */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">{t('schedule.criticalNotifications')}</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    {t('schedule.criticalNotificationsMessage')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">
                    {isNewSchedule ? t('schedule.readyToPublish') : t('schedule.readyToUpdate')}
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    {t('schedule.staffMembersWillBeNotified', { count: affectedStaff.length })}
                    {options.generatePdf && ' ' + t('schedule.pdfScheduleWill')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isNewSchedule ? t('schedule.publishing') : t('schedule.updating')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isNewSchedule ? t('schedule.publishSchedule') : t('schedule.updateSchedule')}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}