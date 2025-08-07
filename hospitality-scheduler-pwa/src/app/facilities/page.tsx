// Main facilities page - TRANSLATED
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'sheetjs-style'
import { 
  Building2, 
  Plus, 
  MapPin, 
  Users, 
  Clock, 
  Settings, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Save,
  FileSpreadsheet,
  Search,
  Filter,
  MoreVertical,
  Shield,
  UserCog,
  Calendar,
  Star,
  CheckCircle,
  AlertTriangle,
  Coffee,
  Utensils,
  Home,
  Waves,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth, useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'

// Import the facility management modals
import { AddFacilityModal } from '@/components/facility/AddFacilityModal'
import { RoleManagementModal } from '@/components/facility/RoleManagementModal'
import { ZoneManagementModal } from '@/components/facility/ZoneManagementModal'
import { ShiftManagementModal } from '@/components/facility/ShiftManagementModal'

// Real-world facility types with appropriate defaults
const FACILITY_TYPES = [
  { 
    id: 'hotel', 
    name: 'facilities.hotel', // Translation key
    icon: Building2,
    color: 'blue',
    zones: ['front-desk', 'housekeeping', 'kitchen', 'restaurant', 'bar', 'security', 'management'],
    defaultShifts: [
      { name: 'facilities.dayShift', start: '06:00', end: '14:00', requiresManager: false },
      { name: 'facilities.eveningShift', start: '14:00', end: '22:00', requiresManager: true },
      { name: 'facilities.nightShift', start: '22:00', end: '06:00', requiresManager: true }
    ],
    commonRoles: ['facilities.manager', 'facilities.frontDeskAgent', 'facilities.housekeeper', 'facilities.concierge', 'facilities.security', 'facilities.maintenance']
  },
  { 
    id: 'restaurant', 
    name: 'facilities.restaurant',
    icon: Utensils,
    color: 'green',
    zones: ['kitchen', 'dining', 'bar', 'management'],
    defaultShifts: [
      { name: 'facilities.breakfast', start: '07:00', end: '11:00', requiresManager: false },
      { name: 'facilities.lunch', start: '11:00', end: '16:00', requiresManager: true },
      { name: 'facilities.dinner', start: '16:00', end: '23:00', requiresManager: true }
    ],
    commonRoles: ['facilities.manager', 'facilities.chef', 'facilities.sousChef', 'facilities.waiter', 'facilities.waitress', 'facilities.bartender', 'facilities.host']
  },
  { 
    id: 'resort', 
    name: 'facilities.resort',
    icon: Waves,
    color: 'purple',
    zones: ['front-desk', 'housekeeping', 'kitchen', 'restaurant', 'bar', 'pool', 'spa', 'activities', 'security'],
    defaultShifts: [
      { name: 'facilities.morning', start: '06:00', end: '14:00', requiresManager: false },
      { name: 'facilities.afternoon', start: '14:00', end: '22:00', requiresManager: true },
      { name: 'facilities.evening', start: '22:00', end: '06:00', requiresManager: true }
    ],
    commonRoles: ['facilities.manager', 'facilities.frontDeskAgent', 'facilities.housekeeper', 'facilities.chef', 'facilities.bartender', 'facilities.poolAttendant', 'facilities.spaTherapist', 'facilities.activitiesCoordinator']
  },
  { 
    id: 'cafe', 
    name: 'facilities.cafe',
    icon: Coffee,
    color: 'orange',
    zones: ['counter', 'kitchen', 'seating', 'management'],
    defaultShifts: [
      { name: 'facilities.opening', start: '06:00', end: '12:00', requiresManager: false },
      { name: 'facilities.midday', start: '12:00', end: '18:00', requiresManager: true },
      { name: 'facilities.closing', start: '18:00', end: '21:00', requiresManager: false }
    ],
    commonRoles: ['facilities.manager', 'facilities.barista', 'facilities.cashier', 'facilities.baker', 'facilities.server']
  },
  { 
    id: 'bar', 
    name: 'facilities.barLounge',
    icon: Zap,
    color: 'red',
    zones: ['bar', 'kitchen', 'seating', 'management'],
    defaultShifts: [
      { name: 'facilities.happyHour', start: '16:00', end: '20:00', requiresManager: false },
      { name: 'facilities.evening', start: '20:00', end: '01:00', requiresManager: true },
      { name: 'facilities.lateNight', start: '01:00', end: '03:00', requiresManager: true }
    ],
    commonRoles: ['facilities.manager', 'facilities.bartender', 'facilities.server', 'facilities.security', 'facilities.dj']
  }
]

const ZONE_ICONS = {
  'front-desk': Users,
  'housekeeping': Home,
  'kitchen': Utensils,
  'restaurant': Utensils,
  'dining': Utensils,
  'bar': Zap,
  'security': Shield,
  'management': UserCog,
  'pool': Waves,
  'spa': Star,
  'activities': Calendar,
  'counter': Coffee,
  'seating': Users
}

interface Facility {
  id: string
  name: string
  address: string
  facility_type: string
  zones: string[]
  shifts: ShiftConfig[]
  roles: string[]
  staff_count: number
  active_schedules: number
  created_at: string
}

interface ShiftConfig {
  id: string
  name: string
  start_time: string
  end_time: string
  requires_manager: boolean
  min_staff: number
  max_staff: number
}

export default function FacilitiesManagementPage() {
  const router = useRouter()
  const { user, isManager, loading: authLoading } = useAuth()
  const apiClient = useApiClient()
  const { t } = useTranslations()
  
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  
  // Import states
  const [showImportProgress, setShowImportProgress] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<'uploading' | 'processing' | 'complete'>('uploading')

  // Check permissions and redirect if needed
  useEffect(() => {
    if (!authLoading && !isManager) {
      toast.error(t('facilities.managerPermissionsRequired'))
      router.push('/dashboard')
    }
  }, [isManager, authLoading, router, t])

  // Load facilities data
  useEffect(() => {
    if (isManager) {
      loadFacilities()
    }
  }, [isManager])

  const loadFacilities = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getFacilities()
      setFacilities(data)
    } catch (error) {
      console.error('Failed to load facilities:', error)
      toast.error(t('common.failedToLoad') + ' ' + t('common.facilities'))
    } finally {
      setLoading(false)
    }
  }

  // Handle facility deletion
  const handleDeleteFacility = async (facilityId: string, facilityName: string) => {
    if (!confirm(t('facilities.areYouSureDelete', { name: facilityName }))) {
      return
    }

    try {
      await apiClient.deleteFacility(facilityId)
      toast.success(t('facilities.deletedSuccessfully', { name: facilityName }))
      await loadFacilities()
    } catch (error: any) {
      console.error('Failed to delete facility:', error)
      toast.error(error.response?.data?.detail || t('facilities.failedToDeleteFacility'))
    }
  }

  // Drag and drop for Excel import
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file || (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv'))) {
      toast.error(t('facilities.pleaseUploadExcel'))
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
      const facilitiesToImport = jsonData.map((row: any) => {
        const facilityType = FACILITY_TYPES.find(t => 
          t.name.toLowerCase() === (row['Type'] || row['type'] || '').toLowerCase()
        ) || FACILITY_TYPES[0]

        return {
          name: row['Name'] || row['name'] || t('facilities.unnamedFacility'),
          location: row['Location'] || row['location'] || '',
          address: row['Address'] || row['address'] || '',
          facility_type: facilityType.id,
          phone: row['Phone'] || row['phone'] || '',
          email: row['Email'] || row['email'] || '',
          description: row['Description'] || row['description'] || ''
        }
      })

      setImportProgress(80)

      // Import facilities via API
      const imported = await Promise.all(
        facilitiesToImport.map(facility => apiClient.createFacility(facility))
      )

      setImportProgress(100)
      setImportStatus('complete')

      toast.success(t('facilities.successfullyImported', { count: imported.length }))
      await loadFacilities()

      setTimeout(() => {
        setShowImportProgress(false)
      }, 1500)

    } catch (error) {
      console.error('Import failed:', error)
      toast.error(t('facilities.failedToImportCheck'))
      setShowImportProgress(false)
    }
  }, [apiClient, t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    noClick: true,
    noKeyboard: true
  })

  // Filter facilities
  const filteredFacilities = facilities.filter((facility: Facility) => {
    const matchesSearch = facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (facility.address || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || facility.facility_type === selectedType
    return matchesSearch && matchesType
  })

  // Global Drop Zone Overlay
  const GlobalDropZone = () => (
    <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 text-center shadow-xl border-2 border-dashed border-blue-400">
        <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('facilities.dropToImport')}</h3>
        <p className="text-gray-600">{t('facilities.releaseToImport')}</p>
      </div>
    </div>
  )

  // Import Progress Modal
  const ImportProgressModal = () => (
    <Dialog open={showImportProgress} onOpenChange={setShowImportProgress}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('facilities.importingFacilities')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{importProgress}%</div>
            <div className="text-sm text-gray-600">
              {importStatus === 'uploading' && t('facilities.uploadingFile')}
              {importStatus === 'processing' && t('facilities.processingFacilities')}
              {importStatus === 'complete' && t('facilities.importComplete')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // Facility Card Component
  const FacilityCard = ({ facility }: { facility: Facility }) => {
    const facilityType = FACILITY_TYPES.find(t => t.id === facility.facility_type) || FACILITY_TYPES[0]
    const IconComponent = facilityType.icon

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br from-${facilityType.color}-500 to-${facilityType.color}-600 rounded-lg flex items-center justify-center`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                  {facility.name}
                </CardTitle>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{facility.address || t('common.noAddress')}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs border-${facilityType.color}-200 text-${facilityType.color}-700 bg-${facilityType.color}-50`}
                >
                  {t(facilityType.name)}
                </Badge>
              </div>
            </div>
            
            {/* Actions Menu */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setEditingFacility(facility)
                  setShowAddModal(true) 
                }}
                className="hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDeleteFacility(facility.id, facility.name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{facility.staff_count || 0}</div>
              <div className="text-xs text-gray-600">{t('facilities.staff')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{facility.shifts?.length || 0}</div>
              <div className="text-xs text-gray-600">{t('facilities.shifts')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{facility.active_schedules || 0}</div>
              <div className="text-xs text-gray-600">{t('facilities.schedules')}</div>
            </div>
          </div>

          {/* Zones */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">{t('facilities.activeZones')}</div>
            <div className="flex flex-wrap gap-1">
              {facility.zones?.slice(0, 4).map(zone => {
                // Handle both string zones and zone objects
                const zoneKey = typeof zone === 'string' ? zone : zone.zone_id || zone.id;
                const zoneName = typeof zone === 'string' ? zone : zone.zone_name || zone.name || zoneKey;
                
                // Create a mapping function for zone names to translation keys
                const getZoneDisplayName = (name: string): string => {
                  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  
                  // Zone name mappings
                  const zoneMap: Record<string, string> = {
                    'frontdesk': 'facilities.frontDesk',
                    'front-desk': 'facilities.frontDesk',
                    'housekeeping': 'facilities.housekeeping',
                    'kitchen': 'facilities.kitchen',
                    'restaurant': 'facilities.restaurant',
                    'dining': 'facilities.dining',
                    'diningroom': 'facilities.dining',
                    'bar': 'facilities.bar',
                    'security': 'facilities.security',
                    'management': 'facilities.management',
                    'pool': 'facilities.pool',
                    'spa': 'facilities.spa',
                    'activities': 'facilities.activities',
                    'counter': 'facilities.counter',
                    'servicecounter': 'facilities.serviceCounter',
                    'seating': 'facilities.seating',
                    'hoststation': 'facilities.host',
                    'lobbycommonareas': 'facilities.lobby',
                    'lobby': 'facilities.lobby',
                    'maintenance': 'facilities.maintenance',
                    'preparea': 'facilities.prepArea'
                  };
                  
                  const translationKey = zoneMap[normalizedName];
                  if (translationKey) {
                    return t(translationKey);
                  }
                  
                  // Fallback to formatted original name
                  return name.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                };
                
                const displayName = getZoneDisplayName(zoneName);
                const ZoneIcon = ZONE_ICONS[zoneKey] || Users;
                
                return (
                  <div 
                    key={zoneKey}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                  >
                    <ZoneIcon className="w-3 h-3" />
                    {displayName}
                  </div>
                )
              })}
              {facility.zones?.length > 4 && (
                <div className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-500">
                  +{facility.zones.length - 4} {t('facilities.more')}
                </div>
              )}
            </div>
          </div>

          {/* Management Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 text-xs hover:bg-blue-50 hover:border-blue-300"
              onClick={() => {
                setEditingFacility(facility)
                setShowShiftModal(true)
              }}
            >
              <Clock className="w-3 h-3" />
              {t('facilities.shifts')}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 text-xs hover:bg-green-50 hover:border-green-300"
              onClick={() => {
                setEditingFacility(facility)
                setShowRoleModal(true)
              }}
            >
              <UserCog className="w-3 h-3" />
              {t('facilities.roles')}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 text-xs hover:bg-purple-50 hover:border-purple-300"
              onClick={() => {
                setEditingFacility(facility)
                setShowZoneModal(true)
              }}
            >
              <Settings className="w-3 h-3" />
              {t('facilities.zones')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">
              {authLoading ? t('facilities.checkingPermissions') : t('facilities.loadingFacilities')}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Access denied
  if (!isManager) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="w-5 h-5" />
                {t('common.accessDenied')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                {t('facilities.accessDeniedMessage')}
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                {t('common.returnToDashboard')}
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
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {t('facilities.facilityManagement')}
                </h1>
                <p className="text-gray-600 mt-1">{t('facilities.configureFacilitiesDescription')}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddModal(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {t('facilities.addFacility')}
              </Button>
            </div>
          </div>

          {/* Import Instructions */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <p className="text-blue-800 text-sm">
                  <strong>{t('facilities.dragDropInstructions')}</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters and Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder={t('facilities.searchFacilities')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-0 focus:bg-white transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">{t('facilities.allTypes')}</option>
                {FACILITY_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{t(type.name)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Facilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFacilities.map(facility => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>

          {/* Empty State */}
          {filteredFacilities.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedType !== 'all' ? t('facilities.noFacilitiesFound') : t('facilities.noFacilitiesYet')}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedType !== 'all' 
                  ? t('facilities.tryAdjustingFilters')
                  : t('facilities.getStartedMessage')
                }
              </p>
              {!searchQuery && selectedType === 'all' && (
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('facilities.addFacility')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Import Progress Modal */}
        <ImportProgressModal />

        {/* Facility Management Modals */}
        <AddFacilityModal
          open={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setEditingFacility(null)
          }}
          onSuccess={() => {
            loadFacilities()
            setShowAddModal(false)
            setEditingFacility(null)
          }}
          facility={editingFacility}
        />

        <RoleManagementModal
          open={showRoleModal}
          onClose={() => {
            setShowRoleModal(false)
            setEditingFacility(null)
          }}
          facility={editingFacility}
          onSuccess={() => {
            loadFacilities()
            setShowRoleModal(false)
            setEditingFacility(null)
          }}
        />

        <ZoneManagementModal
          open={showZoneModal}
          onClose={() => {
            setShowZoneModal(false)
            setEditingFacility(null)
          }}
          facility={editingFacility}
          onSuccess={() => {
            loadFacilities()
            setShowZoneModal(false)
            setEditingFacility(null)
          }}
        />

        <ShiftManagementModal
          open={showShiftModal}
          onClose={() => {
            setShowShiftModal(false)
            setEditingFacility(null)
          }}
          facility={editingFacility}
          onShiftsUpdated={() => {
            loadFacilities()
            setShowShiftModal(false)
            setEditingFacility(null)
          }}
        />
      </div>
    </AppLayout>
  )
}