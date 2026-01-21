'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tournament } from '@/lib/types';
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


const StatCard = ({ icon: Icon, label, value, href }: { icon: React.ElementType, label: string, value: string | number, href: string }) => (
    <Link href={href} className="block group">
        <Card className="bg-muted/50 hover:bg-muted/80 transition-colors h-full">
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-xl font-bold">{value}</div>
            </CardContent>
        </Card>
    </Link>
);

const ActionCard = ({ icon: Icon, label, href, badgeText }: { icon: React.ElementType, label: string, href: string, badgeText?: string }) => (
    <Link href={href} className="block group">
        <Card className="relative bg-muted/50 hover:bg-muted/80 transition-colors h-full flex flex-col items-center justify-center p-4">
            <Icon className="h-6 w-6 text-primary mb-2" />
            <p className="text-xs font-semibold text-center">{label}</p>
            {badgeText && <Badge variant="destructive" className="absolute top-2 right-2">{badgeText}</Badge>}
        </Card>
    </Link>
);


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


    const statCardsData = [
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
    ];

    const actionCardsData = [
       {
        id: 'active_matches',
        title: 'Active Matches',
        href: '/lobby',
        badgeText: (userProfile?.activeMatchIds?.length || 0) > 0 ? userProfile?.activeMatchIds?.length.toString() : undefined,
        icon: Info
      },
       {
        id: 'referral',
        title: 'Referral Fund',
        href: '/referrals',
        icon: Gift
      },
       {
        id: 'bonus',
        title: 'Daily Bonus',
        href: '/wallet',
        icon: Award
      },
    ]

    return (
        <div className="flex-1 space-y-4">
            <ImageSlider />
            <h1 className="text-xl font-bold tracking-tight text-center">Welcome back, {userProfile?.displayName || 'Champion'}!</h1>
            
            <TournamentSlider tournaments={tournaments} loading={loadingTournaments} />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCardsData.map((card) => (
                    <StatCard 
                        key={card.id}
                        label={card.title}
                        value={card.value || ''}
                        href={card.href}
                        icon={card.icon}
                    />
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {actionCardsData.map((card) => (
                     <ActionCard
                        key={card.id}
                        label={card.title}
                        href={card.href}
                        icon={card.icon}
                        badgeText={card.badgeText}
                    />
                ))}
            </div>
            
        </div>
    );
}