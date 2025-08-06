'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Check, X, AlertTriangle} from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface ImportStaffModalProps {
  open: boolean
  onClose: () => void
  facilities: any[]
  onImport: (validStaff: ParsedStaffMember[]) => Promise<void> // NEW: Callback for import
  initialFile?: File | null
}

interface ParsedStaffMember {
  full_name: string
  email?: string // Added email support
  role: string
  phone?: string
  skill_level?: number
  facility_name?: string
  facility_id?: string
  weekly_hours_max?: number
  is_active?: boolean // Added active status support
  valid: boolean
  errors: string[]
}

export function ImportStaffModal({ open, onClose, facilities, onImport, initialFile }: ImportStaffModalProps) {
  const { t } = useTranslations()
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [detectedColumns, setDetectedColumns] = useState<Set<string>>(new Set())
  const [originalColumnNames, setOriginalColumnNames] = useState<Record<string, string>>({})
  const [parsedData, setParsedData] = useState<ParsedStaffMember[]>([])
  const [file, setFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      parseExcelFile(uploadedFile)
    }
  }, [])

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
  }, [open, initialFile, step])

  // Enhanced column mappings with more variants
  const COLUMN_MAPPINGS = {
    full_name: ['Name', 'Full Name', 'name', 'full_name', 'Nome', 'Nome Completo', 'Nom', 'Nombre'],
    email: ['Email', 'email', 'Email Address', 'E-mail', 'E-Mail', 'Mail'], // Added email mapping
    role: ['Role', 'Position', 'role', 'position', 'Ruolo', 'Posizione', 'Rôle', 'Rol'],
    phone: ['Phone', 'phone', 'Phone Number', 'Telefono', 'Cellulare', 'Numero', 'Téléphone'],
    facility: ['Facility', 'facility', 'Location', 'Struttura', 'Posto', 'Sede', 'Établissement'],
    skill_level: ['Skill Level', 'skill_level', 'Level', 'Skill', 'Livello', 'Competenza', 'Livello di Competenza'],
    weekly_hours_max: ['Weekly Hours', 'weekly_hours_max', 'Hours', 'Max Hours', 'Ore settimanali', 'ore_settimanali', 'Ore Massime'],
    status: ['Status', 'status', 'Active', 'active', 'Is Active', 'Stato', 'Attivo'] // Added status mapping
  }

  function mapColumnValue(row: any, fieldName: string): string {
    const possibleColumns = COLUMN_MAPPINGS[fieldName] || []
    for (const col of possibleColumns) {
      if (row[col] !== undefined && row[col] !== null) {
        return row[col].toString().trim()
      }
    }
    return ''
  }

  const parseExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      // Track columns in the file uploaded
      const detectedColumns = new Set<string>()
      const originalColumnNames: Record<string, string> = {}

      const parsed = jsonData.map((row: any) => {
        // Track columns
        const trackColumn = (fieldName: string) => {
          const possibleColumns = COLUMN_MAPPINGS[fieldName] || []
          for (const col of possibleColumns) {
            if (row[col] !== undefined && row[col] !== null && row[col].toString().trim()) {
              detectedColumns.add(fieldName)
              if (!originalColumnNames[fieldName]) {
                originalColumnNames[fieldName] = col // Store the original column name
              }
              return row[col].toString().trim()
            }
          }
          return ''
        }
        // Skill level with validation
        let skillLevel = 3
        const skillValue = trackColumn('skill_level')
        if (skillValue) {
          const parsed = parseInt(skillValue)
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
            skillLevel = parsed
          }
        }

        // Active status extraction
        let isActive = true
        const statusValue = trackColumn('status')
        if (statusValue) {
          const lowerStatus = statusValue.toLowerCase()
          isActive = lowerStatus === 'active' || lowerStatus === 'true' || lowerStatus === 'yes' || lowerStatus === '1'
        }

        // Weekly hours with validation
        let weeklyHours = 40
        const hoursValue = trackColumn('weekly_hours_max')
        if (hoursValue) {
          const parsed = parseInt(hoursValue)
          if (!isNaN(parsed) && parsed > 0 && parsed <= 80) {
            weeklyHours = parsed
          }
        }

        const staff: ParsedStaffMember & { detectedColumns?: Set<string>, originalColumnNames?: Record<string, string> } = {
          full_name: trackColumn('full_name'),
          email: trackColumn('email'),
          role: trackColumn('role'), 
          phone: trackColumn('phone'),
          facility_name: trackColumn('facility'),
          skill_level: skillLevel,
          weekly_hours_max: weeklyHours,
          is_active: isActive,
          valid: true,
          errors: [],
          detectedColumns: detectedColumns, // Store for preview
          originalColumnNames: originalColumnNames
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
          // Default to first facility if only one exists
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

      // Store detected columns for the preview table
      setDetectedColumns(detectedColumns)
      setOriginalColumnNames(originalColumnNames)
      setParsedData(parsed)
      setStep('preview')
    } catch (error) {
      toast.error(t('staff.failedToParseExcel'))
      console.error(error)
    }
  }

  // Dynamic column configuration for preview
  const getPreviewColumns = () => {
    const columns = [
      { key: 'status', label: t('staff.status'), width: 'w-16' }
    ]

    // Add columns based on what was actually found in the file
    if (detectedColumns.has('full_name')) {
      columns.push({ 
        key: 'full_name', 
        label: `${t('staff.fullName')}`,
        width: 'min-w-[120px]'
      })
    }

    if (detectedColumns.has('email')) {
      columns.push({ 
        key: 'email', 
        label: `${t('staff.emailAddress')}`,
        width: 'min-w-[140px]'
      })
    }

    if (detectedColumns.has('role')) {
      columns.push({ 
        key: 'role', 
        label: `${t('staff.role')}`,
        width: 'min-w-[100px]'
      })
    }

    if (detectedColumns.has('facility')) {
      columns.push({ 
        key: 'facility', 
        label: `${t('staff.facility')} `,
        width: 'min-w-[120px]'
      })
    }

    if (detectedColumns.has('phone')) {
      columns.push({ 
        key: 'phone', 
        label: `${t('staff.phoneNumber')} `,
        width: 'min-w-[100px]'
      })
    }

    if (detectedColumns.has('skill_level')) {
      columns.push({ 
        key: 'skill_level', 
        label: `${t('staff.skillLevel')}`,
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
        label: `${t('common.Status')} `,
        width: 'w-20'
      })
    }

    // Always show issues column
    columns.push({ key: 'issues', label: t('common.issues'), width: 'min-w-[200px]' })

    return columns
  }

  // handle the import
  const handleImport = async () => {
    const validStaff = parsedData.filter(staff => staff.valid)
    await onImport(validStaff) // Delegate to parent
    resetModal()
  }

  const resetModal = () => {
    setStep('upload')
    setParsedData([])
    setFile(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const validCount = parsedData.filter(staff => staff.valid).length
  const invalidCount = parsedData.length - validCount

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
            {/* Upload Zone */}
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
                {isDragActive ? t('common.dropFile') : t('common.dropFileorChoose')}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {t('common.fileSupport')}
              </p>
              
              <Button variant="outline" type="button">
                {t('common.chooseFile')}
              </Button>
            </div>

            {/* Expected Format */}
            <div className="mt-8 p-6 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-3">{t('common.expectedFormat')}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-100 rounded">
                      <th className="p-2 text-left">{t('staff.fullName')}</th>
                      <th className="p-2 text-left">{t('staff.role')}</th>
                      <th className="p-2 text-left">{t('staff.phoneNumber')}</th>
                      <th className="p-2 text-left">{t('staff.emailAddress')}</th>
                      <th className="p-2 text-left">{t('staff.facility')}</th>
                      <th className="p-2 text-left">{t('staff.skillLevel')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-blue-800">
                    <tr>
                      <td className="p-2">{t('staff.fullNamePlaceholder')}</td>
                      <td className="p-2">{t('staff.rolePlaceholder')}</td>
                      <td className="p-2">{t('staff.phonePlaceholder')}</td>
                      <td className="p-2">{t('staff.emailPlaceholder')}</td>
                      <td className="p-2">{t('staff.facilityPlaceholder')}</td>
                      <td className="p-2">{t('staff.skillLevelPlaceholder')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                <strong>{t('staff.columnNamesFlexible')}</strong>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (step === 'preview') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size='2xl'>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              {t('common.previewImport')} - {file?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
              <div className="text-sm text-green-700">{t('staff.validRecords')}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
              <div className="text-sm text-red-700">{t('staff.invalidRecords')}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{parsedData.length}</div>
              <div className="text-sm text-blue-700">{t('staff.totalRecords')}</div>
            </div>
          </div>

          {/* Detected Columns Info */}
          {detectedColumns.size > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>{t('common.detectedColumns')}:</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(detectedColumns).map(col => (
                  <Badge key={col} variant="outline" className="text-xs">
                    {originalColumnNames[col]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Data Preview - Dynamic Columns */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {getPreviewColumns().map(col => (
                    <th key={col.key} className={`p-3 text-left ${col.width}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.map((staff, index) => (
                  <tr key={index} className={`border-t ${staff.valid ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                    {getPreviewColumns().map(col => {
                      if (col.key === 'status') {
                        return (
                          <td key={col.key} className="p-3">
                            {staff.valid ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <X className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                        )
                      }
                      
                      if (col.key === 'full_name') {
                        return (
                          <td key={col.key} className="p-3 font-medium">
                            {staff.full_name}
                          </td>
                        )
                      }
                      
                      if (col.key === 'email') {
                        return (
                          <td key={col.key} className="p-3 text-blue-600">
                            {staff.email}
                          </td>
                        )
                      }
                      
                      if (col.key === 'role') {
                        return (
                          <td key={col.key} className="p-3">
                            <Badge variant="outline">{staff.role}</Badge>
                          </td>
                        )
                      }
                      
                      if (col.key === 'facility') {
                        return (
                          <td key={col.key} className="p-3">
                            {staff.facility_name}
                          </td>
                        )
                      }
                      
                      if (col.key === 'phone') {
                        return (
                          <td key={col.key} className="p-3">
                            {staff.phone}
                          </td>
                        )
                      }
                      
                      if (col.key === 'skill_level') {
                        return (
                          <td key={col.key} className="p-3 text-center">
                            <Badge variant="secondary">{staff.skill_level}</Badge>
                          </td>
                        )
                      }
                      
                      if (col.key === 'weekly_hours_max') {
                        return (
                          <td key={col.key} className="p-3 text-center">
                            {staff.weekly_hours_max}h
                          </td>
                        )
                      }
                      
                      if (col.key === 'is_active') {
                        return (
                          <td key={col.key} className="p-3">
                            <Badge variant={staff.is_active ? "default" : "secondary"}>
                              {staff.is_active ? t('staff.active') : t('staff.inactive')}
                            </Badge>
                          </td>
                        )
                      }
                      
                      if (col.key === 'issues') {
                        return (
                          <td key={col.key} className="p-3">
                            {staff.errors.length > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs">{staff.errors.join(', ')}</span>
                              </div>
                            )}
                          </td>
                        )
                      }
                      
                      return <td key={col.key} className="p-3">-</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions - Simplified, no progress handling */}
          <div className="flex gap-3 pt-4">
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
        </DialogContent>
      </Dialog>
    )
  }

  return null
}