'use client'
// Facility zone selector component
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Users, CheckCircle, Circle } from 'lucide-react'

interface Zone {
  id: string
  name: string
  roles?: string[]  // Make this optional with ?
  // Add other zone properties that might be missing
  zone_id?: string
  zone_name?: string
  required_roles?: string[]
  preferred_roles?: string[]
  min_staff_per_shift?: number
  max_staff_per_shift?: number
  description?: string
  is_active?: boolean
  display_order?: number
}

interface FacilityZoneSelectorProps {
  zones: Zone[]
  selectedZones: string[]
  onZoneChange: (zones: string[]) => void
  staff: any[]
}

export function FacilityZoneSelector({
  zones,
  selectedZones,
  onZoneChange,
  staff
}: FacilityZoneSelectorProps) {
  const toggleZone = (zoneId: string) => {
    if (selectedZones.includes(zoneId)) {
      onZoneChange(selectedZones.filter(id => id !== zoneId))
    } else {
      onZoneChange([...selectedZones, zoneId])
    }
  }

  const selectAllZones = () => {
    onZoneChange(zones.map(z => z.id))
  }

  const clearAllZones = () => {
    onZoneChange([])
  }

  const getZoneStaffCount = (zone: Zone) => {
    // Add null/undefined checks for zone.roles
    const zoneRoles = zone.roles || []
    return staff.filter(member => 
      zoneRoles.includes(member.role) || zoneRoles.length === 0
    ).length
  }

  const getZoneName = (zone: Zone) => {
    return zone.name || zone.zone_name || 'Unnamed Zone'
  }

  const getZoneId = (zone: Zone) => {
    return zone.id || zone.zone_id || zone.name
  }

  const getZoneRoles = (zone: Zone) => {
  // Handle different possible role properties
  return zone.roles || zone.required_roles || zone.preferred_roles || []
}

  const getZoneColor = (zoneId: string) => {
    const colors: Record<string, string> = {
      'front-desk': 'bg-blue-100 text-blue-800 border-blue-200',
      'housekeeping': 'bg-green-100 text-green-800 border-green-200',
      'restaurant': 'bg-orange-100 text-orange-800 border-orange-200',
      'kitchen': 'bg-red-100 text-red-800 border-red-200',
      'dining': 'bg-pink-100 text-pink-800 border-pink-200',
      'bar': 'bg-purple-100 text-purple-800 border-purple-200',
      'security': 'bg-gray-100 text-gray-800 border-gray-200',
      'management': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'all': 'bg-slate-100 text-slate-800 border-slate-200'
    }
    return colors[zoneId] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Zones & Departments</label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllZones}
            className="text-xs"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllZones}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
        {zones.map((zone) => {
          const zoneId = getZoneId(zone)
          const zoneName = getZoneName(zone)
          const isSelected = selectedZones.includes(zoneId)
          const staffCount = getZoneStaffCount(zone)
          
          return (
            <Card
              key={zone.id}
              className={`cursor-pointer transition-all duration-200 border-2 ${
                isSelected 
                  ? 'border-blue-300 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => toggleZone(zone.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Selection Indicator */}
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Zone Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{zoneName}</span>
                      <Badge variant="outline" className="text-xs">
                        {staffCount} staff available
                      </Badge>
                    </div>
                    
                    {/* Roles */}
                    <div className="flex flex-wrap gap-1">
                       {getZoneRoles(zone).slice(0, 2).map(role => (
                          <Badge 
                            key={role}
                            variant="outline" 
                            className={`text-xs ${getZoneColor(zoneId)}`}
                          >
                            {role}
                          </Badge>
                        ))}
                          {getZoneRoles(zone).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{getZoneRoles(zone).length - 2}
                          </Badge>
                        )}
                    </div>
                  </div>

                  {/* Staff Count */}
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{staffCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selection Summary */}
      {selectedZones.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
          <div className="flex items-center gap-2 text-blue-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {selectedZones.length} zone{selectedZones.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <p className="text-blue-700 text-xs mt-1">
            Staff will be automatically assigned based on their roles and zone requirements
          </p>
        </div>
      )}
    </div>
  )
}