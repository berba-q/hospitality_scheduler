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
  Users, 
  MessageSquare, 
  Smartphone, 
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react'

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
          title: 'Manager Swap Assignment',
          description: 'Notify staff about manager-initiated swap',
          icon: User,
          color: 'text-blue-600'
        }
      case 'staff_to_staff':
        return {
          title: 'Staff Swap Request',
          description: 'Request swap between staff members',
          icon: ArrowLeftRight,
          color: 'text-green-600'
        }
      case 'swap_approved':
        return {
          title: 'Swap Request Approved',
          description: 'Notify about approved swap request',
          icon: CheckCircle,
          color: 'text-green-600'
        }
      case 'swap_denied':
        return {
          title: 'Swap Request Denied',
          description: 'Notify about denied swap request',
          icon: AlertTriangle,
          color: 'text-red-600'
        }
      default:
        return {
          title: 'Swap Notification',
          description: 'Send swap-related notification',
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
                    <span className="font-medium">Swap Details</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Requester:</strong> {swapDetails.requesterName}</p>
                    {swapDetails.targetStaffName && (
                      <p><strong>Target Staff:</strong> {swapDetails.targetStaffName}</p>
                    )}
                    <p><strong>Original:</strong> {swapDetails.originalDay} {swapDetails.originalShift}</p>
                    {swapDetails.targetDay && swapDetails.targetShift && (
                      <p><strong>Target:</strong> {swapDetails.targetDay} {swapDetails.targetShift}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">Priority & Recipients</span>
                  </div>
                  <div className="space-y-2">
                    <Badge className={getUrgencyColor(swapDetails.urgency)}>
                      {swapDetails.urgency.toUpperCase()} PRIORITY
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {recipientStaff.slice(0, 3).map(staff => (
                        <Badge key={staff.id} variant="outline" className="text-xs">
                          {staff.full_name}
                        </Badge>
                      ))}
                      {recipientStaff.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{recipientStaff.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {swapDetails.reason && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm"><strong>Reason:</strong> {swapDetails.reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notification Channels
            </h3>
            
            <div className="space-y-4">
              {/* In-App Notifications */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-inapp"
                  checked={options.sendInApp}
                  onCheckedChange={(checked) => 
                    updateOption('sendInApp', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="send-inapp"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4 text-blue-600" />
                    In-App Notifications
                    <Badge variant="secondary" className="text-xs">Always On</Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show notification in the app bell icon
                  </p>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-push-swap"
                  checked={options.sendPushNotifications}
                  onCheckedChange={(checked) => 
                    updateOption('sendPushNotifications', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="send-push-swap"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    Push Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send mobile push notifications with action links
                  </p>
                </div>
              </div>

              {/* WhatsApp Messages */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="send-whatsapp-swap"
                  checked={options.sendWhatsApp}
                  onCheckedChange={(checked) => 
                    updateOption('sendWhatsApp', checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="send-whatsapp-swap"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    WhatsApp Messages
                    {(swapDetails.urgency === 'high' || swapDetails.urgency === 'emergency') && (
                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send WhatsApp messages with swap details and action links
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="custom-message" className="text-sm font-medium">
              Additional Message (Optional)
            </Label>
            <Textarea
              id="custom-message"
              placeholder="Add any additional context or instructions..."
              value={options.customMessage || ''}
              onChange={(e) => updateOption('customMessage', e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Urgency Override */}
          <div>
            <Label htmlFor="urgency-override" className="text-sm font-medium">
              Priority Level
            </Label>
            <select
              id="urgency-override"
              value={options.urgencyOverride || swapDetails.urgency}
              onChange={(e) => updateOption('urgencyOverride', e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="low">Low Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="emergency">Emergency Priority</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Emergency and High priority bypass user notification preferences
            </p>
          </div>

          {/* Critical Notice */}
          {(options.urgencyOverride === 'high' || options.urgencyOverride === 'emergency') && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Critical Priority Notice</h4>
                    <p className="text-sm text-red-700 mt-1">
                      This notification will be sent regardless of individual staff notification 
                      preferences due to its {options.urgencyOverride} priority level.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">
                    Ready to Send Notifications
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {recipientStaff.length} staff member(s) will receive notifications through the selected channels
                    {swapType === 'staff_to_staff' && ' and can respond directly through the app or WhatsApp'}.
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
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Send Notifications
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}