
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useUser, useFirestore } from "@/firebase";
import { BarChart, Edit, Mail, Phone, User as UserIcon, Wallet, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Swords, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, updateDoc } from 'firebase/firestore';

const StatCard = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <Card className="bg-muted/50 hover:bg-muted/80 transition-colors">
        <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const KycStatusBadge = ({ kycStatus, rejectionReason }: { kycStatus: string, rejectionReason?: string }) => {
    const statusConfig = {
        approved: {
            icon: <CheckCircle className="h-4 w-4" />,
            text: "KYC Verified",
            className: "bg-green-100 text-green-800 border-green-200"
        },
        pending: {
            icon: <AlertTriangle className="h-4 w-4" />,
            text: "KYC Pending",
            className: "bg-yellow-100 text-yellow-800 border-yellow-200"
        },
        rejected: {
            icon: <XCircle className="h-4 w-4" />,
            text: "KYC Rejected",
            className: "bg-red-100 text-red-800 border-red-200"
        },
        not_submitted: {
            icon: <ShieldCheck className="h-4 w-4" />,
            text: "KYC Not Submitted",
            className: "bg-blue-100 text-blue-800 border-blue-200"
        }
    };
    const currentStatus = statusConfig[kycStatus as keyof typeof statusConfig] || statusConfig.not_submitted;

    return (
        <div className="space-y-4">
             <div className="flex items-center gap-2">
                 {currentStatus.icon}
                 <p className="font-semibold">{currentStatus.text}</p>
            </div>
             {kycStatus === 'rejected' && (
                <p className="text-sm text-destructive">Reason: {rejectionReason || 'Not provided'}</p>
            )}
             {(kycStatus === 'not_submitted' || kycStatus === 'rejected') && (
                <Button asChild variant="default">
                    <Link href="/kyc">{kycStatus === 'rejected' ? 'Resubmit KYC' : 'Submit KYC'}</Link>
                </Button>
            )}
        </div>
    );
};


export default function ProfilePage() {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);


  if (!user || !userProfile) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="space-y-6">
        <Card className="overflow-hidden shadow-lg">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-primary-start to-primary-end p-6 text-primary-foreground relative">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar className="h-24 w-24 border-4 border-white/50 shadow-lg">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                        <AvatarFallback className="text-3xl bg-primary/20 text-white">{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl text-white">{user.displayName}</CardTitle>
                        <CardDescription className="text-primary-foreground/80">{user.email}</CardDescription>
                         {userProfile.isAdmin && <Badge variant="destructive" className="mt-2">Admin</Badge>}
                    </div>
                </div>
                <Button variant="outline" size="sm" className="absolute top-4 right-4 bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                </Button>
            </div>
            
            {/* User Stats Grid */}
            <CardContent className="p-6">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard icon={Wallet} label="Balance" value={`₹${userProfile.walletBalance || 0}`} />
                    <StatCard icon={Trophy} label="Total Winnings" value={`₹${userProfile.winnings || 0}`} />
                    <StatCard icon={BarChart} label="Win Rate" value={`${userProfile.winRate || 0}%`} />
                    <StatCard icon={Swords} label="Matches Played" value={userProfile.totalMatchesPlayed || 0} />
                </div>
                
                 <div className="grid md:grid-cols-2 gap-6">
                    {/* User Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Account Details</h3>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <UserIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">User ID</p>
                                <p className="font-semibold text-sm break-all">{user.uid}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-semibold">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* KYC Status */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">KYC Status</h3>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <KycStatusBadge kycStatus={userProfile.kycStatus || 'not_submitted'} rejectionReason={userProfile.kycRejectionReason} />
                        </div>
                    </div>
                 </div>
            </CardContent>
        </Card>
    </div>
  );
}
