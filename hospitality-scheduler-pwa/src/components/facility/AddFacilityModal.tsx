// AddFacilityModal.tsx - component to add new facilities
'use client'

import { useState} from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
//import { Select } from '@/components/ui/select'
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
  Zap
} from 'lucide-react'
import { useFacilities } from '@/hooks/useFacility'
import { toast } from 'sonner'

interface AddFacilityModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const FACILITY_TYPES = [
  {
    id: 'hotel',
    name: 'Hotel',
    description: 'Full-service hotel with front desk, housekeeping, and guest services',
    icon: Building,
    color: 'bg-blue-100 text-blue-800',
    defaultShifts: ['Day Shift (6AM-2PM)', 'Evening Shift (2PM-10PM)', 'Night Shift (10PM-6AM)'],
    defaultRoles: ['Manager', 'Front Desk Agent', 'Housekeeper', 'Concierge', 'Maintenance'],
    defaultZones: ['Front Desk', 'Housekeeping', 'Lobby', 'Maintenance']
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Dining establishment with kitchen, service, and bar operations',
    icon: Users,
    color: 'bg-green-100 text-green-800',
    defaultShifts: ['Breakfast (7AM-11AM)', 'Lunch (11AM-4PM)', 'Dinner (4PM-11PM)'],
    defaultRoles: ['Manager', 'Chef', 'Server', 'Bartender', 'Host/Hostess'],
    defaultZones: ['Kitchen', 'Dining Room', 'Bar', 'Host Station']
  },
  {
    id: 'cafe',
    name: 'Cafe',
    description: 'Coffee shop or casual dining with counter service',
    icon: Star,
    color: 'bg-yellow-100 text-yellow-800',
    defaultShifts: ['Opening (6AM-12PM)', 'Midday (12PM-6PM)', 'Closing (6PM-9PM)'],
    defaultRoles: ['Manager', 'Barista', 'Cashier', 'Baker'],
    defaultZones: ['Counter', 'Prep Area']
  },
  {
    id: 'resort',
    name: 'Resort',
    description: 'Large resort property with multiple amenities and services',
    icon: CheckCircle,
    color: 'bg-purple-100 text-purple-800',
    defaultShifts: ['Day Shift (6AM-2PM)', 'Evening Shift (2PM-10PM)', 'Night Shift (10PM-6AM)'],
    defaultRoles: ['Manager', 'Front Desk Agent', 'Concierge', 'Spa Attendant', 'Activities Coordinator'],
    defaultZones: ['Front Desk', 'Spa', 'Pool Area', 'Activities', 'Housekeeping']
  },
  {
    id: 'bar',
    name: 'Bar/Lounge',
    description: 'Bar or lounge with beverage service and light food',
    icon: Zap,
    color: 'bg-red-100 text-red-800',
    defaultShifts: ['Happy Hour (4PM-8PM)', 'Evening (8PM-12AM)', 'Late Night (12AM-2AM)'],
    defaultRoles: ['Manager', 'Bartender', 'Server', 'Security'],
    defaultZones: ['Bar', 'Seating Area', 'Kitchen']
  }
]

export function AddFacilityModal({ open, onClose, onSuccess }: AddFacilityModalProps) {
  const { createFacility} = useFacilities()
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

  const selectedFacilityType = FACILITY_TYPES.find(type => type.id === selectedType)

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId)
    setFormData(prev => ({ ...prev, facility_type: typeId }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.facility_type) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    
    try {
      await createFacility(formData)
      onSuccess()
      onClose()
      
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
      
    } catch (error) {
      // Hook already handles error display
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Add New Facility
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Facility Type Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Facility Type *</Label>
              <p className="text-sm text-gray-600 mb-3">Choose the type of facility to automatically configure shifts, roles, and zones</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FACILITY_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedType === type.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleTypeSelect(type.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${type.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{type.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Selected Type Preview */}
          {selectedFacilityType && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Default Configuration for {selectedFacilityType.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700">Default Shifts</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFacilityType.defaultShifts.map((shift, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {shift}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-700">Default Roles</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFacilityType.defaultRoles.map((role, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-700">Default Zones</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFacilityType.defaultZones.map((zone, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Facility Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Downtown Hotel, Main Street Cafe"
                  className="bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Downtown, Airport District"
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street, City, State, ZIP"
                  className="bg-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@facility.com"
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the facility..."
                  className="bg-white"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name || !formData.facility_type}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                'Create Facility'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}