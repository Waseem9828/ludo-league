
import { getFunctions } from 'firebase/functions';
import { firebaseApp } from './index';

// Initialize Cloud Functions and get a reference to the service
export const functions = getFunctions(firebaseApp);
