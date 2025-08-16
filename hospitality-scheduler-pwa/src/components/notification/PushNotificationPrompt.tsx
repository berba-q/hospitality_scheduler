'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X, Smartphone } from 'lucide-react';
import { usePushNotificationContext } from '@/components/providers/PushNotificationProvider';
import { useTranslations } from '@/hooks/useTranslations';

export function PushNotificationPrompt() {
  const { t } = useTranslations();
  const { 
    showPermissionPrompt, 
    requestPermission, 
    dismissPrompt,
    isSupported 
  } = usePushNotificationContext();
  
  const [isRequesting, setIsRequesting] = useState(false);

  if (!showPermissionPrompt || !isSupported) {
    return null;
  }

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm">
                {t('notifications.stayUpdated')}
              </h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {t('notifications.getNotifiedAbout')}
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleEnable}
                  disabled={isRequesting}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Smartphone className="w-3 h-3 mr-1" />
                  {isRequesting ? t('notifications.enabling') : t('common.enable')}
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={dismissPrompt}
                  className="h-7 text-xs text-gray-600 hover:text-gray-800"
                >
                  {t('notifications.maybeLater')}
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="flex-shrink-0 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}