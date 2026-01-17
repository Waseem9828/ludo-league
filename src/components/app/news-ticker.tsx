'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Megaphone } from 'lucide-react';
import type { News } from '@/lib/types';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function NewsTicker() {
  const firestore = useFirestore();
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const newsRef = collection(firestore, 'news');
    const q = query(newsRef, orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News));
      setNewsItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  useEffect(() => {
    if (newsItems.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % newsItems.length);
      }, 7000); // Change every 7 seconds

      return () => clearInterval(timer);
    }
  }, [newsItems]);

  const currentItem = useMemo(() => {
      if (!newsItems || newsItems.length === 0) return null;
      return newsItems[currentIndex];
  }, [newsItems, currentIndex]);

  const isMultiLine = useMemo(() => currentItem?.content?.includes('\n'), [currentItem]);

  if (loading || !currentItem) {
    return (
        <div className="relative flex items-center bg-primary/10 text-primary-foreground p-4 rounded-lg border border-primary/20 min-h-[80px]">
            <Megaphone className="h-6 w-6 text-primary flex-shrink-0 mr-4" />
            <div className="w-full h-12 bg-muted/50 rounded animate-pulse" />
        </div>
    );
  }

  return (
      <div className={cn(
          "relative flex items-center bg-primary/10 p-4 rounded-lg border border-primary/20 min-h-[80px] overflow-hidden",
          !isMultiLine && "items-center"
      )}>
        <Megaphone className="h-6 w-6 text-primary flex-shrink-0 mr-4 group-hover:scale-110 transition-transform" />
        
        <AnimatePresence mode="wait">
            <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, y: isMultiLine ? 20 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isMultiLine ? -20 : 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="flex-grow"
            >
                <Link href={`/news#${currentItem.id}`}><div className="font-bold text-foreground line-clamp-1">{currentItem.title}</div></Link>
                {isMultiLine ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                        {currentItem.content}
                    </p>
                ) : (
                    <div className="w-full overflow-hidden">
                       <motion.p
                            className="text-sm text-muted-foreground whitespace-nowrap w-max"
                            initial={{ x: '100%' }}
                            animate={{ x: '-100%' }}
                            transition={{
                                duration: 15,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        >
                           {currentItem.content}
                        </motion.p>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
  );
}
