// RoleManagementModal.tsx - TRANSLATED
'use client'

import { useState} from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  DollarSign,
  Shield,
  Save,
  X
} from 'lucide-react'
import { useFacilityRoles } from '@/hooks/useFacility'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'
import type { Facility } from '@/types/facility'

interface RoleManagementModalProps {
  open: boolean
  onClose: () => void
  facility: Facility | null
  onSuccess: () => void
}

interface Role {
  id?: string
  role_name: string
  min_skill_level: number
  max_skill_level: number
  is_management: boolean
  hourly_rate_min?: number
  hourly_rate_max?: number
  is_active: boolean
}

export function RoleManagementModal({ open, onClose, facility, onSuccess }: RoleManagementModalProps) {
  const { roles, loading, createRole, updateRole, deleteRole } = useFacilityRoles(facility?.id)
  const { t } = useTranslations()
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  const [newRole, setNewRole] = useState<Role>({
    role_name: '',
    min_skill_level: 1,
    max_skill_level: 3,
    is_management: false,
    hourly_rate_min: 15,
    hourly_rate_max: 25,
    is_active: true
  })

  const handleAddRole = async () => {
    if (!newRole.role_name) {
      toast.error(t('facilities.roleNameRequired'))
      return
    }

    try {
      await createRole(newRole)
      setShowAddForm(false)
      setNewRole({
        role_name: '',
        min_skill_level: 1,
        max_skill_level: 3,
        is_management: false,
        hourly_rate_min: 15,
        hourly_rate_max: 25,
        is_active: true
      })
      onSuccess()
    } catch {
      // Hook already shows error toast
    }
  }

  const handleUpdateRole = async (roleId: string, updatedRole: Role) => {
    try {
      await updateRole(roleId, updatedRole)
      setEditingRole(null)
      onSuccess()
    } catch  {
      // Hook already handles error toasts and logging
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(t('facilities.deleteRoleConfirm', { name: roleName }))) {
      return
    }

    try {
      await deleteRole(roleId, roleName)
      onSuccess()
    } catch {
      // Hook already handles error toasts and logging
    }
  }

  const renderSkillLevel = (level: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < level ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">{level}/5</span>
      </div>
    )
  }

  const RoleCard = ({ role }: { role: Role }) => {
    const isEditing = editingRole?.id === role.id
    const [formData, setFormData] = useState<Role>(role)

    const handleSave = () => {
      if (role.id) {
        handleUpdateRole(role.id, formData)
      }
    }

    const handleCancel = () => {
      setFormData(role)
      setEditingRole(null)
    }

    if (isEditing) {
      return (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {t('facilities.editRole')} {role.role_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('facilities.roleName')} *</Label>
              <Input
                value={formData.role_name}
                onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value }))}
                placeholder={t('facilities.roleName')}
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('facilities.minSkillLevel')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.min_skill_level}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    min_skill_level: parseInt(e.target.value) || 1 
                  }))}
                  className="bg-white"
                />
              </div>
              <div>
                <Label>{t('facilities.maxSkillLevel')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.max_skill_level}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    max_skill_level: parseInt(e.target.value) || 1 
                  }))}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('facilities.minHourlyRate')} ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.hourly_rate_min || 0}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    hourly_rate_min: parseFloat(e.target.value) || 0 
                  }))}
                  className="bg-white"
                />
              </div>
              <div>
                <Label>{t('facilities.maxHourlyRate')} ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={formData.hourly_rate_max || 0}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    hourly_rate_max: parseFloat(e.target.value) || 0 
                  }))}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_management}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    is_management: e.target.checked 
                  }))}
                  className="rounded"
                />
                <span className="text-sm">{t('facilities.isManagement')}</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    is_active: e.target.checked 
                  }))}
                  className="rounded"
                />
                <span className="text-sm">{t('facilities.isActive')}</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} className="gap-1">
                <Save className="h-3 w-3" />
                {t('common.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1">
                <X className="h-3 w-3" />
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                role.is_management ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {role.is_management ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <CardTitle className="text-base">{role.role_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {role.is_management && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {t('common.manager')}
                    </Badge>
                  )}
                  <Badge variant={role.is_active ? "default" : "secondary"} className="text-xs">
                    {role.is_active ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setEditingRole(role)}
                className="hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => role.id && handleDeleteRole(role.id, role.role_name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">{t('facilities.skillLevelRange')}</div>
            <div className="flex items-center gap-2">
              {renderSkillLevel(role.min_skill_level)}
              <span className="text-gray-400">-</span>
              {renderSkillLevel(role.max_skill_level)}
            </div>
          </div>

          {(role.hourly_rate_min || role.hourly_rate_max) && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">{t('facilities.hourlyRateRange')}</div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  ${role.hourly_rate_min || 0} - ${role.hourly_rate_max || 0}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const AddRoleForm = () => (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('facilities.addNewRole')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{t('facilities.roleName')} *</Label>
          <Input
            value={newRole.role_name}
            onChange={(e) => setNewRole(prev => ({ ...prev, role_name: e.target.value }))}
            placeholder={t('facilities.roleName')}
            className="bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('facilities.minSkillLevel')}</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={newRole.min_skill_level}
              onChange={(e) => setNewRole(prev => ({ 
                ...prev, 
                min_skill_level: parseInt(e.target.value) || 1 
              }))}
              className="bg-white"
            />
          </div>
          <div>
            <Label>{t('facilities.maxSkillLevel')}</Label>
            <Input
              type="number"
              min="1"
              max="5"
              value={newRole.max_skill_level}
              onChange={(e) => setNewRole(prev => ({ 
                ...prev, 
                max_skill_level: parseInt(e.target.value) || 1 
              }))}
              className="bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('facilities.minHourlyRate')} ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={newRole.hourly_rate_min || 0}
              onChange={(e) => setNewRole(prev => ({ 
                ...prev, 
                hourly_rate_min: parseFloat(e.target.value) || 0 
              }))}
              className="bg-white"
            />
          </div>
          <div>
            <Label>{t('facilities.maxHourlyRate')} ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={newRole.hourly_rate_max || 0}
              onChange={(e) => setNewRole(prev => ({ 
                ...prev, 
                hourly_rate_max: parseFloat(e.target.value) || 0 
              }))}
              className="bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newRole.is_management}
              onChange={(e) => setNewRole(prev => ({ 
                ...prev, 
                is_management: e.target.checked 
              }))}
              className="rounded"
            />
            <span className="text-sm">{t('facilities.isManagement')}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newRole.is_active}
              onChange={(e) => setNewRole(prev => ({ 
                ...prev, 
                is_active: e.target.checked 
              }))}
              className="rounded"
            />
            <span className="text-sm">{t('facilities.isActive')}</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleAddRole} className="gap-1">
            <Plus className="h-3 w-3" />
            {t('facilities.addRole')}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowAddForm(false)}
            className="gap-1"
          >
            <X className="h-3 w-3" />
            {t('common.cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('facilities.roleManagement')} - {facility?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t('common.manage')} {facility?.name} {t('facilities.roles').toLowerCase()}
            </div>
            <Button 
              onClick={() => setShowAddForm(true)} 
              className="gap-2"
              disabled={showAddForm}
            >
              <Plus className="w-4 h-4" />
              {t('facilities.addRole')}
            </Button>
          </div>

          {/* Add Role Form */}
          {showAddForm && <AddRoleForm />}

          {/* Roles List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">{t('common.loadingRoles') || 'Loading roles...'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && roles.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('facilities.noRolesYet') || 'No roles configured yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('facilities.addFirstRole') || 'Add your first role to get started'}
              </p>
              <Button onClick={() => setShowAddForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                {t('facilities.addRole')}
              </Button>
            </div>
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