'use client';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function AuthGuardRunner({ children }: { children: React.ReactNode }) {
  useAuthGuard();

  return <>{children}</>;
}
