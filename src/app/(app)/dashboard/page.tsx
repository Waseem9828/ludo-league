
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Tournament } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ImageSlider } from '@/components/app/ImageSlider';


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


const DashboardCard = ({ title, value, imageUrls, href, badgeText, index }: { title: string; value?: string | number; imageUrls: string[]; href: string; badgeText?: string; index: number; }) => {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 3500 + (index * 250), stopOnInteraction: false })]);

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
    >
        <Link href={href} className="block group">
            <Card className="relative overflow-hidden rounded-lg shadow-lg aspect-square">
                <div className="overflow-hidden h-full" ref={emblaRef}>
                    <div className="flex h-full">
                        {imageUrls.map((url, i) => (
                            <div className="relative flex-[0_0_100%] h-full" key={i}>
                                <Image src={url} alt={`${title} image ${i + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-semibold text-base">{title}</h3>
                    {value !== undefined && <p className="text-2xl font-bold">{value}</p>}
                </div>
                {badgeText && <Badge variant="destructive" className="absolute top-2 right-2">{badgeText}</Badge>}
            </Card>
        </Link>
    </motion.div>
  );
};


export default function DashboardPage() {
    const { user, userProfile } = useUser();
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


    const cardsData = [
      {
        id: 'wallet',
        title: 'Wallet',
        value: `₹${userProfile?.walletBalance?.toFixed(2) || '0.00'}`,
        href: '/wallet',
        imageUrls: [
          `https://picsum.photos/seed/wallet1/400/400`,
          `https://picsum.photos/seed/wallet2/400/400`,
        ],
      },
      {
        id: 'winnings',
        title: 'Winnings',
        value: `₹${userProfile?.winnings?.toFixed(2) || '0.00'}`,
        href: '/profile',
        imageUrls: [
          `https://picsum.photos/seed/winnings1/400/400`,
          `https://picsum.photos/seed/winnings2/400/400`,
        ],
      },
      {
        id: 'matches',
        title: 'Matches Played',
        value: userProfile?.totalMatchesPlayed || 0,
        href: '/profile',
        imageUrls: [
          `https://picsum.photos/seed/matches1/400/400`,
          `https://picsum.photos/seed/matches2/400/400`,
        ],
      },
      {
        id: 'winrate',
        title: 'Win Rate',
        value: `${userProfile?.winRate?.toFixed(0) || 0}%`,
        href: '/leaderboard',
        imageUrls: [
          `https://picsum.photos/seed/winrate1/400/400`,
          `https://picsum.photos/seed/winrate2/400/400`,
        ],
      },
      {
        id: 'active_matches',
        title: 'Active Matches',
        href: '/lobby',
        badgeText: (userProfile?.activeMatchIds?.length || 0) > 0 ? userProfile?.activeMatchIds?.length.toString() : undefined,
        imageUrls: [
          `https://picsum.photos/seed/active1/400/400`,
          `https://picsum.photos/seed/active2/400/400`,
        ],
      },
       {
        id: 'referral',
        title: 'Referral Fund',
        href: '/referrals',
        imageUrls: [
          `https://picsum.photos/seed/referral1/400/400`,
          `https://picsum.photos/seed/referral2/400/400`,
        ],
      },
       {
        id: 'bonus',
        title: 'Daily Bonus',
        href: '/wallet',
        imageUrls: [
          `https://picsum.photos/seed/bonus1/400/400`,
          `https://picsum.photos/seed/bonus2/400/400`,
        ],
      },
    ];

    return (
        <div className="flex-1 space-y-4">
            <ImageSlider />
            <h1 className="text-xl font-bold tracking-tight text-center">Welcome back, {userProfile?.displayName || 'Champion'}!</h1>
            
            <TournamentSlider tournaments={tournaments} loading={loadingTournaments} />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {cardsData.map((card, index) => (
                    <DashboardCard 
                        key={card.id}
                        title={card.title}
                        value={card.value}
                        imageUrls={card.imageUrls}
                        href={card.href}
                        badgeText={card.badgeText}
                        index={index}
                    />
                ))}
            </div>
            
        </div>
    );
}
