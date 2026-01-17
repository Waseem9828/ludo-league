'use client';

import { useState, useEffect } from 'react';
import { getAuth, onIdTokenChanged, type User, type Auth } from 'firebase/auth';
import { firebaseApp } from '@/firebase';

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    
    const unsubscribe = onIdTokenChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          setRole(idTokenResult.claims.role as string || null);
        } catch (error) {
          console.error("Error getting user role:", error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { role, loading };
}
