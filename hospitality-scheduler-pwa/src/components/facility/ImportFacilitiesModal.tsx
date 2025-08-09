// Fixed ImportFacilitiesModal with proper translations
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Building2, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from '@/hooks/useTranslations'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import React from 'react'

interface ImportFacilitiesModalProps {
  open: boolean
  onClose: () => void
  onImport: (validFacilities: ParsedFacility[]) => Promise<void>
  initialFile?: File | null
}

interface ParsedFacility {
  name: string
  facility_type: string
  location?: string
  address?: string
  phone?: string
  email?: string
  description?: string
  valid: boolean
  errors: string[]
  // Duplicate checking fields
  duplicateInfo?: any
  hasDuplicates?: boolean
  duplicateSeverity?: 'none' | 'warning' | 'error'
  canImport?: boolean
  forceCreate?: boolean
}

const FACILITY_TYPES = [
  { id: 'hotel', name: 'Hotel' },
  { id: 'restaurant', name: 'Restaurant' },
  { id: 'resort', name: 'Resort' },
  { id: 'cafe', name: 'Cafe' },
  { id: 'bar', name: 'Bar' }
]

// Column mapping for translation support (like staff modal)
const COLUMN_MAPPINGS = {
  // Name variations
  name: ['name', 'facility_name', 'facility name', 'nome', 'nom', 'nombre'],
  facility_type: ['type', 'facility_type', 'facility type', 'kind', 'category', 'tipo', 'categoria'],
  location: ['location', 'city', 'place', 'localização', 'lieu', 'ubicación'],
  address: ['address', 'full_address', 'street', 'endereço', 'adresse', 'dirección'],
  phone: ['phone', 'telephone', 'phone_number', 'telefone', 'téléphone', 'teléfono'],
  email: ['email', 'email_address', 'e-mail', 'mail', 'correio'],
  description: ['description', 'notes', 'details', 'descrição', 'notes', 'descripción']
}

export function ImportFacilitiesModal({ open, onClose, onImport, initialFile }: ImportFacilitiesModalProps) {
  const { t } = useTranslations()
  const apiClient = useApiClient()
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [detectedColumns, setDetectedColumns] = useState<Set<string>>(new Set())
  const [originalColumnNames, setOriginalColumnNames] = useState<Record<string, string>>({})
  const [parsedData, setParsedData] = useState<ParsedFacility[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  
  // Duplicate checking state (like staff modal)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicatesChecked, setDuplicatesChecked] = useState(false)
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set())
  const [showDuplicateDetails, setShowDuplicateDetails] = useState<Set<number>>(new Set())
  const [forceCreateAll, setForceCreateAll] = useState(false)

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

  // Enhanced column detection with flexible mapping
  const detectColumn = (headerName: string): string | null => {
    const cleanHeader = headerName.toLowerCase().trim()
    
    for (const [standardName, variations] of Object.entries(COLUMN_MAPPINGS)) {
      if (variations.some(variation => cleanHeader.includes(variation) || variation.includes(cleanHeader))) {
        return standardName
      }
    }
    return null
  }

  // Enhanced Excel parsing with column mapping
  const parseExcelFile = async (file: File) => {
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (jsonData.length === 0) {
        throw new Error(t('facilities.noDataFound'))
      }

      const headers = jsonData[0] as string[]
      const detectedCols = new Set<string>()
      const originalNames: Record<string, string> = {}

      // Map headers to standard column names
      const columnMapping: Record<number, string> = {}
      headers.forEach((header, index) => {
        const standardName = detectColumn(header)
        if (standardName) {
          columnMapping[index] = standardName
          detectedCols.add(standardName)
          originalNames[standardName] = header
        }
      })

      setDetectedColumns(detectedCols)
      setOriginalColumnNames(originalNames)

      // Process data rows
      const facilities: ParsedFacility[] = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.every(cell => !cell)) continue // Skip empty rows

        const facility: any = {}
        
        // Map row data using column mapping
        Object.entries(columnMapping).forEach(([colIndex, fieldName]) => {
          const value = row[parseInt(colIndex)]
          if (value !== undefined && value !== null && value !== '') {
            facility[fieldName] = String(value).trim()
          }
        })

        // Validate and process the facility
        const errors: string[] = []
        
        if (!facility.name || facility.name.length < 2) {
          errors.push(t('facilities.facilityNameRequired'))
        }

        // Map facility type
        const facilityType = FACILITY_TYPES.find(t => 
          t.name.toLowerCase() === (facility.facility_type || '').toLowerCase()
        )
        
        if (!facilityType) {
          facility.facility_type = 'hotel' // Default type
          if (facility.facility_type) {
            errors.push(t('facilities.unknownFacilityType', { type: facility.facility_type }))
          }
        } else {
          facility.facility_type = facilityType.id
        }

        // Email validation
        if (facility.email && !facility.email.includes('@')) {
          errors.push(t('facilities.invalidEmailFormat'))
        }

        facilities.push({
          name: facility.name || t('facilities.unnamedFacility'),
          facility_type: facility.facility_type,
          location: facility.location || '',
          address: facility.address || '',
          phone: facility.phone || '',
          email: facility.email || '',
          description: facility.description || '',
          valid: errors.length === 0,
          errors,
          hasDuplicates: false,
          duplicateSeverity: 'none',
          canImport: true,
          forceCreate: false
        })
      }

      setParsedData(facilities)
      
      // Auto-select valid facilities
      const validIndices = new Set(
        facilities.map((_, index) => index).filter(i => facilities[i].valid)
      )
      setSelectedForImport(validIndices)
      
      setStep('preview')
      
      // Automatically check for duplicates
      if (facilities.length > 0) {
        await checkForDuplicates(facilities)
      }

    } catch (error) {
      console.error('Failed to parse file:', error)
      toast.error(t('facilities.failedToParseExcel'))
    } finally {
      setProcessing(false)
    }
  }

  // Duplicate checking (similar to staff modal)
  const checkForDuplicates = async (facilitiesList: ParsedFacility[]) => {
    if (!facilitiesList.length) return

    setCheckingDuplicates(true)
    
    try {
      const updatedFacilities = [...facilitiesList]
      
      for (let i = 0; i < updatedFacilities.length; i++) {
        const facility = updatedFacilities[i]
        
        if (!facility.valid) continue

        try {
          const response = await apiClient.validateFacilitiesImport({
            name: facility.name,
            facility_type: facility.facility_type,
            location: facility.location,
            address: facility.address,
            phone: facility.phone,
            email: facility.email,
            description: facility.description
          })

          if (response.duplicates?.has_any_duplicates) {
            updatedFacilities[i] = {
              ...facility,
              hasDuplicates: true,
              duplicateInfo: response.duplicates,
              duplicateSeverity: response.duplicates.severity,
              canImport: response.can_create,
              errors: response.duplicates.severity === 'error' && !forceCreateAll 
                ? [...facility.errors, t('facilities.duplicateDetected')]
                : facility.errors
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
          console.error('Error checking duplicates for:', facility.name, error)
        }
      }

      setParsedData(updatedFacilities)
      setDuplicatesChecked(true)
      
    } finally {
      setCheckingDuplicates(false)
    }
  }

  // Handle initial file if provided
  useEffect(() => {
    if (open && initialFile && step === 'upload') {
      setFile(initialFile)
      parseExcelFile(initialFile)
    }
  }, [open, initialFile, step])

  // Toggle selection
  const toggleSelection = (index: number) => {
    const facility = parsedData[index]
    const newSelection = new Set(selectedForImport)
    
    if (newSelection.has(index)) {
      newSelection.delete(index)
    } else {
      if (facility.valid && (facility.canImport || forceCreateAll)) {
        newSelection.add(index)
      }
    }
    
    setSelectedForImport(newSelection)
  }

  // Toggle duplicate details
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
    
    const updatedFacilities = parsedData.map(facility => ({
      ...facility,
      forceCreate: checked,
      canImport: checked || facility.canImport
    }))
    setParsedData(updatedFacilities)
    
    if (checked) {
      const allValidIndices = new Set(
        updatedFacilities.map((_, index) => index).filter(i => updatedFacilities[i].valid)
      )
      setSelectedForImport(allValidIndices)
    }
  }

  const handleImport = async () => {
    const selectedFacilities = Array.from(selectedForImport).map(index => ({
      ...parsedData[index],
      force_create: forceCreateAll || parsedData[index].forceCreate
    }))
    
    if (selectedFacilities.length === 0) return
    
    try {
      // Use the enhanced import API directly
      const result = await apiClient.importFacilities(selectedFacilities, {
        force_create_duplicates: forceCreateAll,
        skip_duplicate_check: false,
        validate_only: false
      })
      
      // Show results to user
      if (result.successful_imports > 0) {
        toast.success(t('facilities.successfullyImported', { count: result.successful_imports }))
      }
      
      if (result.skipped_duplicates > 0) {
        toast.warning(t('facilities.skippedDuplicates', { count: result.skipped_duplicates }))
      }
      
      if (result.validation_errors > 0) {
        toast.error(t('facilities.facilitiesHadErrors', { count: result.validation_errors }))
      }
      
      // Call the parent's onImport for any additional handling (like refreshing the list)
      await onImport(selectedFacilities)
      
      reset()
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
      toast.error(t('facilities.failedToImportFacilities'))
    }
  }

  const reset = () => {
    setStep('upload')
    setFile(null)
    setParsedData([])
    setProcessing(false)
    setCheckingDuplicates(false)
    setDuplicatesChecked(false)
    setSelectedForImport(new Set())
    setShowDuplicateDetails(new Set())
    setForceCreateAll(false)
  }

  const getDuplicateIcon = (severity: string | undefined) => {
    switch (severity) {
      case 'error': return <X className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Check className="w-4 h-4 text-green-500" />
    }
  }

  const getColumns = () => {
    const columns = []
    
    if (detectedColumns.has('name')) {
      columns.push({ 
        key: 'name', 
        label: originalColumnNames['name'] || t('facilities.nameColumn'),
        width: 'min-w-[150px]'
      })
    }

    if (detectedColumns.has('facility_type')) {
      columns.push({ 
        key: 'facility_type', 
        label: originalColumnNames['facility_type'] || t('facilities.typeColumn'),
        width: 'min-w-[100px]'
      })
    }

    if (detectedColumns.has('location')) {
      columns.push({ 
        key: 'location', 
        label: originalColumnNames['location'] || t('facilities.locationColumn'),
        width: 'min-w-[120px]'
      })
    }

    if (detectedColumns.has('address')) {
      columns.push({ 
        key: 'address', 
        label: originalColumnNames['address'] || t('facilities.addressColumn'),
        width: 'min-w-[200px]'
      })
    }

    return columns
  }

  // Calculate conflict count
  const conflictCount = parsedData.filter(f => 
    f.hasDuplicates && (f.duplicateSeverity === 'error' || f.duplicateSeverity === 'warning')
  ).length

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) { reset(); onClose() } }}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('facilities.importFacilities')}</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isDragActive ? t('common.dropFile') : t('common.fileSupport')}
              </h3>
              <p className="text-gray-600 mb-4">{t('common.dropFileorChoose')}</p>
              <Button variant="outline">{t('common.chooseFile')}</Button>
            </div>

            <Alert>
              <AlertDescription>
                {t('common.uploadExcelOrCsv')} {t('common.fileSupport')}
                <br />
                {t('facilities.columnNamesFlexible')}
              </AlertDescription>
            </Alert>

            {processing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>{t('facilities.processingFile')}</p>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col space-y-4 flex-1 min-h-0">
            {/* Header with counts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium">{t('facilities.previewImportData')}</h3>
                {checkingDuplicates && (
                  <Badge variant="outline" className="animate-pulse">
                    {t('facilities.checkingDuplicates')}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {parsedData.length} {t('facilities.facilitiesFound')} • {selectedForImport.size} {t('facilities.selected')}
              </div>
            </div>

            {/* Conflict warning */}
            {conflictCount > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-orange-800">
                    {t('facilities.foundConflicts', { count: conflictCount })}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="force-create"
                      checked={forceCreateAll}
                      onCheckedChange={handleForceCreateToggle}
                    />
                    <label htmlFor="force-create" className="text-sm font-medium text-orange-800 cursor-pointer">
                      {t('facilities.overrideConflicts')}
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Data table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="w-12 p-3 text-left">
                      <Building2 className="w-4 h-4" />
                    </th>
                    {getColumns().map(col => (
                      <th key={col.key} className={`${col.width} p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        {col.label}
                      </th>
                    ))}
                    <th className="w-20 p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parsedData.map((facility, index) => {
                    const isSelected = selectedForImport.has(index)
                    const showingDetails = showDuplicateDetails.has(index)
                    
                    return (
                      <React.Fragment key={index}>
                        <tr className={`
                          ${!facility.valid ? 'bg-red-50' : 
                            facility.hasDuplicates ? 
                              (facility.duplicateSeverity === 'error' ?
                                'bg-red-50' : 'bg-yellow-50') : 'hover:bg-gray-50'}
                        `}>
                          <td className="p-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(index)}
                              disabled={!facility.valid || (!facility.canImport && !forceCreateAll)}
                            />
                          </td>
                          
                          {getColumns().map(col => (
                            <td key={col.key} className="p-3 text-sm">
                              {facility[col.key as keyof ParsedFacility] || '-'}
                            </td>
                          ))}
                          
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getDuplicateIcon(facility.duplicateSeverity)}
                              {facility.hasDuplicates && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleDuplicateDetails(index)}
                                >
                                  {showingDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Duplicate details row */}
                        {showingDetails && facility.duplicateInfo && (
                          <tr className="bg-gray-50">
                            <td colSpan={getColumns().length + 2} className="p-4">
                              <div className="space-y-2 text-sm">
                                {facility.duplicateInfo.exact_name_match && (
                                  <div className="text-red-600">
                                    <strong>{t('facilities.exactNameMatch')}</strong> {facility.duplicateInfo.exact_name_match.name}
                                  </div>
                                )}
                                {facility.duplicateInfo.similar_names?.length > 0 && (
                                  <div className="text-yellow-600">
                                    <strong>{t('facilities.similarNamesFound')}</strong> {facility.duplicateInfo.similar_names.map((f: any) => f.name).join(', ')}
                                  </div>
                                )}
                                {facility.duplicateInfo.address_matches?.length > 0 && (
                                  <div className="text-yellow-600">
                                    <strong>{t('facilities.addressMatches')}</strong> {facility.duplicateInfo.address_matches.map((f: any) => f.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions - with processing state */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" onClick={reset} disabled={processing}>
                {t('facilities.backToUpload')}
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={selectedForImport.size === 0 || processing}
                className="gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('facilities.importing')}
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    {t('facilities.importFacilitiesCount', { count: selectedForImport.size })}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}