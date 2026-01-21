
'use client';

import { Toaster } from '@/components/ui/toaster';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import AppHeader from '@/components/AppHeader';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import CustomLoader from '@/components/CustomLoader';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'; // Corrected import
import { AppSidebar } from "@/components/app/AppSidebar";
import { FcmInitializer } from "@/components/app/fcm-initializer";
import { usePathname } from 'next/navigation';
import { PromotionBanner } from '@/components/app/PromotionBanner';


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticating } = useAuthGuard();
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();

  const isAuthPage = pathname === '/signin' || pathname === '/signup';

  if (isAuthenticating) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <CustomLoader />
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className='lg:grid lg:grid-cols-12 min-h-screen'>
      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:col-span-2">
        <AppSidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <AppSidebar />
        </SheetContent>
      </Sheet>

      <main className='lg:col-span-10 px-4'>
        <AppHeader />
        <PromotionBanner />
        <div className='py-4'>{children}</div>
        <Toaster />
        <FirebaseErrorListener />
        <FcmInitializer />
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
        </SidebarProvider>
    )
}
