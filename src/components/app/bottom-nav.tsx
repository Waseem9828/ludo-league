
'use client';

import { Home, Swords, User, Trophy, BarChart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import NoSsr from '@/components/NoSsr';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/lobby', icon: Swords, label: 'Play' },
  { href: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { href: '/leaderboard', icon: BarChart, label: 'Ranks' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
      <NoSsr>
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 px-2 bg-card border-t z-40">
            <div className="relative flex items-center justify-around h-full">
                {navItems.map((item) => {
                    const isActive = pathname ? pathname.startsWith(item.href) : false;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-end w-16 h-full pt-2"
                        >
                            <motion.div
                                className="absolute"
                                animate={{ y: isActive ? -24 : 0 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-14 h-14 rounded-[14px] transition-all duration-200",
                                    isActive ? "bg-gradient-primary text-white shadow-lg" : "bg-transparent"
                                )}>
                                    <Icon className={cn("h-6 w-6 transition-colors", isActive ? "text-white" : "text-muted-foreground")} />
                                </div>
                            </motion.div>

                            <span className={cn(
                                "text-xs font-medium pb-1 transition-colors",
                                isActive ? "text-primary font-bold" : "text-muted-foreground"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
      </NoSsr>
    );
}
