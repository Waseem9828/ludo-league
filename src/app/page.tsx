'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@/firebase';
import CustomLoader from '@/components/CustomLoader';

function RedirectingPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Render a loader while the initial auth check is happening
  return <CustomLoader />;
}

export default function LandingPage() {
    return (
        <RedirectingPage />
    )
}
