'use client';

import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarNav,
  SidebarSheet,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/app/user-nav';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import CustomLoader from '@/components/CustomLoader';
import { useRole } from '@/hooks/useRole'; 
import { UniversalSearch } from '@/components/admin/search';
import { AppLogo } from '@/components/icons/AppLogo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading: adminLoading, isAdmin } = useAdminOnly();
  const { role, loading: roleLoading } = useRole(); 

  const loading = adminLoading || roleLoading;

  if (loading) {
    return <CustomLoader />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen md:flex bg-muted/30">
        <aside className="hidden md:block md:w-64 border-r border-border">
          <Sidebar />
        </aside>

        <SidebarSheet>
          <SidebarNav inSheet={true} />
        </SidebarSheet>

        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16">
            <SidebarTrigger className="md:hidden" />

            <div className="flex-1">
              <UniversalSearch />
            </div>
            <UserNav />
          </header>
          <main className="p-4 sm:p-6 md:p-8 flex-1 overflow-y-auto">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
