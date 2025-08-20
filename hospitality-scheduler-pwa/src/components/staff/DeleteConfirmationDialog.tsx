'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar, ArrowRightLeft, Users, Shield, AlertTriangle } from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (action: string, options?: any) => Promise<void>
  staffMember: any
  loading: boolean
}

export function DeleteConfirmationDialog({ 
  open, 
  onClose, 
  onConfirm, 
  staffMember, 
  loading 
}: DeleteConfirmationDialogProps) {
  const apiClient = useApiClient()
  const { t } = useTranslations()
  const [validation, setValidation] = useState<any>(null)
  const [validationLoading, setValidationLoading] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>('deactivate')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (open && staffMember) {
      validateDeletion()
    }
  }, [open, staffMember])

  const validateDeletion = async () => {
    if (!staffMember) return
    
    setValidationLoading(true)
    try {
      const result = await apiClient.validateStaffDeletion(staffMember.id)
      setValidation(result)
      
      // Set default action based on validation
      if (result.can_delete) {
        setSelectedAction('deactivate')
      } else {
        setSelectedAction('transfer_and_deactivate')
      }
    } catch (error) {
      console.error('Validation failed:', error)
      toast.error(t('staff.failedToValidateDeletion'))
      setValidation({ 
        can_delete: false, 
        errors: [t('staff.unableToValidateDeletion')], 
        warnings: [], 
        blocking_entities: [] 
      })
    } finally {
      setValidationLoading(false)
    }
  }

  const handleConfirm = async () => {
    await onConfirm(selectedAction, {
    removal_type: selectedAction,                       // 'deactivate' | 'transfer_and_deactivate' | 'permanent'
    soft_delete: selectedAction !== 'permanent',
    cascade_assignments:
      selectedAction === 'permanent' || selectedAction === 'transfer_and_deactivate',
    force: selectedAction === 'permanent',              // <-- key fix
  })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('staff.removeStaffMember', { name: staffMember?.full_name })}
              </h3>
              <p className="text-sm text-gray-500">
                {t('staff.chooseRemovalMethod')}
              </p>
            </div>
          </div>

          {/* Validation Loading */}
          {validationLoading && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-800">{t('staff.checkingImpact')}</p>
              </div>
            </div>
          )}

          {/* Impact Summary */}
          {validation && !validationLoading && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">{t('staff.impactAssessment')}</h4>
              
              {/* Blocking Issues */}
              {validation.errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">{t('staff.issuesFound')}</p>
                      <ul className="mt-1 text-sm text-red-700">
                        {validation.errors.map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Impact Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <Calendar className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-gray-900">{validation.future_assignments_count}</p>
                  <p className="text-xs text-gray-600">{t('staff.futureShifts')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <ArrowRightLeft className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-gray-900">{validation.pending_swap_requests_count}</p>
                  <p className="text-xs text-gray-600">{t('staff.pendingSwaps')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <Shield className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-gray-900">
                    {validation.is_manager ? t('common.yes') : t('common.no')}
                  </p>
                  <p className="text-xs text-gray-600">{t('staff.managerRole')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-gray-900">
                    {validation.has_unique_skills ? t('common.yes') : t('common.no')}
                  </p>
                  <p className="text-xs text-gray-600">{t('staff.uniqueSkills')}</p>
                </div>
              </div>

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">{t('staff.consider')}</p>
                      <ul className="mt-1 text-sm text-yellow-700">
                        {validation.warnings.map((warning: string, index: number) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Selection */}
          {validation && !validationLoading && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">{t('staff.chooseAction')}</h4>
              
              <div className="space-y-3">
                {/* Default: Deactivate */}
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="deactivate"
                    checked={selectedAction === 'deactivate'}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{t('staff.removeFromActiveStaff')}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {t('common.recommended')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('staff.deactivateDescription', { name: staffMember?.full_name })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('staff.wontAppearInScheduling')}
                    </p>
                  </div>
                </label>

                {/* Transfer and Deactivate */}
                {validation.future_assignments_count > 0 && (
                  <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="action"
                      value="transfer_and_deactivate"
                      checked={selectedAction === 'transfer_and_deactivate'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{t('staff.removeAndClearSchedule')}</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('staff.removesAssignmentsAndDeactivates', { count: validation.future_assignments_count })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('staff.historyPreservedShiftsCleared')}
                      </p>
                    </div>
                  </label>
                )}

                {/* Advanced Options */}
                <div className="border-t pt-3">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showAdvanced ? t('common.hide') : t('common.show')} {t('staff.advancedOptions')}
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-3 space-y-3">
                      <label className="flex items-start gap-3 p-4 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50">
                        <input
                          type="radio"
                          name="action"
                          value="permanent"
                          checked={selectedAction === 'permanent'}
                          onChange={(e) => setSelectedAction(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-red-900">{t('staff.completeRemoval')}</span>
                            <Badge variant="destructive">{t('staff.adminOnly')}</Badge>
                          </div>
                          <p className="text-sm text-red-700 mt-1">
                            {t('staff.permanentlyDeletesAllData')}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {t('staff.dataEntryErrorsOnly')}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || validationLoading || !validation}
              className={`flex-1 ${
                selectedAction === 'permanent' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.processing')}
                </div>
              ) : (
                getActionButtonText()
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  function getActionButtonText() {
    switch (selectedAction) {
      case 'deactivate':
        return t('staff.deactivateStaffMember')
      case 'transfer_and_deactivate':
        return t('staff.removeAndClearSchedule')
      case 'permanent':
        return t('staff.permanentlyDelete')
      default:
        return t('common.confirm')
    }
  }
}