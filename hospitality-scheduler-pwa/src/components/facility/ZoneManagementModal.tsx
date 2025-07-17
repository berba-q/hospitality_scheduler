// ZoneManagementModal.tsx
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
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Grid,
  Target
} from 'lucide-react'
import { useFacilityZones, useFacilityRoles } from '@/hooks/useFacility'
import { toast } from 'sonner'

interface ZoneManagementModalProps {
  open: boolean
  onClose: () => void
  facility: any
  onSuccess: () => void
}

interface Zone {
  id?: string
  zone_id: string
  zone_name: string
  description?: string
  required_roles: string[]
  preferred_roles: string[]
  min_staff_per_shift: number
  max_staff_per_shift: number
  is_active: boolean
  display_order: number
}

export function ZoneManagementModal({ open, onClose, facility, onSuccess }: ZoneManagementModalProps) {
  const { zones, loading: zonesLoading, createZone, updateZone, deleteZone } = useFacilityZones(facility?.id)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  const [newZone, setNewZone] = useState<Zone>({
    zone_id: '',
    zone_name: '',
    description: '',
    required_roles: [],
    preferred_roles: [],
    min_staff_per_shift: 1,
    max_staff_per_shift: 3,
    is_active: true,
    display_order: 0
  })

  const generateZoneId = (zoneName: string) => {
    return zoneName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  const handleAddZone = async () => {
  if (!newZone.zone_name) {
    toast.error('Zone name is required')
    return
  }

  const zoneData = {
      ...newZone,
      zone_id: newZone.zone_id || generateZoneId(newZone.zone_name),
      display_order: zones.length
    }

    try {
      await createZone(zoneData)
      setShowAddForm(false)
      setNewZone({
        zone_id: '',
        zone_name: '',
        description: '',
        required_roles: [],
        preferred_roles: [],
        min_staff_per_shift: 1,
        max_staff_per_shift: 3,
        is_active: true,
        display_order: 0
      })
      onSuccess()
    } catch (error) {
      // Hook already handles error toasts and logging
    }
  }

  const handleUpdateZone = async (zoneId: string, updatedZone: Zone) => {
    try {
      await updateZone(zoneId, updatedZone)
      setEditingZone(null)
      onSuccess()
    } catch (error) {
      // Hook handles error display
    }
  }

 const handleDeleteZone = async (zoneId: string, zoneName: string) => {
    if (!confirm(`Are you sure you want to delete the zone "${zoneName}"?`)) {
      return
    }

    try {
      await deleteZone(zoneId, zoneName)
      onSuccess()
    } catch (error) {
      // Hook handles error display
    }
  }

  const handleReorderZone = async (zoneId: string, direction: 'up' | 'down') => {
    const currentIndex = zones.findIndex(z => z.id === zoneId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= zones.length) return

    const movedZone = zones[currentIndex]

    try {
      await updateZone(zoneId, { ...movedZone, display_order: newIndex })
    } catch (error) {
      // Hook handles error display
    }
  }

  const ZoneForm = ({ zone, onSave, onCancel, isNew = false }: {
    zone: Zone
    onSave: (zone: Zone) => void
    onCancel: () => void
    isNew?: boolean
  }) => {
    const [formData, setFormData] = useState<Zone>(zone)

    const handleRoleToggle = (roleName: string, type: 'required' | 'preferred') => {
      const currentRoles = type === 'required' ? formData.required_roles : formData.preferred_roles
      const otherRoles = type === 'required' ? formData.preferred_roles : formData.required_roles
      
      let updatedRoles
      if (currentRoles.includes(roleName)) {
        updatedRoles = currentRoles.filter(r => r !== roleName)
      } else {
        updatedRoles = [...currentRoles, roleName]
        // Remove from other category to avoid conflicts
        const updatedOtherRoles = otherRoles.filter(r => r !== roleName)
        if (type === 'required') {
          setFormData(prev => ({ ...prev, preferred_roles: updatedOtherRoles }))
        } else {
          setFormData(prev => ({ ...prev, required_roles: updatedOtherRoles }))
        }
      }

      setFormData(prev => ({
        ...prev,
        [type === 'required' ? 'required_roles' : 'preferred_roles']: updatedRoles
      }))
    }

    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isNew ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {isNew ? 'Add New Zone' : `Edit ${zone.zone_name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Zone Name *</Label>
              <Input
                value={formData.zone_name}
                onChange={(e) => {
                  const zoneName = e.target.value
                  setFormData(prev => ({ 
                    ...prev, 
                    zone_name: zoneName,
                    zone_id: prev.zone_id || generateZoneId(zoneName)
                  }))
                }}
                placeholder="e.g., Front Desk, Kitchen"
                className="bg-white"
              />
            </div>
            
            <div>
              <Label>Zone ID</Label>
              <Input
                value={formData.zone_id}
                onChange={(e) => setFormData(prev => ({ ...prev, zone_id: e.target.value }))}
                placeholder="e.g., front-desk, kitchen"
                className="bg-white font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this zone..."
              className="bg-white"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Staff per Shift</Label>
              <Input
                type="number"
                min="0"
                max="20"
                value={formData.min_staff_per_shift}
                onChange={(e) => setFormData(prev => ({ ...prev, min_staff_per_shift: parseInt(e.target.value) || 0 }))}
                className="bg-white"
              />
            </div>
            
            <div>
              <Label>Max Staff per Shift</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={formData.max_staff_per_shift}
                onChange={(e) => setFormData(prev => ({ ...prev, max_staff_per_shift: parseInt(e.target.value) || 1 }))}
                className="bg-white"
              />
            </div>
          </div>

          {roles.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Required Roles</Label>
                <p className="text-xs text-gray-600 mb-2">Roles that must be present in this zone</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge
                      key={`req-${role.id}`}
                      variant={formData.required_roles.includes(role.role_name) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleRoleToggle(role.role_name, 'required')}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Preferred Roles</Label>
                <p className="text-xs text-gray-600 mb-2">Roles that are preferred but not required</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge
                      key={`pref-${role.id}`}
                      variant={formData.preferred_roles.includes(role.role_name) ? 'secondary' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleRoleToggle(role.role_name, 'preferred')}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => onSave(formData)}
              disabled={!formData.zone_name || loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isNew ? 'Add Zone' : 'Update Zone'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Manage Zones - {facility?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Zone Form */}
          {showAddForm && (
            <ZoneForm
              zone={newZone}
              onSave={handleAddZone}
              onCancel={() => setShowAddForm(false)}
              isNew={true}
            />
          )}

          {/* Add Zone Button */}
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full border-2 border-dashed border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Zone
            </Button>
          )}

          {/* Existing Zones */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Current Zones ({zones.length})
            </h3>

            {loading && zones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading zones...</div>
            ) : zones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No zones defined yet. Add your first zone above.
              </div>
            ) : (
              <div className="space-y-3">
                {zones.map((zone, index) => (
                  <div key={zone.id}>
                    {editingZone?.id === zone.id ? (
                      <ZoneForm
                        zone={editingZone}
                        onSave={(updatedZone) => handleUpdateZone(zone.id!, updatedZone)}
                        onCancel={() => setEditingZone(null)}
                      />
                    ) : (
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">{zone.zone_name}</h4>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {zone.zone_id}
                                </Badge>
                                <Badge 
                                  variant={zone.is_active ? "default" : "secondary"} 
                                  className="text-xs"
                                >
                                  {zone.is_active ? (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                  )}
                                  {zone.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              
                              {zone.description && (
                                <p className="text-sm text-gray-600 mb-3">{zone.description}</p>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Staff Range:</span>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Users className="h-3 w-3 text-blue-600" />
                                    <span className="font-medium">
                                      {zone.min_staff_per_shift} - {zone.max_staff_per_shift}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-600">Required Roles:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {zone.required_roles.length > 0 ? (
                                      zone.required_roles.map((role, idx) => (
                                        <Badge key={idx} variant="default" className="text-xs">
                                          <Target className="h-2 w-2 mr-1" />
                                          {role}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-gray-400">None</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-600">Preferred Roles:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {zone.preferred_roles.length > 0 ? (
                                      zone.preferred_roles.map((role, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          <Users className="h-2 w-2 mr-1" />
                                          {role}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-gray-400">None</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 ml-4">
                              {/* Reorder buttons */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReorderZone(zone.id!, 'up')}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReorderZone(zone.id!, 'down')}
                                  disabled={index === zones.length - 1}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {/* Edit/Delete buttons */}
                              <div className="flex gap-1 ml-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingZone(zone)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteZone(zone.id!, zone.zone_name)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}