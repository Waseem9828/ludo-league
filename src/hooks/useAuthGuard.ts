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
  const isLandingPage = pathname === '/';
  
  const isAuthenticating = userLoading || settingsLoading;
  
  useEffect(() => {
    // Wait until all loading is complete before running any logic
    if (isAuthenticating) {
      return; 
    }

    const maintenanceMode = settings?.maintenanceMode ?? false;
    
    // --- Maintenance Mode Logic ---
    if (maintenanceMode) {
      // If in maintenance mode and user is not an admin, redirect to maintenance page
      if (!isAdmin && !isMaintenancePage) {
        router.replace('/maintenance');
        return;
      }
      // If admin is on maintenance page, redirect them to their dashboard
      if (isAdmin && isMaintenancePage) {
        router.replace('/admin/dashboard');
        return;
      }
    } else {
      // If maintenance mode is OFF and user is on the maintenance page, redirect away
      if (isMaintenancePage) {
        router.replace(user ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/login');
        return;
      }
    }

    // --- Standard Authentication Logic ---

    // If there is no user and we are on a protected page, redirect to login
    if (!user && !isAuthPage && !isLandingPage && !isMaintenancePage) {
      router.replace('/login');
      return;
    }
    
    // If there IS a user and we are on an auth page or the landing page, redirect to their dashboard
    if (user && (isAuthPage || isLandingPage)) {
      router.replace(isAdmin ? '/admin/dashboard' : '/dashboard');
      return;
    }
    
    // If a non-admin tries to access an admin page, redirect to the main dashboard
    if (user && !isAdmin && isAdminPage) {
        router.replace('/dashboard');
        return;
    }

  }, [isAuthenticating, user, isAdmin, settings, pathname, router, isAuthPage, isAdminPage, isMaintenancePage, isLandingPage]);


  return {
    isAuthenticating,
  };
};
