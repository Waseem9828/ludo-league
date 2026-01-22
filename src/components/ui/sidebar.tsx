'use client';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import type { AdminNavItem, NavItem } from "@/lib/types";
import {
    ChevronDown,
    LayoutDashboard,
    Users,
    ShieldCheck,
    ArrowDownToDot,
    FileImage,
    Settings,
    MessageSquare,
    Trophy,
    Swords,
    BarChart3,
    Newspaper,
    UserPlus,
    CreditCard,
    Shield,
    FileText,
    Percent,
    Gift,
    ArrowUpFromDot,
    Megaphone,
    ClipboardCheck
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants, Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { useState, useMemo, useCallback, createContext, useContext, useEffect } from "react";
import { AppLogo } from "@/components/icons/AppLogo";
import React from 'react';

interface SidebarContextType {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </SidebarContext.Provider>
    );
};

interface NavItemProps {
    item: NavItem | AdminNavItem;
    isCollapsed: boolean;
}

const adminNavItems: AdminNavItem[] = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/admin/dashboard",
        role: ["superAdmin", "depositAdmin", "withdrawalAdmin", "kycAdmin", "matchAdmin"],
    },
    {
        title: "Users",
        icon: Users,
        href: "/admin/users",
        role: ["superAdmin", "depositAdmin", "withdrawalAdmin", "kycAdmin"],
    },
    {
        title: "Requests",
        icon: ShieldCheck,
        href:"#",
        role: ["superAdmin", "kycAdmin", "depositAdmin", "withdrawalAdmin"],
        children: [
            {
                title: "KYC Requests",
                icon: ShieldCheck,
                href: "/admin/kyc-requests",
                role: ["superAdmin", "kycAdmin"],
            },
            {
                title: "Deposits",
                icon: ArrowDownToDot,
                href: "/admin/deposits",
                role: ["superAdmin", "depositAdmin"],
            },
            {
                title: "Withdrawals",
                icon: ArrowUpFromDot,
                href: "/admin/withdrawals",
                role: ["superAdmin", "withdrawalAdmin"],
            },
        ],
    },
    {
        title: "Content",
        icon: FileImage,
        href:"#",
        role: ["superAdmin"],
        children: [
            {
                title: "Banners",
                href: "/admin/banners",
                icon: FileImage,
                role: ["superAdmin"],
            },
            {
                title: "Dashboard Cards",
                href: "/admin/dashboard-cards",
                icon: FileImage,
                role: ["superAdmin"],
            },
            {
                title: "News",
                href: "/admin/news-management",
                icon: Newspaper,
                role: ["superAdmin"],
            },
            {
                title: "Announcements",
                href: "/admin/announcements",
                icon: Megaphone,
                role: ["superAdmin"],
            },
        ]
    },
    {
        title: "Game Management",
        icon: Trophy,
        href:"#",
        role: ["superAdmin", "matchAdmin"],
        children: [
            {
                title: "Matches",
                icon: Swords,
                href: "/admin/matches",
                role: ["superAdmin", "matchAdmin"],
            },
            {
                title: "Tournaments",
                icon: Trophy,
                href: "/admin/tournaments",
                role: ["superAdmin", "matchAdmin"],
            },
        ],
    },
    {
        title: "Reports",
        icon: BarChart3,
        href: "/admin/reports",
        role: ["superAdmin"],
    },
    {
        title: "Support",
        icon: MessageSquare,
        href: "/admin/support",
        role: ["superAdmin"],
    },
    {
        title: "Promotions",
        icon: Percent,
        href:"#",
        role: ["superAdmin"],
        children: [
            {
                title: "Referral",
                icon: UserPlus,
                href: "/admin/referral-settings",
                role: ["superAdmin"],
            },
            {
                title: "Bonus",
                icon: Gift,
                href: "/admin/bonus-settings",
                role: ["superAdmin"],
            },
            {
                title: "Tasks",
                icon: ClipboardCheck,
                href: "/admin/tasks",
                role: ["superAdmin"],
            },
        ]
    },
    {
        title: "Configuration",
        icon: Settings,
        href:"#",
        role: ["superAdmin"],
        children: [
            {
                title: "Manage Admins",
                icon: Shield,
                href: "/admin/manage-admins",
                role: ["superAdmin"],

            },
            {
                title: "Payment",
                icon: CreditCard,
                href: "/admin/upi-management",
                role: ["superAdmin"],

            },
            {
                title: "Global Settings",
                icon: Settings,
                href: "/admin/settings",
                role: ["superAdmin"],
            },
            {
                title: "Security",
                icon: Shield,
                href: "/admin/security",
                role: ["superAdmin"],
            },
             {
                title: "Storage",
                icon: FileImage,
                href: "/admin/storage",
                role: ["superAdmin"],
            },

        ],
    },
];

const NavItemLink = ({ item, isCollapsed }: NavItemProps) => {
    const pathname = usePathname();
    const linkClasses = cn(
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start text-muted-foreground hover:bg-muted/50 hover:text-primary",
        pathname === item.href && "bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary",
    );

    const Icon = item.icon;
    if (!Icon) {
        return null;
    }

    const linkContent = (
        <>
            <Icon className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span className="truncate">{item.title}</span>}
        </>
    );

    if (isCollapsed) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Link href={item.href || '#'} className={linkClasses}>
                            {linkContent}
                            <span className="sr-only">{item.title}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-4">
                        {item.title}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return <Link href={item.href || '#'} className={linkClasses}>{linkContent}</Link>;
};

const NavItemGroup = ({ item, isCollapsed }: NavItemProps) => {
    const pathname = usePathname();
    const { role } = useRole();

    const getFilteredItems = useCallback((items: AdminNavItem[]): AdminNavItem[] => {
        if (!role) return [];
        return items.reduce((acc: AdminNavItem[], subItem) => {
            if (!subItem.role || role === 'superAdmin') {
                acc.push(subItem);
                return acc;
            }
            if (subItem.role.includes(role)) {
                acc.push(subItem);
            }
            return acc;
        }, []);
    }, [role]);

    const children = useMemo(() => {
        return 'children' in item && item.children ? getFilteredItems(item.children) : [];
    }, [item, getFilteredItems]);
    
    const hasVisiblechildren = useMemo(() => {
         if (!('children' in item && item.children)) return false;
         if (role === 'superAdmin') return true;
         return item.children.some(sub => sub.role && role && sub.role.includes(role));
    }, [item, role]);

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isCollapsed) {
            setIsOpen(false);
            return;
        }
        const isActive = children.some(sub => sub.href && pathname && pathname.includes(sub.href));
        setIsOpen(isActive);
    }, [pathname, children, isCollapsed]);


    const Icon = item.icon;
    if (!Icon || !hasVisiblechildren) return null;


    return (
        <Collapsible open={!isCollapsed && isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <div className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start cursor-pointer text-muted-foreground hover:text-primary")}>
                    <Icon className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
                    {!isCollapsed && (
                        <>
                            <span className="truncate flex-1 text-left">{item.title}</span>
                            <ChevronDown className={cn("h-4 w-4 transform transition-transform", isOpen && "rotate-180")} />
                        </>
                    )}
                </div>
            </CollapsibleTrigger>
            {!isCollapsed && (
                <CollapsibleContent className="pl-6 space-y-1 mt-1">
                    {children.map((subItem) => (
                        <NavItemLink key={subItem.title} item={subItem} isCollapsed={isCollapsed} />
                    ))}
                </CollapsibleContent>
            )}
        </Collapsible>
    );
};


function AdminSidebarNav({ className, inSheet }: { className?: string, inSheet?: boolean }) {
    const { isOpen } = useSidebar();
    const { role } = useRole();

    const getFilteredAdminItems = useCallback((items: AdminNavItem[]): AdminNavItem[] => {
        if (!role) return [];

        return items.reduce((acc: AdminNavItem[], item) => {
            const hasVisiblechildren = item.children && item.children.some(sub => sub.role && (role === 'superAdmin' || sub.role.includes(role)));

            if (hasVisiblechildren) {
                 acc.push(item);
            } else if (!item.children && item.role?.includes(role)) {
                acc.push(item);
            }
            return acc;
        }, []);
    }, [role]);

    const filteredNav = useMemo(() => getFilteredAdminItems(adminNavItems), [getFilteredAdminItems]);

    return (
        <nav className={cn("flex flex-col gap-1 p-2", className)}>
            {filteredNav.map((item) => (
                item.children
                    ? <NavItemGroup key={item.title} item={item} isCollapsed={isOpen && !inSheet} />
                    : <NavItemLink key={item.title} item={item} isCollapsed={isOpen && !inSheet} />
            ))}
        </nav>
    );
}

export const AdminSidebar = ({ inSheet }: { inSheet?: boolean }) => (
    <div className="flex flex-col h-full bg-card border-r">
         <div className="p-4 border-b">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
                <AppLogo />
                <span>Admin Panel</span>
            </Link>
        </div>
        <AdminSidebarNav className="flex-1 overflow-y-auto" inSheet={inSheet} />
    </div>
);

export const Sidebar = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("flex flex-col h-full bg-card border-r", className)}>
        {children}
    </div>
);

export const SidebarNav = React.forwardRef<
    HTMLElement,
    React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
    return <nav ref={ref} className={cn("flex flex-col gap-1 p-2", className)} {...props} />
});
SidebarNav.displayName = "SidebarNav";


export const SidebarNavItem = ({ href, icon, children }: { href: string; icon: React.ReactElement; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start",
                isActive && "bg-muted text-primary hover:bg-muted hover:text-primary",
            )}
        >
            {React.cloneElement(icon, { className: "h-5 w-5 mr-2" })}
            <span className="truncate">{children}</span>
        </Link>
    );
};
