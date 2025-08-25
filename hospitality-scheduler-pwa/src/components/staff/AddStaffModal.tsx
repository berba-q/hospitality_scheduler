'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Star, User, MapPin, Phone, Clock, Mail } from 'lucide-react'
import { useApiClient } from '@/hooks/useApi'
import { useTranslations } from '@/hooks/useTranslations'
import { toast } from 'sonner'

interface AddStaffModalProps {
  open: boolean
  onClose: () => void
  facilities: any[]
  onSuccess: (newStaff?: { id: string; full_name: string; email?: string; facility_name?: string }) => void
}

const COMMON_ROLES = [
  'Manager', 'Assistant Manager', 'Chef', 'Sous Chef', 'Line Cook',
  'Front Desk Agent', 'Concierge', 'Housekeeping', 'Maintenance',
  'Security', 'Waiter', 'Waitress', 'Bartender', 'Host/Hostess'
]

export function AddStaffModal({ open, onClose, facilities, onSuccess }: AddStaffModalProps) {
  const apiClient = useApiClient()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    skill_level: 3,
    phone: '',
    facility_id: '',
    weekly_hours_max: 40
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.role || !formData.facility_id) {
      toast.error(t('staff.fillRequiredFields'))
      return
    }

    setLoading(true)
    
    try {
      // Check for duplicate staff member
      const duplicateCheck = await apiClient.checkStaffExists(formData.full_name, formData.facility_id)
      if (duplicateCheck.exists) {
        toast.error(t('staff.staffNameExistsAtFacility', { name: formData.full_name }))
        return
      }
      const newStaff = await apiClient.createStaff(formData)
      toast.success(t('staff.staffAddedSuccessfully', { name: formData.full_name }))
      // Pass the newly created staff data back
      const staffForInvitation = newStaff.email ? {
        id: newStaff.id,
        full_name: newStaff.full_name,
        email: newStaff.email,
        facility_name: facilities.find(f => f.id === formData.facility_id)?.name || 'Unknown'
      } : undefined
      
      onSuccess(staffForInvitation)
      onClose()
      
      // Reset form
      setFormData({
        full_name: '',
        email: '',
        role: '',
        skill_level: 3,
        phone: '',
        facility_id: '',
        weekly_hours_max: 40
      })
    } catch (error: any) {
      if (error.message.includes('409') || error.message.includes('duplicate')) {
        toast.error(t('staff.staffWithInfoAlreadyExists'))
      } else {
        toast.error(t('staff.failedAddStaff'))
      }
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = (role: string) => {
    setFormData(prev => ({ ...prev, role }))
  }

  const getSkillLevelName = (level: number) => {
    const skillLevels = {
      1: t('staff.skillBeginner'),
      2: t('staff.skillBasic'),
      3: t('staff.skillIntermediate'),
      4: t('staff.skillAdvanced'),
      5: t('staff.skillExpert')
    }
    return skillLevels[level as keyof typeof skillLevels] || t('staff.skillIntermediate')
  }

  const renderSkillLevel = () => (
    <div className="space-y-3">
      <Label>{t('staff.skillLevel')}</Label>
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
          {t('staff.levelNumber', { level: formData.skill_level })} - {getSkillLevelName(formData.skill_level)}
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
            {t('staff.addNewStaffMember')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('staff.basicInformation')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('staff.fullName')} *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder={t('staff.fullNamePlaceholder')}
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('staff.emailAddress')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('staff.emailPlaceholder')}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('staff.phoneNumber')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={t('staff.phonePlaceholder')}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">{t('staff.roleAndSkills')}</h3>
            
            <div className="space-y-3">
              <Label>{t('staff.role')} *</Label>
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
                  placeholder={t('staff.customRolePlaceholder')}
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
              {t('staff.workDetails')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facility_id">{t('staff.facility')} *</Label>
                <select
                  id="facility_id"
                  value={formData.facility_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, facility_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  required
                >
                  <option value="">{t('staff.selectFacility')}</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly_hours_max">{t('staff.maxWeeklyHours')}</Label>
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
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('staff.adding')}
                </div>
              ) : (
                t('staff.addStaffMember')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}