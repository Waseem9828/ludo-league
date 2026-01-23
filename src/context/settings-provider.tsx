'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

type AppSettings = {
  maintenanceMode: boolean;
};

type SettingsContextType = {
  settings: AppSettings | null;
  loading: boolean;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      // It might be null on initial render if FirebaseProvider is not ready
      return;
    }

    const settingsRef = doc(firestore, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap: DocumentSnapshot) => {
        if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
        } else {
            // Set default values if the document doesn't exist
            setSettings({ maintenanceMode: false });
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching app settings:", error);
        // Fallback to default on error
        setSettings({ maintenanceMode: false });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
