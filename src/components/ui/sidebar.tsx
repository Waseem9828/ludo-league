
"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft, Swords, Home, Trophy, BarChart, Wallet, ShieldCheck, Gavel, Shield, FileText, Landmark, CircleHelp, LifeBuoy, Settings, LogOut, Gift, LayoutDashboard, Users, Download, FolderKanban, AtSign, Newspaper, WalletCards, Award, ShieldAlert, LineChart, ImageIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUser } from "@/firebase"
import { signOut } from "@/firebase/auth/client"
import { useRole } from "@/hooks/useRole";


const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open]
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"


const SidebarNav = ({ inSheet = false }: { inSheet?: boolean }) => {
    const pathname = usePathname();
    const { isAdmin } = useUser();
    const router = useRouter();
    const { role } = useRole();

    const isAdminPage = pathname ? pathname.startsWith('/admin') : false;

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };
    
    const appNavItems = [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/lobby", label: "Lobby", icon: Swords },
      { href: "/tournaments", label: "Tournaments", icon: Trophy },
      { href: "/leaderboard", label: "Leaderboard", icon: BarChart },
    ]

    const accountItems = [
        { href: "/wallet", label: "Wallet", icon: Wallet },
        { href: "/kyc", label: "KYC Verification", icon: ShieldCheck },
        { href: "/referrals", label: "Referrals", icon: Gift },
    ]

    const adminNavItems = [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/reports", label: "Reports", icon: LineChart },
        {
          label: "Management",
          isGroup: true,
          items: [
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/matches", label: "Matches", icon: Swords },
            { href: "/admin/tournaments", label: "Tournaments", icon: Trophy },
            { href: "/admin/support", label: "Support", icon: LifeBuoy },
            { href: "/admin/storage", label: "Storage", icon: FolderKanban },
          ],
        },
        {
          label: "Requests",
          isGroup: true,
          items: [
            { href: "/admin/kyc-requests", label: "KYC Requests", icon: ShieldCheck },
            { href: "/admin/deposits", label: "Deposits", icon: WalletCards },
            { href: "/admin/withdrawals", label: "Withdrawals", icon: Download },
          ],
        },
        {
          label: "Configuration",
          isGroup: true,
          items: [
            { href: "/admin/settings", label: "App Settings", icon: Settings },
            { href: "/admin/banners", label: "Manage Banners", icon: ImageIcon },
            { href: "/admin/upi-management", label: "UPI Management", icon: AtSign },
            { href: "/admin/referral-settings", label: "Referral Settings", icon: Gift },
            { href: "/admin/bonus-settings", label: "Bonus Settings", icon: Award },
            { href: "/admin/news-management", label: "News Management", icon: Newspaper },
            { href: "/admin/security", label: "Security", icon: ShieldAlert },
          ],
        },
    ];

    const getFilteredAdminItems = React.useCallback(() => {
        if (role === 'superAdmin') return adminNavItems;
        if (!role) return [];

        const rolePermissions: Record<string, string[]> = {
            depositAdmin: ['/admin/deposits'],
            withdrawalAdmin: ['/admin/withdrawals'],
            kycAdmin: ['/admin/kyc-requests'],
            matchAdmin: ['/admin/matches'],
        };
        const allowedPaths = rolePermissions[role] || [];
        if (allowedPaths.length > 0) {
            allowedPaths.unshift('/admin/dashboard');
        }

        const filtered = adminNavItems.map(item => {
            if (!("isGroup" in item)) {
                return allowedPaths.includes(item.href!) ? item : null;
            }
            const filteredGroupItems = item.items?.filter(subItem => allowedPaths.includes(subItem.href));
            if (filteredGroupItems && filteredGroupItems.length > 0) {
                return { ...item, items: filteredGroupItems };
            }
            return null;
        }).filter(Boolean);
        
        return filtered as typeof adminNavItems;
    }, [role]);

    const legalItems = [
      { href: "/terms-and-conditions", label: "Terms & Conditions", icon: Gavel },
      { href: "/privacy-policy", label: "Privacy Policy", icon: Shield },
      { href: "/refund-policy", label: "Refund Policy", icon: Landmark },
    ]
    const helpItems = [
      { href: "/tutorials", label: "Tutorials", icon: CircleHelp },
      { href: "/support", label: "Support", icon: LifeBuoy },
    ]

    const navItems = isAdminPage ? getFilteredAdminItems() : appNavItems;
  
    const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => 
    inSheet ? (
      <SheetClose asChild>
        <Link href={href} className="w-full">{children}</Link>
      </SheetClose>
    ) : (
      <Link href={href} className="w-full">{children}</Link>
    );


    return (
      <>
        {isAdminPage ? (
             <>
                <SidebarMenu>
                    {navItems.map((item, index) => {
                        if ("isGroup" in item) {
                            return (
                                <SidebarGroup key={`group-${index}`}>
                                    <SidebarGroupLabel>{item.label}</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {item.items?.map(subItem => (
                                                <SidebarMenuItem key={subItem.href}>
                                                    <NavLink href={subItem.href}>
                                                        <SidebarMenuButton isActive={!!pathname?.startsWith(subItem.href)}>
                                                            <subItem.icon className="h-4 w-4" />
                                                            {subItem.label}
                                                        </SidebarMenuButton>
                                                    </NavLink>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            )
                        }
                    return (
                    <SidebarMenuItem key={item.href || `item-${index}`}>
                        <NavLink href={item.href!}>
                        <SidebarMenuButton isActive={pathname === item.href || (item.href !== '/admin/dashboard' && !!pathname?.startsWith(item.href!))}>
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </SidebarMenuButton>
                        </NavLink>
                    </SidebarMenuItem>
                    )})}
                </SidebarMenu>
                {role === 'superAdmin' && (
                    <>
                        <SidebarSeparator />
                        <SidebarGroup>
                            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <NavLink href="/admin/manage-admins">
                                            <SidebarMenuButton isActive={!!pathname?.startsWith('/admin/manage-admins')}>
                                                <Shield className="h-4 w-4" />
                                                Manage Admins
                                            </SidebarMenuButton>
                                        </NavLink>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </>
                )}
             </>
        ) : (
          <>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {appNavItems.map(item => (
                             <SidebarMenuItem key={item.href}>
                                <NavLink href={item.href}>
                                <SidebarMenuButton isActive={pathname === item.href || (item.href !== '/dashboard' && !!pathname?.startsWith(item.href))}>
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </SidebarMenuButton>
                                </NavLink>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
                <SidebarGroupLabel>Account</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {accountItems.map(item => (
                             <SidebarMenuItem key={item.href}>
                                <NavLink href={item.href}>
                                <SidebarMenuButton isActive={!!pathname?.startsWith(item.href)}>
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </SidebarMenuButton>
                                </NavLink>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
                <SidebarGroupLabel>Help & Legal</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {[...helpItems, ...legalItems].map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <NavLink href={item.href}>
                                <SidebarMenuButton isActive={pathname === item.href}>
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </SidebarMenuButton>
                                </NavLink>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            
            {isAdmin && (
                <>
                    <SidebarSeparator />
                    <SidebarGroup>
                        <SidebarGroupLabel>Admin</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <NavLink href="/admin/dashboard">
                                        <SidebarMenuButton isActive={!!pathname?.startsWith('/admin')}>
                                            <LayoutDashboard className="h-4 w-4 text-primary" />
                                            Admin Panel
                                        </SidebarMenuButton>
                                    </NavLink>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </>
            )}
          </>
        )}
      </>
    );
  };
  
const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
    const router = useRouter();
    const pathname = usePathname();
    const isAdminPage = pathname ? pathname.startsWith('/admin') : false;

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <div
        ref={ref}
        data-sidebar="sidebar"
        className={cn(
        "flex h-full flex-col bg-background/80 backdrop-blur-lg text-foreground border-r border-border/50",
        className
        )}
        {...props}
    >
        <SidebarHeader>
            <Link href={isAdminPage ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
                <Image src="/icon-192x192.png" alt="Ludo League Logo" width={32} height={32} />
                <span className="font-bold text-lg">Ludo League</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
            <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="/settings" className="w-full">
                        <SidebarMenuButton>
                            <Settings className="h-4 w-4"/>
                            Settings
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleSignOut}>
                        <LogOut className="h-4 w-4"/>
                        Logout
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </div>
    )
});
Sidebar.displayName = "Sidebar";

const SidebarSheet = ({ children }: { children: React.ReactNode }) => {
    const { openMobile, setOpenMobile } = useSidebar();
    const pathname = usePathname();
    const isAdminPage = pathname ? pathname.startsWith('/admin') : false;
  
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-[--sidebar-width-mobile] p-0">
          <div className="flex h-full flex-col bg-background/80 backdrop-blur-lg text-foreground border-r border-border/50">
            <SheetHeader className="p-4 border-b border-border/50">
              <SheetTitle>
                <SheetClose asChild>
                    <Link href={isAdminPage ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
                        <Image src="/icon-192x192.png" alt="Ludo League Logo" width={32} height={32} />
                        <span className="font-bold text-lg">Ludo League</span>
                    </Link>
                </SheetClose>
              </SheetTitle>
            </SheetHeader>
            <SidebarContent>{children}</SidebarContent>
             <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SheetClose asChild>
                            <Link href="/settings" className="w-full">
                                <SidebarMenuButton>
                                    <Settings className="h-4 w-4"/>
                                    Settings
                                </SidebarMenuButton>
                            </Link>
                        </SheetClose>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => { signOut(); setOpenMobile(false); }}>
                            <LogOut className="h-4 w-4"/>
                            Logout
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
          </div>
        </SheetContent>
      </Sheet>
    );
  };
  SidebarSheet.displayName = 'SidebarSheet';


const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-4 border-b border-border/50", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2 mt-auto border-t border-border/50", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-border/50", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 p-2 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground transition-[margin,opa] ease-linear",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring transition-all duration-200 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    {
      variants: {
        variant: {
          default: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          active: "bg-gradient-primary text-primary-foreground font-semibold shadow-sm hover:brightness-110",
        },
        size: {
          default: "h-9 text-sm",
          sm: "h-8 text-xs",
          lg: "h-12 text-sm",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
  )

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & Omit<VariantProps<typeof sidebarMenuButtonVariants>, 'variant'>
>(
  (
    {
      asChild = false,
      isActive = false,
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state } = useSidebar()

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant: isActive ? "active" : "default", size }), className)}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
  SidebarNav,
  SidebarSheet,
}
