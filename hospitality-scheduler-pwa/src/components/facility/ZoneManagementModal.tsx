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
import { useTranslations } from '@/hooks/useTranslations'
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
  const { roles, loading: rolesLoading } = useFacilityRoles(facility?.id)
  const { t } = useTranslations()
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
      toast.error(t('facilities.zoneNameRequired'))
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
    if (!confirm(t('facilities.deleteZoneConfirm', { name: zoneName }))) {
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

    const updateRoleSelection = (roleName: string, roleType: 'required' | 'preferred', isSelected: boolean) => {
      setFormData(prev => ({
        ...prev,
        [roleType === 'required' ? 'required_roles' : 'preferred_roles']: isSelected 
          ? [...prev[roleType === 'required' ? 'required_roles' : 'preferred_roles'], roleName]
          : prev[roleType === 'required' ? 'required_roles' : 'preferred_roles'].filter(r => r !== roleName)
      }))
    }

    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isNew ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {isNew ? t('facilities.addNewZone') : t('facilities.editZone') + ` ${zone.zone_name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('facilities.zoneName')} *</Label>
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
              <Label>{t('facilities.zoneId')}</Label>
              <Input
                value={formData.zone_id}
                onChange={(e) => setFormData(prev => ({ ...prev, zone_id: e.target.value }))}
                placeholder="e.g., front-desk, kitchen"
                className="bg-white font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label>{t('common.description')}</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('facilities.briefDescriptionThe')}
              className="bg-white"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('facilities.minStaffPerShift')}</Label>
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
              <Label>{t('facilities.maxStaffPerShift')}</Label>
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
                <Label className="text-sm font-medium">{t('facilities.requiredRoles')}</Label>
                <p className="text-xs text-gray-600 mb-2">{t('facilities.requiredRolesDesc')}</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge
                      key={`req-${role.id}`}
                      variant={formData.required_roles.includes(role.role_name) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => updateRoleSelection(role.role_name, 'required', !formData.required_roles.includes(role.role_name))}
                    >
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">{t('facilities.preferredRoles')}</Label>
                <p className="text-xs text-gray-600 mb-2">{t('facilities.preferredRolesDesc')}</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge
                      key={`pref-${role.id}`}
                      variant={formData.preferred_roles.includes(role.role_name) ? "secondary" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => updateRoleSelection(role.role_name, 'preferred', !formData.preferred_roles.includes(role.role_name))}
                    >
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="is_active" className="text-sm">{t('facilities.isActive')}</Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => onSave(formData)} className="gap-1">
              <Save className="h-3 w-3" />
              {t('common.save')}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} className="gap-1">
              <X className="h-3 w-3" />
              {t('common.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const ZoneCard = ({ zone }: { zone: Zone }) => {
    const isEditing = editingZone?.id === zone.id

    if (isEditing) {
      return (
        <ZoneForm
          zone={zone}
          onSave={(updatedZone) => zone.id && handleUpdateZone(zone.id, updatedZone)}
          onCancel={() => setEditingZone(null)}
        />
      )
    }

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">{zone.zone_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-mono text-gray-600">
                    {zone.zone_id}
                  </Badge>
                  <Badge variant={zone.is_active ? "default" : "secondary"} className="text-xs">
                    {zone.is_active ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => zone.id && handleReorderZone(zone.id, 'up')}
                className="hover:bg-gray-100"
                disabled={zone.display_order === 0}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => zone.id && handleReorderZone(zone.id, 'down')}
                className="hover:bg-gray-100"
                disabled={zone.display_order === zones.length - 1}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setEditingZone(zone)}
                className="hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => zone.id && handleDeleteZone(zone.id, zone.zone_name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {zone.description && (
            <p className="text-sm text-gray-600">{zone.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">{t('facilities.staffRange')}</div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-medium">
                  {zone.min_staff_per_shift} - {zone.max_staff_per_shift}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">{t('common.order')}</div>
              <div className="flex items-center gap-2 text-sm">
                <Grid className="w-4 h-4 text-purple-600" />
                <span className="text-purple-600 font-medium">#{zone.display_order + 1}</span>
              </div>
            </div>
          </div>

          {zone.required_roles.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">{t('facilities.requiredRoles')}</div>
              <div className="flex flex-wrap gap-1">
                {zone.required_roles.map((role, idx) => (
                  <Badge key={idx} variant="default" className="text-xs">
                    <Target className="w-3 h-3 mr-1" />
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {zone.preferred_roles.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">{t('facilities.preferredRoles')}</div>
              <div className="flex flex-wrap gap-1">
                {zone.preferred_roles.map((role, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const AddZoneForm = () => (
    <ZoneForm
      zone={newZone}
      onSave={(zoneData) => {
        setNewZone(zoneData)
        handleAddZone()
      }}
      onCancel={() => setShowAddForm(false)}
      isNew={true}
    />
  )

  const loading = zonesLoading || rolesLoading

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('facilities.zoneManagement')} - {facility?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t('common.manage')} {facility?.name} {t('facilities.zones').toLowerCase()}
            </div>
            <Button 
              onClick={() => setShowAddForm(true)} 
              className="gap-2"
              disabled={showAddForm}
            >
              <Plus className="w-4 h-4" />
              {t('facilities.addNewZone')}
            </Button>
          </div>

          {/* Add Zone Form */}
          {showAddForm && <AddZoneForm />}

          {/* Zones List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">{t('common.loadingZones') || 'Loading zones...'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {zones
                .sort((a, b) => a.display_order - b.display_order)
                .map((zone) => (
                  <ZoneCard key={zone.id} zone={zone} />
                ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && zones.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('facilities.noZonesYet') || 'No zones configured yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('facilities.addFirstZone') || 'Add your first zone to get started'}
              </p>
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                {t('facilities.addNewZone')}
              </Button>
            </div>
          )}

          {/* Zone Summary */}
          {zones.length > 0 && (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">{t('facilities.configurationSummary')}</div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-600">{zones.filter(z => z.is_active).length}</div>
                    <div className="text-gray-600">{t('facilities.activeZones')}</div>
                  </div>
                  <div>
                    <div className="font-medium text-green-600">
                      {zones.reduce((sum, z) => sum + z.min_staff_per_shift, 0)} - {zones.reduce((sum, z) => sum + z.max_staff_per_shift, 0)}
                    </div>
                    <div className="text-gray-600">{t('facilities.staffRange')}</div>
                  </div>
                  <div>
                    <div className="font-medium text-purple-600">
                      {zones.reduce((total, zone) => total + zone.required_roles.length, 0)}
                    </div>
                    <div className="text-gray-600">{t('facilities.requiredRoles')}</div>
                  </div>
                  <div>
                    <div className="font-medium text-orange-600">
                      {zones.reduce((total, zone) => total + zone.preferred_roles.length, 0)}
                    </div>
                    <div className="text-gray-600">{t('facilities.preferredRoles')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}