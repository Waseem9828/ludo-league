'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User, Auth } from 'firebase/auth';
import CustomLoader from '@/components/CustomLoader';
import { firebaseApp } from './index';

interface AuthContextType {
  user: User | null;
  auth: Auth | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, auth: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    const authInstance = getAuth(firebaseApp);
    setAuth(authInstance);
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <AuthContext.Provider value={{ user, auth, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return { user: context.user, loading: context.loading };
};

export const useAuthInstance = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthInstance must be used within an AuthProvider');
    }
    return context.auth;
};
