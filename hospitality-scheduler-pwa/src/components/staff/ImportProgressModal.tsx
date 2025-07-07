'use client'
// Progress modal component for staff import process
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Users } from 'lucide-react'

interface ImportProgressModalProps {
  open: boolean
  onClose: () => void
  progress: number
  status: 'uploading' | 'processing' | 'importing' | 'complete' | 'error'
  results: { added: number; errors: number }
}

export function ImportProgressModal({ open, onClose, progress, status, results }: ImportProgressModalProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'uploading':
        return {
          icon: Upload,
          title: 'Uploading File...',
          description: 'Reading your Excel file',
          color: 'text-blue-600'
        }
      case 'processing':
        return {
          icon: FileSpreadsheet,
          title: 'Processing Data...',
          description: 'Validating staff information',
          color: 'text-orange-600'
        }
      case 'importing':
        return {
          icon: Users,
          title: 'Importing Staff...',
          description: 'Adding staff members to database',
          color: 'text-purple-600'
        }
      case 'complete':
        return {
          icon: CheckCircle,
          title: 'Import Complete!',
          description: `Successfully imported ${results.added} staff members`,
          color: 'text-green-600'
        }
      case 'error':
        return {
          icon: XCircle,
          title: 'Import Failed',
          description: 'Something went wrong during import',
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
                  status === 'complete' ? 'bg-green-500' : 
                  'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status Icon */}
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              status === 'error' ? 'bg-red-100' :
              status === 'complete' ? 'bg-green-100' :
              'bg-blue-100'
            }`}>
              <StatusIcon className={`w-8 h-8 ${statusInfo.color} ${
                status === 'uploading' || status === 'processing' || status === 'importing' 
                  ? 'animate-pulse' : ''
              }`} />
            </div>
          </div>

          {/* Results (only show when complete) */}
          {status === 'complete' && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{results.added}</div>
                  <div className="text-sm text-green-700">Added</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-red-800 text-sm">
                Please check your Excel file format and try again.
              </p>
            </div>
          )}

          {/* Actions */}
          {(status === 'complete' || status === 'error') && (
            <Button onClick={onClose} className="w-full">
              {status === 'complete' ? 'Done' : 'Try Again'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}