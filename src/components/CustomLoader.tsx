'use client';
import { motion, Variants } from 'framer-motion';
import { NewsTicker } from './app/news-ticker';
import Image from 'next/image';

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

export const CustomLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--background)),transparent)]"></div>
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

        <motion.div variants={itemVariants} className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Entering the Arena...</h2>
            <p className="text-sm text-muted-foreground">Polishing the dice for your next victory!</p>
        </motion.div>
      </motion.div>
      
      <div className="absolute bottom-0 left-0 w-full p-4 z-10">
        <NewsTicker />
      </div>
    </div>
  );
};

export default CustomLoader;
