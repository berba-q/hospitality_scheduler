'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, CheckCircle, AlertCircle, RefreshCw, TestTube } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function FirebaseTestComponent() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Fix hydration issue by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    permission,
    token,
    isSupported,
    isLoading,
    error,
    hasPermission,
    needsPermission,
    isBlocked,
    requestPermission,
    refreshToken,
    sendTestNotification
  } = usePushNotifications();

  // Don't render until mounted on client
  if (!mounted) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Loading Firebase Test...
            </CardTitle>
            <CardDescription>
              Initializing push notification test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runFullTest = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting Firebase test...');
    
    // Test 1: Check support
    addTestResult(`📱 Browser support: ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
    if (!isSupported) return;
    
    // Test 2: Check permission
    addTestResult(`🔐 Permission status: ${permission || 'unknown'}`);
    
    // Test 3: Request permission if needed
    if (needsPermission) {
      addTestResult('📋 Requesting permission...');
      const success = await requestPermission();
      addTestResult(`📋 Permission result: ${success ? '✅ Granted' : '❌ Denied'}`);
      if (!success) return;
    }
    
    // Test 4: Check token
    if (token) {
      addTestResult(`🎟️ FCM Token: ✅ Generated (${token.substring(0, 20)}...)`);
    } else {
      addTestResult('🎟️ FCM Token: ❌ Not available');
      return;
    }
    
    // Test 5: Send test notification
    addTestResult('📨 Sending test notification...');
    try {
      await sendTestNotification();
      addTestResult('📨 Test notification: ✅ Sent (check if received)');
    } catch (error) {
      addTestResult('📨 Test notification: ❌ Failed to send');
      console.error('Test notification error:', error);
    }
    
    addTestResult('🎉 Test complete!');
  };

  const getPermissionBadge = () => {
    if (!isSupported) return <Badge variant="secondary">Not Supported</Badge>;
    if (hasPermission) return <Badge variant="default">✅ Enabled</Badge>;
    if (isBlocked) return <Badge variant="destructive">❌ Blocked</Badge>;
    return <Badge variant="secondary">Not Set</Badge>;
  };

  const getStatusIcon = () => {
    if (!isSupported) return <BellOff className="w-5 h-5 text-gray-400" />;
    if (hasPermission) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (isBlocked) return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <Bell className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              Firebase Push Notifications Test
            </div>
            {getPermissionBadge()}
          </CardTitle>
          <CardDescription>
            Test your Firebase push notification setup
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Status Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Browser Support</div>
              <div className="text-sm text-gray-600">
                {isSupported ? '✅ Supported' : '❌ Not supported'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Permission</div>
              <div className="text-sm text-gray-600">
                {permission || 'Unknown'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">FCM Token</div>
              <div className="text-sm text-gray-600">
                {token ? '✅ Generated' : '❌ Not available'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Service Worker</div>
              <div className="text-sm text-gray-600">
                {typeof window !== 'undefined' && 'serviceWorker' in navigator ? '✅ Available' : '❌ Not available'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={runFullTest}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {isLoading ? 'Testing...' : 'Run Full Test'}
            </Button>
            
            {needsPermission && (
              <Button 
                onClick={requestPermission}
                disabled={isLoading}
                variant="outline"
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            )}
            
            {hasPermission && (
              <>
                <Button 
                  onClick={refreshToken}
                  disabled={isLoading}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Token
                </Button>
                
                <Button 
                  onClick={sendTestNotification}
                  disabled={isLoading}
                  variant="outline"
                >
                  📨 Send Test
                </Button>
              </>
            )}
          </div>

          {/* Troubleshooting */}
          {isBlocked && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Notifications are blocked.</strong> To enable them:
                <br />
                1. Click the 🔒 lock icon in your address bar
                <br />
                2. Change notifications to &quot;Allow&quot;
                <br />
                3. Refresh this page
              </AlertDescription>
            </Alert>
          )}

          {/* Token Display (for debugging) */}
          {token && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                🔧 Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
                <div><strong>FCM Token:</strong></div>
                <div className="break-all mt-1 text-gray-600">{token}</div>
                <div className="mt-2"><strong>Permission:</strong> {permission}</div>
                <div><strong>Supported:</strong> {isSupported.toString()}</div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className="text-sm font-mono p-2 bg-gray-50 rounded"
                >
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. <strong>Run Full Test</strong> to check everything is working</p>
            <p>2. <strong>Enable Notifications</strong> when prompted by your browser</p>
            <p>3. <strong>Send Test</strong> to verify you receive notifications</p>
            <p>4. Check browser DevTools → Console for detailed logs</p>
            <p>5. If issues occur, check the Technical Details section</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}