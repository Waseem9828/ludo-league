"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Home",
      active: pathname === "/dashboard",
    },
    {
      href: "/lobby",
      label: "Lobby",
      active: pathname ? (pathname.startsWith("/lobby") || pathname.startsWith('/match')) : false,
    },
    {
      href: "/tournaments",
      label: "Tournaments",
      active: pathname ? pathname.startsWith("/tournaments") : false,
    },
     {
      href: "/leaderboard",
      label: "Leaderboard",
      active: pathname === "/leaderboard",
    },
    {
      href: "/wallet",
      label: "Wallet",
      active: pathname === "/wallet",
    },
    {
      href: "/kyc",
      label: "KYC",
      active: pathname === "/kyc",
    },
  ]

  return (
    <nav
      className={cn("hidden md:flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-md font-medium transition-colors hover:text-primary-foreground/80",
            route.active
              ? "text-primary-foreground font-semibold"
              : "text-primary-foreground/60"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
