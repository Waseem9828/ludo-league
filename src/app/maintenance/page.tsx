'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { signOut } from '@/firebase/auth/client';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import Image from 'next/image';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import CustomLoader from '@/components/CustomLoader';

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const pulseVariants: Variants = {
    animate: {
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
}


export default function MaintenancePage() {
  const { isAuthenticating } = useAuthGuard();
  const router = useRouter();
  const { user, isAdmin, loading } = useUser();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  if (isAuthenticating) {
    return <CustomLoader />;
  }


  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background overflow-hidden text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:6rem_4rem]">
        {/* The new glowing grid line effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_farthest-side_at_50%_100%,hsl(var(--primary)/0.1),transparent)] animate-grid-glow"></div>
      </div>
      
      <motion.div 
        className="relative z-10 flex flex-col items-center justify-center gap-6 text-center p-4"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={itemVariants} className="relative">
            <motion.div 
                className="absolute inset-0 bg-primary/20 rounded-full"
                variants={pulseVariants}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 shadow-lg p-4">
                <Image src="/icon-192x192.png" alt="Ludo League Logo" width={80} height={80} priority />
            </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2 max-w-md">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">App is Under Maintenance</h1>
            <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
              We’re preparing something better for you.
              {`\n`}Performance upgrades, smoother gameplay, and an enhanced experience are on the way.
              {`\n`}Maintenance won’t take long — stay tuned! 🚀
            </p>
        </motion.div>

        {user && !isAdmin && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-6 flex flex-col sm:flex-row gap-3 max-w-sm w-full mx-auto"
            >
                <Button variant="outline" onClick={handleLogout} className="w-full">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
            </motion.div>
        )}
      </motion.div>
    </div>
  );
}
