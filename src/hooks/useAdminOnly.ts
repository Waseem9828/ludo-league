'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useToast } from './use-toast';

export const useAdminOnly = () => {
  const { isAdmin, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Wait for the user loading to be complete
    if (!loading) {
      // If user is not an admin, redirect them
      if (!isAdmin) {
        toast({
            title: 'Permission Denied',
            description: 'You must be an admin to access this page.',
            variant: 'destructive'
        });
        router.replace('/dashboard');
      }
    }
  }, [isAdmin, loading, router, toast]);

  // You can return the loading and isAdmin states if needed by the component
  return { loading, isAdmin };
};
