'use client';

import { UserProvider } from './auth/use-user';
import { FirebaseProvider } from './provider';
import { SettingsProvider } from '@/context/settings-provider';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider>
      <SettingsProvider>
        <UserProvider>
            {children}
        </UserProvider>
      </SettingsProvider>
    </FirebaseProvider>
  );
}
