'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, QuerySnapshot, DocumentData, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import type { Tournament } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ImageSlider } from '@/components/app/ImageSlider';
import { Wallet, Trophy, Swords, BarChart, Gift, Award, Info } from 'lucide-react';

const TournamentSlider = ({ tournaments, loading }: { tournaments: Tournament[], loading: boolean }) => {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 5000 })]);

  if (loading) {
      return (
          <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden shadow-lg">
              <Skeleton className="h-full w-full" />
          </div>
      );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="flex items-center justify-center h-24 bg-muted">
        <p className="text-muted-foreground text-sm">No tournaments available right now.</p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg shadow-lg" ref={emblaRef}>
      <div className="flex -ml-4">
        {tournaments.map((tournament) => (
          <div className="relative flex-[0_0_100%] pl-4" key={tournament.id}>
            <Link href={`/tournaments/${tournament.id}`}>
              <Card className="overflow-hidden">
                <div className="relative aspect-[3/1] w-full">
                  <Image
                    src={tournament.bannerImageUrl || `https://picsum.photos/seed/${tournament.id}/800/400`}
                    alt={tournament.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-2 text-white">
                    <Badge className="mb-1 text-xs">{tournament.status.toUpperCase()}</Badge>
                    <h3 className="text-base font-bold">{tournament.name}</h3>
                    <p className="text-xs">Prize Pool: <span className="font-bold text-green-400">₹{tournament.prizePool.toLocaleString()}</span></p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};


const DashboardCard = ({
  icon: Icon,
  label,
  value,
  href,
  cardId
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  href: string;
  cardId: string;
}) => {
  const firestore = useFirestore();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: Math.random() * (5000 - 3000) + 3000 })]);

  useEffect(() => {
    if (!firestore) return;
    setLoading(true);
    const imagesQuery = query(
      collection(firestore, 'dashboardCardImages'),
      where('cardId', '==', cardId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(imagesQuery, (snapshot) => {
      setImages(snapshot.docs.map(doc => doc.data().imageUrl));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore, cardId]);

  return (
    <Link href={href} className="block group">
      <Card className="bg-muted/50 hover:bg-muted/80 transition-colors h-full overflow-hidden aspect-square">
        <div className="relative w-full h-full">
          {/* Image Slider Background */}
          {loading ? (
             <Skeleton className="absolute inset-0" />
          ) : images.length > 0 ? (
            <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    {images.map((imgUrl) => (
                        <div className="relative flex-[0_0_100%] h-full" key={imgUrl}>
                            <Image src={imgUrl} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                    ))}
                </div>
            </div>
          ) : (
            // Fallback for when there are no images
            <div className="absolute inset-0 bg-gradient-primary" />
          )}

          {/* Overlay and Content */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative h-full flex flex-col justify-between p-4 text-white">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium">{label}</h3>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
};


export default function DashboardPage() {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loadingTournaments, setLoadingTournaments] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        setLoadingTournaments(true);
        const tournamentsQuery = query(
            collection(firestore, 'tournaments'),
            where('status', 'in', ['upcoming', 'live']),
            orderBy('startTime', 'desc'),
            limit(5)
        );
        const unsubscribe = onSnapshot(tournamentsQuery, 
            (snapshot: QuerySnapshot<DocumentData>) => {
                const fetchedTournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
                setTournaments(fetchedTournaments);
                setLoadingTournaments(false);
            },
            (error) => {
                console.error("Error fetching tournaments: ", error);
                setLoadingTournaments(false);
            }
        );
        return () => unsubscribe();
    }, [firestore]);


    const cardData = [
      {
        id: 'wallet',
        title: 'Wallet',
        value: `₹${userProfile?.walletBalance?.toFixed(2) || '0.00'}`,
        href: '/wallet',
        icon: Wallet
      },
      {
        id: 'winnings',
        title: 'Winnings',
        value: `₹${userProfile?.winnings?.toFixed(2) || '0.00'}`,
        href: '/profile',
        icon: Trophy
      },
      {
        id: 'matches',
        title: 'Matches Played',
        value: userProfile?.totalMatchesPlayed || 0,
        href: '/profile',
        icon: Swords
      },
      {
        id: 'winrate',
        title: 'Win Rate',
        value: `${userProfile?.winRate?.toFixed(0) || 0}%`,
        href: '/leaderboard',
        icon: BarChart
      },
       {
        id: 'active_matches',
        title: 'Active Matches',
        value: userProfile?.activeMatchIds?.length || 0,
        href: '/lobby',
        icon: Info
      },
       {
        id: 'referral',
        title: 'Referral Fund',
        value: 'View',
        href: '/referrals',
        icon: Gift
      },
       {
        id: 'bonus',
        title: 'Daily Bonus',
        value: 'Claim',
        href: '/wallet',
        icon: Award
      },
    ];

    return (
        <div className="flex-1 space-y-4">
            <ImageSlider />
            <motion.h1 
              className="text-xl font-bold tracking-tight text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Welcome back, {userProfile?.displayName || 'Champion'}!
            </motion.h1>
            
            <TournamentSlider tournaments={tournaments} loading={loadingTournaments} />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {cardData.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    >
                      <DashboardCard 
                          cardId={card.id}
                          label={card.title}
                          value={card.value as string | number}
                          href={card.href}
                          icon={card.icon}
                      />
                    </motion.div>
                ))}
            </div>
            
        </div>
    );
}