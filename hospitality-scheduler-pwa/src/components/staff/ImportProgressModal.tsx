'use client'
// Progress modal component for staff import process
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Users } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'

interface ImportProgressModalProps {
  open: boolean
  onClose: () => void
  progress: number
  status: 'uploading' | 'processing' | 'importing' | 'complete' | 'error'
  results: { added: number; errors: number }
}

export function ImportProgressModal({ open, onClose, progress, status, results }: ImportProgressModalProps) {
  const { t } = useTranslations()

  const getStatusInfo = () => {
    switch (status) {
      case 'uploading':
        return {
          icon: Upload,
          title: t('staff.uploadingFile'),
          description: t('staff.readingExcelFile'),
          color: 'text-blue-600'
        }
      case 'processing':
        return {
          icon: FileSpreadsheet,
          title: t('staff.processingData'),
          description: t('staff.validatingStaffInfo'),
          color: 'text-orange-600'
        }
      case 'importing':
        return {
          icon: Users,
          title: t('staff.importingStaff'),
          description: t('staff.addingToDatabase'),
          color: 'text-purple-600'
        }
      case 'complete':
        return {
          icon: CheckCircle,
          title: t('staff.importComplete'),
          description: t('staff.importCompleteDesc', { count: results.added }),
          color: 'text-green-600'
        }
      case 'error':
        return {
          icon: XCircle,
          title: t('staff.importFailed'),
          description: t('staff.somethingWentWrong'),
          color: 'text-red-600'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <Dialog open={open} onOpenChange={status === 'complete' || status === 'error' ? onClose : undefined}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            {statusInfo.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{statusInfo.description}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  status === 'error' ? 'bg-red-500' : 
                  status === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Results Summary (only show when complete) */}
          {status === 'complete' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{results.added}</div>
                  <div className="text-sm text-green-700">{t('staff.staffAdded')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <div className="text-sm text-red-700">{t('staff.errors')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                {t('staff.importErrorMessage')}
              </p>
            </div>
          )}

          {/* Actions */}
          {(status === 'complete' || status === 'error') && (
            <div className="flex justify-end">
              <Button onClick={onClose} className="min-w-[100px]">
                {status === 'complete' ? t('common.done') : t('common.close')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}