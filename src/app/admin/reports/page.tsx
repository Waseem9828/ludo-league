
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from "@/firebase";
import { collection, query, onSnapshot, orderBy, collectionGroup } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Download, Loader2, DollarSign, Landmark, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useAdminOnly } from '@/hooks/useAdminOnly';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';

export default function ReportsPage() {
    useAdminOnly();
    const firestore = useFirestore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const q = query(collectionGroup(firestore, "transactions"), orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const trans: Transaction[] = [];
            snapshot.forEach(doc => trans.push({ id: doc.id, ...doc.data() } as Transaction));
            setTransactions(trans);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const stats = useMemo(() => {
        const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((acc, t) => acc + t.amount, 0);
        const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((acc, t) => acc + Math.abs(t.amount), 0);
        const netRevenue = transactions.filter(t => t.type === 'match_commission' || t.type === 'tournament_commission').reduce((acc,t) => acc + t.amount, 0);
        return { totalDeposits, totalWithdrawals, netRevenue };
    }, [transactions]);

    const chartData = useMemo(() => {
        const dailyData: { [key: string]: { deposits: number, withdrawals: number, revenue: number } } = {};
        transactions.forEach(t => {
            if (!t.createdAt) return;
            const date = format(t.createdAt.toDate(), 'yyyy-MM-dd');
            if (!dailyData[date]) {
                dailyData[date] = { deposits: 0, withdrawals: 0, revenue: 0 };
            }
            if (t.type === 'deposit') {
                dailyData[date].deposits += t.amount;
            } else if (t.type === 'withdrawal') {
                dailyData[date].withdrawals += Math.abs(t.amount);
            } else if (t.type === 'match_commission' || t.type === 'tournament_commission') {
                dailyData[date].revenue += t.amount;
            }
        });

        return Object.entries(dailyData)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [transactions]);

    const exportToCSV = () => {
        const headers = ['ID', 'User ID', 'Type', 'Amount', 'Description', 'Status', 'Date'];
        const rows = transactions.map(t => [
            t.id,
            t.userId,
            t.type,
            t.amount,
            t.description ? t.description.replace(/,/g, '') : '', // Basic CSV escaping
            t.status,
            t.createdAt ? t.createdAt.toDate().toISOString() : ''
        ]);

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transactions_export_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
                    <p className="text-muted-foreground">An overview of your application&apos;s financial performance.</p>
                </div>
                <Button onClick={exportToCSV} disabled={transactions.length === 0}>
                    <Download className="mr-2 h-4 w-4"/> Export as CSV
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{stats.totalDeposits.toLocaleString('en-IN')}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{stats.totalWithdrawals.toLocaleString('en-IN')}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Revenue (Commission)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{stats.netRevenue.toLocaleString('en-IN')}</div></CardContent>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Financials Over Time</CardTitle>
                    <CardDescription>Daily deposits, withdrawals and revenue from commission.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM dd')} />
                            <YAxis tickFormatter={(val) => `₹${(val/1000)}k`} />
                            <Tooltip formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                            <Legend />
                            <Line type="monotone" dataKey="deposits" stroke="#22c55e" strokeWidth={2} name="Deposits" />
                            <Line type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={2} name="Withdrawals" />
                             <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
