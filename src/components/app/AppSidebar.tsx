'use client';

import { Sidebar, SidebarNav, SidebarNavItem } from "@/components/ui/sidebar";
import { Home, Wallet, User, Gift, Trophy, LogOut, Swords, BarChart, Settings, LifeBuoy } from "lucide-react";
import { signOut } from "@/firebase/auth/client";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { AppLogo } from '../icons/AppLogo';
import { useUser } from "@/firebase";

const AppSidebarNav = () => {
  const { isAdmin } = useUser();
  return (
    <SidebarNav className="flex-1 overflow-y-auto">
      <SidebarNavItem href="/dashboard" icon={<Home />}>Dashboard</SidebarNavItem>
      <SidebarNavItem href="/lobby" icon={<Swords />}>Play</SidebarNavItem>
      <SidebarNavItem href="/tournaments" icon={<Trophy />}>Tournaments</SidebarNavItem>
      <SidebarNavItem href="/leaderboard" icon={<BarChart />}>Leaderboard</SidebarNavItem>
      <SidebarNavItem href="/wallet" icon={<Wallet />}>Wallet</SidebarNavItem>
      <SidebarNavItem href="/profile" icon={<User />}>Profile</SidebarNavItem>
      <SidebarNavItem href="/referrals" icon={<Gift />}>Refer & Earn</SidebarNavItem>
      <SidebarNavItem href="/support" icon={<LifeBuoy />}>Support</SidebarNavItem>
      
      {isAdmin && (
        <div className="pt-4 mt-4 border-t">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
          <SidebarNavItem href="/admin/dashboard" icon={<Settings />}>Admin Panel</SidebarNavItem>
        </div>
      )}
    </SidebarNav>
  );
}

export const AppSidebar = () => {

    return (
        <Sidebar>
            <div className="flex flex-col h-full">
                 <div className="p-4 border-b flex justify-between items-center">
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
                        <AppLogo />
                        <span>Ludo League</span>
                    </Link>
                </div>
                <AppSidebarNav />
                <div className="mt-auto p-4 border-t space-y-2">
                    <div className="flex gap-2 text-xs">
                        <Link href="/terms-and-conditions" className="hover:underline text-muted-foreground">Terms</Link>
                        <Link href="/privacy-policy" className="hover:underline text-muted-foreground">Privacy</Link>
                        <Link href="/refund-policy" className="hover:underline text-muted-foreground">Refunds</Link>
                    </div>
                    <Button variant="outline" className="w-full justify-start" onClick={signOut}>
                        <LogOut className="h-5 w-5 mr-2"/>
                        Logout
                    </Button>
                </div>
            </div>
        </Sidebar>
    )
}
