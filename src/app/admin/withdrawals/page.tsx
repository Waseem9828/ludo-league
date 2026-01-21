'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore, useUser } from "@/firebase";
import { collection, query, onSnapshot, orderBy, doc, writeBatch, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, DollarSign, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WithdrawalRequest, UserProfile } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRole } from '@/hooks/useRole';
import QRCode from 'qrcode.react';

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
                    <DialogDescription>Please provide a reason for rejecting this withdrawal request. This reason will be shown to the user.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="rejection-reason">Rejection Reason</Label>
                    <Input id="rejection-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Bank details incorrect" />
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

const ViewDetailsDialog = ({ request }: { request: WithdrawalRequest }) => {
    const firestore = useFirestore();
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchUserData = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            const userRef = doc(firestore, 'users', request.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                setUserData(userDoc.data() as UserProfile);
            } else {
                toast({ title: "Error", description: "User profile not found.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Could not fetch user details.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const upiId = userData?.upiId || request.upiId;
    const upiUrl = upiId ? `upi://pay?pa=${upiId}&pn=${request.userName || 'User'}&am=${request.amount}&cu=INR` : '';

    return (
        <Dialog onOpenChange={(open) => open && fetchUserData()}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Withdrawal for {request.userName}</DialogTitle>
                    <DialogDescription>Amount: <span className='font-bold text-lg'>₹{request.amount.toLocaleString('en-IN')}</span></DialogDescription>
                </DialogHeader>
                {loading ? <div className='flex justify-center items-center h-40'><Loader2 className='h-8 w-8 animate-spin' /></div> :
                    <div className="py-4 space-y-4">
                        {upiUrl && (
                            <div className='flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/40'>
                                <h3 className='font-semibold'>Scan to Pay with UPI</h3>
                                <div className='p-2 bg-white rounded-md shadow-md'>
                                    <QRCode value={upiUrl} size={180} />
                                </div>
                                <p className='text-sm text-muted-foreground'>UPI ID: <span className='font-mono text-primary'>{upiId}</span></p>
                            </div>
                        )}
                        <div className='space-y-2'>
                             <h3 className='font-semibold'>Payment Details</h3>
                            {userData?.bankDetails && <p className="text-sm">Bank: {userData.bankDetails}</p>}
                            {!upiUrl && !userData?.bankDetails && <p className='text-sm text-destructive'>No payment details found for this user.</p>}
                        </div>
                    </div>
                }
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function WithdrawalsPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const { user: adminUser } = useUser();
    const { role } = useRole();

    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('pending');
    const { toast } = useToast();

    const canManageWithdrawals = role === 'superAdmin' || role === 'withdrawalAdmin';

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "withdrawalRequests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const withdrawalRequests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest));
            setRequests(withdrawalRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching withdrawals: ", error);
            toast({ title: "Error", description: "Could not fetch withdrawal requests.", variant: "destructive" });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore, toast]);

    const handleUpdateStatus = useCallback(async (request: WithdrawalRequest, status: 'approved' | 'rejected', rejectionReason?: string) => {
        if (!firestore || !canManageWithdrawals || !adminUser) {
            toast({ title: "Permission Denied", description: "You don't have permission to perform this action.", variant: "destructive" });
            return;
        }
        if (status === 'rejected' && !rejectionReason) {
            toast({ title: "Rejection reason is required", variant: "destructive" });
            return;
        }

        setActionLoading(prev => ({ ...prev, [request.id]: true }));
        const withdrawalRef = doc(firestore, "withdrawalRequests", request.id);

        try {
            await updateDoc(withdrawalRef, {
                status,
                processedAt: serverTimestamp(),
                processedBy: adminUser.uid,
                rejectionReason: status === 'rejected' ? rejectionReason : null,
            });
            
            toast({ title: "Success", description: `Withdrawal has been ${status}.`, variant: status === 'rejected' ? 'destructive' : 'default' });
        } catch (error: any) {
            console.error("Error updating status: ", error);
            toast({ title: "Error", description: "Failed to update status: " + error.message, variant: "destructive" });
        } finally {
            setActionLoading(prev => ({ ...prev, [request.id]: false }));
        }
    }, [firestore, canManageWithdrawals, adminUser, toast]);

    const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

    const renderRow = (request: WithdrawalRequest, isMobile = false) => {

        const actionButtons = (
            <div className={cn("flex gap-2", isMobile ? "justify-end" : "justify-end")}>
                <ViewDetailsDialog request={request} />
                {request.status === 'pending' && canManageWithdrawals && (
                    <>
                        <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus(request, 'approved')} disabled={actionLoading[request.id]}>
                           {actionLoading[request.id] ? <Loader2 className='h-4 w-4 animate-spin'/> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <RejectionDialog onConfirm={(reason) => handleUpdateStatus(request, 'rejected', reason)} loading={actionLoading[request.id]} />
                    </>
                )}
            </div>
        );

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
                                <p className="font-bold">{request.userName || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{request.createdAt?.toDate().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'} >{request.status}</Badge>
                    </div>
                    <div className="mt-2 space-y-2 text-sm">
                        <div className="flex justify-between"><span>Amount:</span> <span className="font-bold">₹{request.amount.toLocaleString('en-IN')}</span></div>
                    </div>
                    <div className='mt-4'>{actionButtons}</div>
                </Card>
            )
        }

        return (
            <TableRow key={request.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={request.userAvatar} />
                            <AvatarFallback>{request.userName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium whitespace-nowrap">{request.userName || 'Unknown'}</span>
                    </div>
                </TableCell>
                <TableCell className="font-semibold">₹{request.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>{request.createdAt?.toDate().toLocaleString()}</TableCell>
                <TableCell>
                    <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}>{request.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{actionButtons}</TableCell>
            </TableRow>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Withdrawal Management</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign /> Withdrawal Requests</CardTitle>
                    <CardDescription>Review and process user withdrawal requests. Data is updated in real-time.</CardDescription>
                    <div className="flex space-x-2 pt-2">
                        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending</Button>
                        <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>Approved</Button>
                        <Button variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>Rejected</Button>
                        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className='flex justify-center items-center h-64'><Loader2 className='h-8 w-8 animate-spin text-primary'/></div>
                     : filteredRequests.length === 0 
                        ? <div className="text-center py-10 text-muted-foreground"><p>No {filter} requests found.</p></div>
                        : <>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Amount</TableHead>
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
