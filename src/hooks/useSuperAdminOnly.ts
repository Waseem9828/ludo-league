
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export function useSuperAdminOnly() {
  const { role, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'superAdmin') {
      router.push('/admin/dashboard'); // Or any other appropriate page
    }
  }, [role, loading, router]);
}
