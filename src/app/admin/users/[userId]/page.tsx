'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, ShieldAlert, DollarSign, WalletCards, Swords, History, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { UserProfile, Transaction, Match, ActivityLog } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn, formatTimestamp } from '@/lib/utils';
import { useUser as useAuthUser } from '@/firebase/auth/use-user';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function UserProfilePage() {
    useAdminOnly();
    const params = useParams();
    const userId = params ? params.userId as string : '';
    const firestore = useFirestore();
    const { user: adminUser } = useAuthUser();
    const { toast } = useToast();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [adjustAmount, setAdjustAmount] = useState(0);
    const [adjustReason, setAdjustReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!userId || !firestore) return;
        setLoading(true);
        try {
            // User
            const userDoc = await getDoc(doc(firestore, "users", userId));
            if (!userDoc.exists()) {
                toast({ title: "Error", description: "User not found.", variant: "destructive" });
                return;
            }
            setUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);

            // Transactions
            const transQuery = query(collection(firestore, "transactions"), where("userId", "==", userId), orderBy("createdAt", "desc"));
            const transSnapshot = await getDocs(transQuery);
            setTransactions(transSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));

            // Matches
            const allMatchesQuery = query(collection(firestore, "matches"), orderBy("createdAt", "desc"));
            const allMatchesSnapshot = await getDocs(allMatchesQuery);
            const userMatches = allMatchesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Match))
                .filter(match => match.players && Object.keys(match.players).includes(userId));
            setMatches(userMatches);
            
            // Activity Logs
            const logQuery = query(collection(firestore, `users/${userId}/activity`), orderBy("timestamp", "desc"));
            const logSnapshot = await getDocs(logQuery);
            setActivityLogs(logSnapshot.docs.map(l => ({ id: l.id, ...l.data() } as ActivityLog)));

        } catch (error) {
            console.error("Error fetching user data: ", error);
            toast({ title: "Error", description: "Failed to fetch user data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [userId, firestore, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const logActivity = async (action: string, details: Record<string, any>) => {
        if (!firestore || !adminUser) return;
        const logRef = doc(collection(firestore, `users/${userId}/activity`));
        await setDoc(logRef, { 
            action,
            details,
            timestamp: serverTimestamp(),
            actor: { id: adminUser.uid, name: adminUser.displayName || 'Admin' }
        });
    };

    const handleBlockToggle = async () => {
        if (!user || !firestore) return;
        const userDocRef = doc(firestore, "users", userId);
        try {
            const newStatus = !user.isBlocked;
            await updateDoc(userDocRef, { isBlocked: newStatus });
            await logActivity(newStatus ? 'User Blocked' : 'User Unblocked', { by: 'admin' });
            toast({ title: "Success", description: `User has been ${newStatus ? 'blocked' : 'unblocked'}.` });
            setUser(prev => prev ? {...prev, isBlocked: newStatus} : null);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update user status.", variant: "destructive" });
        }
    };

    const handleAdminToggle = async () => {
        if (!user || !firestore) return;

        const functions = getFunctions();
        const setRoleFunction = httpsCallable(functions, 'setRole');

        try {
            const newRole = user.isAdmin ? 'none' : 'superAdmin'; // Simplified logic, assumes only superAdmin for now
            await setRoleFunction({ uid: userId, role: newRole });
            
            await logActivity(newRole !== 'none' ? 'Admin Status Granted' : 'Admin Status Revoked', { by: 'admin', role: newRole });
            toast({ title: "Success", description: `User admin status updated.` });
            setUser(prev => prev ? {...prev, isAdmin: newRole !== 'none'} : null);
        } catch(error: any) {
            toast({ title: "Error", description: error.message || "Failed to update admin status.", variant: "destructive" });
        }
    }

    const handleAdjustBalance = async (adjustmentType: 'add' | 'remove') => {
        if (!user || adjustAmount <= 0 || !firestore || !adjustReason.trim()) {
            toast({ title: "Invalid Input", description: "Please enter a positive amount and a reason.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);
        const finalAmount = adjustmentType === 'add' ? adjustAmount : -adjustAmount;

        try {
            const batch = writeBatch(firestore);
            const transactionRef = doc(collection(firestore, "transactions"));

            batch.set(transactionRef, {
                userId,
                amount: finalAmount,
                type: adjustmentType === 'add' ? 'admin_credit' : 'admin_debit',
                status: 'completed',
                description: adjustReason,
                createdAt: serverTimestamp(),
            });
            
            await batch.commit();

            await logActivity('Balance Adjusted', { amount: finalAmount, reason: adjustReason });
            
            toast({ title: "Success", description: `Balance adjustment transaction created. The balance will update shortly.`, className: "bg-green-100 text-green-800" });
            setAdjustAmount(0);
            setAdjustReason('');
            fetchData(); // Refresh data

        } catch (error) {
            console.error("Error adjusting balance: ", error);
            toast({ title: "Error", description: "Failed to adjust balance.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (!user) return <div className="text-center py-10">User not found.</div>;

    const totalWagered = transactions
        .filter(t => t.type === 'entry-fee')
        .reduce((acc, t) => acc - t.amount, 0); // Amount is negative

    return (
        <div className="space-y-6">
             <div className="grid gap-4 md:grid-cols-12">
                {/* Main User Card */}
                <Card className="md:col-span-8 lg:col-span-9">
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border">
                                <AvatarImage src={user.photoURL ?? undefined} />
                                <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{user.displayName}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={user.kycStatus === 'approved' ? 'default' : 'secondary'} className={cn({'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': user.kycStatus === 'approved'})}>{user.kycStatus ? user.kycStatus.replace('_', ' ') : "Not Submitted"}</Badge>
                                    {user.isAdmin && <Badge variant="destructive">Admin</Badge>}
                                    {user.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                                </div>
                            </div>
                        </div>
                        <div className="flex w-full md:w-auto flex-col md:flex-row gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><DollarSign className="mr-2 h-4 w-4"/> Adjust Wallet</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Adjust Wallet Balance</DialogTitle>
                                        <DialogDescription>Manually add or remove funds. This action will be logged.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div>
                                            <Label htmlFor="amount">Amount</Label>
                                            <Input id="amount" type="number" value={adjustAmount === 0 ? '' : adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <Label htmlFor="reason">Reason</Label>
                                            <Input id="reason" type="text" placeholder="e.g., Bonus credit, refund" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                                        <Button variant="destructive" onClick={() => handleAdjustBalance('remove')} disabled={isSubmitting}>Remove Funds</Button>
                                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAdjustBalance('add')} disabled={isSubmitting}>Add Funds</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                             <Button variant="outline" onClick={handleAdminToggle}>
                                <ShieldAlert className="mr-2 h-4 w-4"/> {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                            </Button>
                            <Button variant={user.isBlocked ? "outline" : "destructive"} onClick={handleBlockToggle}>
                                <ShieldAlert className="mr-2 h-4 w-4"/> {user.isBlocked ? "Unblock" : "Block"} User
                            </Button>
                        </div>
                    </CardHeader>
                </Card>
                {/* Wallet Balance Card */}
                <Card className="md:col-span-4 lg:col-span-3">
                     <CardHeader>
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <CardDescription>Available funds in wallet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="text-4xl font-bold">₹{user.walletBalance?.toLocaleString('en-IN') || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader><CardTitle>Total Wagered</CardTitle><CardDescription>₹{totalWagered.toLocaleString('en-IN')}</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle>Total Winnings</CardTitle><CardDescription>₹{(user.winnings || 0).toLocaleString('en-IN')}</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle>Matches Played</CardTitle><CardDescription>{user.totalMatchesPlayed || 0}</CardDescription></CardHeader></Card>
            </div>

            <Tabs defaultValue="transactions">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="transactions"><WalletCards className="mr-2 h-4 w-4"/> Transactions</TabsTrigger>
                    <TabsTrigger value="matches"><Swords className="mr-2 h-4 w-4"/> Match History</TabsTrigger>
                    <TabsTrigger value="activity"><History className="mr-2 h-4 w-4"/> Activity Log</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                     <Table>
                        <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {transactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium capitalize flex items-center gap-2">{t.amount > 0 ? <ArrowUpCircle className="h-5 w-5 text-green-500" /> : <ArrowDownCircle className="h-5 w-5 text-red-500" />}{t.type.replace(/_/g,' ')}</TableCell>
                                    <TableCell className={cn(t.amount > 0 ? 'text-green-600' : 'text-red-600', 'font-bold')}>₹{Math.abs(t.amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{t.description}</TableCell>
                                    <TableCell><Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className={cn({'bg-green-100 text-green-800': t.status === 'completed'})}>{t.status}</Badge></TableCell>
                                    <TableCell className="text-right">{formatTimestamp(t.createdAt)}</TableCell>
                                </TableRow>
                            ))}
                             {transactions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24">No transactions found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TabsContent>

                 <TabsContent value="matches">
                     <Table>
                        <TableHeader><TableRow><TableHead>Prize</TableHead><TableHead>Opponent</TableHead><TableHead>Result</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {matches.map(m => {
                                const isWinner = m.winnerId === userId;
                                const opponent = Object.values(m.players).find(p => p.id !== userId);
                                return (
                                <TableRow key={m.id}>
                                    <TableCell>₹{m.prizePool.toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{opponent?.name || 'N/A'}</TableCell>
                                    <TableCell>{m.status === 'completed' ? (isWinner ? 'Won' : 'Lost') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>{m.status as string}</Badge></TableCell>
                                    <TableCell className="text-right">{formatTimestamp(m.createdAt)}</TableCell>
                                </TableRow>
                            )})}
                            {matches.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24">No matches found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TabsContent>

                <TabsContent value="activity">
                     <Table>
                        <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>Actor</TableHead><TableHead className="text-right">Timestamp</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {activityLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.action}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground"><pre className="font-mono text-xs bg-muted p-2 rounded">{JSON.stringify(log.details, null, 2)}</pre></TableCell>
                                    <TableCell>{log.actor?.name}</TableCell>
                                    <TableCell className="text-right">{formatTimestamp(log.timestamp)}</TableCell>
                                </TableRow>
                            ))}
                            {activityLogs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No activity logs found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </div>
    );
}
