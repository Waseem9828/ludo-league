
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Loader2, Share2 } from "lucide-react";
import { doc, onSnapshot } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const bannerImage = PlaceHolderImages.find(img => img.id === 'referrals-banner');

export default function ReferralsPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [commission, setCommission] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [referralLink, setReferralLink] = useState('');
    const [isShareSupported, setIsShareSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'share' in navigator) {
            setIsShareSupported(true);
        }
    }, []);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const configRef = doc(firestore, 'referralConfiguration', 'settings');
        const unsubscribe = onSnapshot(configRef, (doc) => {
          if (doc.exists()) {
            setCommission(doc.data().commissionPercentage);
          }
          setLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    useEffect(() => {
        if (userProfile?.referralCode) {
            const baseUrl = window.location.origin;
            setReferralLink(`${baseUrl}/signup?ref=${userProfile.referralCode}`);
        }
    }, [userProfile?.referralCode]);

    const handleCopy = (textToCopy: string, type: 'Code' | 'Link') => {
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: `Referral ${type} Copied!`,
            description: "You can now share it with your friends.",
        });
    };
    
    const handleShare = async () => {
        if (isShareSupported) {
            try {
                await navigator.share({
                    title: 'Join me on Ludo League!',
                    text: `Sign up on Ludo League using my referral code and let's play! My code is ${userProfile?.referralCode}.`,
                    url: referralLink,
                });
                toast({ title: 'Link shared successfully!' });
            } catch (error) {
                console.error('Error sharing:', error);
                toast({ title: 'Could not share link', description: 'An error occurred while trying to share.', variant: 'destructive'});
            }
        } else {
             // Fallback for desktop or unsupported browsers
            handleCopy(referralLink, 'Link');
        }
    };

    return (
        <div className="space-y-6">
            {bannerImage && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
                    <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" />
                </div>
            )}
            <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Refer & Earn</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Invite Friends, Earn Rewards!</CardTitle>
                    <CardDescription>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : commission ? (
                            `Share your referral code with friends. When they make their first deposit, you'll earn a ${commission}% commission!`
                        ) : (
                            'Share your referral code with friends to earn rewards!'
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>Your Unique Referral Code</Label>
                        <div className="flex items-center gap-4 mt-2">
                            {userProfile?.referralCode ? (
                                <>
                                    <div className="flex-grow p-3 bg-muted/50 rounded-lg border">
                                        <p className="text-2xl font-bold tracking-widest text-center text-primary font-mono">{userProfile.referralCode}</p>
                                    </div>
                                    <Button onClick={() => handleCopy(userProfile.referralCode!, 'Code')} variant="outline" size="icon">
                                        <Copy className="h-5 w-5" />
                                    </Button>
                                </>
                            ) : (
                                <div className="flex-grow p-3 bg-muted/50 rounded-lg border flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                         <Label>Your Shareable Referral Link</Label>
                         <div className="flex items-center gap-2">
                            <Input 
                                readOnly 
                                value={referralLink || "Generating link..."}
                                className="bg-muted/50"
                            />
                            <Button onClick={() => handleCopy(referralLink, 'Link')} variant="outline" size="icon" disabled={!referralLink}>
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleShare} variant="default" size="icon" disabled={!referralLink}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
