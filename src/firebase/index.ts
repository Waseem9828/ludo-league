
import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { firebaseConfig } from './config';
import { useUser } from './auth/use-user';
import { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, useMessaging, useStorage } from './provider';
import { FirebaseClientProvider } from './client-provider';


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

const { app, auth, firestore: db, messaging, storage } = initializeFirebase(firebaseConfig);

// export the useUser hook
export { useUser };
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, FirebaseClientProvider, useMessaging, useStorage };
export { initializeFirebase, auth, db, messaging, storage, app as firebaseApp };
