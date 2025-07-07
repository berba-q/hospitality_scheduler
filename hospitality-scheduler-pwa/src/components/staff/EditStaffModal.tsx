'use client'
// Edit staff modal component
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Star, User, MapPin, Phone, Clock, Save, Mail } from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

interface EditStaffModalProps {
  open: boolean
  onClose: () => void
  staff: any
  facilities: any[]
  onSuccess: () => void
}

const COMMON_ROLES = [
  'Manager', 'Assistant Manager', 'Chef', 'Sous Chef', 'Line Cook',
  'Front Desk Agent', 'Concierge', 'Housekeeping', 'Maintenance',
  'Security', 'Waiter', 'Waitress', 'Bartender', 'Host/Hostess'
]

export function EditStaffModal({ open, onClose, staff, facilities, onSuccess }: EditStaffModalProps) {
  const apiClient = useApiClient()
  const [loading, setLoading] = useState(false)
  const [originalData, setOriginalData] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    skill_level: 3,
    phone: '',
    facility_id: '',
    weekly_hours_max: 40,
    is_active: true
  })

  // Populate form when staff changes
  useEffect(() => {
    if (staff) {
      const data = {
        full_name: staff.full_name || '',
        email: staff.email || '',
        role: staff.role || '',
        skill_level: staff.skill_level || 3,
        phone: staff.phone || '',
        facility_id: staff.facility_id || '',
        weekly_hours_max: staff.weekly_hours_max || 40,
        is_active: staff.is_active !== false
      }
      setFormData(data)
      setOriginalData(data) // Store original data for comparison
    }
  }, [staff])

  // Check if form has been modified
  const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.role || !formData.facility_id) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    setLoading(true)
    try {
      // Check for duplicates if name or facility changed
      if (formData.full_name !== originalData.full_name || formData.facility_id !== originalData.facility_id) {
        const duplicateCheck = await apiClient.checkStaffExists(formData.full_name, formData.facility_id)
        if (duplicateCheck.exists) {
          toast.error(`A staff member named "${formData.full_name}" already exists at this facility`)
          setLoading(false)
          return
        }
      }

      // Update staff via API
      await apiClient.updateStaff(staff.id, formData)
      toast.success(`${formData.full_name} updated successfully!`)
      onSuccess()
      onClose()
    } catch (error: any) {
      if (error.message.includes('409') || error.message.includes('already exists')) {
        toast.error('A staff member with this name already exists')
      } else {
        toast.error('Failed to update staff member')
      }
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = (role: string) => {
    setFormData(prev => ({ ...prev, role }))
  }

  const renderSkillLevel = () => (
    <div className="space-y-3">
      <Label>Skill Level</Label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, skill_level: level }))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Star 
              className={`w-6 h-6 ${
                level <= formData.skill_level 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          Level {formData.skill_level} - {
            formData.skill_level === 1 ? 'Beginner' :
            formData.skill_level === 2 ? 'Basic' :
            formData.skill_level === 3 ? 'Intermediate' :
            formData.skill_level === 4 ? 'Advanced' : 'Expert'
          }
        </span>
      </div>
    </div>
  )

  if (!staff) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            Edit {staff.full_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john.doe@company.com"
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
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
            </div>
          </div>

          {/* Role Selection */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Role & Skills</h3>
            
            <div className="space-y-3">
              <Label>Role *</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ROLES.map((role) => (
                  <Badge
                    key={role}
                    variant={formData.role === role ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all duration-200 ${
                      formData.role === role 
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
              
              {/* Custom Role Input */}
              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Or enter custom role..."
                  className="bg-white"
                />
              </div>
            </div>

            {renderSkillLevel()}
          </div>

          {/* Work Details */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Work Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facility_id">Facility *</Label>
                <select
                  id="facility_id"
                  value={formData.facility_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, facility_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
                  required
                >
                  <option value="">Select a facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly_hours_max">Max Weekly Hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="weekly_hours_max"
                    type="number"
                    min="1"
                    max="80"
                    value={formData.weekly_hours_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekly_hours_max: parseInt(e.target.value) }))}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <Label htmlFor="is_active">Active staff member</Label>
            </div>
          </div>

          {/* Change indicator */}
          {hasChanges && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">You have unsaved changes</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className={`flex-1 transition-all duration-200 ${
                hasChanges 
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {hasChanges ? 'Save Changes' : 'No Changes'}
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}