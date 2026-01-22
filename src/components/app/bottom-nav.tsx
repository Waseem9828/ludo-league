'use client';

import { Home, Swords, User, Trophy, Award, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import NoSsr from '@/components/NoSsr';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/lobby', icon: Swords, label: 'Play' },
  { href: '/community', icon: Users, label: 'Community'},
  { href: '/tournaments', icon: Trophy, label: 'Tournaments' },
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
                            className="relative flex flex-col items-center justify-center w-16 h-full pt-1"
                        >
                            <motion.div
                                className="absolute"
                                animate={{ y: isActive ? -22 : 0 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-12 h-12 rounded-[14px] transition-all duration-200",
                                    isActive ? "bg-gradient-primary text-white shadow-lg" : "bg-transparent"
                                )}>
                                    <Icon className={cn("h-6 w-6 transition-colors", isActive ? "text-white" : "text-muted-foreground")} />
                                </div>
                            </motion.div>

                            <span className={cn(
                                "text-xs font-medium pb-1 transition-all duration-200",
                                isActive ? "opacity-100 text-primary font-bold" : "opacity-0",
                                'absolute bottom-0'
                            )} style={{transform: `translateY(${isActive ? '0px': '10px'})`}}>
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

    