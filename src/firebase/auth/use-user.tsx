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
import { app } from '@/firebase/config'; // Use the exported app instance
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import type { UserProfile, UserContextType } from '@/lib/types';

const auth = getAuth(app);

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // Single, comprehensive loading state
  const firestore = useFirestore();

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // If a user profile listener is active, unsubscribe from it first
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      setLoading(true); // Set loading to true whenever auth state changes

      if (firebaseUser) {
        // User is logged in.
        setUser(firebaseUser);

        if (!firestore) {
          // Firestore might not be ready yet. We will remain in a loading state.
          return;
        }

        const userRef = doc(firestore, 'users', firebaseUser.uid);
        profileUnsubscribe = onSnapshot(
          userRef,
          async (docSnap: DocumentSnapshot) => {
            if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);

              // Check for admin status from custom claims for security
              try {
                const tokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh token
                setIsAdmin(!!tokenResult.claims.admin);
              } catch (error) {
                console.error(
                  'Error fetching token result for admin check:',
                  error
                );
                setIsAdmin(false);
              }
            } else {
              // This case might happen briefly if the user document hasn't been created yet.
              setUserProfile(null);
              setIsAdmin(false);
            }
            setLoading(false); // Auth state and profile state are now resolved.
          },
          (error) => {
            console.error('Error fetching user profile:', error);
            setUserProfile(null);
            setIsAdmin(false);
            setLoading(false);
          }
        );
      } else {
        // User is logged out. Clear all user state.
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false); // Auth state is resolved (no user).
      }
    });

    // Cleanup function for the auth listener
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [firestore]); // Dependency on firestore to re-run if it becomes available.

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
