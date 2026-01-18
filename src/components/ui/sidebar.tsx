
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
    ArrowUpToDot,
    Megaphone
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants, Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { useState, useMemo, useCallback, createContext, useContext } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Menu } from "lucide-react";
import { AppLogo } from "@/components/icons/AppLogo";

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
        role: ["superAdmin", "kycAdmin", "depositAdmin", "withdrawalAdmin"],
        subItems: [
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
                icon: ArrowUpToDot,
                href: "/admin/withdrawals",
                role: ["superAdmin", "withdrawalAdmin"],
            },
        ],
    },
    {
        title: "Content",
        icon: FileImage,
        role: ["superAdmin"],
        subItems: [
            {
                title: "Banners",
                href: "/admin/banners",
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
        role: ["superAdmin", "matchAdmin"],
        subItems: [
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
        role: ["superAdmin"],
        subItems: [
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
        ]
    },
    {
        title: "Configuration",
        icon: Settings,
        role: ["superAdmin"],
        subItems: [
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

interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
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
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
};

interface NavItemProps {
    item: NavItem | AdminNavItem;
    isCollapsed: boolean;
}

const NavItemLink = ({ item, isCollapsed }: NavItemProps) => {
    const pathname = usePathname();
    const linkClasses = cn(
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start",
        pathname === item.href && "bg-muted text-primary hover:bg-muted hover:text-primary",
    );

    const linkContent = (
        <>
            <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
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
    const [isOpen, setIsOpen] = useState(false);

    const subItems = 'subItems' in item && item.subItems ? item.subItems : [];

    useState(() => {
        if (subItems.some(sub => sub.href && pathname.includes(sub.href))) {
            setIsOpen(true);
        }
    });

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <div className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start cursor-pointer")}>
                    <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
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
                    {subItems.map((subItem) => (
                        <NavItemLink key={subItem.title} item={subItem} isCollapsed={isCollapsed} />
                    ))}
                </CollapsibleContent>
            )}
        </Collapsible>
    );
};


export function SidebarNav({ className, inSheet }: { className?: string, inSheet?: boolean }) {
    const { isCollapsed } = useSidebar();
    const { role } = useRole();

    const getFilteredAdminItems = useCallback((items: AdminNavItem[]): AdminNavItem[] => {
        return items.reduce((acc: AdminNavItem[], item) => {
            if (!item.role) return acc;
            const hasAccess = item.role.includes(role);

            if (hasAccess) {
                if (item.subItems) {
                    const filteredSubItems = getFilteredAdminItems(item.subItems);
                    if (filteredSubItems.length > 0) {
                        acc.push({ ...item, subItems: filteredSubItems });
                    }
                } else {
                    acc.push(item);
                }
            }
            return acc;
        }, []);
    }, [role]);

    const filteredNav = useMemo(() => getFilteredAdminItems(adminNavItems), [getFilteredAdminItems]);

    return (
        <nav className={cn("flex flex-col gap-1 p-2", className)}>
            {filteredNav.map((item) => (
                item.subItems
                    ? <NavItemGroup key={item.title} item={item} isCollapsed={isCollapsed && !inSheet} />
                    : <NavItemLink key={item.title} item={item} isCollapsed={isCollapsed && !inSheet} />
            ))}
        </nav>
    );
}

export const Sidebar = () => (
    <div className="flex flex-col h-full">
         <div className="p-4 border-b">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
                <AppLogo />
                <span>Admin Panel</span>
            </Link>
        </div>
        <SidebarNav className="flex-1 overflow-y-auto" />
    </div>
);

// This component is no longer used directly in the layout, but is kept to avoid breaking imports.
// The Sheet/SheetContent is now handled directly in the root app layout.
export const SidebarSheet = ({ children }: { children: React.ReactNode }) => {
    return null;
};

export { Sheet, SheetContent };
