'use client';

import AuthGuardRunner from '@/components/app/AuthGuardRunner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuardRunner>
      <div className="w-full flex items-center justify-center min-h-screen px-4 py-8 bg-background overflow-hidden bg-[url('/entry-fee-card-background.png')] bg-cover bg-center md:bg-none">
        <div className="hidden md:block absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:6rem_4rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_farthest-side_at_50%_100%,hsl(var(--primary)/0.1),transparent)]"></div>
        </div>
        <div className="relative z-10 w-full max-w-sm">
          {children}
          {/* This container is essential for Firebase phone auth reCAPTCHA */}
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </AuthGuardRunner>
  );
}
