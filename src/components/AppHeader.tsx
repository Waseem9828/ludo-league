
'use client';

import Image from "next/image";
import Link from "next/link";
import NoSsr from "@/components/NoSsr";
import { UserNav } from "@/components/app/user-nav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/firebase";
import { Wallet2 } from "lucide-react";
import { motion } from 'framer-motion';

const WalletBalance = () => {
    const { userProfile, loading } = useUser();
    
    // Do not render anything if loading, or if the user/balance is unavailable
    if (loading || !userProfile || typeof userProfile.walletBalance === 'undefined') {
      return null;
    }
  
    return (
        <Link href="/wallet">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer">
                <Wallet2 className="h-5 w-5" />
                <span className="text-sm font-semibold tracking-wider">₹{userProfile.walletBalance.toFixed(2)}</span>
            </div>
      </Link>
    );
  };
  
const sentence = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            delay: 0.2,
            staggerChildren: 0.08,
        },
    },
};

const letter = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
    },
};
  
export default function AppHeader() {
    const appName = "Ludo League";
    return (
        <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden text-primary-foreground hover:text-primary-foreground/80 hover:bg-white/20"/>
                <Link href="/dashboard" className="flex items-center gap-2">
                    <Image src="/icon-192x192.png" alt="Ludo League Logo" width={32} height={32} />
                    <motion.h1 
                        className="text-xl font-bold text-white tracking-wider flex overflow-hidden"
                        variants={sentence}
                        initial="hidden"
                        animate="visible"
                    >
                        {appName.split("").map((char, index) => (
                            <motion.span key={char + "-" + index} variants={letter}>
                                {char === " " ? "\u00A0" : char}
                            </motion.span>
                        ))}
                    </motion.h1>
                </Link>
            </div>
            
            <div className="flex items-center justify-end gap-3">
                <NoSsr>
                    <WalletBalance />
                </NoSsr>
                <NoSsr>
                    <UserNav />
                </NoSsr>
            </div>
        </div>
    );
}
