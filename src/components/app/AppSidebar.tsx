
'use client';

import { Sidebar, SidebarNav, SidebarNavItem } from "@/components/ui/sidebar";
import { Home, Wallet, User, Gift, Trophy, LogOut, FileText, Shield, DollarSign, FileType } from "lucide-react";
import { signOut } from "@/firebase/auth/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

const LegalLinks = () => {
  return (
    <div className="p-4 border-t border-border/20 text-xs text-muted-foreground">
        <h4 className="font-semibold mb-2 text-foreground">Legal & Info</h4>
        <Link href="/terms-and-conditions" className="flex items-center gap-2 py-1.5 hover:text-primary transition-colors">
            <FileText size={14} /> Terms & Conditions
        </Link>
        <Link href="/privacy-policy" className="flex items-center gap-2 py-1.5 hover:text-primary transition-colors">
            <Shield size={14} /> Privacy Policy
        </Link>
        <Link href="/refund-policy" className="flex items-center gap-2 py-1.5 hover:text-primary transition-colors">
            <DollarSign size={14} /> Refund Policy
        </Link>
        <Link href="/gst-policy" className="flex items-center gap-2 py-1.5 hover:text-primary transition-colors">
            <FileType size={14} /> GST Policy
        </Link>
    </div>
  )
}

export const AppSidebar = () => {
    return (
        <Sidebar>
            <div className="flex flex-col h-full">
                <AppSidebarNav />
                <div className="mt-auto">
                    <LegalLinks />
                    <div className="p-2 border-t border-border/20">
                        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                            <LogOut className="h-5 w-5 mr-2"/>
                            Logout
                        </Button>
                    </div>
                </div>
            </div>
        </Sidebar>
    )
}
