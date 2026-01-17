
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * A client component that listens for Firestore permission errors
 * and throws them to be caught by the Next.js error overlay.
 * This is for development purposes only and should not be used in production
 * without a proper error boundary.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: Error) => {
      // In development, throwing the error will display the Next.js error overlay.
      // This provides a much better debugging experience than just logging to the console.
      if (process.env.NODE_ENV === 'development') {
        // We throw the error in a timeout to break out of the current render cycle
        // and ensure Next.js catches it as a runtime error.
        setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // In production, you might want to log this to a service like Sentry.
        console.error('Firestore Permission Error:', error);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}
