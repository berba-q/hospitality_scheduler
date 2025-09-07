// components/swap/SwapNotificationDialog.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeftRight, 
  MessageSquare, 
  Smartphone, 
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface SwapNotificationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (options: SwapNotificationOptions) => Promise<void>
  swapType: 'manager_to_staff' | 'staff_to_staff' | 'swap_approved' | 'swap_denied'
  swapDetails: {
    requesterName: string
    targetStaffName?: string
    originalDay: string
    originalShift: string
    targetDay?: string
    targetShift?: string
    reason?: string
    urgency: 'low' | 'normal' | 'high' | 'emergency'
  }
  recipientStaff: any[]
}

interface SwapNotificationOptions {
  sendWhatsApp: boolean
  sendPushNotifications: boolean
  sendInApp: boolean
  customMessage?: string
  urgencyOverride?: 'low' | 'normal' | 'high' | 'emergency'
}

export function SwapNotificationDialog({
  open,
  onClose,
  onConfirm,
  swapType,
  swapDetails,
  recipientStaff
}: SwapNotificationDialogProps) {
  const { t } = useTranslations()
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<SwapNotificationOptions>({
    sendWhatsApp: true,
    sendPushNotifications: true,
    sendInApp: true,
    urgencyOverride: swapDetails.urgency
  })

  const handleConfirm = async () => {
    try {
      setSaving(true)
      await onConfirm(options)
      onClose()
    } catch (error) {
      console.error('Failed to process swap notification:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateOption = (key: keyof SwapNotificationOptions, value: boolean | string) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const getSwapTypeDisplay = () => {
    switch (swapType) {
      case 'manager_to_staff':
        return {
          title: t('notifications.managerSwapAssignment'),
          description: t('notifications.notifyStaffManagerInitiated'),
          icon: User,
          color: 'text-blue-600'
        }
      case 'staff_to_staff':
        return {
          title: t('notifications.staffSwapRequest'),
          description: t('notifications.requestSwapBetweenStaff'),
          icon: ArrowLeftRight,
          color: 'text-green-600'
        }
      case 'swap_approved':
        return {
          title: t('notifications.swapRequestApproved'),
          description: t('notifications.notifyAboutApprovedSwap'),
          icon: CheckCircle,
          color: 'text-green-600'
        }
      case 'swap_denied':
        return {
          title: t('notifications.swapRequestDenied'),
          description: t('notifications.notifyAboutDeniedSwap'),
          icon: AlertTriangle,
          color: 'text-red-600'
        }
      default:
        return {
          title: t('notifications.swapNotification'),
          description: t('notifications.sendSwapRelatedNotification'),
          icon: Bell,
          color: 'text-gray-600'
        }
    }
  }

  const typeDisplay = getSwapTypeDisplay()
  const TypeIcon = typeDisplay.icon

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={`w-5 h-5 ${typeDisplay.color}`} />
            {typeDisplay.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Swap Details */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{t('swaps.swapDetails')}</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>{t('swaps.requester')}:</strong> {swapDetails.requesterName}</p>
                    {swapDetails.targetStaffName && (
                      <p><strong>{t('swaps.targetStaff')}:</strong> {swapDetails.targetStaffName}</p>
                    )}
                    <p><strong>{t('swaps.original')}:</strong> {swapDetails.originalDay} {swapDetails.originalShift}</p>
                    {swapDetails.targetDay && swapDetails.targetShift && (
                      <p><strong>{t('swaps.target')}:</strong> {swapDetails.targetDay} {swapDetails.targetShift}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">{t('notifications.priorityAndRecipients')}</span>
                  </div>
                  <div className="space-y-2">
                    <Badge className={getUrgencyColor(swapDetails.urgency)}>
                      {t(`swaps.${swapDetails.urgency}Priority`).toUpperCase()} {t('notifications.priority')}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {recipientStaff.slice(0, 3).map((staff) => (
                        <Badge key={staff.id} variant="outline" className="text-xs">
                          {staff.name}
                        </Badge>
                      ))}
                      {recipientStaff.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipientStaff.length - 3} {t('common.more')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <div className="space-y-4">
            <Label className="text-base font-medium">{t('notifications.notificationChannels')}</Label>
            
            <div className="grid grid-cols-1 gap-3">
              {/* In-App Notifications */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium">{t('notifications.inAppNotifications')}</div>
                    <div className="text-sm text-gray-600">{t('notifications.showNotificationInApp')}</div>
                  </div>
                </div>
                <Checkbox
                  checked={options.sendInApp}
                  onCheckedChange={(checked) => updateOption('sendInApp', !!checked)}
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">{t('notifications.pushNotifications')}</div>
                    <div className="text-sm text-gray-600">{t('notifications.sendMobilePushNotifications')}</div>
                  </div>
                </div>
                <Checkbox
                  checked={options.sendPushNotifications}
                  onCheckedChange={(checked) => updateOption('sendPushNotifications', !!checked)}
                />
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">{t('notifications.whatsappMessages')}</div>
                    <div className="text-sm text-gray-600">{t('notifications.sendWhatsappWithDetails')}</div>
                  </div>
                </div>
                <Checkbox
                  checked={options.sendWhatsApp}
                  onCheckedChange={(checked) => updateOption('sendWhatsApp', !!checked)}
                />
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="custom-message" className="text-sm font-medium">
              {t('notifications.additionalMessageOptional')}
            </Label>
            <Textarea
              id="custom-message"
              placeholder={t('notifications.addAdditionalContext')}
              value={options.customMessage || ''}
              onChange={(e) => updateOption('customMessage', e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Urgency Override */}
          <div>
            <Label htmlFor="urgency-override" className="text-sm font-medium">
              {t('swaps.priorityLevel')}
            </Label>
            <select
              id="urgency-override"
              value={options.urgencyOverride || swapDetails.urgency}
              onChange={(e) => updateOption('urgencyOverride', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="low">{t('swaps.lowPriority')}</option>
              <option value="normal">{t('swaps.normalPriority')}</option>
              <option value="high">{t('swaps.highPriority')}</option>
              <option value="emergency">{t('swaps.emergencyPriority')}</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t('notifications.emergencyHighBypassPreferences')}
            </p>
          </div>

          {/* Critical Notice */}
          {(options.urgencyOverride === 'high' || options.urgencyOverride === 'emergency') && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">{t('notifications.criticalPriorityNotice')}</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {t('notifications.notificationSentRegardlessPreferences', { 
                        priority: options.urgencyOverride 
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                {t('notifications.sending')}
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                {t('notifications.sendNotifications')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}