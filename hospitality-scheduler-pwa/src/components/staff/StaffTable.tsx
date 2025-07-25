'use client'
// Staff table component to display and manage staff members

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Phone, MapPin, Star, Mail } from 'lucide-react'
import { EditStaffModal } from './EditStaffModal'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

interface StaffTableProps {
  staff: any[]
  facilities: any[]
  onRefresh: () => void
}

export function StaffTable({ staff, facilities, onRefresh }: StaffTableProps) {
  // DEBUG: Log each staff member's is_active value
  console.log('StaffTable received staff:', staff)
  staff.forEach((member: any) => {
    console.log(`${member.full_name}:`, {
      is_active: member.is_active,
      type: typeof member.is_active,
      raw_object: member
    })
  })

  const apiClient = useApiClient()
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [deletingStaff, setDeletingStaff] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const getFacilityName = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId)
    return facility?.name || 'Unknown'
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
        className={`w-3 h-3 ${i < level ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ))
  }

  const handleDelete = async () => {
    if (!deletingStaff) return

    setDeleteLoading(true)
    try {
      await apiClient.deleteStaff(deletingStaff.id)
      toast.success(`${deletingStaff.full_name} deleted successfully`)
      onRefresh()
      setDeletingStaff(null)
    } catch (error) {
      toast.error('Failed to delete staff member')
      console.error(error)
    } finally {
      setDeleteLoading(false)
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
              <th className="text-left p-4 font-medium text-gray-700">Staff Member</th>
              <th className="text-left p-4 font-medium text-gray-700">Role & Skills</th>
              <th className="text-left p-4 font-medium text-gray-700">Facility</th>
              <th className="text-left p-4 font-medium text-gray-700">Contact</th>
              <th className="text-left p-4 font-medium text-gray-700">Status</th>
              <th className="text-left p-4 font-medium text-gray-700">Actions</th>
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
                        Level {member.skill_level || 1}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Facility */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {getFacilityName(member.facility_id)}
                    </span>
                  </div>
                </td>

                {/* Contact */}
                <td className="p-4">
                  <div className="space-y-1">
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${member.email}`} className="hover:text-blue-600 transition-colors">
                          {member.email}
                        </a>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-3 h-3" />
                        {member.phone}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Max {member.weekly_hours_max || 40}h/week
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="p-4">
                  <div className="space-y-1">
                    <Badge variant={member.is_active === true ? 'default' : 'secondary'}>
                      {member.is_active === true ? 'Active' : 'Inactive'}
                    </Badge>
                    
                  </div>
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingStaff(member)}
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingStaff(member)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
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
      <EditStaffModal
        open={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        staff={editingStaff}
        facilities={facilities}
        onSuccess={() => {
          onRefresh()
          setEditingStaff(null)
        }}
      />

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