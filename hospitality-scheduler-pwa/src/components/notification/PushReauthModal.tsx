// hospitality-scheduler-pwa/src/components/notification/PushReauthModal.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Smartphone, 
  Monitor, 
  Tablet,
  Globe,
  RefreshCw
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useApiClient } from '@/hooks/useApi';
import { useTranslations } from '@/hooks/useTranslations'; // ADD: Translation hook
import { toast } from 'sonner';

interface DeviceReauth {
  id: string;
  device_name?: string;
  device_type: string;
  last_seen: string;
  push_failures: number;
  status: string;
}

interface PushReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  devicesNeedingReauth: DeviceReauth[];
  onDeviceReauthorized?: (deviceId: string) => void;
}

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="w-5 h-5" />;
    case 'tablet':
      return <Tablet className="w-5 h-5" />;
    case 'desktop':
      return <Monitor className="w-5 h-5" />;
    default:
      return <Globe className="w-5 h-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'needs_reauth':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'permission_denied':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const isSafari = () => {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export function PushReauthModal({ 
  isOpen, 
  onClose, 
  devicesNeedingReauth,
  onDeviceReauthorized 
}: PushReauthModalProps) {
  const [isReauthorizing, setIsReauthorizing] = useState(false);
  const [completedDevices, setCompletedDevices] = useState<Set<string>>(new Set());
  const { requestPermission, state } = usePushNotifications();
  const apiClient = useApiClient();
  const { t } = useTranslations(); // ADD: Use translations hook

  const handleReauthorize = async () => {
    if (!apiClient) {
      toast.error(t('notifications.pushReauthorization.apiNotAvailable'));
      return;
    }

    setIsReauthorizing(true);

    try {
      // Request permission and get new token
      const success = await requestPermission();
      
      if (success && state.token) {
        // Update all devices that need reauth
        const reauthorizationPromises = devicesNeedingReauth.map(async (device) => {
          try {
            await apiClient.updateTokenAfterReauth({
              device_id: device.id,
              success: true,
              new_token: state.token
            });
            
            setCompletedDevices(prev => new Set(prev).add(device.id));
            onDeviceReauthorized?.(device.id);
            
            return { deviceId: device.id, success: true };
          } catch (error) {
            console.error(`Failed to reauthorize device ${device.id}:`, error);
            return { deviceId: device.id, success: false };
          }
        });

        const results = await Promise.all(reauthorizationPromises);
        const successCount = results.filter(r => r.success).length;
        
        if (successCount > 0) {
          toast.success(t('notifications.pushReauthorization.reenabledSuccess', { count: successCount }));
          
          // Close modal after short delay if all devices succeeded
          if (successCount === devicesNeedingReauth.length) {
            setTimeout(() => {
              onClose();
              setCompletedDevices(new Set());
            }, 2000);
          }
        } else {
          toast.error(t('notifications.pushReauthorization.reenableFailed'));
        }
      } else {
        // Handle permission denial
        const denialPromises = devicesNeedingReauth.map(async (device) => {
          try {
            await apiClient.updateTokenAfterReauth({
              device_id: device.id,
              success: false,
              new_token: null
            });
          } catch (error) {
            console.error(`Failed to update device ${device.id} denial:`, error);
          }
        });

        await Promise.all(denialPromises);
        
        if (state.permission === 'denied') {
          toast.error(t('notifications.pushReauthorization.permissionBlocked'));
        } else {
          toast.error(t('notifications.pushReauthorization.enableFailed'));
        }
      }
    } catch (error) {
      console.error('Re-authorization failed:', error);
      toast.error(t('notifications.pushReauthorization.reenabledFailed'));
    } finally {
      setIsReauthorizing(false);
    }
  };

  const handleSkip = async () => {
    if (!apiClient) {
      onClose();
      return;
    }

    // Mark devices as permission denied
    try {
      const skipPromises = devicesNeedingReauth.map(device =>
        apiClient.updateTokenAfterReauth({
          device_id: device.id,
          success: false,
          new_token: null
        })
      );

      await Promise.all(skipPromises);
      toast.info(t('notifications.pushReauthorization.disabledForSession'));
    } catch (error) {
      console.error('Failed to update device status:', error);
    }

    onClose();
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('notifications.pushReauthorization.justNow');
    if (diffInHours < 24) return `${diffInHours}${t('notifications.pushReauthorization.hoursAgo')}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}${t('notifications.pushReauthorization.daysAgo')}`;
    
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            {t('notifications.pushReauthorization.title')}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {t('notifications.pushReauthorization.description')}
            {isSafari() && (
              <strong className="block mt-1 text-blue-600">
                {t('notifications.pushReauthorization.safariInstructions')}
              </strong>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Device List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              {t('notifications.pushReauthorization.devicesNeedingAttention')}
            </h4>
            
            {devicesNeedingReauth.map((device) => {
              const isCompleted = completedDevices.has(device.id);
              
              return (
                <Card key={device.id} className="border border-orange-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-orange-600">
                          {getDeviceIcon(device.device_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {device.device_name || `${device.device_type} Device`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('notifications.pushReauthorization.lastSeen')} {formatLastSeen(device.last_seen)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('notifications.pushReauthorization.fixed')}
                          </Badge>
                        ) : (
                          <Badge className={getStatusColor(device.status)}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {device.push_failures} {t('notifications.pushReauthorization.failures')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Safari-specific instructions */}
          {isSafari() && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">
                      {t('notifications.pushReauthorization.safariInstructionsTitle')}
                    </p>
                    <p className="text-blue-700 mt-1">
                      {t('notifications.pushReauthorization.safariDialogInfo')}
                    </p>
                    <p className="text-blue-700 text-xs mt-1 font-medium">
                      {t('notifications.pushReauthorization.allowButtonPrompt')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button 
              onClick={handleReauthorize}
              disabled={isReauthorizing}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isReauthorizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.working')}
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  {t('notifications.pushReauthorization.reEnableButton')}
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={isReauthorizing}
              className="flex-shrink-0"
            >
              {t('notifications.pushReauthorization.skipButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}