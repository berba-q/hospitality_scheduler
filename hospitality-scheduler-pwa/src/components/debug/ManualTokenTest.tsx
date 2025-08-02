// Add this to your Firebase test page for manual testing
// src/components/test/ManualTokenTest.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useApi';

export function ManualTokenTest() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuth();

  const testWithCustomToken = async () => {
    if (!token.trim()) {
      setResult({ error: 'Please enter a token' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Test with different token formats
      const tests = [
        // Test 1: Original format
        { 
          name: 'Original Format', 
          body: { push_token: token.trim() } 
        },
        // Test 2: Simple string
        { 
          name: 'Simple String', 
          body: token.trim() 
        },
        // Test 3: Alternative field name
        { 
          name: 'Alternative Field', 
          body: { token: token.trim() } 
        }
      ];

      const results = [];

      for (const test of tests) {
        try {
          console.log(`Testing ${test.name}:`, test.body);
          
          const response = await fetch(`${backendUrl}/v1/notifications/push-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(test.body)
          });

          const responseText = await response.text();
          let responseData;
          
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          results.push({
            test: test.name,
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            data: responseData
          });

          if (response.ok) {
            break; // Stop on first success
          }

        } catch (error: any) {
          results.push({
            test: test.name,
            error: error.message
          });
        }
      }

      setResult(results);

    } catch (error: any) {
      setResult([{ error: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const generateTestToken = () => {
    // Generate a realistic-looking FCM token for testing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < 152; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(result);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🧪 Manual Push Token Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-token">Test Token</Label>
          <Textarea
            id="test-token"
            placeholder="Paste your FCM token here or generate a test one..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button 
              onClick={generateTestToken}
              variant="outline"
              size="sm"
            >
              Generate Test Token
            </Button>
            <Button 
              onClick={testWithCustomToken}
              disabled={loading || !token.trim()}
              size="sm"
            >
              {loading ? 'Testing...' : 'Test Token'}
            </Button>
          </div>
        </div>

        {token && (
          <div className="text-xs text-gray-600">
            <strong>Token Length:</strong> {token.length} characters
            <br />
            <strong>Preview:</strong> {token.substring(0, 50)}...
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}