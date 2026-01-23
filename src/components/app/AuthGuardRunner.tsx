'use client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import CustomLoader from '@/components/CustomLoader';

export default function AuthGuardRunner({ children }: { children: React.ReactNode }) {
  const { isAuthenticating } = useAuthGuard();

  if (isAuthenticating) {
    return <CustomLoader />;
  }

  return <>{children}</>;
}
