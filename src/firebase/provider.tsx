
'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

function initializeFirebase(config: FirebaseOptions): { app: FirebaseApp; auth: Auth; firestore: Firestore; messaging: Messaging | null, storage: FirebaseStorage } {
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp(config);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  
  let messaging: Messaging | null = null;
  // Messaging is only available in the browser
  if (typeof window !== 'undefined') {
    try {
        messaging = getMessaging(app);
    } catch(e) {
        console.error("Could not initialize Firebase Messaging", e);
    }
  }

  return { app, auth, firestore, messaging, storage };
}

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
      {children}
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
