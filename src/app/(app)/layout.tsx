
      'use client';
      
      import { Toaster } from '@/components/ui/toaster';
      import { Sidebar, SidebarProvider, SidebarNav } from "@/components/ui/sidebar"
      import { Sheet, SheetContent } from "@/components/ui/sheet";
      import AppHeader from '@/components/AppHeader';
      import { useAuthGuard } from '@/hooks/useAuthGuard';
      import CustomLoader from '@/components/CustomLoader';
      import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
      import { BottomNav } from '@/components/app/bottom-nav';
      import { FcmInitializer } from '@/components/app/fcm-initializer';
      import { usePathname } from 'next/navigation';
      import { PromotionBanner } from '@/components/app/PromotionBanner';
      import { useSidebar } from '@/hooks/useSidebar';
      
      
      function AppLayoutContent({ children }: { children: React.ReactNode }) {
        const { isAuthenticating } = useAuthGuard();
        const pathname = usePathname();
        const { isOpen, setIsOpen } = useSidebar();
      
        // The dashboard has special negative margin styling, so it needs different padding rules.
        const useDefaultLayout = pathname !== '/dashboard';
      
        return (
          <>
            {isAuthenticating ? (
              <div className="h-screen w-full flex items-center justify-center">
                <CustomLoader />
              </div>
            ) : (
              <div className={useDefaultLayout ? 'lg:grid lg:grid-cols-12 min-h-screen' : ''}>
                <div className="hidden lg:block lg:col-span-2">
                  <Sidebar>
                    <SidebarNav />
                  </Sidebar>
                </div>
                {/* Mobile sidebar */}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetContent side="left" className="w-64 p-0">
                    <Sidebar>
                      <SidebarNav />
                    </Sidebar>
                  </SheetContent>
                </Sheet>
      
                <main className={useDefaultLayout ? 'lg:col-span-10 px-4' : 'w-full'}>
                  <AppHeader />
                  <PromotionBanner />
                  <div className={useDefaultLayout ? 'py-4' : ''}>{children}</div>
                  <Toaster />
                  <FirebaseErrorListener />
                  <FcmInitializer />
                </main>
      
                <div className="block lg:hidden">
                  <BottomNav />
                </div>
              </div>
            )}
          </>
        );
      }
      
      export default function AppLayout({ children }: { children: React.ReactNode }) {
        return (
          <SidebarProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
          </SidebarProvider>
        );
      }
      