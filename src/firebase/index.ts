
import { app as firebaseApp, auth, db, messaging, storage, functions } from './config';
import { useUser } from './auth/use-user';
import { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, useMessaging, useFirebaseStorage, useFunctions } from './provider';
import { FirebaseClientProvider } from './client-provider';


// export the useUser hook
export { useUser };
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore, FirebaseClientProvider, useMessaging, useFirebaseStorage, useFunctions };
export { auth, db, messaging, storage, firebaseApp, functions };
