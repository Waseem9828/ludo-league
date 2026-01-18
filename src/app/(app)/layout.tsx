
'use client';

import { Toaster } from '@/components/ui/toaster';
import { Sidebar, SidebarProvider, SidebarSheet, SidebarNav } from "@/components/ui/sidebar"
import AppHeader from '@/components/AppHeader';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import CustomLoader from '@/components/CustomLoader';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { BottomNav } from '@/components/app/bottom-nav';
import { FcmInitializer } from '@/components/app/fcm-initializer';
import { usePathname } from 'next/navigation';
import { PromotionBanner } from '@/components/app/PromotionBanner';


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticating } = useAuthGuard();
  const pathname = usePathname();

  // The dashboard has special negative margin styling, so it needs different padding rules.
  const useDefaultLayout = pathname !== '/dashboard';

  if (isAuthenticating) {
    return <CustomLoader />;
  }
  
  return (
    <>
      <div className="bg-background font-sans overflow-x-hidden">
          <FcmInitializer />
          {process.env.NODE_ENV === 'development' && <FirebaseErrorListener/>}
          <aside className="hidden md:block fixed left-0 top-0 h-full w-64 z-50">
            <Sidebar />
          </aside>
          <SidebarSheet>
              <SidebarNav />
          </SidebarSheet>

          <div className="md:pl-64 flex flex-col h-screen">
            <PromotionBanner />
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 bg-gradient-primary px-6 text-primary-foreground shadow-sm w-full flex-shrink-0">
                <AppHeader/>
            </header>
            <main className={"flex-1 flex flex-col overflow-y-auto " + (useDefaultLayout ? "p-4 sm:p-6 md:pb-6 pb-24" : "pb-24")}>
                {children}
            </main>
            {/* Mobile Bottom Navigation */}
            <BottomNav />
            <Toaster />
        </div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
  )
}
