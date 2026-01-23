
'use client';

import { Sidebar, SidebarNav, SidebarNavItem } from "@/components/ui/sidebar";
import { Home, Wallet, User, Gift, Trophy, LogOut, FileText, Shield, DollarSign, FileType, BarChart } from "lucide-react";
import { signOut } from "@/firebase/auth/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const AppSidebarNav = () => {
  return (
    <SidebarNav>
      <SidebarNavItem href="/lobby" icon={<Home />}>Lobby</SidebarNavItem>
      <SidebarNavItem href="/wallet" icon={<Wallet />}>Wallet</SidebarNavItem>
      <SidebarNavItem href="/tournaments" icon={<Trophy />}>Tournaments</SidebarNavItem>
      <SidebarNavItem href="/leaderboard" icon={<BarChart />}>Leaderboard</SidebarNavItem>
      <SidebarNavItem href="/profile" icon={<User />}>Profile</SidebarNavItem>
      <SidebarNavItem href="/referrals" icon={<Gift />}>Refer & Earn</SidebarNavItem>
    </SidebarNav>
  );
}

const AppSidebar = () => {
  return (
    <Sidebar>
      <div className="flex flex-col h-full">
        <div className="flex-grow">
          <AppSidebarNav />
        </div>
        <div className="p-4">
          <p className="text-sm text-center text-gray-500 mb-4">Enjoying the app? Share with your friends!</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full" asChild>
                <Link href="/terms-and-conditions"><FileText className="mr-2 h-4 w-4"/>Terms & Conditions</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/privacy-policy"><Shield className="mr-2 h-4 w-4"/>Privacy Policy</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/gst-policy"><DollarSign className="mr-2 h-4 w-4"/>GST Policy</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/refund-policy"><FileType className="mr-2 h-4 w-4"/>Refund Policy</Link>
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4"/> Sign Out
            </Button>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export { AppSidebar, AppSidebarNav };
