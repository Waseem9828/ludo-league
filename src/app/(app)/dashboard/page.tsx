
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, DocumentSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Match, Tournament, UserProfile } from '@/lib/types';
import { TrendingUp, Zap, Users, Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';


const StatCard = ({ title, value, icon: Icon, link, loading }: { title: string, value: string | number, icon: React.ElementType, link?: string, loading: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
            {link && !loading && (
                <Link href={link} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    View all
                </Link>
            )}
        </CardContent>
    </Card>
);

const RecentActivityItem = ({ text, time, loading }: { text: string, time: string, loading: boolean }) => (
    <div className="flex items-center">
        {loading ? (
            <>
                <Skeleton className="h-10 w-10 rounded-full mr-4" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </>
        ) : (
            <>
                <Avatar className="h-9 w-9 mr-4">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">{text}</p>
                    <p className="text-sm text-muted-foreground">{time}</p>
                </div>
            </>
        )}
    </div>
);

export default function DashboardPage() {
    const { user, userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [walletStats, setWalletStats] = useState({ balance: 0, winnings: 0 });
    const [gameStats, setGameStats] = useState({ matchesPlayed: 0, tournamentsWon: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [liveMatches, setLiveMatches] = useState<Match[]>([]);
    const [featuredTournaments, setFeaturedTournaments] = useState<Tournament[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [loadingTournaments, setLoadingTournaments] = useState(true);


    useEffect(() => {
        async function fetchStats() {
            if (user && userProfile && firestore) {
                setLoadingStats(true);
                // Fetch wallet stats from the specific user document
                setWalletStats({
                    balance: userProfile.wallet?.balance || 0,
                    winnings: userProfile.wallet?.winnings || 0,
                });

                // Fetch game stats from user document
                setGameStats({
                    matchesPlayed: userProfile.stats?.matchesPlayed || 0,
                    tournamentsWon: userProfile.stats?.tournamentsWon || 0,
                });
                setLoadingStats(false);
            }
        }

        fetchStats();
    }, [user, userProfile, firestore]);

    useEffect(() => {
        async function fetchGameData() {
            if (!firestore) return;

            // Fetch Live Matches
            setLoadingMatches(true);
            try {
                const matchesQuery = query(
                    collection(firestore, 'matches'),
                    where('status', '==', 'live'),
                    limit(5)
                );
                const matchSnapshots = await getDocs(matchesQuery);
                const matches = matchSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
                setLiveMatches(matches);
            } catch (error) {
                console.error("Error fetching live matches: ", error);
            } finally {
                setLoadingMatches(false);
            }

            // Fetch Featured Tournaments
            setLoadingTournaments(true);
            try {
                const tournamentsQuery = query(
                    collection(firestore, 'tournaments'),
                    where('isFeatured', '==', true),
                    limit(3)
                );
                const tournamentSnapshots = await getDocs(tournamentsQuery);
                const tournaments = tournamentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tournament[];
                setFeaturedTournaments(tournaments);
            } catch (error) {
                console.error("Error fetching featured tournaments: ", error);
            } finally {
                setLoadingTournaments(false);
            }
        }

        fetchGameData();
    }, [firestore]);

     useEffect(() => {
        if (user && firestore) {
            const fetchActiveMatches = async () => {
                 if (!userProfile?.activeMatches || userProfile.activeMatches.length === 0) {
                    setLiveMatches([]);
                    setLoadingMatches(false);
                    return;
                }

                setLoadingMatches(true);
                const activeMatchIds = userProfile.activeMatches;
                let activeMatches: Match[] = [];
                if (activeMatchIds.length > 0) {
                    const matchPromises = activeMatchIds.map((id: any) => getDoc(doc(firestore, 'matches', id)));
                    const matchDocs = await Promise.all(matchPromises);
                    activeMatches = matchDocs
                        .filter((docSnap: DocumentSnapshot) => docSnap.exists())
                        .map((docSnap: DocumentSnapshot) => ({ id: docSnap.id, ...docSnap.data() } as Match));
                }
                setLiveMatches(activeMatches);
                setLoadingMatches(false);
            };

            fetchActiveMatches();
        }
    }, [user, firestore, userProfile?.activeMatches]);

    const loading = userLoading || loadingStats;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Welcome back, {userProfile?.name || 'User'}!</h2>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Wallet Balance" value={`₹${walletStats.balance.toFixed(2)}`} icon={Zap} link="/wallet" loading={loading} />
                <StatCard title="Winnings" value={`₹${walletStats.winnings.toFixed(2)}`} icon={Trophy} loading={loading} />
                <StatCard title="Matches Played" value={gameStats.matchesPlayed} icon={Users} loading={loading} />
                <StatCard title="Tournaments Won" value={gameStats.tournamentsWon} icon={TrendingUp} loading={loading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Live Matches */}
                <Card className="col-span-12 lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Live Matches</span>
                            <Link href="/lobby" className="text-sm font-normal text-primary hover:underline">View All</Link>
                        </CardTitle>
                        <CardDescription>Join ongoing matches and start playing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingMatches ? (
                            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                        ) : liveMatches.length > 0 ? (
                            liveMatches.map((match) => (
                                <Link key={match.id} href={`/match/${match.id}`} className="block hover:bg-muted/50 p-3 rounded-lg transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                             <Image src={match.game.cover_image_url} alt={match.game.title} width={64} height={64} className="rounded-md w-16 h-16 object-cover" />
                                            <div>
                                                <p className="font-semibold">{match.game.title}</p>
                                                <p className="text-sm text-muted-foreground">Entry: ₹{match.entryFee}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-green-500">Prize: ₹{match.prize_pool}</p>
                                            <p className="text-sm text-muted-foreground">Live Now</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No live matches currently.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Featured Tournaments */}
                <Card className="col-span-12 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Featured Tournaments</span>
                            <Link href="/tournaments" className="text-sm font-normal text-primary hover:underline">View All</Link>
                        </CardTitle>
                        <CardDescription>Compete in special events for bigger prizes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {loadingTournaments ? (
                             Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                        ) : featuredTournaments.length > 0 ? (
                            featuredTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="block hover:bg-muted/50 p-3 rounded-lg transition-colors">
                                    <div className="flex items-start gap-4">
                                        <Image src={tournament.game.cover_image_url} alt={tournament.game.title} width={80} height={80} className="rounded-md w-20 h-20 object-cover" />
                                        <div className="flex-1">
                                            <p className="font-semibold">{tournament.name}</p>
                                            <p className="text-sm text-muted-foreground">Game: {tournament.game.title}</p>
                                            <p className="text-sm text-muted-foreground">Prize: <span className="font-bold text-green-500">₹{tournament.prize_pool}</span></p>
                                        </div>
                                         <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No featured tournaments.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
