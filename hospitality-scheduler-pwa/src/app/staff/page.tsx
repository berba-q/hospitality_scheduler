'use client'
// Staff management page for managers
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Plus, Upload, Search, Users, FileSpreadsheet, ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { StaffTable } from '@/components/staff/StaffTable'
import { AddStaffModal } from '@/components/staff/AddStaffModal'
import { ImportProgressModal } from '@/components/staff/ImportProgressModal'
import { GlobalDropZone } from '@/components/staff/GlobalDropZone'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

export default function StaffPage() {
  const { isManager, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  const router = useRouter()
  
  const [staff, setStaff] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacility, setSelectedFacility] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportProgress, setShowImportProgress] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<'uploading' | 'processing' | 'importing' | 'complete' | 'error'>('uploading')
  const [importResults, setImportResults] = useState({ added: 0, errors: 0 })

  // Check if user is manager - redirect if not
  useEffect(() => {
    if (!authLoading && !isManager) {
      toast.error('Access denied. Manager permissions required.')
      router.push('/dashboard')
    }
  }, [isManager, authLoading, router])

  // Load data
  useEffect(() => {
    if (isManager) {
      loadData()
    }
  }, [isManager])

  const loadData = async () => {
    try {
      setLoading(true)
      const [staffData, facilitiesData] = await Promise.all([
        apiClient.getStaff(),
        apiClient.getFacilities()
      ])
      setStaff(staffData)
      setFacilities(facilitiesData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }

  // Auto-import on drag and drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file || (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv'))) {
      toast.error('Please upload an Excel (.xlsx) or CSV file')
      return
    }

    setShowImportProgress(true)
    setImportProgress(0)
    setImportStatus('uploading')

    try {
      // Simulate upload progress
      for (let i = 0; i <= 30; i += 5) {
        setImportProgress(i)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      setImportStatus('processing')
      
      // Parse the file
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      setImportProgress(50)

      // Process and validate data
      const staffToImport = jsonData.map((row: any) => ({
        full_name: row['Name'] || row['Full Name'] || row['name'] || row['full_name'] || '',
        role: row['Role'] || row['Position'] || row['role'] || row['position'] || '',
        phone: row['Phone'] || row['phone'] || row['Phone Number'] || '',
        skill_level: parseInt(row['Skill Level'] || row['skill_level'] || '3'),
        facility_id: facilities.find(f => 
          f.name.toLowerCase().includes((row['Facility'] || row['facility'] || '').toLowerCase())
        )?.id || facilities[0]?.id || '',
        weekly_hours_max: parseInt(row['Weekly Hours'] || row['weekly_hours_max'] || '40')
      })).filter(staff => staff.full_name && staff.role && staff.facility_id)

      setImportProgress(70)
      setImportStatus('importing')

      // Import staff members
      let added = 0
      let errors = 0
      
      for (let i = 0; i < staffToImport.length; i++) {
        try {
          await apiClient.createStaff(staffToImport[i])
          added++
        } catch (error) {
          errors++
          console.error('Failed to import staff:', error)
        }
        
        // Update progress
        const progress = 70 + ((i + 1) / staffToImport.length) * 30
        setImportProgress(progress)
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setImportResults({ added, errors })
      setImportStatus('complete')
      setImportProgress(100)

      // Refresh data
      await loadData()

      if (errors === 0) {
        toast.success(`Successfully imported ${added} staff members!`)
      } else {
        toast.warning(`Imported ${added} staff members with ${errors} errors`)
      }

    } catch (error) {
      console.error('Import failed:', error)
      setImportStatus('error')
      toast.error('Failed to import staff. Please check the file format.')
    }
  }, [apiClient, facilities])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    noClick: true,
    noKeyboard: true
  })

  // Filter staff
  const filteredStaff = staff.filter((member: any) => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.phone?.includes(searchQuery)
    
    const matchesFacility = selectedFacility === 'all' || member.facility_id === selectedFacility
    
    return matchesSearch && matchesFacility
  })

  // Loading state
  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">
              {authLoading ? 'Checking permissions...' : 'Loading staff data...'}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Access denied - shouldn't reach here due to redirect, but just in case
  if (!isManager) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="w-5 h-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You need manager permissions to access staff management.
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div 
        {...getRootProps()} 
        className={`min-h-screen bg-gradient-to-br from-slate-50 to-white p-6 transition-all duration-200 ${
          isDragActive ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
        }`}
      >
        <input {...getInputProps()} />
        
        {/* Global Drop Zone Overlay */}
        {isDragActive && <GlobalDropZone />}

        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Staff Management
                </h1>
                <p className="text-gray-600 mt-1">Manage your team across all facilities</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddModal(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Add Staff
              </Button>
            </div>
          </div>

          {/* Import Instructions */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <p className="text-blue-800 text-sm">
                  <strong>Drag & Drop Excel files anywhere</strong> to instantly import staff members. 
                  We support .xlsx and .csv files with columns: Name, Role, Phone, Facility, Skill Level.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{staff.length}</p>
                    <p className="text-sm text-gray-600">Total Staff</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Badge className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{staff.filter((s: any) => s.is_active).length}</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{facilities.length}</p>
                    <p className="text-sm text-gray-600">Facilities</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(staff.map((s: any) => s.role)).size}
                    </p>
                    <p className="text-sm text-gray-600">Unique Roles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search staff by name, role, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-0 bg-gray-50 focus:bg-white transition-all duration-200"
                  />
                </div>
                
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">All Facilities</option>
                  {facilities.map((facility: any) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Staff Table */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Staff Members ({filteredStaff.length})</span>
                <Badge variant="outline" className="text-xs">
                  Manager Only Access
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <StaffTable 
                staff={filteredStaff} 
                facilities={facilities}
                onRefresh={loadData}
              />
            </CardContent>
          </Card>

          {/* Empty State */}
          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No staff found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedFacility !== 'all' 
                  ? 'Try adjusting your search criteria' 
                  : 'Get started by adding your first staff member or drag & drop an Excel file'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Staff Member
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <AddStaffModal 
          open={showAddModal} 
          onClose={() => setShowAddModal(false)}
          facilities={facilities}
          onSuccess={loadData}
        />
        
        <ImportProgressModal
          open={showImportProgress}
          onClose={() => setShowImportProgress(false)}
          progress={importProgress}
          status={importStatus}
          results={importResults}
        />
      </div>
    </AppLayout>
  )
}