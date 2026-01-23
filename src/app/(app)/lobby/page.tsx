
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Info, PlusCircle, Trophy, CircleDotDashed } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import React, { useEffect, useState, useRef, useCallback, useMemo, useContext } from "react";
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, getDoc, where, orderBy, runTransaction, Timestamp, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Match, MatchPlayer } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import CustomLoader from '@/components/CustomLoader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EntryFeeCard } from '@/components/app/lobby/entry-fee-card';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/functions';


const ActiveMatchesAlert = ({ activeMatchIds }: { activeMatchIds: string[] }) => {
    const firestore = useFirestore();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMatches = async () => {
        if (!firestore || activeMatchIds.length === 0) return;
        setLoading(true);
        const matchPromises = activeMatchIds.map(id => getDoc(doc(firestore, 'matches', id)));
        const matchDocs = await Promise.all(matchPromises);
        const fetchedMatches = matchDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as Match));
        setMatches(fetchedMatches);
        setLoading(false);
    };

    return (
        <Collapsible onOpenChange={(open) => open && fetchMatches()}>
            <CollapsibleTrigger asChild>
                 <div className='cursor-pointer'>
                    <Alert variant="default" className="border-2 shadow-sm border-primary/50 bg-primary/10">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="font-bold text-primary">You have {activeMatchIds.length} active match(es)!</AlertTitle>
                        <AlertDescription>
                            Click here to view your ongoing matches.
                            {activeMatchIds.length >= 5 && <span className="font-semibold text-destructive block mt-1">You have reached the limit of 5 active matches. Please complete a match to play another.</span>}
                        </AlertDescription>
                    </Alert>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
                {loading && <div className="flex justify-center p-4"><Loader2 className="animate-spin"/></div>}
                {!loading && matches.map(match => (
                    <Card key={match.id} className="p-3">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold">Prize: ₹{match.prizePool}</p>
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/match/${match.id}`}>View Match</Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </CollapsibleContent>
        </Collapsible>
    )
}

const WaitingMatchCard = ({ match }: { match: Match }) => {
    const router = useRouter();
    const creator = match.players ? match.players[match.creatorId] : null;

    const handleJoin = () => {
        router.push(`/match/${match.id}`);
    };

    if (!creator) return null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-primary p-2 rounded-xl text-primary-foreground shadow-lg"
        >
            <div className="flex items-center justify-between">
                {/* Player Info */}
                <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-10 w-10 border-2 border-white/50">
                        <AvatarImage src={creator.avatarUrl || ''} />
                        <AvatarFallback>{creator.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm truncate">{creator.name}</span>
                </div>

                {/* Center Info */}
                <div className="flex flex-col items-center mx-4">
                    <Image src="/icon-192x192.png" alt="Ludo League Logo" width={24} height={24} />
                    <span className="font-bold text-sm mt-1">₹{match.entryFee}</span>
                </div>

                {/* Join Button */}
                <div className="flex-1 flex justify-end">
                    <Button 
                        onClick={handleJoin}
                        className="bg-white text-primary hover:bg-gray-200 font-bold rounded-xl px-6 shadow-md"
                    >
                        Join
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

const OngoingMatchCard = ({ match }: { match: any }) => {
    const creator = match.creator;
    const opponent = match.opponent;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-gradient-primary p-2 rounded-xl text-primary-foreground shadow-lg"
        >
            <div className="flex items-center justify-between">
                {/* Left Player */}
                <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-10 w-10 border-2 border-white/50">
                        <AvatarImage src={creator.avatarUrl || ''} />
                        <AvatarFallback>{creator.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm truncate">{creator.name}</span>
                </div>

                {/* Center Info */}
                <div className="flex flex-col items-center mx-2 text-center">
                     <Image src="/icon-192x192.png" alt="Ludo League Logo" width={24} height={24} />
                     <span className="font-bold text-sm mt-1">₹{match.entryFee}</span>
                </div>

                {/* Right Player */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                     <span className="font-semibold text-sm truncate text-right">{opponent.name}</span>
                    <Avatar className="h-10 w-10 border-2 border-white/50">
                        <AvatarImage src={opponent.avatarUrl || ''} />
                        <AvatarFallback>{opponent.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </motion.div>
    );
};

// Generates a list of mock ongoing matches
const generateMockOngoingMatches = (count: number) => {
    const names = ["Rohan", "Priya", "Amit", "Sneha", "Vikas", "Anjali", "Deepak", "Pooja", "Sanjay", "Meera", "Arjun", "Kavita"];
    const fees = [50, 100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

    return Array.from({ length: count }, (_, i) => {
        const creatorIndex = Math.floor(Math.random() * names.length);
        let opponentIndex = Math.floor(Math.random() * names.length);
        while (creatorIndex === opponentIndex) {
            opponentIndex = Math.floor(Math.random() * names.length);
        }
        
        const creatorName = names[creatorIndex];
        const opponentName = names[opponentIndex];
        const fee = fees[Math.floor(Math.random() * fees.length)];

        return {
            id: `mock-ongoing-${Date.now()}-${i}`,
            creator: {
                id: `mock-user-c-${i}`,
                name: `${creatorName}_${i}`,
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${creatorName}${i}`,
            },
            opponent: {
                id: `mock-user-o-${i}`,
                name: `${opponentName}_${i+1}`,
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${opponentName}${i+1}`,
            },
            entryFee: fee,
        };
    });
};


// --- COMBINED LIST COMPONENT ---
const CombinedLobbyList = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const [realMatches, setRealMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [mockMatches, setMockMatches] = useState(() => generateMockOngoingMatches(50));

    // Fetch real 'waiting' matches
    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const q = query(
            collection(firestore, 'matches'),
            where('status', '==', 'waiting'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const waitingMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
            setRealMatches(waitingMatches);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching waiting matches: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    // Update mock matches periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setMockMatches(prevMatches => {
                const matchesToRemove = Math.floor(Math.random() * 3) + 2; // 2 to 4
                const newMatches = generateMockOngoingMatches(matchesToRemove);
                
                const updatedMatches = [...newMatches, ...prevMatches.slice(0, prevMatches.length - matchesToRemove)];
                
                return updatedMatches.slice(0, 50);
            });
        }, 25000);

        return () => clearInterval(interval);
    }, []);

    const combinedAndSortedMatches = useMemo(() => {
        // Sort real matches first (user's own match at the top)
        const sortedRealMatches = [...realMatches].sort((a, b) => {
            if (user && a.creatorId === user.uid) return -1;
            if (user && b.creatorId === user.uid) return 1;
            // Assuming createdAt is a Timestamp
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });
        
        return [...sortedRealMatches, ...mockMatches];

    }, [realMatches, mockMatches, user]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (combinedAndSortedMatches.length === 0) {
        return (
             <div className="text-center py-10 text-muted-foreground">
                <p>No open matches available right now.</p>
                <p className="text-sm">Be the first to create one!</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <AnimatePresence>
               {combinedAndSortedMatches.map(match => {
                   // Check if it's a real match by looking for a property mock matches don't have, like 'creatorId'
                   if ('creatorId' in match) {
                       return <WaitingMatchCard key={match.id} match={match as Match} />;
                   } else {
                       return <OngoingMatchCard key={match.id} match={match} />;
                   }
               })}
            </AnimatePresence>
        </div>
    )
};


const LobbyContext = React.createContext<{ commissionPercentage: number }>({ commissionPercentage: 10 });
const useLobbyContext = () => useContext(LobbyContext);

export default function LobbyPage() {
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [showStakesDialog, setShowStakesDialog] = useState(false);
  const [commissionPercentage, setCommissionPercentage] = useState(10);
  const [loadingCommission, setLoadingCommission] = useState(true);
  
  const activeMatchIds = userProfile?.activeMatchIds || [];

  useEffect(() => {
    if (!firestore) return;
    const configRef = doc(firestore, 'matchCommission', 'settings');
    const unsubscribe = onSnapshot(configRef, (doc) => {
        if (doc.exists()) {
            setCommissionPercentage(doc.data().percentage || 10);
        }
        setLoadingCommission(false);
    }, (error) => {
        console.error("Error fetching commission settings: ", error);
        setLoadingCommission(false);
    });
    return () => unsubscribe();
  }, [firestore]);
  

  const handleCreateMatch = async (fee: number) => {
    if (!user || !userProfile || !firestore) {
        toast({ title: "Please login to play.", variant: "destructive" });
        return;
    }
     if ((userProfile as any).isBlocked) {
        toast({ title: "Your account is blocked.", variant: "destructive" });
        return;
    }
    if (activeMatchIds.length >= 5) {
        toast({ title: "Match Limit Reached", description: "You can have a maximum of 5 active matches.", variant: "destructive" });
        return;
    }
     if (userProfile.walletBalance < fee) {
        toast({ title: "Insufficient Balance", description: `You need at least ₹${fee} to play.`, variant: "destructive" });
        router.push('/wallet');
        return;
    }

    setShowStakesDialog(false);

    const { id: toastId, update } = toast({ title: "Creating your match..." });

    try {
        const createMatchFunction = httpsCallable(functions, 'createMatch');
        await createMatchFunction({ entryFee: fee });

        update({ id: toastId, title: "Match Created!", description: "Your match is now live in the Open Battles list.", className: "bg-green-100 text-green-800" });

    } catch (error: any) {
         console.error("Error creating match:", error);
         update({ id: toastId, title: "Failed to create match", description: error.message, variant: 'destructive' });
    }
  };
  
  if (loading || loadingCommission) {
    return <CustomLoader />;
  }

  const lowStakes = Array.from({ length: 10 }, (_, i) => 50 + i * 50);
  const mediumStakes = Array.from({ length: 9 }, (_, i) => 1000 + i * 500);
  const highStakes = Array.from({ length: 9 }, (_, i) => 10000 + i * 5000);

  const FeeTier = ({ fees, tier }: { fees: number[], tier: 'low' | 'medium' | 'high' }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {fees.map(fee => {
        const isLocked = false;
        return (
          <EntryFeeCard
            key={fee}
            fee={fee}
            onPlay={handleCreateMatch}
            isLocked={isLocked}
            commissionPercentage={commissionPercentage}
          />
        )
      })}
    </div>
  );

  return (
    <LobbyContext.Provider value={{ commissionPercentage }}>
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-6">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <Image src="/lobby.banner.png" alt="Lobby Banner" fill className="object-cover" priority />
                </div>

                {activeMatchIds.length > 0 && <ActiveMatchesAlert activeMatchIds={activeMatchIds} />}
            
                <div className="grid grid-cols-2 gap-4">
                    <Dialog open={showStakesDialog} onOpenChange={setShowStakesDialog}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="w-full h-20 text-lg">
                                <PlusCircle className="mr-2 h-6 w-6"/> Create New Match
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-5xl">
                            <DialogHeader>
                                <DialogTitle>Select Your Stake</DialogTitle>
                                <DialogDescription>Choose an entry fee to create an open match.</DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="low" className="w-full pt-4">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="low">Low Stakes</TabsTrigger>
                                    <TabsTrigger value="medium">Medium Stakes</TabsTrigger>
                                    <TabsTrigger value="high">High Stakes</TabsTrigger>
                                </TabsList>
                                <ScrollArea className="h-[65vh] pr-4">
                                    <TabsContent value="low" className="pt-4">
                                        <FeeTier fees={lowStakes} tier="low" />
                                    </TabsContent>
                                    <TabsContent value="medium" className="pt-4">
                                        <FeeTier fees={mediumStakes} tier="medium" />
                                    </TabsContent>
                                    <TabsContent value="high" className="pt-4">
                                        <FeeTier fees={highStakes} tier="high" />
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </DialogContent>
                    </Dialog>

                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline" size="lg" className="w-full h-20 text-lg animate-pulse shadow-lg shadow-primary/50">
                                <Info className="mr-2 h-6 w-6"/> How to Play
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>How to Play</DialogTitle>
                            </DialogHeader>
                            <ol className="space-y-3 mt-4 text-sm text-muted-foreground list-decimal list-inside">
                                <li>Click <strong>Create New Match</strong> and select your entry fee. Your match will be listed publicly.</li>
                                <li>Wait for an opponent to join your match from the &quot;Open Battles&quot; list.</li>
                                <li>Once an opponent joins, the match page will ask for a Ludo King room code. Create one and enter it.</li>
                                <li>Play the game in your Ludo King app.</li>
                                <li>After the game, take a screenshot of the win/loss screen.</li>
                                <li>Come back to the app and submit your result with the screenshot to claim your winnings.</li>
                            </ol>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className='mt-8 flex flex-col flex-grow'>
                <ScrollArea className="flex-grow pr-4">
                    <CombinedLobbyList />
                </ScrollArea>
            </div>
        </div>
    </LobbyContext.Provider>
  );
}
