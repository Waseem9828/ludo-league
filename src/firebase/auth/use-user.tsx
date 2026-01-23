
"use client";

import { useEffect, useState, createContext, useContext, useMemo } from "react";
import {
  onAuthStateChanged,
  getAuth,
  User as FirebaseUser,
} from "firebase/auth";
import { firebaseConfig } from "@/firebase/config"; 
import { initializeApp, getApps } from "firebase/app";
import { useFirestore } from "@/firebase";
import { doc, onSnapshot, DocumentSnapshot } from "firebase/firestore";
import type { UserProfile, UserContextType } from "@/lib/types";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
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

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If a user is found, their profile listener might be active, so unsubscribe first.
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const tokenResult = await firebaseUser.getIdTokenResult();
        setIsAdmin(!!tokenResult.claims.admin);

        // Set up the new profile listener
        const userRef = doc(firestore, "users", firebaseUser.uid);
        profileUnsubscribe = onSnapshot(userRef, (docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false); // Auth state and profile state are now resolved.
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          setLoading(false);
        });

      } else {
        // User is logged out
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
  }, [firestore]);
  

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
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
