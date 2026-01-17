
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from "@/firebase";
import { collection, query, onSnapshot, orderBy, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, DollarSign, Loader2, Hourglass, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WithdrawalRequest } from '@/lib/types';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
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

// ... (WithdrawalStats component remains the same)
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
                    <Input id="rejection-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Bank details incorrect"/>
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

export default function WithdrawalsPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const { user: adminUser } = useUser();
    const { role } = useRole(); // Get the user role
    const canManageWithdrawals = role === 'withdrawalAdmin' || role === 'superAdmin';

    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('pending');
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "withdrawalRequests"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const withdrawalRequests: WithdrawalRequest[] = [];
            querySnapshot.forEach((doc) => {
                withdrawalRequests.push({ id: doc.id, ...doc.data() } as WithdrawalRequest);
            });
            setRequests(withdrawalRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching withdrawals: ", error);
            toast({ title: "Error", description: "Could not fetch withdrawal requests.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, toast]);

    const handleUpdateStatus = async (request: WithdrawalRequest, status: 'approved' | 'rejected', rejectionReason?: string) => {
        if (!firestore || !canManageWithdrawals || !adminUser) {
            toast({ title: "Permission Denied", description: "You don't have permission to perform this action.", variant: "destructive" });
            return;
        }

        if (status === 'rejected' && !rejectionReason) {
            toast({ title: "Rejection reason is required", variant: "destructive" });
            return;
        }

        setActionLoading(prev => ({...prev, [request.id]: true}));
        const withdrawalRef = doc(firestore, "withdrawalRequests", request.id);
        
        try {
             const batch = writeBatch(firestore);
            
            batch.update(withdrawalRef, { 
                status, 
                processedAt: serverTimestamp(),
                processedBy: adminUser.uid,
                rejectionReason: status === 'rejected' ? rejectionReason : null,
            });

            const transactionRef = doc(collection(firestore, 'transactions'));
            
            if (status === 'approved') {
                 batch.set(transactionRef, {
                    userId: request.userId,
                    type: 'withdrawal',
                    amount: -request.amount, // Negative amount for debit
                    status: 'completed',
                    createdAt: serverTimestamp(),
                    description: `Withdrawal to ${request.upiId || request.bankDetails}`,
                    relatedMatchId: request.id,
                });
            } else if (status === 'rejected') {
                 batch.set(transactionRef, {
                    userId: request.userId,
                    type: 'withdrawal_refund',
                    amount: request.amount, // Positive to refund
                    status: 'completed',
                    createdAt: serverTimestamp(),
                    description: `Refund for rejected withdrawal request`,
                    relatedMatchId: request.id,
                });
            }

            await batch.commit();
            toast({ title: "Success", description: `Withdrawal has been ${status}.` });
        } catch (error: any) {
            console.error("Error updating status: ", error);
            toast({ title: "Error", description: "Failed to update status: " + error.message, variant: "destructive" });
        } finally {
            setActionLoading(prev => ({...prev, [request.id]: false}));
        }
    };
    
    const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Withdrawal Management</h2>
            {/* <WithdrawalStats /> */}
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
                    <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                {canManageWithdrawals && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.map((request) => (
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
                                    <TableCell className="font-mono text-xs">{request.upiId || request.bankDetails}</TableCell>
                                    <TableCell>{request.createdAt?.toDate().toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'} className={cn({'bg-green-100 text-green-800': request.status === 'approved', 'bg-yellow-100 text-yellow-800': request.status === 'pending'})}>{request.status}</Badge>
                                    </TableCell>
                                    {canManageWithdrawals && <TableCell className="text-right">
                                        {request.status === 'pending' && (
                                            <div className="flex gap-2 justify-end">
                                                <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus(request, 'approved')} disabled={actionLoading[request.id]}><CheckCircle className="h-4 w-4" /></Button>
                                                <RejectionDialog onConfirm={(reason) => handleUpdateStatus(request, 'rejected', reason)} loading={actionLoading[request.id]}/>
                                            </div>
                                        )}
                                    </TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="grid gap-4 md:hidden">
                    {filteredRequests.map((request) => (
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
                                <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'} className={cn({'bg-green-100 text-green-800': request.status === 'approved', 'bg-yellow-100 text-yellow-800': request.status === 'pending'})}>{request.status}</Badge>
                            </div>
                             <div className="mt-2 space-y-2 text-sm">
                                <div className="flex justify-between"><span>Amount:</span> <span className="font-bold">₹{request.amount.toLocaleString('en-IN')}</span></div>
                                <div className="w-full">
                                    <p>Details:</p>
                                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-words">{request.upiId || request.bankDetails}</p>
                                </div>
                            </div>
                            {canManageWithdrawals && <div className="flex justify-end mt-4">
                                {request.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleUpdateStatus(request, 'approved')} disabled={actionLoading[request.id]}><CheckCircle className="h-4 w-4 mr-1"/> Process</Button>
                                        <RejectionDialog onConfirm={(reason) => handleUpdateStatus(request, 'rejected', reason)} loading={actionLoading[request.id]}/>
                                    </div>
                                )}
                            </div>}
                        </Card>
                    ))}
                </div>
                 {filteredRequests.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No {filter} requests found.</p>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    );
}

    