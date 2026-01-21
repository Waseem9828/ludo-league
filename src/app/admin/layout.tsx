'use client';

import { Toaster } from '@/components/ui/toaster';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AppHeader from '@/components/AppHeader';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import CustomLoader from '@/components/CustomLoader';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { SidebarProvider, useSidebar, AdminSidebar } from '@/components/ui/sidebar';
import { useAdminOnly } from '@/hooks/useAdminOnly';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticating } = useAuthGuard();
  const { isAdmin, loading: adminLoading } = useAdminOnly();
  const { isOpen, setIsOpen } = useSidebar();

  const isLoading = isAuthenticating || adminLoading;

  if (isLoading) {
      return (
          <div className="h-screen w-full flex items-center justify-center">
              <CustomLoader />
          </div>
      );
  }

  if (!isAdmin) {
      return (
          <div className="h-screen w-full flex items-center justify-center">
              <p>You do not have permission to view this page.</p>
          </div>
      );
  }

  return (
    <div className='lg:grid lg:grid-cols-12 min-h-screen'>
        <div className="hidden lg:block lg:col-span-2">
           <AdminSidebar />
        </div>

        {/* Mobile sidebar */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent side="left" className="w-64 p-0">
                 <SheetHeader className="sr-only">
                    <SheetTitle>Admin Menu</SheetTitle>
                    <SheetDescription>
                        Main navigation menu for the admin panel.
                    </SheetDescription>
                </SheetHeader>
                <AdminSidebar inSheet={true} />
            </SheetContent>
        </Sheet>

        <main className='lg:col-span-10 px-4'>
            <AppHeader />
            <div className='py-4'>{children}</div>
            <Toaster />
            <FirebaseErrorListener />
        </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}
