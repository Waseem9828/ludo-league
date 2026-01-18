"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Match, Tournament, UserProfile } from '@/lib/types';
import { TrendingUp, Zap, Users, Trophy, ChevronRight, Swords } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageSlider } from '@/components/app/ImageSlider';

const StatCard = ({ title, value, icon: Icon, link, loading }: { title: string, value: string | number, icon: React.ElementType, link?: string, loading: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold text-gradient-primary">{value}</div>}
            {link && !loading && (
                <Link href={link} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    View all
                </Link>
            )}
        </CardContent>
    </Card>
);

export default function DashboardPage() {
    const { user, userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [walletStats, setWalletStats] = useState({ balance: 0, winnings: 0 });
    const [gameStats, setGameStats] = useState({ matchesPlayed: 0, matchesWon: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [activeMatches, setActiveMatches] = useState<Match[]>([]);
    const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);
    const [loadingTournaments, setLoadingTournaments] = useState(true);

    useEffect(() => {
        if (user && userProfile) {
            setLoadingStats(true);
            setWalletStats({
                balance: userProfile.walletBalance || 0,
                winnings: userProfile.winnings || 0,
            });
            setGameStats({
                matchesPlayed: userProfile.totalMatchesPlayed || 0,
                matchesWon: userProfile.totalMatchesWon || 0,
            });
            setLoadingStats(false);
        }
    }, [user, userProfile]);

    useEffect(() => {
        async function fetchGameData() {
            if (!firestore) return;

            // Fetch Upcoming Tournaments
            setLoadingTournaments(true);
            try {
                const tournamentsQuery = query(
                    collection(firestore, 'tournaments'),
                    where('status', '==', 'upcoming'),
                    orderBy('startTime', 'asc'),
                    limit(3)
                );
                const tournamentSnapshots = await getDocs(tournamentsQuery);
                const tournaments = tournamentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tournament[];
                setUpcomingTournaments(tournaments);
            } catch (error) {
                console.error("Error fetching upcoming tournaments: ", error);
            } finally {
                setLoadingTournaments(false);
            }
        }

        fetchGameData();
    }, [firestore]);

    useEffect(() => {
        if (user && firestore && userProfile) {
            const fetchActiveMatches = async () => {
                const activeMatchIds = userProfile.activeMatchIds || [];
                if (activeMatchIds.length === 0) {
                    setActiveMatches([]);
                    setLoadingMatches(false);
                    return;
                }

                setLoadingMatches(true);
                try {
                    const matchPromises = activeMatchIds.map(id => getDoc(doc(firestore, 'matches', id)));
                    const matchDocs = await Promise.all(matchPromises);
                    const matches = matchDocs
                        .filter(docSnap => docSnap.exists())
                        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Match));
                    setActiveMatches(matches);
                } catch(error) {
                    console.error("Error fetching active matches:", error);
                } finally {
                    setLoadingMatches(false);
                }
            };

            fetchActiveMatches();
        } else if (!userLoading) {
            // If user is not logged in and not loading, clear matches.
            setActiveMatches([]);
            setLoadingMatches(false);
        }
    }, [user, firestore, userProfile, userLoading]);

    const loading = userLoading || loadingStats;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6 shadow-lg">
                <Image src="https://picsum.photos/seed/dashboard-banner/1200/400" alt="Dashboard Banner" fill className="object-cover" priority data-ai-hint="gaming dashboard" />
            </div>
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-gradient-primary">Welcome back, {userProfile?.displayName || 'User'}!</h2>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Wallet Balance" value={`₹${walletStats.balance.toFixed(2)}`} icon={Zap} link="/wallet" loading={loading} />
                <StatCard title="Total Winnings" value={`₹${walletStats.winnings.toFixed(2)}`} icon={Trophy} loading={loading} />
                <StatCard title="Matches Played" value={gameStats.matchesPlayed} icon={Users} loading={loading} />
                <StatCard title="Matches Won" value={gameStats.matchesWon} icon={TrendingUp} loading={loading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Active Matches */}
                <Card className="col-span-12 lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Your Active Matches</span>
                            <Link href="/lobby" className="text-sm font-normal text-primary hover:underline">Go to Lobby</Link>
                        </CardTitle>
                        <CardDescription>Your ongoing matches. Complete them to play more.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingMatches ? (
                            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                        ) : activeMatches.length > 0 ? (
                            activeMatches.map((match) => (
                                <Link key={match.id} href={`/match/${match.id}`} className="block hover:bg-muted/50 p-3 rounded-lg transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                             <div className="p-3 bg-primary/10 rounded-lg">
                                                <Swords className="h-6 w-6 text-primary"/>
                                             </div>
                                            <div>
                                                <p className="font-semibold">Match vs {Object.values(match.players).find(p => p.id !== user?.uid)?.name || 'Opponent'}</p>
                                                <p className="text-sm text-muted-foreground">Entry: ₹{match.entryFee}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-green-500">Prize: ₹{match.prizePool}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{match.status}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No active matches. Go to the lobby to find one!</p>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Tournaments */}
                <Card className="col-span-12 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Upcoming Tournaments</span>
                            <Link href="/tournaments" className="text-sm font-normal text-primary hover:underline">View All</Link>
                        </CardTitle>
                        <CardDescription>Join the next big event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {loadingTournaments ? (
                             Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                        ) : upcomingTournaments.length > 0 ? (
                            upcomingTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="block hover:bg-muted/50 p-3 rounded-lg transition-colors">
                                    <div className="flex items-start gap-4">
                                        <Image src={tournament.bannerImageUrl || `https://picsum.photos/seed/${tournament.id}/400/400`} alt={tournament.name} width={80} height={80} className="rounded-md w-20 h-20 object-cover" />
                                        <div className="flex-1">
                                            <p className="font-semibold">{tournament.name}</p>
                                            <p className="text-sm text-muted-foreground">Starts: {new Date(tournament.startTime.seconds * 1000).toLocaleDateString()}</p>
                                            <p className="text-sm text-muted-foreground">Prize: <span className="font-bold text-green-500">₹{tournament.prizePool}</span></p>
                                        </div>
                                         <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No upcoming tournaments.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
