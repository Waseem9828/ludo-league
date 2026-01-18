
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const promoMessages = [
  "Diwali Dhamaka! Get 50% bonus on all deposits.",
  "New high-stakes tournaments every weekend. Join now!",
  "Refer your friends and earn instant cash rewards.",
  "Lightning fast withdrawals now active. Get your winnings in minutes!",
  "Complete daily missions for exciting bonuses."
];

export function PromotionBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % promoMessages.length);
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-6 flex items-center justify-center overflow-hidden w-full">
      <div className="relative h-full w-full">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center w-full h-full"
          >
            <p className="text-sm font-semibold text-white truncate">
              {promoMessages[currentIndex]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
