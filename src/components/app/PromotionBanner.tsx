'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';

type AppSettings = {
  announcement?: {
    message: string;
    active: boolean;
  };
};

export function PromotionBanner() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const newSettings = docSnap.data() as AppSettings;
        // If the message changes, show the banner again
        if (settings?.announcement?.message !== newSettings.announcement?.message) {
            setIsVisible(true);
        }
        setSettings(newSettings);
      } else {
        setSettings(null);
      }
    });
    return () => unsubscribe();
  }, [firestore, settings?.announcement?.message]);

  const showBanner = settings?.announcement?.active && settings?.announcement?.message && isVisible;

  const sentence = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.5,
        staggerChildren: 0.04,
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

  if (!showBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative z-50 flex items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
        >
          <Megaphone className="h-5 w-5 flex-shrink-0 animate-pulse" />
          <motion.p
            className="text-center"
            variants={sentence}
            initial="hidden"
            animate="visible"
          >
            {(settings.announcement?.message || "").split("").map((char, index) => (
              <motion.span key={char + "-" + index} variants={letter}>
                {char}
              </motion.span>
            ))}
          </motion.p>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-white/20 transition-colors"
            aria-label="Dismiss promotion"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
