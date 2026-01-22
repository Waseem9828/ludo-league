'use client';

import { Toaster } from '@/components/ui/toaster';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AppHeader from '@/components/AppHeader';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import CustomLoader from '@/components/CustomLoader';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from "@/components/app/AppSidebar";
import { FcmInitializer } from "@/components/app/fcm-initializer";
import { usePathname } from 'next/navigation';
import { PromotionBanner } from '@/components/app/PromotionBanner';
import { BottomNav } from '@/components/app/bottom-nav';


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticating } = useAuthGuard();
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

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
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Main navigation menu for the application.
            </SheetDescription>
          </SheetHeader>
          <AppSidebar />
        </SheetContent>
      </Sheet>

      <main className='lg:col-span-10 bg-gradient-primary pb-16 md:pb-0'>
        <div className="p-4">
            <AppHeader />
        </div>
        <PromotionBanner />
        <div className='py-4 px-4 bg-background rounded-t-[3.5rem] min-h-[calc(100vh-88px)]'>{children}</div>
        <Toaster />
        <FirebaseErrorListener />
        <FcmInitializer />
      </main>
      <BottomNav />
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
