import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

// This is a global event emitter for Firebase errors.
// It is used to propagate errors from the data layer to the UI layer.

type FirebaseErrorEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// We need to declare the `on` and `emit` methods with the correct types.
declare interface FirebaseErrorEmitter {
  on<U extends keyof FirebaseErrorEvents>(
    event: U,
    listener: FirebaseErrorEvents[U]
  ): this;
  emit<U extends keyof FirebaseErrorEvents>(
    event: U,
    ...args: Parameters<FirebaseErrorEvents[U]>
  ): boolean;
}

class FirebaseErrorEmitter extends EventEmitter {}

export const errorEmitter = new FirebaseErrorEmitter();
