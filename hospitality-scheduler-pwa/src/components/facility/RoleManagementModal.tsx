// RoleManagementModal.tsx
'use client'

import { useState, useEffect } from 'react'
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
  AlertTriangle,
  CheckCircle,
  Save,
  X
} from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

interface RoleManagementModalProps {
  open: boolean
  onClose: () => void
  facility: any
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
  const apiClient = useApiClient()
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
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

  useEffect(() => {
    if (open && facility) {
      loadFacilityRoles()
    }
  }, [open, facility])

  const loadFacilityRoles = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getFacilityRoles(facility.id)
      setRoles(data)
    } catch (error) {
      console.error('Failed to load roles:', error)
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRole = async () => {
    if (!newRole.role_name) {
      toast.error('Role name is required')
      return
    }

    try {
      setLoading(true)
      await apiClient.createFacilityRole(facility.id, newRole)
      toast.success(`Role "${newRole.role_name}" created successfully`)
      await loadFacilityRoles()
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
    } catch (error: any) {
      console.error('Failed to create role:', error)
      toast.error(error.response?.data?.detail || 'Failed to create role')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (roleId: string, updatedRole: Role) => {
    try {
      setLoading(true)
      await apiClient.updateFacilityRole(facility.id, roleId, updatedRole)
      toast.success(`Role "${updatedRole.role_name}" updated successfully`)
      await loadFacilityRoles()
      setEditingRole(null)
      onSuccess()
    } catch (error: any) {
      console.error('Failed to update role:', error)
      toast.error(error.response?.data?.detail || 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return
    }

    try {
      setLoading(true)
      await apiClient.deleteFacilityRole(facility.id, roleId)
      toast.success(`Role "${roleName}" deleted successfully`)
      await loadFacilityRoles()
      onSuccess()
    } catch (error: any) {
      console.error('Failed to delete role:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete role')
    } finally {
      setLoading(false)
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
        <span className="text-xs ml-1">{level}/5</span>
      </div>
    )
  }

  const RoleForm = ({ role, onSave, onCancel, isNew = false }: {
    role: Role
    onSave: (role: Role) => void
    onCancel: () => void
    isNew?: boolean
  }) => {
    const [formData, setFormData] = useState<Role>(role)

    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isNew ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {isNew ? 'Add New Role' : `Edit ${role.role_name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Role Name *</Label>
              <Input
                value={formData.role_name}
                onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value }))}
                placeholder="e.g., Front Desk Agent"
                className="bg-white"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_management}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_management: e.target.checked }))}
                  className="rounded"
                />
                <Shield className="h-4 w-4" />
                <span className="text-sm">Management Role</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Skill Level</Label>
              <select
                value={formData.min_skill_level}
                onChange={(e) => setFormData(prev => ({ ...prev, min_skill_level: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md bg-white"
              >
                {[1, 2, 3, 4, 5].map(level => (
                  <option key={level} value={level}>{level} Star{level > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Max Skill Level</Label>
              <select
                value={formData.max_skill_level}
                onChange={(e) => setFormData(prev => ({ ...prev, max_skill_level: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md bg-white"
              >
                {[1, 2, 3, 4, 5].map(level => (
                  <option key={level} value={level}>{level} Star{level > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Hourly Rate ($)</Label>
              <Input
                type="number"
                step="0.50"
                value={formData.hourly_rate_min || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate_min: parseFloat(e.target.value) || undefined }))}
                placeholder="15.00"
                className="bg-white"
              />
            </div>
            
            <div>
              <Label>Max Hourly Rate ($)</Label>
              <Input
                type="number"
                step="0.50"
                value={formData.hourly_rate_max || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate_max: parseFloat(e.target.value) || undefined }))}
                placeholder="25.00"
                className="bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onSave(formData)}
              disabled={!formData.role_name || loading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isNew ? 'Add Role' : 'Update Role'}
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
            <Users className="h-5 w-5" />
            Manage Roles - {facility?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Role Form */}
          {showAddForm && (
            <RoleForm
              role={newRole}
              onSave={handleAddRole}
              onCancel={() => setShowAddForm(false)}
              isNew={true}
            />
          )}

          {/* Add Role Button */}
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full border-2 border-dashed border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Role
            </Button>
          )}

          {/* Existing Roles */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Roles ({roles.length})
            </h3>

            {loading && roles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No roles defined yet. Add your first role above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <div key={role.id}>
                    {editingRole?.id === role.id ? (
                      <RoleForm
                        role={editingRole}
                        onSave={(updatedRole) => handleUpdateRole(role.id!, updatedRole)}
                        onCancel={() => setEditingRole(null)}
                      />
                    ) : (
                      <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {role.is_management && <Shield className="h-4 w-4 text-blue-600" />}
                              {role.role_name}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingRole(role)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteRole(role.id!, role.role_name)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Skill Range</span>
                            <div className="flex items-center gap-2">
                              {renderSkillLevel(role.min_skill_level)}
                              <span className="text-xs text-gray-400">to</span>
                              {renderSkillLevel(role.max_skill_level)}
                            </div>
                          </div>
                          
                          {(role.hourly_rate_min || role.hourly_rate_max) && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Hourly Rate</span>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span className="text-sm font-medium">
                                  ${role.hourly_rate_min || 0} - ${role.hourly_rate_max || 0}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {role.is_management && (
                              <Badge variant="default" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Management
                              </Badge>
                            )}
                            <Badge 
                              variant={role.is_active ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              {role.is_active ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {role.is_active ? 'Active' : 'Inactive'}
                            </Badge>
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