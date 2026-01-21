
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tournament } from '@/lib/types';
import { TrendingUp, Zap, Users, Trophy, Swords, Gift, Award } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ImageSlider } from '@/components/app/ImageSlider';

// Welcome Message Component
const AnimatedWelcome = ({ name }: { name: string }) => {
    const welcomeText = `Welcome back, ${name}!`;
    
    const sentence = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: {
                delay: 0.1,
                staggerChildren: 0.05,
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

    return (
        <motion.h2 
            className="text-2xl font-bold tracking-tight text-gradient-primary mb-4 text-center"
            variants={sentence}
            initial="hidden"
            animate="visible"
        >
            {welcomeText.split("").map((char, index) => (
                <motion.span key={char + "-" + index} variants={letter}>
                    {char}
                </motion.span>
            ))}
        </motion.h2>
    );
};


const StatCard = ({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold text-gradient-primary">{value}</div>}
        </CardContent>
    </Card>
);

const TournamentSlider = ({ tournaments, loading }: { tournaments: Tournament[], loading: boolean }) => {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 5000 })]);

  if (loading) {
      return (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
              <Skeleton className="h-full w-full" />
          </div>
      );
  }

  if (tournaments.length === 0) {
    return (
      <Card className="flex items-center justify-center h-48 bg-muted">
        <p className="text-muted-foreground">No tournaments available right now.</p>
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
                <div className="relative aspect-video w-full">
                  <Image
                    src={tournament.bannerImageUrl || `https://picsum.photos/seed/${tournament.id}/800/400`}
                    alt={tournament.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4 text-white">
                    <Badge className="mb-2">{tournament.status.toUpperCase()}</Badge>
                    <h3 className="text-lg font-bold">{tournament.name}</h3>
                    <p className="text-sm">Prize Pool: <span className="font-bold text-green-400">₹{tournament.prizePool.toLocaleString()}</span></p>
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

const ActionCard = ({ title, href, icon: Icon, badgeText }: { title: string, href: string, icon: React.ElementType, badgeText?: string }) => (
    <Link href={href} className="block hover:scale-[1.02] transition-transform duration-300">
        <Card className="h-full bg-card shadow-lg hover:shadow-primary/20 border-border hover:border-primary/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Icon className="h-6 w-6 text-primary"/>
                        </div>
                        <CardTitle className="text-md">{title}</CardTitle>
                    </div>
                    {badgeText && <Badge variant="destructive">{badgeText}</Badge>}
                </div>
            </CardHeader>
        </Card>
    </Link>
);


export default function DashboardPage() {
    const { user, userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [stats, setStats] = useState({ walletBalance: 0, winnings: 0, matchesPlayed: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loadingTournaments, setLoadingTournaments] = useState(true);

    useEffect(() => {
        if (user && userProfile) {
            setLoadingStats(true);
            setStats({
                walletBalance: userProfile.walletBalance || 0,
                winnings: userProfile.winnings || 0,
                matchesPlayed: userProfile.totalMatchesPlayed || 0,
            });
            setLoadingStats(false);
        }
    }, [user, userProfile]);

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


    const loading = userLoading || loadingStats;

    return (
        <div className="flex-1 space-y-6">
            <ImageSlider />
            <AnimatedWelcome name={userProfile?.displayName || 'Champion'}/>
            
            <TournamentSlider tournaments={tournaments} loading={loadingTournaments} />
            
            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <StatCard title="Wallet" value={`₹${stats.walletBalance.toFixed(2)}`} icon={Zap} loading={loading} />
                <StatCard title="Winnings" value={`₹${stats.winnings.toFixed(2)}`} icon={Trophy} loading={loading} />
                <StatCard title="Matches" value={stats.matchesPlayed} icon={Users} loading={loading} />
                <StatCard title="Win Rate" value={`${userProfile?.winRate?.toFixed(0) || 0}%`} icon={TrendingUp} loading={loading} />
            </div>

            {/* Action Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                 <ActionCard 
                    title="Active Matches"
                    href="/lobby"
                    icon={Swords}
                    badgeText={(userProfile?.activeMatchIds?.length || 0) > 0 ? userProfile?.activeMatchIds?.length.toString() : undefined}
                 />
                 <ActionCard 
                    title="Referral Fund"
                    href="/referrals"
                    icon={Gift}
                 />
                 <ActionCard 
                    title="Daily Bonus"
                    href="/wallet" // Linking to wallet as bonus page doesn't exist
                    icon={Award}
                 />
            </div>
            
        </div>
    );
}
