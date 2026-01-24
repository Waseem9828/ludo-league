
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from "@/firebase";
import { collection, query, onSnapshot, orderBy, doc, getDoc, updateDoc, serverTimestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, Loader2, Hourglass, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DepositRequest } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DepositStats = ({ requests, loading }: { requests: DepositRequest[], loading: boolean }) => {
    const stats = requests.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
    }, { pending: 0, approved: 0, rejected: 0 });

    const StatCard = ({ title, value, icon: Icon, isLoading, variant }: { title: string, value: number, icon: React.ElementType, isLoading: boolean, variant?: "destructive" }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-4 w-4", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    );

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
            <StatCard title="Pending Requests" value={stats.pending} icon={Hourglass} isLoading={loading} />
            <StatCard title="Approved Deposits" value={stats.approved} icon={ShieldCheck} isLoading={loading} />
            <StatCard title="Rejected Deposits" value={stats.rejected} icon={XCircle} isLoading={loading} variant="destructive"/>
        </div>
    );
}

const RejectionDialog = ({ onConfirm, loading }: { onConfirm: (reason: string) => void, loading: boolean }) => {
    const [reason, setReason] = useState('');

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="icon" variant="destructive" className="h-8 w-8"><XCircle className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Rejection</DialogTitle>
                    <DialogDescription>Please provide a reason for rejecting this deposit request.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="rejection-reason">Rejection Reason</Label>
                    <Input id="rejection-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., UTR not found, screenshot unclear"/>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={!reason || loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm Rejection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DepositsPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const { user: adminUser, role } = useUser();

    const [requests, setRequests] = useState<DepositRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('pending');
    const { toast } = useToast();

    const canManageDeposits = role === 'superAdmin' || role === 'depositAdmin';

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "depositRequests"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const depositRequests: DepositRequest[] = [];
            querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
                depositRequests.push({ id: doc.id, ...doc.data() } as DepositRequest);
            });
            setRequests(depositRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching deposits: ", error);
            toast({ title: "Error", description: "Could not fetch deposit requests.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, toast]);

    const handleUpdateStatus = useCallback(async (request: DepositRequest, status: 'approved' | 'rejected', rejectionReason?: string) => {
        if (!firestore || !adminUser || !canManageDeposits) {
            toast({ title: "Permission Denied", description: "You don't have rights to perform this action.", variant: "destructive" });
            return;
        }

        if (status === 'rejected' && !rejectionReason) {
            toast({ title: "Rejection reason is required", variant: "destructive" });
            return;
        }

        setActionLoading(prev => ({ ...prev, [request.id]: true }));

        const depositRef = doc(firestore, "depositRequests", request.id);

        try {
            const depositDoc = await getDoc(depositRef);
            if (!depositDoc.exists() || depositDoc.data().status !== 'pending') {
                throw new Error("This request has already been processed or does not exist.");
            }

            await updateDoc(depositRef, {
                status,
                reviewedAt: serverTimestamp(),
                reviewedBy: adminUser.uid,
                rejectionReason: status === 'rejected' ? rejectionReason : null,
            });

            toast({ 
                title: `Request marked as ${status}`,
                description: "The system will now process the transaction and update the user's balance.",
                variant: status === 'approved' ? 'default' : 'destructive',
                className: status === 'approved' ? 'bg-green-100 text-green-800' : ''
            });

        } catch (error: any) {
            console.error("Error updating status: ", error);
            toast({ title: "Update Error", description: error.message, variant: "destructive" });
        } finally {
            setActionLoading(prev => ({ ...prev, [request.id]: false }));
        }
    }, [firestore, adminUser, canManageDeposits, toast]);
    
    const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

    const renderRow = (request: DepositRequest, isMobile = false) => {
        const ActionButtons = () => (
            <div className={cn("flex gap-2", isMobile ? "justify-between mt-4" : "justify-end")}>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size={isMobile ? "sm" : "icon"} className={cn({"h-8 w-8": !isMobile})}>
                            <Eye className="h-4 w-4" /> {isMobile && <span className="ml-2">View Screenshot</span>}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Deposit Screenshot</DialogTitle>
                            <DialogDescription>UTR: {request.utr}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <a href={request.screenshotUrl} target='_blank' rel='noopener noreferrer'>
                                <Image src={request.screenshotUrl} alt="Deposit Screenshot" width={400} height={800} className="w-full h-auto rounded-md" />
                            </a>
                        </div>
                    </DialogContent>
                 </Dialog>
                {canManageDeposits && request.status === 'pending' && (
                    <div className={cn("flex gap-2", {"w-full": isMobile})}>
                         <Button 
                            size={isMobile ? 'sm' : 'icon'} 
                            className={cn("h-8 w-8 bg-green-500 hover:bg-green-600 text-white", {"flex-1": isMobile})}
                            onClick={() => handleUpdateStatus(request, 'approved')}
                            disabled={actionLoading[request.id]}
                        >
                            {actionLoading[request.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : isMobile ? <><CheckCircle className="h-4 w-4 mr-2"/>Approve</> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <RejectionDialog 
                            loading={actionLoading[request.id]} 
                            onConfirm={(reason) => handleUpdateStatus(request, 'rejected', reason)} 
                        />
                    </div>
                )}
            </div>
        )

        if (isMobile) {
            return (
                <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar>
                                <AvatarImage src={request.userAvatar} />
                                <AvatarFallback>{request.userName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold">{request.userName || 'Unknown User'}</p>
                                <p className="text-sm text-muted-foreground">{request.createdAt?.toDate().toLocaleString('en-GB')}</p>
                            </div>
                        </div>
                        <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'} className={cn({'bg-green-100 text-green-800': request.status === 'approved', 'bg-yellow-100 text-yellow-800': request.status === 'pending'})}>{request.status}</Badge>
                    </div>
                    <div className="mt-2 space-y-2 text-sm">
                        <div className="flex justify-between"><span>Amount:</span> <span className="font-bold">₹{request.amount.toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between items-center"><span>UTR:</span> <span className="font-mono text-xs bg-muted p-1 rounded">{request.utr}</span></div>
                         {request.status !== 'pending' && <div className="flex justify-between items-center pt-2 border-t"><span>Reviewed By:</span> <span className="text-xs">{request.reviewedBy || 'N/A'}</span></div>}
                         {request.status === 'rejected' && <div className="flex justify-between items-center"><span>Reason:</span> <span className="text-xs">{request.rejectionReason}</span></div>}
                    </div>
                    <ActionButtons />
                </Card>
            )
        }

        return (
             <TableRow key={request.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={request.userAvatar} />
                            <AvatarFallback>{request.userName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col'>
                             <span className="font-medium whitespace-nowrap">{request.userName || 'Unknown User'}</span>
                             <span className="text-xs text-muted-foreground">{request.userId}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="font-semibold whitespace-nowrap">₹{request.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell className="font-mono text-xs">{request.utr}</TableCell>
                <TableCell className="whitespace-nowrap">{request.createdAt?.toDate().toLocaleString('en-GB')}</TableCell>
                <TableCell>
                    <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'} className={cn({'bg-green-100 text-green-800': request.status === 'approved', 'bg-yellow-100 text-yellow-800': request.status === 'pending'})}>{request.status}</Badge>
                </TableCell>
                <TableCell className="text-right"><ActionButtons /></TableCell>
            </TableRow>
        )
    }

    return (
         <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Deposit Management</h2>
            <DepositStats requests={requests} loading={loading} />
            <Card>
                <CardHeader>
                    <CardTitle>Deposit Requests</CardTitle>
                    <CardDescription>Review and manage all user deposit requests. Data is updated in real-time.</CardDescription>
                    <div className="flex space-x-2 pt-2">
                        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending</Button>
                        <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>Approved</Button>
                        <Button variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>Rejected</Button>
                        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
                     : filteredRequests.length === 0 ? <div className="text-center py-10 text-muted-foreground"><p>No {filter} requests found.</p></div>
                     : <>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>UTR</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>{filteredRequests.map(req => renderRow(req, false))}</TableBody>
                            </Table>
                        </div>
                        <div className="grid gap-4 md:hidden">{filteredRequests.map(req => renderRow(req, true))}</div>
                    </>}
                </CardContent>
            </Card>
        </div>
    );
}
