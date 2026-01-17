
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import { useFirestore } from "@/firebase";
import { useEffect, useState }from "react";
import type { UserProfile } from "@/lib/types";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const bannerImage = PlaceHolderImages.find(img => img.id === 'leaderboard-banner');

const PlayerCard = ({ user, rank, delay }: { user: Partial<UserProfile>, rank: number, delay: number }) => {
    const isTopThree = rank <= 3;
    const rankColors = {
        1: { bg: 'bg-amber-400/20', border: 'border-amber-400', text: 'text-amber-400' },
        2: { bg: 'bg-slate-400/20', border: 'border-slate-400', text: 'text-slate-400' },
        3: { bg: 'bg-orange-400/20', border: 'border-orange-400', text: 'text-orange-400' }
    };
    const colors = isTopThree ? rankColors[rank as keyof typeof rankColors] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.05 }}
        >
            <div className={cn(
                "relative grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 rounded-xl transition-all duration-300",
                isTopThree ? `${colors?.bg} border-2 ${colors?.border}` : 'bg-muted/50 border border-transparent hover:border-primary/50'
            )}>
                {isTopThree && (
                    <Trophy className={cn("absolute -top-3 -left-3 h-7 w-7", colors?.text)} fill="currentColor" />
                )}
                 <div className={cn("flex items-center justify-center w-12 h-12 rounded-full font-black text-2xl flex-shrink-0",
                    isTopThree ? 'text-white' : 'text-muted-foreground'
                )}>
                    <span className={cn(isTopThree && "absolute text-5xl opacity-20")}>{rank}</span>
                    <span className={cn(isTopThree && "relative")}>{rank}</span>
                </div>

                <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="h-12 w-12 border-2 border-border flex-shrink-0">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-grow overflow-hidden">
                        <p className="font-bold truncate">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">Win Rate: {user.winRate || 0}%</p>
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg text-primary">₹{(user.winnings || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">Winnings</p>
                </div>
            </div>
        </motion.div>
    );
};

export default function LeaderboardPage() {
    const firestore = useFirestore();
    const [leaderboardData, setLeaderboardData] = useState<Partial<UserProfile>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, orderBy('winnings', 'desc'), limit(50));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as Partial<UserProfile>));
            setLeaderboardData(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching leaderboard: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);


    return (
        <div className="space-y-6">
            {bannerImage &&
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
                    <Image src={bannerImage.imageUrl} alt={bannerImage.description} fill className="object-cover" />
                </div>
            }
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-br from-primary-start to-primary-end text-primary-foreground p-6">
                <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8"/>
                    <CardTitle className="text-3xl tracking-tight">Hall of Fame</CardTitle>
                </div>
                <CardDescription className="text-primary-foreground/80">
                    Check out the all-time rankings of the top Ludo League players.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {loading ? (
                     <div className="flex justify-center items-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                     </div>
                ) : (
                    <div className="space-y-3">
                        {leaderboardData.map((user, index) => (
                            <PlayerCard key={user.uid} user={user} rank={index + 1} delay={index} />
                        ))}
                    </div>
                )}
              </CardContent>
            </Card>
        </div>
    );
}
