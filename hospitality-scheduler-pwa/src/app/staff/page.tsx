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
import { useTranslations } from '@/hooks/useTranslations'
import { StaffTable } from '@/components/staff/StaffTable'
import { AddStaffModal } from '@/components/staff/AddStaffModal'
import { ImportProgressModal } from '@/components/staff/ImportProgressModal'
import { ImportStaffModal } from '@/components/staff/ImportStaffModal'
import { GlobalDropZone } from '@/components/staff/GlobalDropZone'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ParsedStaffMember {
  full_name: string
  email?: string
  role: string
  phone?: string
  skill_level?: number
  facility_id?: string
  weekly_hours_max?: number
  is_active?: boolean
}

export default function StaffPage() {
  const { isManager, isLoading: authLoading } = useAuth()
  const apiClient = useApiClient()
  const router = useRouter()
  const { t } = useTranslations()
  
  const [staff, setStaff] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFacility, setSelectedFacility] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportProgress, setShowImportProgress] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<'uploading' | 'processing' | 'importing' | 'complete' | 'error'>('uploading')
  const [importResults, setImportResults] = useState({ added: 0, errors: 0 })
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)

  // Check if user is manager - redirect if not
  useEffect(() => {
    if (!authLoading && !isManager) {
      toast.error(t('staff.accessDeniedManager'))
      router.push('/dashboard')
    }
  }, [isManager, authLoading, router, t])

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
      toast.error(t('staff.failedLoadData'))
    } finally {
      setLoading(false)
    }
  }

  // Drag & drop with preview
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file || (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv'))) {
      toast.error(t('staff.uploadExcelOrCsv'))
      return
    }

    // Simply open the import modal with the file
    setPendingImportFile(file)
    setShowImportModal(true)
  }, [t])

  // Handle when ImportStaffModal wants to start importing
  const handleStartImport = async (validStaff: ParsedStaffMember[]) => {
    // Close preview modal
    setShowImportModal(false)
    setPendingImportFile(null)
    
    // Open progress modal
    setShowImportProgress(true)
    setImportProgress(0)
    setImportStatus('importing')
    setImportResults({ added: 0, errors: 0 })

    try {
      let added = 0
      let errors = 0
      
      // Import with progress tracking
      for (let i = 0; i < validStaff.length; i++) {
        try {
          // Use the enhanced existing createStaff method
          await apiClient.createStaff({
            full_name: validStaff[i].full_name,
            email: validStaff[i].email || undefined,
            role: validStaff[i].role,
            phone: validStaff[i].phone || undefined,
            skill_level: validStaff[i].skill_level || 3,
            facility_id: validStaff[i].facility_id!,
            weekly_hours_max: validStaff[i].weekly_hours_max || 40,
            is_active: validStaff[i].is_active ?? true,
            force_create: validStaff[i].force_create || false, // NEW: Pass force_create flag
            skip_duplicate_check: false
          })
          
          added++
          setImportResults({ added, errors })
          setImportProgress((i + 1) / validStaff.length * 100)
          
        } catch (error: any) {
          console.error('Failed to create staff:', validStaff[i].full_name, error)
          errors++
          setImportResults({ added, errors })
        }
      }

      // Finish import
      setImportStatus('complete')
      await loadData() // Refresh data
      
      if (errors === 0) {
        toast.success(t('staff.importSuccess', { count: added }))
      } else {
        toast.warning(t('staff.importPartialSuccess', { added, errors }))
      }

      setTimeout(() => {
        setShowImportProgress(false)
      }, 2000)

    } catch (error) {
      console.error('Import failed:', error)
      setImportStatus('error')
      toast.error(t('staff.importFailed'))
    }
  }

  // Setup drag and drop for the entire page
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    noClick: true,
    noKeyboard: true
  })

  // Filter staff based on search and facility
  const filteredStaff = staff.filter((member: any) => {
    const matchesSearch = !searchQuery || 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFacility = selectedFacility === 'all' || member.facility_id === selectedFacility

    return matchesSearch && matchesFacility
  })

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Show access denied for non-managers
  if (!isManager) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="p-6 space-y-4">
              <Shield className="w-12 h-12 text-gray-400 mx-auto" />
              <h2 className="text-xl font-semibold">{t('staff.accessDenied')}</h2>
              <p className="text-gray-600">{t('staff.managerPermissionsRequired')}</p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                {t('staff.returnToDashboard')}
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
          {/* Header with Import Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
            
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {t('staff.staffManagement')}
                </h1>
                <p className="text-gray-600 mt-1">{t('staff.manageYourTeam')}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* Import Staff Button */}
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {t('staff.importStaff')}
              </Button>
              
              {/* Add Staff Button */}
              <Button
                onClick={() => setShowAddModal(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {t('staff.addStaff')}
              </Button>
            </div>
          </div>

          {/* Import Instructions */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <p className="text-blue-800 text-sm">
                  <strong>{t('staff.dragDropImport')}</strong> {t('staff.importInstructions')}
                  <br />
                  <span className="text-blue-600">
                    {t('staff.orClickImportButton')}
                  </span>
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
                    <p className="text-sm text-gray-600">{t('staff.totalStaff')}</p>
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
                    <p className="text-sm text-gray-600">{t('staff.activeStaff')}</p>
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
                    <p className="text-sm text-gray-600">{t('facilities.facilities')}</p>
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
                    <p className="text-sm text-gray-600">{t('staff.uniqueRoles')}</p>
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
                    placeholder={t('staff.searchStaffByNameRole')}
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
                  <option value="all">{t('staff.allFacilities')}</option>
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
                <span>{t('staff.staffMembers')} ({filteredStaff.length})</span>
                <Badge variant="outline" className="text-xs">
                  {t('staff.managerOnlyAccess')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t('staff.noStaffFound')}</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery || selectedFacility !== 'all' 
                      ? t('staff.tryAdjustingCriteria')
                      : t('staff.getStartedMessage')}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setShowAddModal(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      {t('staff.addStaffMember')}
                    </Button>
                  </div>
                </div>
              ) : (
                <StaffTable 
                  staff={filteredStaff} 
                  facilities={facilities}
                  onRefresh={loadData}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modals - Clean separation */}
        <AddStaffModal 
          open={showAddModal} 
          onClose={() => setShowAddModal(false)}
          facilities={facilities}
          onSuccess={() => {
            setShowAddModal(false)
            loadData()
          }}
        />

        <ImportStaffModal 
          open={showImportModal} 
          onClose={() => {
            setShowImportModal(false)
            setPendingImportFile(null)
          }}
          facilities={facilities}
          onImport={handleStartImport} // Pass callback for import
          initialFile={pendingImportFile}
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