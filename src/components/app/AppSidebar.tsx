
'use client';

import { Sidebar, SidebarNav, SidebarNavItem } from "@/components/ui/sidebar";
import { Home, Wallet, User, Gift, Trophy, LogOut } from "lucide-react";
import { signOut } from "@/firebase/auth/client";
import { Button } from "@/components/ui/button";

const AppSidebarNav = () => {
  return (
    <SidebarNav>
      <SidebarNavItem href="/lobby" icon={<Home />}>Lobby</SidebarNavItem>
      <SidebarNavItem href="/wallet" icon={<Wallet />}>Wallet</SidebarNavItem>
      <SidebarNavItem href="/tournaments" icon={<Trophy />}>Tournaments</SidebarNavItem>
      <SidebarNavItem href="/profile" icon={<User />}>Profile</SidebarNavItem>
      <SidebarNavItem href="/referrals" icon={<Gift />}>Refer & Earn</SidebarNavItem>
    </SidebarNav>
  );
}

export const AppSidebar = () => {
    return (
        <Sidebar>
            <div className="flex flex-col h-full">
                <AppSidebarNav />
                <div className="mt-auto p-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                        <LogOut className="h-5 w-5 mr-2"/>
                        Logout
                    </Button>
                </div>
            </div>
        </Sidebar>
    )
}
