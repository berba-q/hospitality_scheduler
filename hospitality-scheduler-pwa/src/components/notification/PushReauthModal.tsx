// hospitality-scheduler-pwa/src/components/notification/PushReauthModal.tsx

import React, { useState, useEffect } from 'react';
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
  X, 
  Smartphone, 
  Monitor, 
  Tablet,
  Globe,
  RefreshCw
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useApiClient } from '@/hooks/useApiClient';
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

  const handleReauthorize = async () => {
    if (!apiClient) {
      toast.error('API client not available');
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
          toast.success(`🔔 Notifications re-enabled for ${successCount} device(s)!`);
          
          // Close modal after short delay if all devices succeeded
          if (successCount === devicesNeedingReauth.length) {
            setTimeout(() => {
              onClose();
              setCompletedDevices(new Set());
            }, 2000);
          }
        } else {
          toast.error('Failed to re-enable notifications. Please try again.');
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
          toast.error('Notifications blocked. Please enable them in your browser settings.');
        } else {
          toast.error('Failed to enable notifications. Please try again.');
        }
      }
    } catch (error) {
      console.error('Re-authorization failed:', error);
      toast.error('Failed to re-enable notifications. Please try again.');
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
      toast.info('Push notifications disabled for this session');
    } catch (error) {
      console.error('Failed to update device status:', error);
    }

    onClose();
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
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
            🔔 Push Notifications Need Re-enabling
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            We're having trouble sending you notifications. 
            {isSafari() && (
              <strong className="block mt-1 text-blue-600">
                Safari users: Make sure to allow notifications when the browser prompts you.
              </strong>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Device List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Devices needing attention:</h4>
            
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
                            Last seen: {formatLastSeen(device.last_seen)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Fixed
                          </Badge>
                        ) : (
                          <Badge className={getStatusColor(device.status)}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {device.push_failures} failures
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
                    <p className="font-medium text-blue-800">Safari Instructions:</p>
                    <p className="text-blue-700 mt-1">
                      When you click "Re-enable Notifications", Safari will show a permission dialog. 
                      Make sure to click "Allow" to receive notifications.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleReauthorize}
              disabled={isReauthorizing}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isReauthorizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Re-enabling...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Re-enable Notifications
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isReauthorizing}
              className="px-4"
            >
              <X className="w-4 h-4 mr-2" />
              Skip
            </Button>
          </div>

          {/* Progress indicator */}
          {isReauthorizing && (
            <div className="text-center text-sm text-gray-600">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Setting up notifications...
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}