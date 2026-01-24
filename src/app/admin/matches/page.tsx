
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from "@/firebase";
import { collection, query, onSnapshot, orderBy, where, Timestamp, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Crown, Loader2, Wallet, Users, DollarSign } from "lucide-react";
import type { Match, MatchPlayer, Transaction } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, loading }: { title: string; value: string; icon: React.ElementType; loading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

export default function MatchesDashboardPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('UNDER_REVIEW'); // Default to disputed view

    useEffect(() => {
        if (!firestore) return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTimestamp = Timestamp.fromDate(todayStart);

        const matchesQuery = query(collection(firestore, "matches"), orderBy("createdAt", "desc"));
        const transQuery = query(collection(firestore, "transactions"), where("type", "==", "match_commission"), where("createdAt", ">=", todayStartTimestamp));

        const unsubMatches = onSnapshot(matchesQuery, (snapshot) => {
            setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching matches: ", error);
            setLoading(false);
        });

        const unsubTrans = onSnapshot(transQuery, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
        });

        return () => {
            unsubMatches();
            unsubTrans();
        };
    }, [firestore]);

    const stats = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const matchesToday = matches.filter(m => m.createdAt && format(m.createdAt.toDate(), 'yyyy-MM-dd') === todayStr);
        
        const totalMatchesToday = matchesToday.length;
        const totalAmountToday = matchesToday.reduce((acc, m) => acc + (m.entryFee * (m.playerIds?.length || 0)), 0);
        const commissionToday = transactions.reduce((acc, t) => acc + t.amount, 0);

        return { totalMatchesToday, totalAmountToday, commissionToday };
    }, [matches, transactions]);

    const filteredMatches = useMemo(() => {
        if (filter === 'all') return matches;
        return matches.filter(m => m.status === filter);
    }, [matches, filter]);

    const handleMatchClick = (matchId: string) => {
        router.push(`/admin/matches/${matchId}`);
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Matches Dashboard</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Matches Today" value={stats.totalMatchesToday.toLocaleString()} icon={Swords} loading={loading} />
                <StatCard title="Total Amount Today" value={`₹${stats.totalAmountToday.toLocaleString()}`} icon={Wallet} loading={loading} />
                <StatCard title="Commission Today" value={`₹${stats.commissionToday.toLocaleString()}`} icon={DollarSign} loading={loading} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Match History</CardTitle>
                    <CardDescription>Browse and manage all matches played. Default view shows matches under review.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="UNDER_REVIEW" value={filter} onValueChange={setFilter} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                            <TabsTrigger value="UNDER_REVIEW">Under Review</TabsTrigger>
                            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                            <TabsTrigger value="waiting">Waiting</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                            <TabsTrigger value="all">All</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    <div className="mt-4">
                        {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                        : filteredMatches.length === 0 ? <div className="text-center py-10 text-muted-foreground"><p>No {filter} matches found.</p></div>
                        :
                        <>
                            <div className="hidden md:block border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Players</TableHead>
                                            <TableHead>Prize</TableHead>
                                            <TableHead>Winner</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMatches.map((match) => (
                                            <TableRow key={match.id} onClick={() => handleMatchClick(match.id)} className="cursor-pointer hover:bg-muted/50">
                                                <TableCell className="flex items-center gap-4">
                                                    <div className="flex items-center -space-x-2">
                                                        {Object.values(match.players || {})?.map((p: MatchPlayer) => (
                                                            <Avatar key={`${match.id}-${p.id}`} className="h-8 w-8 border-2 border-background">
                                                                <AvatarImage src={p.avatarUrl} />
                                                                <AvatarFallback>{p.name?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                    <span className="font-medium">{Object.values(match.players || {})?.map((p: MatchPlayer) => p.name).join(' vs ')}</span>
                                                </TableCell>
                                                <TableCell className="font-semibold">₹{match.prizePool.toLocaleString('en-IN')}</TableCell>
                                                <TableCell>
                                                    {match.winnerId ? 
                                                        Object.values(match.players || {})?.find((p: MatchPlayer) => p.id === match.winnerId)?.name : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={match.status === 'completed' ? 'default' : match.status === 'UNDER_REVIEW' ? 'destructive' : 'secondary'} className={cn({'bg-green-100 text-green-800': match.status === 'completed', 'bg-yellow-100 text-yellow-800': ['in-progress', 'waiting'].includes(match.status as string)})}>{match.status}</Badge>
                                                </TableCell>
                                                <TableCell>{match.createdAt?.toDate ? match.createdAt.toDate().toLocaleString() : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-4 md:hidden">
                                {filteredMatches.map((match) => (
                                    <Card key={match.id} className="p-4" onClick={() => handleMatchClick(match.id)}>
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-lg">Prize: ₹{match.prizePool.toLocaleString('en-IN')}</p>
                                            <Badge variant={match.status === 'completed' ? 'default' : match.status === 'UNDER_REVIEW' ? 'destructive' : 'secondary'} className={cn({'bg-green-100 text-green-800': match.status === 'completed', 'bg-yellow-100 text-yellow-800': ['in-progress', 'waiting'].includes(match.status as string)})}>{match.status}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">{match.createdAt?.toDate ? match.createdAt.toDate().toLocaleString() : 'N/A'}</p>
                                        
                                        <div className="space-y-3">
                                            {Object.values(match.players || {})?.map((p: MatchPlayer) => (
                                                <div key={`${match.id}-${p.id}`} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={p.avatarUrl} />
                                                            <AvatarFallback>{p.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{p.name}</span>
                                                    </div>
                                                    {match.winnerId === p.id && <Crown className="h-5 w-5 text-yellow-500"/>}
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                        }
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    