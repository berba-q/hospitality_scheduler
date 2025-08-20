'use client'
// Staff table component to display and manage staff members

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Phone, MapPin, Star, Mail } from 'lucide-react'
import { EditStaffModal } from './EditStaffModal'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'

interface StaffTableProps {
  staff: any[]
  facilities: any[]
  onRefresh: () => void
}

export function StaffTable({ staff, facilities, onRefresh }: StaffTableProps) {
  const apiClient = useApiClient()
  const { t } = useTranslations()
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [deletingStaff, setDeletingStaff] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const getFacilityName = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId)
    return facility?.name || t('staff.unknownFacility')
  }

  const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'Manager': 'bg-purple-100 text-purple-800',
      'Chef': 'bg-orange-100 text-orange-800',
      'Sous Chef': 'bg-yellow-100 text-yellow-800',
      'Front Desk': 'bg-blue-100 text-blue-800',
      'Housekeeping': 'bg-green-100 text-green-800',
      'Security': 'bg-gray-100 text-gray-800',
      'Concierge': 'bg-indigo-100 text-indigo-800',
      'Waiter': 'bg-pink-100 text-pink-800',
      'Bartender': 'bg-red-100 text-red-800',
    }
    return roleColors[role] || 'bg-gray-100 text-gray-800'
  }

  const getSkillStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < level ? 
          'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ))
  }

  const handleDelete = async (action: string, options?: any) => {
    if (!deletingStaff) return

    setDeleteLoading(true)
    try {
      if (!apiClient) {
        throw new Error('API client is not initialized');
      }
      const result = await apiClient.deleteStaff(deletingStaff.id, {
        removal_type: action,
        ...options
      })

      // Show detailed success message based on what actually happened
      const successMessage = getSuccessMessage(action, result)
      toast.success(successMessage)
      
      onRefresh()
      setDeletingStaff(null)
    } catch (error: any) {
      console.error('Delete failed:', error)
      
      // Show more specific error messages
      if (error.message.includes('Cannot delete staff member due to existing assignments')) {
        toast.error(
          'Cannot remove staff member. They have active assignments that need to be handled first.',
          {
            description: 'Try using "Remove and Clear Schedule" option instead.'
          }
        )
      } else if (error.message.includes('foreign key constraint')) {
        toast.error(
          'Cannot remove staff member due to schedule dependencies.',
          {
            description: 'Please clear their assignments first or use cascade options.'
          }
        )
      } else {
        toast.error('Failed to remove staff member', {
          description: error.message || 'An unexpected error occurred.'
        })
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  const getSuccessMessage = (action: string, result: any) => {
    const name = deletingStaff?.full_name || 'Staff member'
    
    switch (action) {
      case 'deactivate':
        return `${name} has been deactivated successfully`
      case 'transfer_and_deactivate':
        return `${name} has been removed and ${result.reassigned_schedules_count} schedules cleared`
      case 'permanent':
        return `${name} has been permanently deleted`
      default:
        return `${name} has been removed successfully`
    }
  }

  if (staff.length === 0) {
    return null
  }


  return (
    <>
      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="text-left p-4 font-medium text-gray-700">{t('staff.staffMember')}</th>
              <th className="text-left p-4 font-medium text-gray-700">{t('staff.roleAndSkills')}</th>
              <th className="text-left p-4 font-medium text-gray-700">{t('staff.facility')}</th>
              <th className="text-left p-4 font-medium text-gray-700">{t('staff.contact')}</th>
              <th className="text-left p-4 font-medium text-gray-700">{t('staff.status')}</th>
              <th className="text-left p-4 font-medium text-gray-700">{t('staff.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr 
                key={member.id} 
                className="border-t border-gray-100 hover:bg-gray-50/50 transition-all duration-200 group"
              >
                {/* Staff Member */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                      <p className="text-sm text-gray-500">ID: {member.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>

                {/* Role & Skills */}
                <td className="p-4">
                  <div className="space-y-2">
                    <Badge className={`${getRoleBadgeColor(member.role)} border-0`}>
                      {member.role}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getSkillStars(member.skill_level || 1)}
                      <span className="text-xs text-gray-500 ml-1">
                        {t('staff.level')} {member.skill_level || 1}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Facility */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {getFacilityName(member.facility_id)}
                    </span>
                  </div>
                </td>

                {/* Contact */}
                <td className="p-4">
                  <div className="space-y-1">
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{member.phone}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="p-4">
                  <div className="space-y-1">
                    <Badge 
                      variant={member.is_active ? "default" : "secondary"}
                      className={member.is_active ? 
                        "bg-green-100 text-green-800 border-green-200" : 
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {member.is_active ? t('staff.active') : t('staff.inactive')}
                    </Badge>
                    <p className="text-xs text-gray-500">
                      {t('staff.maxHours', { hours: member.weekly_hours_max || 40 })}
                    </p>
                  </div>
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStaff(member)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingStaff(member)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingStaff && (
        <EditStaffModal
          open={!!editingStaff}
          onClose={() => setEditingStaff(null)}
          staff={editingStaff}
          facilities={facilities}
          onSuccess={() => {
            setEditingStaff(null)
            onRefresh()
          }}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deletingStaff}
        onClose={() => setDeletingStaff(null)}
        onConfirm={handleDelete}
        staffMember={deletingStaff}
        loading={deleteLoading}
      />
    </>
  )
}