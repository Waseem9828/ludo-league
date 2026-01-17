
'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Messaging } from 'firebase/messaging';
import type { FirebaseStorage } from 'firebase/storage';

import { initializeFirebase } from './index';
import { firebaseConfig } from './config';
import { AuthProvider } from './auth-provider';

type FirebaseContextValue = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  messaging: Messaging | null;
  storage: FirebaseStorage;
} | null;

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

type FirebaseProviderProps = {
  children: ReactNode;
};

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const services = useMemo(() => {
    return initializeFirebase(firebaseConfig);
  }, []);

  return (
    <FirebaseContext.Provider value={services}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  if (context === null) {
      throw new Error('Firebase has not been initialized yet. Make sure you are using useFirebase within a component wrapped by FirebaseProvider.');
  }

  return context;
}

export function useFirebaseApp() {
  return useFirebase().app;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().firestore;
}

export function useMessaging() {
    return useFirebase().messaging;
}

export function useStorage() {
    return useFirebase().storage;
}
