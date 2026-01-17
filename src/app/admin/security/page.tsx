
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ShieldCheck, Loader2, User, Link as LinkIcon } from "lucide-react";
import { useAdminOnly } from '@/hooks/useAdminOnly';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type MultiAccountAlert = {
    ipAddress: string;
    users: { id: string; name: string | null; }[];
    count: number;
}

type SharedPaymentAlert = {
    identifier: string;
    type: 'UPI' | 'Bank';
    users: { id: string; name: string | null; }[];
    count: number;
}

export default function SecurityPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "users"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userList: UserProfile[] = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            setUsers(userList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users for security scan: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const securityAlerts = useMemo(() => {
        const ipMap: { [key: string]: { id: string; name: string | null; }[] } = {};
        const upiMap: { [key: string]: { id: string; name: string | null; }[] } = {};

        users.forEach(user => {
            // IP Address mapping - this would require storing IP on user profile which we are not doing.
            // For now this part of the logic will be dormant.
            // if (user.lastLoginIp) {
            //     if (!ipMap[user.lastLoginIp]) ipMap[user.lastLoginIp] = [];
            //     ipMap[user.lastLoginIp].push({ id: user.uid, name: user.displayName || user.email });
            // }

            // UPI ID mapping
            if (user.upiId) {
                if (!upiMap[user.upiId]) upiMap[user.upiId] = [];
                upiMap[user.upiId].push({ id: user.uid, name: user.displayName || user.email });
            }
        });

        const multiAccountAlerts: MultiAccountAlert[] = Object.entries(ipMap)
            .filter(([_, userList]) => userList.length > 1)
            .map(([ipAddress, users]) => ({ ipAddress, users, count: users.length }));

        const sharedPaymentAlerts: SharedPaymentAlert[] = Object.entries(upiMap)
            .filter(([_, userList]) => userList.length > 1)
            .map(([identifier, users]) => ({ identifier, users, type: 'UPI', count: users.length }));

        return { multiAccountAlerts, sharedPaymentAlerts };
    }, [users]);

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    const totalAlerts = securityAlerts.multiAccountAlerts.length + securityAlerts.sharedPaymentAlerts.length;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Security Center</h2>
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {totalAlerts > 0 ? <AlertTriangle className="h-6 w-6 text-destructive" /> : <ShieldCheck className="h-6 w-6 text-green-500" />}
                        Security Status
                    </CardTitle>
                    <CardDescription>
                        {totalAlerts > 0 ? `Found ${totalAlerts} potential security issue(s).` : 'No immediate security threats detected. System is looking healthy.'}
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Shared Payment Method Detection</CardTitle>
                    <CardDescription>Lists UPI IDs or Bank Accounts used by more than one user. This could be a sign of coordinated fraud.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Identifier (UPI)</TableHead><TableHead>User Count</TableHead><TableHead>Linked Accounts</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {securityAlerts.sharedPaymentAlerts.map(alert => (
                                <TableRow key={alert.identifier} className="hover:bg-muted/50">
                                    <TableCell className="font-mono">{alert.identifier}</TableCell>
                                    <TableCell><Badge variant="destructive">{alert.count}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                        {alert.users.map(user => (
                                            <Link key={user.id} href={`/admin/users/${user.id}`} className="text-sm text-primary hover:underline flex items-center gap-2">
                                               <User className="h-3 w-3"/> {user.name}
                                            </Link>
                                        ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {securityAlerts.sharedPaymentAlerts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No shared payment methods detected.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
