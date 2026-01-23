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
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Auth state is known, so we can stop initial loading
    });
    return () => unsubscribe();
  }, []);

  // Handle user profile and custom claims
  useEffect(() => {
    if (!user || !firestore) {
      // If there's no user or firestore isn't ready, clear profile data
      setUserProfile(null);
      setIsAdmin(false);
      // If user is null, loading is already false from the previous effect.
      // If user is not null but firestore is not ready, we should indicate loading.
      if (user) {
        setLoading(true);
      }
      return;
    }

    setLoading(true); // Start loading profile data
    const userRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap: DocumentSnapshot) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserProfile(profile);

        try {
          const tokenResult = await user.getIdTokenResult(true); // force refresh
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (error) {
          console.error('Error fetching custom claims:', error);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false); // Profile data loaded
    }, (error) => {
      console.error("Error listening to user profile:", error);
      setUserProfile(null);
      setIsAdmin(false);
      setLoading(false); // Error occurred, stop loading
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const value = useMemo(
    () => ({
      user,
      loading,
      userProfile,
      isAdmin,
    }),
    [user, loading, userProfile, isAdmin]
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
