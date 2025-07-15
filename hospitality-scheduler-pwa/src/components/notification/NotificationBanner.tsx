// Notifications component
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'

interface NotificationBannerProps {
  actionNeeded: any[]
  urgentExpiring: any[]
  showNotifications: boolean
  onDismiss: () => void
}

export function NotificationBanner({ 
  actionNeeded, 
  urgentExpiring, 
  showNotifications, 
  onDismiss 
}: NotificationBannerProps) {
  if (!showNotifications || (actionNeeded.length === 0 && urgentExpiring.length === 0)) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800">Action Required</h3>
              <div className="text-sm text-orange-700 space-y-1">
                {actionNeeded.length > 0 && (
                  <p>• {actionNeeded.length} swap request(s) waiting for your response</p>
                )}
                {urgentExpiring.length > 0 && (
                  <p>• {urgentExpiring.length} request(s) expiring within 24 hours</p>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}