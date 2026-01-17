import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;

if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApp();
}

const firestore = getFirestore(app);

export function getFirebaseApp() {
  return { firestore };
}
