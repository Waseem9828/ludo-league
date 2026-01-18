
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

type AppSettings = {
  maintenanceMode: boolean;
};

export const useAuthGuard = () => {
  const { user, isAdmin, userProfile, loading } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isAdminPage = pathname?.startsWith('/admin') ?? false;
  const isMaintenancePage = pathname === '/maintenance';
  
  const isAuthenticating = loading || settingsLoading;
  
  useEffect(() => {
    if (!firestore) return;

    const settingsRef = doc(firestore, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap: DocumentSnapshot) => {
        if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
        } else {
            setSettings({ maintenanceMode: false });
        }
        setSettingsLoading(false);
    }, (error) => {
        console.error("Error fetching app settings:", error);
        setSettings({ maintenanceMode: false });
        setSettingsLoading(false);
    });

    return () => unsubscribe();

  }, [firestore]);
  
  useEffect(() => {
    if (isAuthenticating) {
      return; 
    }

    const maintenanceMode = settings?.maintenanceMode ?? false;
    
    if (maintenanceMode) {
        if (!isAdmin && !isMaintenancePage) {
            router.replace('/maintenance');
            return;
        }
        if (isAdmin && isMaintenancePage) {
            router.replace('/admin/dashboard');
            return;
        }
    } else {
        if (isMaintenancePage) {
            router.replace(isAdmin ? '/admin/dashboard' : '/dashboard');
            return;
        }
    }

    if (!user && !isAuthPage && !isMaintenancePage) {
      router.replace('/login');
      return;
    }

    if (user && isAuthPage) {
      router.replace(isAdmin ? '/admin/dashboard' : '/dashboard');
      return;
    }
    
    if (user && !isAdmin && isAdminPage) {
        router.replace('/dashboard');
        return;
    }

  }, [isAuthenticating, router, isAdmin, isAdminPage, isAuthPage, isMaintenancePage, settings, user]);


  return {
    isAuthenticating,
  };
};
