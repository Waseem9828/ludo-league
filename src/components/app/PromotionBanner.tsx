
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Announcement } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export function PromotionBanner() {
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const q = query(
      collection(firestore, 'announcements'), 
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeMessages = snapshot.docs.map(doc => doc.data().text as string);
      setMessages(activeMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  useEffect(() => {
    if (messages.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
      }, 4000); // Change message every 4 seconds

      return () => clearInterval(timer);
    }
  }, [messages.length]);

  if (loading) {
    return (
        <div className="h-6 w-full bg-white flex items-center justify-center overflow-hidden">
            <Skeleton className="h-4 w-1/2" />
        </div>
    );
  }

  if (messages.length === 0) {
      return null; // Don't render the banner if there are no active messages
  }

  return (
    <div className="h-6 flex items-center justify-center overflow-hidden w-full bg-white">
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
            <p className="text-sm font-semibold text-destructive truncate">
              {messages[currentIndex]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
