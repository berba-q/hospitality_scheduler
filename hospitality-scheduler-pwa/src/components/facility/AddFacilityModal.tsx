// AddFacilityModal.tsx - component to add new facilities and edit existing ones
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Info,
  Clock,
  Users,
  Star,
  CheckCircle,
  Zap,
  Edit
} from 'lucide-react'
import { useFacilities } from '@/hooks/useFacility'
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'
import * as FacilityTypes from '@/types/facility'

interface AddFacilityModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  facility?: FacilityTypes.Facility | null // Add facility prop for editing
}

const FACILITY_TYPES = [
  {
    id: 'hotel',
    name: 'facilities.hotel',
    description: 'facilities.fullServiceHotel',
    icon: Building,
    color: 'bg-blue-100 text-blue-800',
    defaultShifts: ['facilities.dayShift', 'facilities.eveningShift', 'facilities.nightShift'],
    defaultRoles: ['facilities.manager', 'facilities.frontDeskAgent', 'facilities.housekeeper', 'facilities.concierge', 'facilities.maintenance'],
    defaultZones: ['facilities.frontDesk', 'facilities.housekeeping', 'facilities.lobby', 'facilities.maintenance']
  },
  {
    id: 'restaurant',
    name: 'facilities.restaurant',
    description: 'facilities.diningEstablishmentWith',
    icon: Users,
    color: 'bg-green-100 text-green-800',
    defaultShifts: ['facilities.breakfast', 'facilities.lunch', 'facilities.dinner'],
    defaultRoles: ['facilities.manager', 'facilities.chef', 'facilities.server', 'facilities.bartender', 'facilities.host'],
    defaultZones: ['facilities.kitchen', 'facilities.dining', 'facilities.bar', 'facilities.host']
  },
  {
    id: 'cafe',
    name: 'facilities.cafe',
    description: 'facilities.coffeeShopCasual',
    icon: Star,
    color: 'bg-yellow-100 text-yellow-800',
    defaultShifts: ['facilities.opening', 'facilities.midday', 'facilities.closing'],
    defaultRoles: ['facilities.manager', 'facilities.barista', 'facilities.cashier', 'facilities.baker'],
    defaultZones: ['facilities.counter', 'facilities.prepArea']
  },
  {
    id: 'resort',
    name: 'facilities.resort',
    description: 'facilities.largeResortProperty',
    icon: CheckCircle,
    color: 'bg-purple-100 text-purple-800',
    defaultShifts: ['facilities.dayShift', 'facilities.eveningShift', 'facilities.nightShift'],
    defaultRoles: ['facilities.manager', 'facilities.frontDeskAgent', 'facilities.concierge', 'facilities.spaTherapist', 'facilities.activitiesCoordinator'],
    defaultZones: ['facilities.frontDesk', 'facilities.spa', 'facilities.pool', 'facilities.activities', 'facilities.housekeeping']
  },
  {
    id: 'bar',
    name: 'facilities.barLounge',
    description: 'facilities.barLoungeWith',
    icon: Zap,
    color: 'bg-red-100 text-red-800',
    defaultShifts: ['facilities.happyHour', 'facilities.evening', 'facilities.lateNight'],
    defaultRoles: ['facilities.manager', 'facilities.bartender', 'facilities.server', 'facilities.security'],
    defaultZones: ['facilities.bar', 'facilities.seating', 'facilities.kitchen']
  }
]

export function AddFacilityModal({ open, onClose, onSuccess, facility }: AddFacilityModalProps) {
  const { createFacility } = useFacilities()
  const apiClient = useApiClient()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    facility_type: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    description: ''
  })

  // Determine if we're in edit mode
  const isEditMode = !!facility
  const modalTitle = isEditMode 
    ? t('facilities.editFacility', { name: facility?.name }) || `Edit ${facility?.name}`
    : t('facilities.addNewFacility')

  // Reset form when modal opens/closes or facility changes
  useEffect(() => {
    if (open) {
      if (facility) {
        // Pre-populate form for editing
        setFormData({
          name: facility.name || '',
          facility_type: facility.facility_type || '',
          location: facility.location || '',
          address: facility.address || '',
          phone: facility.phone || '',
          email: facility.email || '',
          description: facility.description || ''
        })
        setSelectedType(facility.facility_type || '')
      } else {
        // Reset form for new facility
        setFormData({
          name: '',
          facility_type: '',
          location: '',
          address: '',
          phone: '',
          email: '',
          description: ''
        })
        setSelectedType('')
      }
    }
  }, [open, facility])

  const selectedFacilityType = FACILITY_TYPES.find(type => type.id === selectedType)

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId)
    setFormData(prev => ({ ...prev, facility_type: typeId }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.facility_type) {
      toast.error(t('facilities.fillRequiredFields'))
      return
    }

    setLoading(true)
    try {
      if (isEditMode && facility) {
        // Update existing facility
        const updateData = {
          name: formData.name,
          facility_type: formData.facility_type,
          location: formData.location,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          description: formData.description
        }
        if (!apiClient) throw new Error(t('common.apiClientNotInitialized'))

        await apiClient.updateFacility(facility.id, updateData)
        toast.success(t('facilities.updatedSuccessfully', { name: formData.name }))
      } else {
        // Create new facility
        await createFacility(formData)
        toast.success(t('facilities.addedSuccessfully', { name: formData.name }))
      }
      
      onSuccess()
      handleCancel()
    } catch (error) {
      console.error(isEditMode ? 'Failed to update facility:' : 'Failed to create facility:', error)
      const errorMessage = isEditMode 
        ? t('facilities.failedToUpdate') 
        : t('common.failedToCreate')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: '',
      facility_type: '',
      location: '',
      address: '',
      phone: '',
      email: '',
      description: ''
    })
    setSelectedType('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Edit className="w-5 h-5" />
                {modalTitle}
              </>
            ) : (
              <>
                <Building className="w-5 h-5" />
                {modalTitle}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Facility Type */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('facilities.selectFacilityType')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FACILITY_TYPES.map((type) => {
                const IconComponent = type.icon
                const isSelected = selectedType === type.id
                
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleTypeSelect(type.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${type.color}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{t(type.name)}</CardTitle>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-3">
                        {t(type.description)}
                      </p>
                      
                      {/* Preview of defaults - only show for new facilities */}
                      {!isEditMode && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500">{t('facilities.shifts')}:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {type.defaultShifts.slice(0, 2).map((shift, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {t(shift)}
                                </Badge>
                              ))}
                              {type.defaultShifts.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{type.defaultShifts.length - 2} {t('facilities.more')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-xs font-medium text-gray-500">{t('facilities.zones')}:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {type.defaultZones.slice(0, 2).map((zone, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {t(zone)}
                                </Badge>
                              ))}
                              {type.defaultZones.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{type.defaultZones.length - 2} {t('facilities.more')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Step 2: Facility Details (only shown after type selection) */}
          {(selectedType || facility?.facility_type) && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">{t('facilities.facilityDetails')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('common.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('facilities.facilityName')}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">{t('common.location')}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder={t('common.location')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">{t('common.address')}</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder={t('common.address')}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">{t('facilities.contactInformation')}</h4>
                  
                  <div>
                    <Label htmlFor="phone">{t('common.phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder={t('common.phone')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">{t('common.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={t('common.email')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">{t('common.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t('facilities.briefDescriptionThe')}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Configuration Preview - only show for new facilities */}
              {!isEditMode && selectedFacilityType && (
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t('facilities.facilityConfiguration')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('facilities.facilityWillBeConfigured')}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm">{t('facilities.shifts')}</span>
                        </div>
                        <div className="space-y-1">
                          {selectedFacilityType.defaultShifts.map((shift, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              • {t(shift)}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-sm">{t('facilities.roles')}</span>
                        </div>
                        <div className="space-y-1">
                          {selectedFacilityType.defaultRoles.map((role, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              • {t(role)}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-sm">{t('facilities.zones')}</span>
                        </div>
                        <div className="space-y-1">
                          {selectedFacilityType.defaultZones.map((zone, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              • {t(zone)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name || !formData.facility_type || loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEditMode ? t('common.updating') : t('common.creating')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isEditMode ? t('common.updateExisting') : t('facilities.createFacility')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}