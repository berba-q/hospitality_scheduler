'use client';

import { FirebaseTestComponent } from '@/components/debug/FirebaseTestComponent';

export default function FirebaseTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Firebase Push Notifications Test</h1>
        <p className="text-gray-600 mt-2">
          Test your Firebase setup before integrating with the main app
        </p>
      </div>
      
      <FirebaseTestComponent />
    </div>
  );
}