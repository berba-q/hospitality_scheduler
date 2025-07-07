'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Check, X, AlertTriangle, Users } from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface ImportStaffModalProps {
  open: boolean
  onClose: () => void
  facilities: any[]
  onSuccess: () => void
}

interface ParsedStaffMember {
  full_name: string
  role: string
  phone?: string
  skill_level?: number
  facility_name?: string
  facility_id?: string
  weekly_hours_max?: number
  valid: boolean
  errors: string[]
}

export function ImportStaffModal({ open, onClose, facilities, onSuccess }: ImportStaffModalProps) {
  const apiClient = useApiClient()
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')
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

  const parseExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const parsed = jsonData.map((row: any) => {
        const staff: ParsedStaffMember = {
          full_name: row['Name'] || row['Full Name'] || row['name'] || row['full_name'] || '',
          role: row['Role'] || row['Position'] || row['role'] || row['position'] || '',
          phone: row['Phone'] || row['phone'] || row['Phone Number'] || '',
          skill_level: parseInt(row['Skill Level'] || row['skill_level'] || '3'),
          facility_name: row['Facility'] || row['facility'] || row['Location'] || '',
          weekly_hours_max: parseInt(row['Weekly Hours'] || row['weekly_hours_max'] || '40'),
          valid: true,
          errors: []
        }

        // Validation
        if (!staff.full_name.trim()) {
          staff.errors.push('Name is required')
          staff.valid = false
        }
        if (!staff.role.trim()) {
          staff.errors.push('Role is required')
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
            staff.errors.push(`Facility "${staff.facility_name}" not found`)
            staff.valid = false
          }
        } else {
          // Default to first facility if only one exists
          if (facilities.length === 1) {
            staff.facility_id = facilities[0].id
            staff.facility_name = facilities[0].name
          } else {
            staff.errors.push('Facility is required')
            staff.valid = false
          }
        }

        return staff
      })

      setParsedData(parsed)
      setStep('preview')
    } catch (error) {
      toast.error('Failed to parse Excel file. Please check the format.')
      console.error(error)
    }
  }

  const handleImport = async () => {
    setStep('importing')
    
    try {
      const validStaff = parsedData.filter(staff => staff.valid)
      
      for (const staff of validStaff) {
        await apiClient.createStaff({
          full_name: staff.full_name,
          role: staff.role,
          phone: staff.phone || undefined,
          skill_level: staff.skill_level || 3,
          facility_id: staff.facility_id!,
        })
      }

      toast.success(`Successfully imported ${validStaff.length} staff members!`)
      onSuccess()
      onClose()
      resetModal()
    } catch (error) {
      toast.error('Failed to import some staff members')
      console.error(error)
    } finally {
      setStep('preview')
    }
  }

  const resetModal = () => {
    setStep('upload')
    setParsedData([])
    setFile(null)
  }

  const validCount = parsedData.filter(staff => staff.valid).length
  const invalidCount = parsedData.length - validCount

  if (step === 'upload') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              Import Staff from Excel
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
                {isDragActive ? 'Drop your file here' : 'Drop Excel file or click to browse'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                Supports .xlsx and .csv files up to 10MB
              </p>
              
              <Button variant="outline" type="button">
                Choose File
              </Button>
            </div>

            {/* Expected Format */}
            <div className="mt-8 p-6 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-3">Expected Excel Format:</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-100 rounded">
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Phone</th>
                      <th className="p-2 text-left">Facility</th>
                      <th className="p-2 text-left">Skill Level</th>
                    </tr>
                  </thead>
                  <tbody className="text-blue-800">
                    <tr>
                      <td className="p-2">John Doe</td>
                      <td className="p-2">Chef</td>
                      <td className="p-2">555-1234</td>
                      <td className="p-2">Main Hotel</td>
                      <td className="p-2">4</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Column names are flexible - we'll auto-detect common variations
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              Preview Import - {file?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
              <div className="text-sm text-green-700">Valid Records</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
              <div className="text-sm text-red-700">Invalid Records</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{parsedData.length}</div>
              <div className="text-sm text-blue-700">Total Records</div>
            </div>
          </div>

          {/* Data Preview */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Facility</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Issues</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((staff, index) => (
                  <tr key={index} className={`border-t ${staff.valid ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                    <td className="p-3">
                      {staff.valid ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                    </td>
                    <td className="p-3 font-medium">{staff.full_name}</td>
                    <td className="p-3">
                      <Badge variant="outline">{staff.role}</Badge>
                    </td>
                    <td className="p-3">{staff.facility_name}</td>
                    <td className="p-3">{staff.phone}</td>
                    <td className="p-3">
                      {staff.errors.length > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs">{staff.errors.join(', ')}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={resetModal} className="flex-1">
              Choose Different File
            </Button>
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || step === 'importing'}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {step === 'importing' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </div>
              ) : (
                `Import ${validCount} Staff Members`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}