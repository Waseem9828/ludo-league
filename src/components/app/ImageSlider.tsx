
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, QueryDocumentSnapshot } from 'firebase/firestore';
import { Banner } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export const ImageSlider = () => {
  const firestore = useFirestore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const autoplayOptions = {
    delay: 4000,
    stopOnInteraction: false,
  };
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay(autoplayOptions)]);
  
  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const bannersQuery = query(
        collection(firestore, 'banners'), 
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(bannersQuery, (snapshot) => {
        const activeBanners = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as Banner));
        setBanners(activeBanners);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [firestore]);


  if (loading) {
      return (
          <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden shadow-lg mb-4">
              <Skeleton className="h-full w-full" />
          </div>
      )
  }
  
  if (banners.length === 0) {
    return null; // Don't render slider if there are no active banners
  }


  return (
    <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden shadow-lg mb-4" ref={emblaRef}>
        <div className="flex h-full">
            {banners.map((banner, index) => (
                <div className="relative flex-[0_0_100%] h-full" key={banner.id}>
                    <Link href={banner.targetPage} className="block h-full w-full relative">
                        <Image 
                            src={banner.imageUrl} 
                            alt={banner.name || `Banner image ${index + 1}`}
                            fill
                            className="object-cover"
                            priority={index === 0} // Prioritize loading the first image
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                    </Link>
                </div>
            ))}
        </div>
    </div>
  );
};
