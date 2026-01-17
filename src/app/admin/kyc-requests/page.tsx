
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from "@/firebase";
import { collection, query, onSnapshot, orderBy, doc, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, Loader2, Hourglass, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { KycApplication } from '@/lib/types';
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

const KycStats = ({ applications, loading }: { applications: KycApplication[], loading: boolean }) => {
    const stats = applications.reduce((acc, req) => {
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
            <StatCard title="Approved KYC" value={stats.approved} icon={ShieldCheck} isLoading={loading} />
            <StatCard title="Rejected KYC" value={stats.rejected} icon={XCircle} isLoading={loading} variant="destructive"/>
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
                    <DialogDescription>Please provide a reason for rejecting this KYC application.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="rejection-reason">Rejection Reason</Label>
                    <Input id="rejection-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Unclear selfie, ID mismatch"/>
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

export default function KycRequestsPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const { user: adminUser } = useUser();
    const { role } = useRole(); 
    const canManageKyc = role === 'kycAdmin' || role === 'superAdmin';

    const [applications, setApplications] = useState<KycApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('pending');
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "kycApplications"), orderBy("submittedAt", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const kycApplications: KycApplication[] = [];
            querySnapshot.forEach((doc) => {
                kycApplications.push({ id: doc.id, ...doc.data() } as KycApplication);
            });
            setApplications(kycApplications);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching KYC applications: ", error);
            toast({ title: "Error", description: "Could not fetch KYC applications.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, toast]);

    const handleUpdateStatus = useCallback(async (application: KycApplication, status: 'approved' | 'rejected', rejectionReason?: string) => {
        if (!firestore || !adminUser || !canManageKyc) {
            toast({ title: "Permission Denied", description: "You don't have rights to perform this action.", variant: "destructive" });
            return;
        }

        if (status === 'rejected' && !rejectionReason) {
            toast({ title: "Rejection reason is required", variant: "destructive" });
            return;
        }

        setActionLoading(prev => ({ ...prev, [application.id]: true }));

        const appRef = doc(firestore, "kycApplications", application.id);
        const userRef = doc(firestore, "users", application.userId);

        try {
            const batch = writeBatch(firestore);
            
            batch.update(appRef, {
                status,
                reviewedAt: new Date(),
                reviewedBy: adminUser.uid,
                rejectionReason: status === 'rejected' ? rejectionReason : null,
            });

            batch.update(userRef, { kycStatus: status });

            await batch.commit();

            toast({ 
                title: `Application ${status}`,
                description: `KYC for ${application.userName} has been ${status}.`,
                variant: status === 'approved' ? 'default' : 'destructive',
                className: status === 'approved' ? 'bg-green-100 text-green-800' : ''
            });

        } catch (error: any) {
            console.error("Error updating status: ", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setActionLoading(prev => ({ ...prev, [application.id]: false }));
        }
    }, [firestore, adminUser, canManageKyc, toast]);
    
    const filteredApplications = applications.filter(req => filter === 'all' || req.status === filter);

    const renderRow = (application: KycApplication, isMobile = false) => {
        const ActionButtons = () => (
            <div className={cn("flex gap-2", isMobile ? "justify-between mt-4" : "justify-end")}>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size={isMobile ? "sm" : "icon"} className={cn({"h-8 w-8": !isMobile})}>
                            <Eye className="h-4 w-4" /> {isMobile && <span className="ml-2">View Details</span>}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>KYC Details for {application.userName}</DialogTitle>
                            <DialogDescription>Review the submitted documents carefully.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto">
                            <div><p className="font-semibold">Full Name:</p> <p>{application.fullName}</p></div>
                            <div><p className="font-semibold">Date of Birth:</p> <p>{application.dateOfBirth}</p></div>
                            {application.aadhaarNumber && <div><p className="font-semibold">Aadhaar Number:</p> <p>{application.aadhaarNumber}</p></div>}
                            {application.panNumber && <div><p className="font-semibold">PAN Number:</p> <p>{application.panNumber}</p></div>}
                            {application.upiId && <div><p className="font-semibold">UPI ID:</p> <p>{application.upiId}</p></div>}
                            {application.bankDetails && <div><p className="font-semibold">Bank Details:</p> <p>{application.bankDetails}</p></div>}
                            <div className="md:col-span-2 space-y-2">
                                <p className="font-semibold">Documents:</p>
                                <div className="flex flex-wrap gap-4">
                                    {application.selfieUrl && <a href={application.selfieUrl} target="_blank" rel="noopener noreferrer" className="border rounded-md p-2 hover:bg-muted"><p className='text-center text-sm'>Selfie</p><Image src={application.selfieUrl} alt="Selfie" width={160} height={160} className="h-40 w-40 object-cover" /></a>}
                                    {application.aadhaarUrl && <a href={application.aadhaarUrl} target="_blank" rel="noopener noreferrer" className="border rounded-md p-2 hover:bg-muted"><p className='text-center text-sm'>Aadhaar</p><Image src={application.aadhaarUrl} alt="Aadhaar" width={160} height={160} className="h-40 w-40 object-cover" /></a>}
                                    {application.panUrl && <a href={application.panUrl} target="_blank" rel="noopener noreferrer" className="border rounded-md p-2 hover:bg-muted"><p className='text-center text-sm'>PAN</p><Image src={application.panUrl} alt="PAN" width={160} height={160} className="h-40 w-40 object-cover" /></a>}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                {canManageKyc && application.status === 'pending' && (
                    <div className={cn("flex gap-2", {"w-full": isMobile})}>
                         <Button 
                            size={isMobile ? 'sm' : 'icon'} 
                            className={cn("h-8 w-8 bg-green-500 hover:bg-green-600 text-white", {"flex-1": isMobile})}
                            onClick={() => handleUpdateStatus(application, 'approved')}
                            disabled={actionLoading[application.id]}
                        >
                            {actionLoading[application.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : isMobile ? <><CheckCircle className="h-4 w-4 mr-2"/>Approve</> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <RejectionDialog 
                            loading={actionLoading[application.id]} 
                            onConfirm={(reason) => handleUpdateStatus(application, 'rejected', reason)} 
                        />
                    </div>
                )}
            </div>
        )

        if (isMobile) {
            return (
                <Card key={application.id} className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar>
                                <AvatarImage src={application.userAvatar} />
                                <AvatarFallback>{application.userName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold">{application.userName || 'Unknown User'}</p>
                                <p className="text-sm text-muted-foreground">{application.submittedAt?.toDate().toLocaleString('en-GB')}</p>
                            </div>
                        </div>
                        <Badge variant={application.status === 'pending' ? 'secondary' : application.status === 'approved' ? 'default' : 'destructive'} className={cn({'bg-green-100 text-green-800': application.status === 'approved', 'bg-yellow-100 text-yellow-800': application.status === 'pending'})}>{application.status}</Badge>
                    </div>
                    <div className="mt-2 space-y-2 text-sm">
                         {application.status !== 'pending' && <div className="flex justify-between items-center pt-2 border-t"><span>Reviewed By:</span> <span className="text-xs">{application.reviewedBy || 'N/A'}</span></div>}
                         {application.status === 'rejected' && <div className="flex justify-between items-center"><span>Reason:</span> <span className="text-xs">{application.rejectionReason}</span></div>}
                    </div>
                    <ActionButtons />
                </Card>
            )
        }

        return (
             <TableRow key={application.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={application.userAvatar} />
                            <AvatarFallback>{application.userName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className='flex flex-col'>
                             <span className="font-medium whitespace-nowrap">{application.userName || 'Unknown User'}</span>
                             <span className="text-xs text-muted-foreground">{application.userId}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{application.submittedAt?.toDate().toLocaleString('en-GB')}</TableCell>
                <TableCell>
                    <Badge variant={application.status === 'pending' ? 'secondary' : application.status === 'approved' ? 'default' : 'destructive'} className={cn({'bg-green-100 text-green-800': application.status === 'approved', 'bg-yellow-100 text-yellow-800': application.status === 'pending'})}>{application.status}</Badge>
                </TableCell>
                <TableCell className="text-right"><ActionButtons /></TableCell>
            </TableRow>
        )
    }

    return (
         <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">KYC Management</h2>
            <KycStats applications={applications} loading={loading} />
            <Card>
                <CardHeader>
                    <CardTitle>KYC Applications</CardTitle>
                    <CardDescription>Review and manage all user KYC submissions. Data is updated in real-time.</CardDescription>
                    <div className="flex space-x-2 pt-2">
                        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Pending</Button>
                        <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>Approved</Button>
                        <Button variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>Rejected</Button>
                        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
                     : filteredApplications.length === 0 ? <div className="text-center py-10 text-muted-foreground"><p>No {filter} applications found.</p></div>
                     : <>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Date Submitted</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>{filteredApplications.map(req => renderRow(req, false))}</TableBody>
                            </Table>
                        </div>
                        <div className="grid gap-4 md:hidden">{filteredApplications.map(req => renderRow(req, true))}</div>
                    </>}
                </CardContent>
            </Card>
        </div>
    );
}
