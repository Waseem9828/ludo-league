
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

  const isAuthenticating = userLoading || settingsLoading;

  useEffect(() => {
    if (isAuthenticating) {
      return; // Wait until all data is loaded
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isLandingPage = pathname === '/';
    const isAdminPage = pathname.startsWith('/admin');
    const isMaintenancePage = pathname === '/maintenance';
    const isProtectedRoute = !isAuthPage && !isLandingPage && !isMaintenancePage;
    
    const maintenanceMode = settings?.maintenanceMode ?? false;

    // 1. Handle Maintenance Mode
    if (maintenanceMode) {
      if (!isAdmin && !isMaintenancePage) {
        router.replace('/maintenance');
        return;
      }
      if (isAdmin && isMaintenancePage) {
        router.replace('/admin/dashboard');
        return;
      }
      // If in maintenance mode and logic reaches here, it means user is an admin on a regular page, so we allow it.
    } else {
      // If maintenance is OFF, but user is on the maintenance page, redirect them.
      if (isMaintenancePage) {
        router.replace(user ? '/dashboard' : '/login');
        return;
      }
    }

    // 2. Handle Authentication
    if (!user) {
      // User is NOT logged in
      if (isProtectedRoute) {
        router.replace('/login');
      }
      // If not logged in and on a public page (auth, landing), do nothing.
    } else {
      // User IS logged in
      if (isAuthPage || isLandingPage) {
        router.replace(isAdmin ? '/admin/dashboard' : '/dashboard');
      } else if (isAdminPage && !isAdmin) {
        router.replace('/dashboard');
      }
      // If user is logged in and on a protected page they have access to, do nothing.
    }
  }, [isAuthenticating, user, isAdmin, settings, pathname, router]);

  return {
    isAuthenticating,
  };
};
