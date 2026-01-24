
'use client';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    DollarSign,
    Users,
    TrendingUp, 
    TrendingDown,
    Scale,
    ShieldCheck,
    Loader2,
    Swords,
    Info,
    Gift,
    Trophy,
    Hourglass,
    CircleDashed
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, Timestamp, collectionGroup } from 'firebase/firestore';
import Link from 'next/link';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Match, Tournament } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';


interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
  className?: string;
}

const StatCard = ({ title, value, description, icon: Icon, href, loading, className }: StatCardProps) => {
    const cardContent = (
        <Card className={cn(
            "shadow-lg border-border/10 hover:shadow-xl transition-shadow duration-300",
            href && "hover:border-primary/50 cursor-pointer",
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                    <div className="text-3xl font-bold tracking-tighter">{value}</div>
                )}
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </CardContent>
        </Card>
    );

    return href ? <Link href={href}>{cardContent}</Link> : cardContent;
};


export default function AdminDashboardPage() {
    useAdminOnly();
    const { role, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingKyc: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        disputedMatches: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
    const [financials, setFinancials] = useState({ 
        totalRevenue: 0, 
        totalExpenses: 0, 
        netProfit: 0,
        matchCommission: 0,
        tournamentCommission: 0,
        totalBonus: 0,
    });
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [loadingFinancials, setLoadingFinancials] = useState(true);

    useEffect(() => {
        if (userLoading) return;
        if (role && role !== 'superAdmin') {
            const roleRedirects: { [key: string]: string } = {
                depositAdmin: '/admin/deposits',
                withdrawalAdmin: '/admin/withdrawals',
                kycAdmin: '/admin/kyc-requests',
                matchAdmin: '/admin/matches',
            };
            const redirectPath = roleRedirects[role];
            if (redirectPath) {
                router.replace(redirectPath);
            }
        }
    }, [role, userLoading, router]);
    
    useEffect(() => {
        if (!firestore || role !== 'superAdmin') return;

        const fetchStats = async () => {
             setStatsLoading(true);
            try {
                const functions = getFunctions();
                const getStats = httpsCallable(functions, 'getAdminDashboardStats');
                const result = await getStats();
                setStats(result.data as any);
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setStatsLoading(false);
            }
        };

       fetchStats();
    }, [role, firestore]);

    useEffect(() => {
        if (!firestore || role !== 'superAdmin') return;
        
        setLoadingFinancials(true);
        
        const { from, to } = dateRange || {};
        if (!from) {
            setLoadingFinancials(false);
            return;
        }

        const start = Timestamp.fromDate(from);
        const end = to ? Timestamp.fromDate(to) : Timestamp.now();

        const q = query(
            collectionGroup(firestore, 'transactions'), 
            where('createdAt', '>=', start), 
            where('createdAt', '<=', end)
        );
        
        const unsub = onSnapshot(q, (transSnap) => {
            let totalRevenue = 0;
            let totalExpenses = 0;
            let matchCommission = 0;
            let tournamentCommission = 0;
            let totalBonus = 0;
            const dailyData: { [key: string]: { revenue: number, expenses: number } } = {};

            transSnap.forEach(doc => {
                const data = doc.data();
                const date = (data.createdAt as Timestamp).toDate().toISOString().split('T')[0];

                if (!dailyData[date]) {
                    dailyData[date] = { revenue: 0, expenses: 0 };
                }

                if (data.type === 'match_commission' || data.type === 'tournament_commission') {
                    const revenueAmount = data.amount || 0;
                    totalRevenue += revenueAmount;
                    dailyData[date].revenue += revenueAmount;
                    if (data.type === 'match_commission') matchCommission += revenueAmount;
                    if (data.type === 'tournament_commission') tournamentCommission += revenueAmount;
                } else if (data.type === 'referral-bonus' || data.type === 'daily_bonus' || data.type === 'task-reward') {
                    const expenseAmount = data.amount || 0;
                    totalExpenses += expenseAmount;
                    totalBonus += expenseAmount;
                    dailyData[date].expenses += expenseAmount;
                }
            });

            const netProfit = totalRevenue - totalExpenses;
            setFinancials({ totalRevenue, totalExpenses, netProfit, matchCommission, tournamentCommission, totalBonus });
            
            const chartData = Object.keys(dailyData).sort().map(date => ({ 
                date, 
                Revenue: dailyData[date].revenue,
                Expenses: dailyData[date].expenses,
            }));
            setRevenueData(chartData);
            setLoadingFinancials(false);
        }, (error) => {
            console.error("Error fetching financial data:", error);
            setLoadingFinancials(false);
        });

        return () => unsub();

    }, [firestore, dateRange, role]);
    
    if (userLoading) {
        return <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto my-10" />;
    }

    if (role !== 'superAdmin') {
         return <div className="flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto my-10" /></div>;
    }

  return (
    <div className="flex-1 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                 <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary text-transparent bg-clip-text">Master Admin Dashboard</h1>
                 <p className="text-muted-foreground">Welcome to your command center. Monitor and manage everything.</p>
            </div>
            <DateRangePicker range={dateRange} onRangeChange={setDateRange} />
        </div>

        {/* Actionable Live Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard href="/admin/users" title="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} loading={statsLoading} />
             <StatCard href="/admin/matches?filter=disputed" title="Disputed Matches" value={stats.disputedMatches.toLocaleString()} icon={Swords} loading={statsLoading} className="border-amber-500/50 bg-amber-500/10" />
             <StatCard href="/admin/kyc-requests" title="Pending KYC" value={stats.pendingKyc.toLocaleString()} icon={ShieldCheck} loading={statsLoading} />
             <StatCard href="/admin/deposits" title="Pending Deposits" value={stats.pendingDeposits.toLocaleString()} icon={TrendingUp} loading={statsLoading} />
             <StatCard href="/admin/withdrawals" title="Pending Withdrawals" value={stats.pendingWithdrawals.toLocaleString()} icon={TrendingDown} loading={statsLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                 <Card className="shadow-xl border-border/20">
                    <CardHeader>
                        <CardTitle>Financial Overview</CardTitle>
                        <CardDescription>Revenue vs. Expenses in the selected date range.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingFinancials ? (
                            <div className="flex justify-center items-center h-[350px]"><Loader2 className="h-10 w-10 animate-spin" /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)"/>
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip 
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: 'var(--radius)',
                                        }}
                                        formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name]}
                                        labelStyle={{ fontWeight: 'bold' }} 
                                    />
                                    <Legend />
                                    <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
             <div className="lg:col-span-1 space-y-6">
                <Card className="shadow-lg border-border/20">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                             <Scale className="text-muted-foreground"/>
                            Financial Summary
                        </CardTitle>
                        <CardDescription>Key financial metrics for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                            <p className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4"/>Total Revenue</p>
                            <p className="font-bold text-green-600">₹{financials.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                            <p className="font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4"/>Total Expenses</p>
                            <p className="font-bold text-red-600">₹{financials.totalExpenses.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
                            <p className="font-semibold flex items-center gap-2"><Scale className="h-4 w-4"/>Net Profit</p>
                            <p className="font-bold text-blue-600">₹{financials.netProfit.toLocaleString()}</p>
                        </div>
                        <div className="border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between"><p className="text-muted-foreground">Match Commission:</p> <p>₹{financials.matchCommission.toLocaleString()}</p></div>
                             <div className="flex justify-between"><p className="text-muted-foreground">Tournament Commission:</p> <p>₹{financials.tournamentCommission.toLocaleString()}</p></div>
                             <div className="flex justify-between"><p className="text-muted-foreground">Total Bonus Given:</p> <p>₹{financials.totalBonus.toLocaleString()}</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
