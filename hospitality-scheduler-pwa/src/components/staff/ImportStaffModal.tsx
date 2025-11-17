'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Users, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import React from 'react'
import * as ApiTypes from '@/types/api'
import * as FacilityTypes from '@/types/facility'

interface ImportStaffModalProps {
  open: boolean
  onClose: () => void
  facilities: FacilityTypes.Facility[]
  onImport: (validStaff: ParsedStaffMember[]) => Promise<void>
  initialFile?: File | null
}

interface ParsedStaffMember {
  full_name: string
  email?: string
  role: string
  phone?: string
  skill_level?: number
  facility_name?: string
  facility_id?: string
  weekly_hours_max?: number
  is_active?: boolean
  valid: boolean
  errors: string[]
  // Duplicate checking fields
  duplicateInfo?: ApiTypes.ValidationResult['duplicates']
  hasDuplicates?: boolean
  duplicateSeverity?: 'none' | 'warning' | 'error'
  canImport?: boolean
  forceCreate?: boolean
}

// Enhanced column mappings with more variants - defined outside component as constant
type FieldName = 'full_name' | 'email' | 'role' | 'phone' | 'facility' | 'skill_level' | 'weekly_hours_max' | 'status'

const COLUMN_MAPPINGS: Record<FieldName, string[]> = {
  full_name: ['Name', 'Full Name', 'name', 'full_name', 'Nome', 'Nome Completo', 'Nom', 'Nombre'],
  email: ['Email', 'email', 'Email Address', 'E-mail', 'E-Mail', 'Mail'],
  role: ['Role', 'Position', 'role', 'position', 'Ruolo', 'Posizione', 'Rôle', 'Rol'],
  phone: ['Phone', 'phone', 'Phone Number', 'Telefono', 'Cellulare', 'Numero', 'Téléphone'],
  facility: ['Facility', 'facility', 'Location', 'Struttura', 'Posto', 'Sede', 'Établissement'],
  skill_level: ['Skill Level', 'skill_level', 'Level', 'Skill', 'Livello', 'Competenza', 'Livello di Competenza'],
  weekly_hours_max: ['Weekly Hours', 'weekly_hours_max', 'Hours', 'Max Hours', 'Ore settimanali', 'ore_settimanali', 'Ore Massime'],
  status: ['Status', 'status', 'Active', 'active', 'Is Active', 'Stato', 'Attivo']
}

export function ImportStaffModal({ open, onClose, facilities, onImport, initialFile }: ImportStaffModalProps) {
  const { t } = useTranslations()
  const apiClient = useApiClient()
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [detectedColumns, setDetectedColumns] = useState<Set<string>>(new Set())
  const [originalColumnNames, setOriginalColumnNames] = useState<Record<string, string>>({})
  const [parsedData, setParsedData] = useState<ParsedStaffMember[]>([])
  const [file, setFile] = useState<File | null>(null)

  // Duplicate checking state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicatesChecked, setDuplicatesChecked] = useState(false)
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set())
  const [showDuplicateDetails, setShowDuplicateDetails] = useState<Set<number>>(new Set())
  const [forceCreateAll, setForceCreateAll] = useState(false)

  const mapColumnValue = useCallback((row: Record<string, unknown>, fieldName: FieldName): string => {
    const possibleColumns = COLUMN_MAPPINGS[fieldName] || []
    for (const col of possibleColumns) {
      if (row[col] !== undefined && row[col] !== null) {
        return String(row[col]).trim()
      }
    }
    return ''
  }, [])

  // Check all staff for duplicates
  const checkForDuplicates = useCallback(async (staffList: ParsedStaffMember[]) => {
    if (!staffList.length || !apiClient) return

    setCheckingDuplicates(true)

    try {
      const updatedStaff = [...staffList]

      for (let i = 0; i < updatedStaff.length; i++) {
        const staff = updatedStaff[i]

        if (!staff.valid || !staff.facility_id) continue

        try {
          const response = await apiClient.validateStaffBeforeCreate({
            full_name: staff.full_name,
            email: staff.email,
            role: staff.role,
            phone: staff.phone,
            skill_level: staff.skill_level,
            facility_id: staff.facility_id,
            weekly_hours_max: staff.weekly_hours_max,
            is_active: staff.is_active
          })

          if (response.duplicates?.has_any_duplicates) {
            updatedStaff[i] = {
              ...staff,
              hasDuplicates: true,
              duplicateInfo: response.duplicates,
              duplicateSeverity: response.duplicates.severity,
              canImport: response.can_create,
              errors: response.duplicates.severity === 'error' && !forceCreateAll
                ? [...staff.errors, t('staff.duplicateDetectedOverride')]
                : staff.errors
            }

            // Remove from auto-selection if it's a blocking duplicate
            if (response.duplicates.severity === 'error') {
              setSelectedForImport(prev => {
                const newSet = new Set(prev)
                newSet.delete(i)
                return newSet
              })
            }
          }
        } catch (error) {
          console.error('Error checking duplicates for:', staff.full_name, error)
        }
      }

      setParsedData(updatedStaff)
      setDuplicatesChecked(true)

    } finally {
      setCheckingDuplicates(false)
    }
  }, [apiClient, forceCreateAll, t])

  const parseExcelFile = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      const detectedColumns = new Set<string>()
      const originalColumnNames: Record<string, string> = {}

      const parsed = (jsonData as Record<string, unknown>[]).map((row: Record<string, unknown>) => {
        const trackColumn = (fieldName: FieldName) => {
          const possibleColumns = COLUMN_MAPPINGS[fieldName] || []
          for (const col of possibleColumns) {
            if (row[col] !== undefined) {
              detectedColumns.add(fieldName)
              originalColumnNames[fieldName] = col
              return
            }
          }
        }

        trackColumn('full_name')
        trackColumn('email')
        trackColumn('role')
        trackColumn('phone')
        trackColumn('facility')
        trackColumn('skill_level')
        trackColumn('weekly_hours_max')
        trackColumn('status')

        const full_name = mapColumnValue(row, 'full_name')
        const email = mapColumnValue(row, 'email')
        const role = mapColumnValue(row, 'role')
        const phone = mapColumnValue(row, 'phone')
        const facility_name = mapColumnValue(row, 'facility')
        const skill_level_str = mapColumnValue(row, 'skill_level')
        const weekly_hours_str = mapColumnValue(row, 'weekly_hours_max')
        const status_str = mapColumnValue(row, 'status')

        const skillLevel = skill_level_str ? parseInt(skill_level_str, 10) : 3
        const weeklyHours = weekly_hours_str ? parseInt(weekly_hours_str, 10) : 40
        
        let is_active = true
        if (status_str) {
          const statusLower = status_str.toLowerCase()
          is_active = !['false', 'no', 'inactive', 'inattivo', '0'].includes(statusLower)
        }

        const staff: ParsedStaffMember = {
          full_name,
          email: email || undefined,
          role,
          phone: phone || undefined,
          skill_level: skillLevel,
          facility_name,
          facility_id: undefined,
          weekly_hours_max: weeklyHours,
          is_active,
          valid: true,
          errors: [],
          // Initialize duplicate fields
          hasDuplicates: false,
          duplicateSeverity: 'none',
          canImport: true,
          forceCreate: false
        }

        // Validation with translated error messages
        if (!staff.full_name.trim()) {
          staff.errors.push(t('staff.nameRequired'))
          staff.valid = false
        }
        if (!staff.role.trim()) {
          staff.errors.push(t('staff.roleRequired'))
          staff.valid = false
        }

        // Match facility
        if (staff.facility_name) {
          const facility = facilities.find(f => 
            f.name.toLowerCase().includes(staff.facility_name!.toLowerCase()) ||
            staff.facility_name!.toLowerCase().includes(f.name.toLowerCase())
          )
          if (facility) {
            staff.facility_id = facility.id
          } else {
            staff.errors.push(t('staff.facilityNotFound', { facilityName: staff.facility_name }))
            staff.valid = false
          }
        } else {
          if (facilities.length === 1) {
            staff.facility_id = facilities[0].id
            staff.facility_name = facilities[0].name
          } else {
            staff.errors.push(t('staff.facilityRequired'))
            staff.valid = false
          }
        }

        return staff
      })

      setDetectedColumns(detectedColumns)
      setOriginalColumnNames(originalColumnNames)
      setParsedData(parsed)
      
      // Auto-select all valid staff initially
      const validIndices = new Set(
        parsed.map((_, index) => index).filter(i => parsed[i].valid)
      )
      setSelectedForImport(validIndices)
      
      setStep('preview')
      
      // Check for duplicates after parsing
      await checkForDuplicates(parsed)

    } catch (error) {
      console.error('Failed to parse Excel file:', error)
      toast.error(t('common.error'))
    }
  }, [checkForDuplicates, facilities, mapColumnValue, t])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      parseExcelFile(uploadedFile)
    }
  }, [parseExcelFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  useEffect(() => {
    if (open && initialFile && step === 'upload') {
      setFile(initialFile)
      parseExcelFile(initialFile)
    }
  }, [open, initialFile, step, parseExcelFile])

  // Toggle selection of individual staff
  const toggleSelection = (index: number) => {
    const staff = parsedData[index]
    const newSelection = new Set(selectedForImport)
    
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      // Only allow selection if staff is valid and can be imported
      if (staff.valid && (staff.canImport || forceCreateAll)) {
        newSelection.add(index)
      }
    }
    
    setSelectedForImport(newSelection)
  }

  // Toggle duplicate details view
  const toggleDuplicateDetails = (index: number) => {
    const newSet = new Set(showDuplicateDetails)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setShowDuplicateDetails(newSet)
  }

  // Force create toggle
  const handleForceCreateToggle = (checked: boolean) => {
    setForceCreateAll(checked)
    
    // Update all staff to mark for force creation
    const updatedStaff = parsedData.map(staff => ({
      ...staff,
      forceCreate: checked,
      canImport: checked || staff.canImport
    }))
    setParsedData(updatedStaff)
    
    // Re-select blocked items if force create is enabled
    if (checked) {
      const allValidIndices = new Set(
        updatedStaff.map((_, index) => index).filter(i => updatedStaff[i].valid)
      )
      setSelectedForImport(allValidIndices)
    }
  }

  const getDuplicateIcon = (severity: string | undefined) => {
    switch (severity) {
      case 'error': return <X className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Check className="w-4 h-4 text-green-500" />
    }
  }

  const getDuplicateBadgeColor = (severity: string | undefined) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  interface ColumnConfig {
    key: string
    label: string
    width: string
  }

  const getColumns = (): ColumnConfig[] => {
    const columns: ColumnConfig[] = []

    if (detectedColumns.has('full_name')) {
      columns.push({
        key: 'full_name',
        label: `${originalColumnNames['full_name']}`,
        width: 'min-w-[150px]'
      })
    }

    if (detectedColumns.has('role')) {
      columns.push({
        key: 'role',
        label: `${originalColumnNames['role']} `,
        width: 'w-32'
      })
    }

    if (detectedColumns.has('email')) {
      columns.push({
        key: 'email',
        label: `${originalColumnNames['email']} `,
        width: 'w-48'
      })
    }

    if (detectedColumns.has('phone')) {
      columns.push({
        key: 'phone',
        label: `${originalColumnNames['phone']} `,
        width: 'w-32'
      })
    }

    if (detectedColumns.has('facility')) {
      columns.push({
        key: 'facility_name',
        label: `${originalColumnNames['facility']} `,
        width: 'w-32'
      })
    }

    if (detectedColumns.has('skill_level')) {
      columns.push({
        key: 'skill_level',
        label: `${originalColumnNames['skill_level']} `,
        width: 'w-20'
      })
    }

    if (detectedColumns.has('weekly_hours_max')) {
      columns.push({
        key: 'weekly_hours_max',
        label: `${t('staff.hours')}`,
        width: 'w-20'
      })
    }

    if (detectedColumns.has('status')) {
      columns.push({
        key: 'is_active',
        label: `${t('common.Status')}`,
        width: 'w-20'
      })
    }

    // Always show issues column (now includes duplicates)
    columns.push({ key: 'issues', label: t('common.issues'), width: 'min-w-[200px]' })

    return columns
  }

  // Enhanced import handler
  const handleImport = async () => {
    const staffToImport = parsedData
      .filter((_, index) => selectedForImport.has(index))
      .map(staff => ({
        ...staff,
        force_create: forceCreateAll || staff.forceCreate
      }))
    
    await onImport(staffToImport)
    resetModal()
  }

  const resetModal = () => {
    setStep('upload')
    setParsedData([])
    setFile(null)
    setCheckingDuplicates(false)
    setDuplicatesChecked(false)
    setSelectedForImport(new Set())
    setShowDuplicateDetails(new Set())
    setForceCreateAll(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const validCount = parsedData.filter((_, index) => selectedForImport.has(index)).length
  const duplicateCount = parsedData.filter(staff => staff.hasDuplicates).length
  const conflictCount = parsedData.filter(staff => staff.duplicateSeverity === 'error').length

  if (step === 'upload') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size='2xl'>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              {t('common.import')}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? t('common.releaseFile') : t('common.dropFileorChoose')}
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                {t('common.fileSupport')}
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  {t('common.expectedFormat')}:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>• {t('staff.fullName')}</div>
                  <div>• {t('staff.role')}</div>
                  <div>• {t('staff.emailAddress')}</div>
                  <div>• {t('staff.phoneNumber')}</div>
                  <div>• {t('staff.facility')}</div>
                  <div>• {t('staff.skillLevel')}</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Enhanced preview step with duplicate checking
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size='2xl'>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                {t('common.previewImport')} - {parsedData.length} {t('common.records')}
              </div>
              {file && (
                <div className="text-sm text-gray-500 font-normal">
                  {file.name}
                </div>
              )}
            </div>

            {checkingDuplicates && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                {t('common.checkDuplicates')}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Summary and controls */}
          <div className="flex flex-col gap-3">
            {/* Summary badges */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-50">
                  {validCount} {t('common.selectedImport')}
                </Badge>
                
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-50">
                    {duplicateCount} {t('common.withDuplicates')}
                  </Badge>
                )}
                
                {conflictCount > 0 && (
                  <Badge variant="outline" className="bg-red-50">
                    {conflictCount} {t('common.conflicts')}
                  </Badge>
                )}
              </div>

              {/* Selection controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allValidIndices = parsedData
                      .map((_, i) => i)
                      .filter(i => parsedData[i].valid && (parsedData[i].canImport || forceCreateAll))
                    setSelectedForImport(new Set(allValidIndices))
                  }}
                >
                  {t('common.selectAll')}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForImport(new Set())}
                >
                  {t('common.selectNone')}
                </Button>
              </div>
            </div>

            {/* Duplicate handling controls */}
            {duplicatesChecked && conflictCount > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-orange-800">
                    {t('common.found')} {conflictCount} {t('common.conflictsAttention')}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="force-create"
                      checked={forceCreateAll}
                      onCheckedChange={handleForceCreateToggle}
                    />
                    <label htmlFor="force-create" className="text-sm font-medium text-orange-800 cursor-pointer">
                      {t('common.override')}
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Enhanced data table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="w-12 p-3 text-left">
                    <Users className="w-4 h-4" />
                  </th>
                  {getColumns().map(col => (
                    <th key={col.key} className={`${col.width} p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedData.map((staff, index) => {
                  const isSelected = selectedForImport.has(index)
                  const showingDetails = showDuplicateDetails.has(index)
                  
                  return (
                    <React.Fragment key={index}>
                      <tr className={`
                        ${!staff.valid ? 'bg-red-50' : 
                          staff.hasDuplicates ? 
                            (staff.duplicateSeverity === 'error' ? 'bg-red-25' : 'bg-yellow-25') 
                            : 'bg-white'
                        }
                        hover:bg-gray-50
                      `}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(index)}
                              disabled={!staff.valid || (!staff.canImport && !forceCreateAll)}
                            />
                            {staff.hasDuplicates && getDuplicateIcon(staff.duplicateSeverity)}
                          </div>
                        </td>
                        
                        {getColumns().map(col => {
                          if (col.key === 'issues') {
                            return (
                              <td key={col.key} className="p-3">
                                <div className="space-y-1">
                                  {/* Basic validation errors */}
                                  {staff.errors.length > 0 && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <AlertTriangle className="w-4 h-4" />
                                      <span className="text-xs">{staff.errors.join(', ')}</span>
                                    </div>
                                  )}
                                  
                                  {/* NEW: Duplicate information */}
                                  {staff.hasDuplicates && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge className={`text-xs px-1 py-0 ${getDuplicateBadgeColor(staff.duplicateSeverity)}`}>
                                          {staff.duplicateSeverity === 'error' ? t('staff.emailExist') : t('staff.similar')}
                                        </Badge>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0"
                                          onClick={() => toggleDuplicateDetails(index)}
                                        >
                                          {showingDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </Button>
                                      </div>
                                      
                                      {/* Duplicate details when expanded */}
                                      {showingDetails && staff.duplicateInfo && (
                                        <div className="text-xs text-gray-600 space-y-1 pl-2 border-l-2 border-gray-200">
                                          {staff.duplicateInfo.exact_email_match && (
                                            <div className="text-red-600">
                                              ✗ {t('staff.emailExists')} {staff.duplicateInfo.exact_email_match.full_name}
                                            </div>
                                          )}
                                          
                                          {staff.duplicateInfo.name_similarity_matches?.length > 0 && (
                                            <div className="text-yellow-600">
                                              ⚠ {t('staff.nameFound')} {staff.duplicateInfo.name_similarity_matches.length}
                                            </div>
                                          )}
                                          
                                          {staff.duplicateInfo.phone_matches?.length > 0 && (
                                            <div className="text-yellow-600">
                                              ⚠ {t('staff.phoneExists')} {staff.duplicateInfo.phone_matches.length}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          }
                          
                          // Handle other columns normally
                          if (col.key === 'is_active') {
                            return (
                              <td key={col.key} className="p-3">
                                <Badge variant={staff.is_active ? "default" : "secondary"}>
                                  {staff.is_active ? t('staff.active') : t('staff.inactive')}
                                </Badge>
                              </td>
                            )
                          }

                          const value = staff[col.key as keyof ParsedStaffMember]
                          const displayValue = value !== undefined && value !== null ? String(value) : '-'
                          return (
                            <td key={col.key} className="p-3">
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Enhanced actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetModal} className="flex-1">
              {t('staff.chooseDifferentFile')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={validCount === 0}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {t('staff.importStaffMembers', { count: validCount })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}