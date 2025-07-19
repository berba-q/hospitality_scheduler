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
  Clock,
  Mail
} from 'lucide-react'

interface ScheduleSaveConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (options: SaveConfirmationOptions) => Promise<void>
  schedule: any
  staffList: any[]
  facility: any
  isNewSchedule?: boolean
}

interface SaveConfirmationOptions {
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
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<SaveConfirmationOptions>({
    generatePdf: true,
    sendWhatsApp: true,
    sendPushNotifications: true,
    sendEmail: false,
    notifyAllStaff: true
  })

  const affectedStaff = staffList.filter(staff => 
    schedule?.assignments?.some((assignment: any) => assignment.staff_id === staff.id)
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
            {isNewSchedule ? 'Publish New Schedule' : 'Update Schedule'}
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
                    <span className="font-medium">Schedule Details</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Facility:</strong> {facility?.name || 'Unknown'}</p>
                    <p><strong>Week:</strong> {formatWeekRange(schedule?.week_start)}</p>
                    <p><strong>Assignments:</strong> {schedule?.assignments?.length || 0}</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Affected Staff</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {affectedStaff.slice(0, 4).map(staff => (
                      <Badge key={staff.id} variant="outline" className="text-xs">
                        {staff.full_name}
                      </Badge>
                    ))}
                    {affectedStaff.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{affectedStaff.length - 4} more
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
              Notification Options
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
                    Generate PDF Schedule
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Create a printable PDF version of the schedule
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
                    Send WhatsApp Messages
                    <Badge variant="secondary" className="text-xs">Critical</Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send WhatsApp notifications with PDF attachment to all staff
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
                    Send Push Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send mobile push notifications with schedule link (no PDF attachment)
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
                    Send Email Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send email notifications with PDF attachment
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
                  <h4 className="font-medium text-orange-800">Critical Notifications</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    WhatsApp messages and push notifications will be sent regardless of individual 
                    staff preferences for critical schedule updates. This ensures all staff receive 
                    important schedule information.
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
                    Ready to {isNewSchedule ? 'Publish' : 'Update'}
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    {affectedStaff.length} staff members will be notified through the selected channels.
                    {options.generatePdf && ' A PDF schedule will be generated and attached to notifications.'}
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
                {isNewSchedule ? 'Publishing...' : 'Updating...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isNewSchedule ? 'Publish Schedule' : 'Update Schedule'}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}