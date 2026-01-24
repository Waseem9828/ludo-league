
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { FirebaseOptions } from 'firebase/app';

// Your web app's Firebase configuration
export const firebaseConfig: FirebaseOptions = {
    apiKey: "AIzaSyAHRqi6FiM0jjMIqX0j7Jwj91s0JLyAKak",
    authDomain: "studio-4431476254-c1156.firebaseapp.com",
    projectId: "studio-4431476254-c1156",
    storageBucket: "studio-4431476254-c1156.firebasestorage.app",
    messagingSenderId: "23513776021",
    appId: "1:23513776021:web:3e5b6870112641c0fac09c"
};

type FirebaseServices = {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    functions: Functions;
    storage: FirebaseStorage;
    messaging: Messaging | null;
};

// This function ensures we initialize Firebase only once
const getFirebaseServices = (): FirebaseServices => {
    // In a Next.js development environment, we use a global object to preserve state across hot reloads.
    // This prevents the Firebase SDK from being re-initialized on every change.
    if (process.env.NODE_ENV === 'development') {
        const globalWithFirebase = globalThis as typeof globalThis & {
            _firebaseServices?: FirebaseServices;
        };

        if (globalWithFirebase._firebaseServices) {
            return globalWithFirebase._firebaseServices;
        }
    }

    // Standard initialization for production or the first run in development
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const functions = getFunctions(app);
    const storage = getStorage(app);
    const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

    const services: FirebaseServices = { app, auth, db, functions, storage, messaging };

    // In development, we cache the services on the global object for subsequent hot reloads.
    if (process.env.NODE_ENV === 'development') {
        const globalWithFirebase = globalThis as typeof globalThis & {
            _firebaseServices?: FirebaseServices;
        };
        globalWithFirebase._firebaseServices = services;
    }

    return services;
};

// Get and export the singleton services
const { app, auth, db, functions, storage, messaging } = getFirebaseServices();

export { app, auth, db, functions, storage, messaging };
