'use client';

import { UserProvider } from './auth/use-user';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider>
        <UserProvider>
            {children}
        </UserProvider>
    </FirebaseProvider>
  );
}
