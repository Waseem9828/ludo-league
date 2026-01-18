
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
import { useRouter, usePathname } from 'next/navigation';

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
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  // Listen for user authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const tokenResult = await firebaseUser.getIdTokenResult();
        setIsAdmin(!!tokenResult.claims.admin);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Redirect non-admins from admin routes
  useEffect(() => {
    if (!loading && pathname && pathname.startsWith("/admin") && !isAdmin) {
      console.log("Redirecting: Not an admin.", {pathname, isAdmin});
      router.push("/dashboard");
    }
  }, [pathname, loading, router, isAdmin]);

  // Listen for user profile changes in Firestore
  useEffect(() => {
    if (user && firestore) {
      const userRef = doc(firestore, "users", user.uid);
      const unsubscribe = onSnapshot(
        userRef,
        (doc: DocumentSnapshot) => {
          if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
          } else {
            setUserProfile(null); 
          }
        },
        (error) => {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        }
      );
      return () => unsubscribe();
    } else {
      setUserProfile(null); // Clear profile if no user
    }
  }, [user, firestore]);

  // Check for KYC status and redirect if needed
  useEffect(() => {
    if (!loading && userProfile && pathname) {
      const { kycStatus } = userProfile;
      const isKycPending = kycStatus === 'pending';
      const onKycPage = pathname.startsWith("/kyc");
      
      if (!isKycPending && !onKycPage && !isAdmin) {
         // console.log("Redirect check: ", { kycStatus, onKycPage });
      }
    }
  }, [pathname, loading, userProfile, isAdmin]);
  

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
