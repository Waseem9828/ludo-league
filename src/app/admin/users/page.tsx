
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from "@/firebase";
import { collection, query, onSnapshot, orderBy, where, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, UserPlus, BarChart2, Gamepad2, Trophy, Wallet, ShieldCheck, Swords, ArrowDownCircle } from "lucide-react";
import type { UserProfile } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { getFunctions, httpsCallable } from 'firebase/functions';

const UserStats = () => {
    const [stats, setStats] = useState({ total: 0, newToday: 0, active: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const functions = getFunctions();
                const getStats = httpsCallable(functions, 'getAdminUserStats');
                const result = await getStats();
                setStats(result.data as any);
            } catch (error) {
                console.error("Error fetching user stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: number, icon: React.ElementType, isLoading: boolean }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{value.toLocaleString('en-IN')}</div>}
            </CardContent>
        </Card>
    );

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
            <StatCard title="Total Users" value={stats.total} icon={Users} isLoading={loading} />
            <StatCard title="New Users (Today)" value={stats.newToday} icon={UserPlus} isLoading={loading} />
            <StatCard title="Active Users (7 days)" value={stats.active} icon={BarChart2} isLoading={loading} />
        </div>
    );
}

export default function UsersPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "users"), orderBy("displayName", "asc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersList: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                usersList.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });
            setUsers(usersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleUserClick = (userId: string) => {
        router.push(`/admin/users/${userId}`);
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
    }


    return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <UserStats />
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> All Users</CardTitle>
                <CardDescription>Select a user to view details and manage their account. Data is updated in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>KYC Status</TableHead>
                                <TableHead>Admin</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.uid} onClick={() => handleUserClick(user.uid)} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL ?? undefined} />
                                                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium whitespace-nowrap">{user.displayName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="font-semibold">₹{user.walletBalance?.toLocaleString('en-IN') || 0}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.kycStatus === 'approved' ? 'default' : 'secondary'} className={cn({'bg-green-100 text-green-800': user.kycStatus === 'approved'})}>
                                            {user.kycStatus?.replace('_', ' ') || 'Not Submitted'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.isAdmin && <Badge variant="destructive">Admin</Badge>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <div className="grid gap-4 md:hidden">
                    {users.map((user) => {
                        const totalMatches = user.totalMatchesPlayed || 0;
                        const totalWins = user.totalMatchesWon || 0;
                        const totalLosses = totalMatches - totalWins;
                        const isActiveInMatch = (user.activeMatchIds?.length || 0) > 0;
                        const isInTournament = (user.joinedTournamentIds?.length || 0) > 0;
                        return (
                        <Card key={user.uid} onClick={() => handleUserClick(user.uid)} className="p-4 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar>
                                    <AvatarImage src={user.photoURL ?? undefined} />
                                    <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{user.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground"/>Balance: <span className="font-bold ml-auto">₹{user.walletBalance?.toLocaleString('en-IN') || 0}</span></div>
                                    <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-muted-foreground"/>Winnings: <span className="font-bold ml-auto">₹{user.winnings?.toLocaleString('en-IN') || 0}</span></div>
                                    <div className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-muted-foreground"/>Withdrawn: <span className="font-bold ml-auto">₹{user.totalWithdrawals?.toLocaleString('en-IN') || 0}</span></div>
                                    <div className="flex items-center gap-2"><Swords className="h-4 w-4 text-muted-foreground"/>Matches: <span className="font-bold ml-auto">{totalMatches}</span></div>
                                    <div className="flex items-center gap-2 text-xs col-span-2">
                                        <span className="text-green-500">Won: {totalWins}</span> / <span className="text-red-500">Lost: {totalLosses}</span>
                                    </div>
                                </div>
                                
                                <div className="border-t pt-3 space-y-2">
                                     <div className="flex justify-between">
                                        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-muted-foreground"/>KYC Status:</div>
                                        <Badge variant={user.kycStatus === 'approved' ? 'default' : 'secondary'} className={cn({'bg-green-100 text-green-800': user.kycStatus === 'approved'})}>
                                            {user.kycStatus?.replace('_', ' ') || 'Not Submitted'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-muted-foreground"/>Active Status:</div> 
                                        {isActiveInMatch || isInTournament ? (
                                            <Badge variant="destructive" className="animate-pulse">Active</Badge>
                                        ) : (
                                            <Badge variant="secondary">Idle</Badge>
                                        )}
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="flex items-center gap-2">Admin:</div>
                                        {user.isAdmin ? <Badge variant="destructive">Yes</Badge> : <span className="text-muted-foreground">No</span>}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )})}
                </div>
            </CardContent>
        </Card>
        </div>
    );
}

    

    