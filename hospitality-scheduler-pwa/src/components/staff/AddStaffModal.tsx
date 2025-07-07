'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Star, User, MapPin, Phone, Clock } from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { toast } from 'sonner'

interface AddStaffModalProps {
  open: boolean
  onClose: () => void
  facilities: any[]
  onSuccess: () => void
}

const COMMON_ROLES = [
  'Manager', 'Assistant Manager', 'Chef', 'Sous Chef', 'Line Cook',
  'Front Desk Agent', 'Concierge', 'Housekeeping', 'Maintenance',
  'Security', 'Waiter', 'Waitress', 'Bartender', 'Host/Hostess'
]

export function AddStaffModal({ open, onClose, facilities, onSuccess }: AddStaffModalProps) {
  const apiClient = useApiClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    skill_level: 3,
    phone: '',
    facility_id: '',
    weekly_hours_max: 40
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.role || !formData.facility_id) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      await apiClient.createStaff(formData)
      toast.success(`${formData.full_name} added successfully!`)
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        full_name: '',
        role: '',
        skill_level: 3,
        phone: '',
        facility_id: '',
        weekly_hours_max: 40
      })
    } catch (error) {
      toast.error('Failed to add staff member')
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            Add New Staff Member
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
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700' 
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
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
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </div>
              ) : (
                'Add Staff Member'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}