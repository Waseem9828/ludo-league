
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
  const [loading, setLoading] = useState(true); // The one and only loading state.
  const firestore = useFirestore();

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // First, if a profile listener is active from a previous user, clean it up.
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }

      setLoading(true); // Always start loading when auth state changes.

      if (firebaseUser) {
        setUser(firebaseUser);

        // As soon as we have a user, force a refresh of the ID token
        // to get the latest custom claims.
        try {
          const tokenResult = await firebaseUser.getIdTokenResult(true); // force refresh
          setIsAdmin(!!tokenResult.claims.admin);
          setRole(tokenResult.claims.role as string || null);
        } catch (error) {
          console.error('Error fetching custom claims:', error);
          setIsAdmin(false);
          setRole(null);
        }

        // Can't get profile without firestore.
        // This case is handled because the effect depends on `firestore`.
        // If firestore is null, we'll remain in a loading state until it's available and the effect re-runs.
        if (!firestore) return;

        const userRef = doc(firestore, 'users', firebaseUser.uid);
        profileUnsubscribe = onSnapshot(userRef, async (docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
          } else {
            // This can happen if the user doc isn't created yet after signup.
            setUserProfile(null);
          }
          // Only once we have the profile (or know it doesn't exist) are we done loading.
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setRole(null);
          setLoading(false);
        });

      } else {
        // No user is logged in.
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setRole(null);
        setLoading(false); // We are done loading, there's just no user.
      }
    });

    // Cleanup function for the auth listener.
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [firestore]); // This effect depends on firestore, so it will re-run if firestore becomes available.

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
