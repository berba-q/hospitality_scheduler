'use client'
// src/components/InvitationConfirmationModal.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useTranslations } from '@/hooks/useTranslations'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'
import * as ApiTypes from '@/types/api'
import {
  Mail,
  Send,
  CheckCircle,
  AlertTriangle,
  Users,
  Clock,
  Loader2
} from 'lucide-react'

interface InvitationConfirmationModalProps {
  open: boolean
  onClose: () => void
  importedStaff: Array<{
    id: string
    full_name: string
    email?: string
    facility_name?: string
  }>
}

export function InvitationConfirmationModal({
  open,
  onClose,
  importedStaff
}: InvitationConfirmationModalProps) {
  const { t } = useTranslations()
  const apiClient = useApiClient()
  
  const [step, setStep] = useState<'confirm' | 'sending' | 'results'>('confirm')
  const [customMessage, setCustomMessage] = useState('')
  const [expiryHours, setExpiryHours] = useState(168) // 1 week default
  const [sendingProgress, setSendingProgress] = useState(0)
  const [results, setResults] = useState<{
    successful: number
    failed: number
    noEmail: number
    alreadyExists: number
    details?: ApiTypes.BulkInvitationResult
  } | null>(null)

  // Separate staff with and without email
  const staffWithEmail = importedStaff.filter(staff => staff.email)
  const staffWithoutEmail = importedStaff.filter(staff => !staff.email)

  const handleSendInvitations = async () => {
    if (staffWithEmail.length === 0) {
      toast.error(t('staff.staffWithoutEmailCount', { count: staffWithoutEmail.length }))
      return
    }

    if (!apiClient) {
      toast.error(t('errors.apiClientNotInitialized'))
      return
    }

    setStep('sending')
    setSendingProgress(0)

    try {
      const result = await apiClient.createBulkInvitations({
        staff_ids: staffWithEmail.map(staff => staff.id),
        custom_message: customMessage.trim() || undefined,
        expires_in_hours: expiryHours
      })

      setResults({
        successful: result.successful.length,
        failed: result.failed.length,
        noEmail: staffWithoutEmail.length,
        alreadyExists: result.already_exists.length,
        details: result
      })

      setStep('results')

      // Show appropriate toast
      if (result.successful.length > 0 && result.failed.length === 0) {
        toast.success(t('staff.invitationsSentComplete', { count: result.successful.length }))
      } else if (result.successful.length > 0) {
        toast.success(t('staff.invitationsSentPartial', { 
          sent: result.successful.length, 
          total: staffWithEmail.length 
        }))
      } else {
        toast.error(t('staff.invitationsFailedToSend'))
      }

    } catch (error) {
      console.error('Failed to send invitations:', error)
      toast.error(t('staff.invitationSendError', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }))
      setStep('confirm')
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const handleClose = () => {
    setStep('confirm')
    setCustomMessage('')
    setExpiryHours(168)
    setSendingProgress(0)
    setResults(null)
    onClose()
  }

  // Simulate progress during sending
  useState(() => {
    if (step === 'sending') {
      const interval = setInterval(() => {
        setSendingProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 20
        })
      }, 200)
      return () => clearInterval(interval)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            {t('staff.sendInvitationsQuestion')}
          </DialogTitle>
          {step === 'confirm' && (
            <DialogDescription>
              {t('staff.invitationConfirmMessage', { count: importedStaff.length })}
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium">
                  {staffWithEmail.length} {t('common.with')} email, {staffWithoutEmail.length} {t('common.without')}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {t('staff.invitationConfirmSubtitle')}
              </p>
            </div>

            {/* Staff without email warning */}
            {staffWithoutEmail.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t('staff.staffWithoutEmailCount', { count: staffWithoutEmail.length })}
                  {staffWithoutEmail.length <= 3 && (
                    <div className="mt-1 text-xs text-gray-600">
                      {t('staff.staffWithoutEmailList', { 
                        names: staffWithoutEmail.map(s => s.full_name).join(', ')
                      })}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Custom message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('staff.customizeInvitationMessage')}
              </label>
              <Textarea
                placeholder={t('staff.invitationMessagePlaceholder')}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Expiry selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('staff.invitationExpiry')}
              </label>
              <Select value={expiryHours.toString()} onValueChange={(value) => setExpiryHours(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">{t('staff.invitationExpiryOptions.24')}</SelectItem>
                  <SelectItem value="72">{t('staff.invitationExpiryOptions.72')}</SelectItem>
                  <SelectItem value="168">{t('staff.invitationExpiryOptions.168')}</SelectItem>
                  <SelectItem value="336">{t('staff.invitationExpiryOptions.336')}</SelectItem>
                  <SelectItem value="720">{t('staff.invitationExpiryOptions.720')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="flex-1"
              >
                {t('staff.skipInvitations')}
              </Button>
              <Button 
                onClick={handleSendInvitations}
                disabled={staffWithEmail.length === 0}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('staff.sendInvitationsButton', { count: staffWithEmail.length })}
              </Button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
              <h3 className="font-medium">{t('staff.sendingInvitations')}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('staff.sendingInvitations')}...
              </p>
            </div>
            <Progress value={sendingProgress} className="w-full" />
            <p className="text-xs text-center text-gray-500">
              {Math.round(sendingProgress)}% {t('common.complete')}
            </p>
          </div>
        )}

        {step === 'results' && results && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium">{t('staff.invitationsSentSuccessfully')}</h3>
            </div>

            {/* Results summary */}
            <div className="space-y-2">
              {results.successful > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">✓ {t('common.successful')}</span>
                  <span className="font-medium">{results.successful}</span>
                </div>
              )}
              {results.failed > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-700">✗ {t('common.failed')}</span>
                  <span className="font-medium">{results.failed}</span>
                </div>
              )}
              {results.noEmail > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">⚠ {t('staff.staffWithoutEmail')}</span>
                  <span className="font-medium">{results.noEmail}</span>
                </div>
              )}
              {results.alreadyExists > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">ℹ {t('common.skipped')}</span>
                  <span className="font-medium">{results.alreadyExists}</span>
                </div>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">
              {t('common.close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}