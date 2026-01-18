'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { useAuth, useFirestore } from '../provider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { firebaseApp } from '@/firebase';


type UserContextValue = {
  user: User | null;
  userProfile: UserProfile | null; 
  isAdmin: boolean;
  loading: boolean;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const firestore = useFirestore();
  const [authLoading, setAuthLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
        if (user) {
            await user.getIdToken(true); // Force refresh of the token
            const tokenResult = await user.getIdTokenResult();
            const newIsAdmin = tokenResult.claims.admin === true;
            if (!isAdmin || user.uid !== user?.uid) {
                 setUser(user);
                 setIsAdmin(newIsAdmin);
            }
        } else {
            setUser(null);
            setIsAdmin(false);
        }
        setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && user && firestore) {
      const userProfileRef = doc(firestore, 'users', user.uid);
      
      const unsubscribeProfile = onSnapshot(userProfileRef, 
        (profileDoc) => {
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setUserProfile({ ...profileData });
             if (profileData.isAdmin !== isAdmin) {
                 setIsAdmin(profileData.isAdmin === true);
            }
          } else {
            setUserProfile(null);
            setIsAdmin(false);
          }
          setProfileLoading(false);
        },
        (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setIsAdmin(false);
          setProfileLoading(false);
        }
      );
      
      return () => unsubscribeProfile();

    } else if (!authLoading && !user) {
      // No user is authenticated.
      setUserProfile(null);
      setIsAdmin(false);
      setProfileLoading(false);
    }
  }, [user, authLoading, firestore]);

  const loading = authLoading || profileLoading;

  return (
    <UserContext.Provider value={{ user, userProfile, isAdmin, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
