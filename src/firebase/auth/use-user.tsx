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
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Every time auth state changes, we might need to tear down the old profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        if (!firestore) {
            // Firestore isn't ready yet. We will remain in a loading state.
            // The effect will re-run when firestore becomes available.
            return;
        }

        const userRef = doc(firestore, 'users', firebaseUser.uid);
        profileUnsubscribe = onSnapshot(userRef, async (docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);
            setRole(profile.role || null);

            try {
              const tokenResult = await firebaseUser.getIdTokenResult(true);
              setIsAdmin(!!tokenResult.claims.admin);
            } catch (error) {
              console.error('Error fetching custom claims:', error);
              setIsAdmin(false);
            }
          } else {
            // This can happen briefly during user creation
            setUserProfile(null);
            setIsAdmin(false);
            setRole(null);
          }
          setLoading(false); // Definitive state is known, set loading to false.
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          setRole(null);
          setLoading(false); // Definitive state (error) is known.
        });
      } else {
        // No user is logged in. This is a definitive state.
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setRole(null);
        setLoading(false); // Definitive state is known.
      }
    });

    // Cleanup function for the auth listener.
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [firestore]); // This effect depends on firestore.

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
