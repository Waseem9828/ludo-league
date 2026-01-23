
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useSettings } from '@/context/settings-provider';

export const useAuthGuard = () => {
  const { user, isAdmin, loading: userLoading } = useUser();
  const { settings, loading: settingsLoading } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isAdminPage = pathname?.startsWith('/admin') ?? false;
  const isMaintenancePage = pathname === '/maintenance';
  
  const isAuthenticating = userLoading || settingsLoading;
  
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
