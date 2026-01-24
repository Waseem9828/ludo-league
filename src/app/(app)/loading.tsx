'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex items-center space-x-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div>
            <h1 className="text-2xl font-semibold text-foreground">Loading your experience</h1>
            <p className="text-muted-foreground">Authenticating and preparing your dashboard{dots}</p>
        </div>
      </div>
    </div>
  );
}
