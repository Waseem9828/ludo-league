
'use client';

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  getAuth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { app } from '@/firebase/config';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import type { UserProfile, UserContextType } from '@/lib/types';

const auth = getAuth(app);

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !firestore) {
      setUserProfile(null);
      setIsAdmin(false);
      setRole(null);
      if (user) {
        setLoading(true);
      }
      return;
    }

    setLoading(true); 
    const userRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap: DocumentSnapshot) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserProfile(profile);
        setRole(profile.role || null); // Get role from Firestore profile

        try {
          const tokenResult = await user.getIdTokenResult(true); 
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (error) {
          console.error('Error fetching custom claims:', error);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setRole(null);
      }
      setLoading(false); 
    }, (error) => {
      console.error("Error listening to user profile:", error);
      setUserProfile(null);
      setIsAdmin(false);
      setRole(null);
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const value = useMemo(
    () => ({
      user,
      loading,
      userProfile,
      isAdmin,
      role,
    }),
    [user, loading, userProfile, isAdmin, role]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
