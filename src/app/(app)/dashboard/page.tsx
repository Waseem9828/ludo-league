'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Banknote, ArrowUpRight, ArrowDownRight, User, BarChart, Swords, Gamepad2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import type { Match, Transaction, UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatTimestamp } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { ImageSlider } from "@/components/app/ImageSlider";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { formatDistanceToNow } from 'date-fns';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const bannerImages = PlaceHolderImages.filter(img => img.id.includes('-banner'));

const ActiveMatchesList = ({ matches, loading }: { matches: Match[], loading: boolean }) => {
    if (matches.length === 0 && !loading) {
        return null; // Don't render anything if there are no active matches
    }

    if (loading) {
        return (
            <div className="p-4 pt-4">
                <h2 className="text-lg font-semibold mb-4 px-2">Active Matches</h2>
                <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div>
            </div>
        );
    }

    return (
         <div className="p-4 pt-4">
            <h2 className="text-lg font-semibold mb-4 px-2">Active Matches ({matches.length})</h2>
            <div className="space-y-3">
                {matches.map(match => (
                    <Link key={match.id} href={`/match/${match.id}`}>
                        <Card className="p-3 flex items-center justify-between text-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Gamepad2 className="h-6 w-6 text-primary"/>
                                <div>
                                    <p className="font-semibold">Prize: ₹{match.prizePool}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Started {formatDistanceToNow(match.createdAt.toDate())} ago
                                    </p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline">View Match</Button>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}


const ActivityFeed = ({ activities, loading, userId }: { activities: (Match | Transaction)[], loading: boolean, userId: string | undefined }) => {
    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div>;

    return (
        <div className="p-4 pt-4">
            <h2 className="text-lg font-semibold mb-4 px-2">Recent Activity</h2>
            {activities.length > 0 ? (
                <div className="space-y-3">
                    {activities.map((act : any) => {
                        if (act._type === 'match') {
                            const opponent = act.players ? Object.values(act.players).find((p: any) => p.id !== userId) : null;
                            const won = act.winnerId === userId;
                            return (
                                <Card key={act.id} className="p-3 flex items-center justify-between text-sm shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3"><User className="h-5 w-5 text-muted-foreground"/>
                                        <div>
                                            <p className="font-semibold">vs {(opponent as any)?.name || 'player'}</p>
                                            <p className="text-xs text-muted-foreground">Prize: ₹{act.prizePool}</p>
                                        </div>
                                    </div>
                                    <Badge className={cn(won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'text-white')}>{won ? 'Win' : 'Loss'}</Badge>
                                </Card>
                            );
                        } else {
                            const isCredit = act.amount > 0;
                            return (
                                <Card key={act.id} className="p-3 flex items-center justify-between text-sm shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        {isCredit ? <ArrowUpRight className="h-5 w-5 text-green-500"/> : <ArrowDownRight className="h-5 w-5 text-red-500"/>}
                                        <div>
                                            <p className="font-semibold capitalize">{act.description}</p>
                                            <p className="text-xs text-muted-foreground">{formatTimestamp(act.createdAt)}</p>
                                        </div>
                                    </div>
                                    <p className={cn("font-bold text-base", isCredit ? 'text-green-500' : 'text-red-500')}>{isCredit ? '+' : '-'}₹{Math.abs(act.amount)}</p>
                                </Card>
                            );
                        }
                    })}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-4">No recent activity.</p>
            )}
        </div>
    );
};

function DashboardClientContent() {
    const { user, userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [dashboardData, setDashboardData] = useState<{
        activeMatches: Match[],
        recentActivity: (Match | Transaction)[]
    }>({ activeMatches: [], recentActivity: [] });
    const [dataLoading, setDataLoading] = useState(true);

    const handleClaimSuperAdmin = async () => {
        try {
            const functions = getFunctions();
            const claimSuperAdminRole = httpsCallable(functions, 'claimSuperAdminRole');
            const result = await claimSuperAdminRole();
            toast({
                title: "Success",
                description: (result.data as any).message,
                className: 'bg-green-100 text-green-800'
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: 'destructive'
            });
        }
    };

     useEffect(() => {
        if (!user || !firestore) return;

        const claimBonus = async () => {
            try {
                const functions = getFunctions();
                const dailyLoginBonus = httpsCallable(functions, 'dailyLoginBonus');
                const result = await dailyLoginBonus();
                const data = result.data as { success: boolean, message: string };
                if (data.success && data.message !== "Daily bonus already claimed for today.") {
                    toast({
                        title: "Daily Login Bonus!",
                        description: data.message,
                        className: 'bg-green-100 text-green-800'
                    });
                }
            } catch (error: any) {
                // Don't show toast for errors like already claimed, it's not a user-facing issue.
                console.error("Error claiming daily bonus:", error.message);
            }
        };

        claimBonus();

    }, [user, firestore, toast]);

    useEffect(() => {
        if (!user || !firestore || !userProfile) {
            setDataLoading(userLoading);
            return;
        };

        const fetchDashboardData = async () => {
            setDataLoading(true);
            try {
                // 1. Fetch Active Matches
                const activeMatchIds = userProfile.activeMatchIds || [];
                let activeMatches: Match[] = [];
                if (activeMatchIds.length > 0) {
                    const matchPromises = activeMatchIds.map(id => getDoc(doc(firestore, 'matches', id)));
                    const matchDocs = await Promise.all(matchPromises);
                    activeMatches = matchDocs
                        .filter(docSnap => docSnap.exists())
                        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Match))
                        .sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
                }

                // 2. Fetch Recent Activity
                const matchesQuery = query(
                    collection(firestore, 'matches'), 
                    where('playerIds', 'array-contains', user.uid), 
                    orderBy('createdAt', 'desc'), 
                    limit(3)
                );
                const transQuery = query(
                    collection(firestore, 'transactions'), 
                    where('userId', '==', user.uid), 
                    orderBy('createdAt', 'desc'), 
                    limit(5)
                );

                const [matchesSnap, transSnap] = await Promise.all([
                    getDocs(matchesQuery),
                    getDocs(transQuery)
                ]);
                
                const fetchedMatches = matchesSnap.docs.map(d => ({ ...d.data(), _type: 'match', id: d.id } as Match & { _type: 'match' }));
                const fetchedTransactions = transSnap.docs.map(d => ({ ...d.data(), _type: 'transaction', id: d.id } as Transaction & { _type: 'transaction' }));

                const recentActivity = [...fetchedMatches, ...fetchedTransactions].sort((a, b) => {
                    if (!b.createdAt || !a.createdAt) return 0;
                    return b.createdAt.seconds - a.createdAt.seconds;
                }).slice(0, 5);

                setDashboardData({ activeMatches, recentActivity });

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setDataLoading(false);
            }
        };

        fetchDashboardData();

    }, [user, userProfile, firestore, userLoading]);

    if (userLoading || !user || !userProfile) {
        return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto max-w-lg space-y-6">
            {user.uid === '8VHy30yW04XgFsRlnPo1ZzQPCch1' && (
                <Card className="bg-yellow-100 border-yellow-400">
                    <CardHeader>
                        <CardTitle>Super Admin Claim</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Click the button below to claim your super admin role.</p>
                        <Button onClick={handleClaimSuperAdmin} className="mt-4">Claim Role</Button>
                    </CardContent>
                </Card>
            )}
            { (userProfile.kycStatus === 'not_submitted' || userProfile.kycStatus === 'rejected') &&
                <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
                    <ShieldCheck className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
                    <AlertTitle className="font-bold text-amber-900 dark:text-amber-200">KYC Verification Required</AlertTitle>
                    <AlertDescription className="flex justify-between items-center text-amber-800 dark:text-amber-300">
                        <span>Complete your KYC to enable withdrawals.</span>
                        <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-full">
                        <Link href="/kyc">
                            {userProfile.kycStatus === 'rejected' ? 'Resubmit KYC' : 'Complete KYC'}
                        </Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            }
            <Card>
                <CardHeader>
                    {/* User Welcome */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                             <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage src={userProfile.photoURL ?? undefined} />
                                <AvatarFallback className="bg-primary/20">{userProfile.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm text-muted-foreground">Welcome Back,</p>
                                <h1 className="text-xl font-bold">{userProfile.displayName}</h1>
                            </div>
                        </div>
                        {/* Wallet Balance as a chip */}
                        <div className="text-right">
                             <p className="text-sm font-medium text-primary">Balance</p>
                             <p className="text-2xl font-bold tracking-tight">₹{userProfile.walletBalance?.toLocaleString('en-IN') || 0}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                     {/* Wallet Actions */}
                    <Button asChild className="bg-gradient-primary rounded-full">
                        <Link href="/wallet"> <Banknote className="mr-2 h-4 w-4"/>Deposit </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full">
                         <Link href="/wallet">Withdraw</Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Button asChild size="lg" className="h-20 shadow-lg rounded-xl flex-col gap-1 bg-gradient-primary">
                    <Link href="/lobby" className="text-lg"><Swords className="h-6 w-6"/> Play Now</Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="h-20 shadow-lg rounded-xl flex-col gap-1">
                    <Link href="/leaderboard"><BarChart className="mr-2 h-6 w-6"/> Leaderboard</Link>
                </Button>
            </div>
            
            <ActiveMatchesList matches={dashboardData.activeMatches} loading={dataLoading} />
            <ActivityFeed activities={dashboardData.recentActivity} loading={dataLoading} userId={user.uid} />
        </div>
    );
}

// The main page is a Server Component that renders the client part
export default function DashboardPage() {
    return (
        <div className="bg-background min-h-screen space-y-6">
             <ImageSlider />
             <DashboardClientContent />
        </div>
    );
}
