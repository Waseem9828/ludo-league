
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Loader2, Info, Lock, Wallet, Users, User, Shield, BarChart, X, Trophy, CircleDotDashed, PlusCircle } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Match } from "@/lib/types";
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

const PlayerCard = ({ name, avatarUrl, winRate }: { name: string, avatarUrl: string | null | undefined, winRate: number }) => (
    <motion.div 
        className="flex flex-col items-center gap-3 relative"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
    >
        <div className="relative">
             <Avatar className="h-28 w-28 border-4 border-card shadow-lg">
                <AvatarImage src={avatarUrl || ''} />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <motion.div 
                 className="absolute inset-0 rounded-full border-4 border-primary"
                 animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
        <div className="text-center">
            <h3 className="text-lg font-bold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">Win Rate: {winRate}%</p>
        </div>
    </motion.div>
);

const SearchingCard = () => {
    const mockOpponents = [
        { name: "Shadow King", avatar: "https://api.dicebear.com/8.x/lorelei/svg?seed=ShadowKing" },
        { name: "Ludo Legend", avatar: "https://api.dicebear.com/8.x/lorelei/svg?seed=LudoLegend" },
        { name: "Dice Master", avatar: "https://api.dicebear.com/8.x/lorelei/svg?seed=DiceMaster" },
        { name: "Royal Pro", avatar: "https://api.dicebear.com/8.x/lorelei/svg?seed=RoyalPro" },
        { name: "Ace Player", avatar: "https://api.dicebear.com/8.x/lorelei/svg?seed=AcePlayer" },
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % mockOpponents.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [mockOpponents.length]);
    
    return (
        <motion.div 
            className="flex flex-col items-center gap-3 relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <AnimatePresence mode="wait">
                 <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center gap-3"
                 >
                    <div className="relative">
                        <Avatar className="h-28 w-28 border-4 border-dashed border-primary/50 shadow-lg">
                            <AvatarImage src={mockOpponents[index].avatar} />
                             <AvatarFallback>{mockOpponents[index].name.charAt(0)}</AvatarFallback>
                        </Avatar>
                         <motion.div 
                            className="absolute inset-0 rounded-full border-2 border-primary/30"
                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatType: 'reverse' }}
                        />
                    </div>
                     <div className="text-center">
                        <h3 className="text-lg font-bold text-foreground">{mockOpponents[index].name}</h3>
                        <p className="text-sm text-muted-foreground">Searching...</p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};


const SearchingOverlay = ({ user, userProfile, onCancel }: { user: any, userProfile: any, onCancel: () => void }) => (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4 overflow-hidden"
        >
             {/* Animated Background */}
             <div className="absolute inset-0 z-0 h-full w-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),transparent_50%)]"></div>
             
             <motion.div 
                className="absolute h-[300px] w-[300px] md:h-[500px] md:w-[500px] rounded-full border-2 border-primary/20"
                animate={{ scale: [0.5, 1.5], opacity: [0, 0.8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
             />

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center justify-around w-full max-w-md relative z-10"
            >
                <PlayerCard name={user.displayName} avatarUrl={user.photoURL} winRate={userProfile?.winRate || 0} />
                <motion.div 
                    className="text-6xl font-black text-gradient-primary mx-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.6 }}
                >VS</motion.div>
                <SearchingCard />
            </motion.div>

            <motion.div
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.8, duration: 0.5 }}
                 className="text-center mt-12 relative z-10"
            >
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Finding the perfect opponent...</h2>
                <p className="text-muted-foreground mt-2">This usually takes just a few moments.</p>
            </motion.div>

            <motion.div
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 1, duration: 0.5 }}
                 className="absolute bottom-10 z-10"
            >
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-card/50" onClick={onCancel}>
                    <X className="mr-2 h-4 w-4"/> Cancel Search
                </Button>
            </motion.div>
        </motion.div>
    </AnimatePresence>
);

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

const VSLogo = () => (
    <svg width="24" height="24" viewBox="0 0 42 41" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.33317 1.66699L18.8332 23.167L6.33317 39.8337H11.6665L24.1665 18.3337L17.4165 6.41699L29.9165 24.5003L22.9165 39.8337H28.2498L41.9998 16.0003V1.66699H36.6665L24.1665 23.167L30.9165 11.2503L18.4165 29.3337L31.1665 1.66699H25.8332L13.3332 23.167L20.0832 35.0837L7.58317 17.0003L14.5832 1.66699H6.33317Z" fill="url(#paint0_linear_1_2)"/>
        <defs>
            <linearGradient id="paint0_linear_1_2" x1="24.1665" y1="1.66699" x2="24.1665" y2="39.8337" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F9A825"/>
                <stop offset="1" stopColor="#F57F17"/>
            </linearGradient>
        </defs>
    </svg>
)

const mockNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Saanvi", "Aadya", "Kiara", "Diya", "Pari", "Ananya", "Riya", "Ahana", "Myra", "Prisha"];
const mockAvatarSeeds = ["Gizmo", "Tinkerbell", "Zoe", "Milo", "Luna", "Oscar", "Ruby", "Leo", "Coco", "Max", "Chloe", "Toby", "Lily", "Rocky", "Mia", "Buddy", "Lucy", "Charlie", "Zoe", "Jack"];
const fees = [50, 100, 150, 200, 250, 300, 350, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000, 20000, 50000];

const generateRandomMatch = (id: number) => {
    const p1Index = Math.floor(Math.random() * mockNames.length);
    let p2Index = Math.floor(Math.random() * mockNames.length);
    while(p1Index === p2Index) p2Index = Math.floor(Math.random() * mockNames.length);
    const fee = fees[Math.floor(Math.random() * fees.length)];
    return {
        id,
        player1: mockNames[p1Index].slice(0,5) + '...',
        player1Avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${mockAvatarSeeds[p1Index]}`,
        player2: mockNames[p2Index].slice(0,5) + '...',
        player2Avatar: `https://api.dicebear.com/8.x/adventurer/svg?seed=${mockAvatarSeeds[p2Index]}`,
        prize: fee * 1.8
    }
}

const LiveMatchList = () => {
    const [matches, setMatches] = useState(() => Array.from({length: 50}, (_, i) => generateRandomMatch(i)));

    useEffect(() => {
        const interval = setInterval(() => {
            setMatches(prev => {
                // Determine how many matches to replace (2 to 4)
                const numToChange = Math.floor(Math.random() * 3) + 2;

                // Create a copy of the array without the last `numToChange` elements
                const updatedMatches = prev.slice(0, prev.length - numToChange);

                // Generate `numToChange` new matches
                const newItems = Array.from({length: numToChange}, (_, i) => generateRandomMatch(Date.now() + i));

                // Add the new matches to the beginning of the array
                return [...newItems, ...updatedMatches];
            });
        }, 25000); // update every 25 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className='mt-8 flex flex-col flex-grow'>
            <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex-grow h-px bg-border"></div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-shrink-0">
                    <Trophy className="text-primary"/>
                    Open Battles (Classic)
                </h2>
                <div className="flex-grow h-px bg-border"></div>
            </div>
            <ScrollArea className="flex-grow pr-4">
                <div className="space-y-3">
                    <AnimatePresence>
                        {matches.map((match, index) => (
                             <motion.div
                                key={match.id}
                                layout
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.3, delay: index * 0.02 }}
                             >
                                <Card className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={match.player1Avatar} />
                                                <AvatarFallback>{match.player1.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-semibold text-sm">{match.player1}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <VSLogo />
                                            <span className="font-bold text-green-600 text-sm">Rs {match.prize}</span>
                                        </div>
                                         <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{match.player2}</span>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={match.player2Avatar} />
                                                <AvatarFallback>{match.player2.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </ScrollArea>
        </div>
    )
}

export default function LobbyPage() {
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [checkedLocalStorage, setCheckedLocalStorage] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRoomCodeDialog, setShowRoomCodeDialog] = useState(false);
  const [showStakesDialog, setShowStakesDialog] = useState(false);
  const [hasRoomCode, setHasRoomCode] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [selectedFee, setSelectedFee] = useState(0);
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
  
  useEffect(() => {
    const searchingMatchFee = localStorage.getItem('searchingMatchFee');
    if (searchingMatchFee) {
        setIsSearching(true);
    }
    setCheckedLocalStorage(true);
  }, []);

  const handleCancelSearch = useCallback(async () => {
    if (!user || !firestore) return;
    if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
    }
    setIsSearching(false);
    localStorage.removeItem('searchingMatchFee');
    localStorage.removeItem('previousActiveIds');
    try {
        // We need to check both queues to cancel, as we don't know which one the user is in client-side
        await deleteDoc(doc(firestore, 'roomCodeCreators', user.uid));
        await deleteDoc(doc(firestore, 'roomCodeSeekers', user.uid));
        toast({ title: "Search Cancelled", description: "You have been removed from the matchmaking queue." });
    } catch (error: any) {
        console.error("Error cancelling search: ", error);
        // Don't show error toast if one of the deletes fails, it's expected.
    }
  }, [user, firestore, toast]);

  useEffect(() => {
    if (isSearching) {
        // Set a 60-second timeout
        searchTimeoutRef.current = setTimeout(() => {
            toast({
                title: "No Match Found",
                description: "We couldn't find an opponent for you at this time. Please try another entry fee or try again later.",
                variant: "destructive",
                duration: 5000,
            });
            handleCancelSearch(); // This will also clear the timeout
        }, 60000); // 60 seconds
    } else if (searchTimeoutRef.current) {
        // Clear timeout if user cancels search manually or a match is found
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
    }

    // Cleanup function to clear timeout if component unmounts
    return () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    };
  }, [isSearching, handleCancelSearch, toast]);

  useEffect(() => {
    if (userProfile && isSearching) {
        const previousActiveIds = JSON.parse(localStorage.getItem('previousActiveIds') || '[]');
        const currentActiveIds = userProfile.activeMatchIds || [];

        if (currentActiveIds.length > previousActiveIds.length) {
            const newMatchId = currentActiveIds.find((id: string) => !previousActiveIds.includes(id));
            if (newMatchId) {
                toast({ title: "Match Found!", description: "Redirecting you to the match room." });
                localStorage.removeItem('searchingMatchFee');
                localStorage.removeItem('previousActiveIds');
                if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                }
                router.push(`/match/${newMatchId}`);
            }
        }
         if (isSearching) {
            localStorage.setItem('previousActiveIds', JSON.stringify(currentActiveIds));
         }
    }
  }, [userProfile, isSearching, router, toast]);

  const handlePlayClick = (fee: number) => {
    if (!user || !userProfile) {
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
        return;
    }
    setShowStakesDialog(false);
    setSelectedFee(fee);
    setShowConfirmDialog(true);
  };

  const handleConfirmPlay = async () => {
    setShowConfirmDialog(false);
    setShowRoomCodeDialog(true);
  }

  const enterQueue = async () => {
      if (!user || !firestore || !userProfile) return;
      setShowRoomCodeDialog(false);
      
      let queueName: string;
      let queueData: any;
      
      if (hasRoomCode) {
          if(!/^\d{8}$/.test(roomCode)) {
              toast({ title: "Invalid Room Code", description: "Room code must be 8 digits.", variant: "destructive"});
              return;
          }
          queueName = 'roomCodeCreators';
          queueData = { roomCode };
      } else {
          queueName = 'roomCodeSeekers';
          queueData = {};
      }

      setIsSearching(true);
      localStorage.setItem('searchingMatchFee', selectedFee.toString());
      localStorage.setItem('previousActiveIds', JSON.stringify(userProfile.activeMatchIds || []));

      try {
        const queueRef = doc(firestore, queueName, user.uid);
        await setDoc(queueRef, {
            ...queueData,
            userId: user.uid,
            entryFee: selectedFee,
            userName: user.displayName,
            userAvatar: user.photoURL,
            winRate: userProfile.winRate || 0,
            rank: userProfile.rank || 0,
            createdAt: new Date(),
        });
        toast({ title: "Searching for a match..." });
      } catch (error: any) {
        console.error(`Error entering ${queueName} queue: `, error);
        toast({ title: "Could not start search", description: error.message, variant: "destructive" });
        setIsSearching(false);
        localStorage.removeItem('searchingMatchFee');
        localStorage.removeItem('previousActiveIds');
      }
  }
  
  if (loading || loadingCommission) {
    return <CustomLoader />;
  }

  const lowStakes = Array.from({ length: 10 }, (_, i) => 50 + i * 50);
  const mediumStakes = Array.from({ length: 9 }, (_, i) => 1000 + i * 500);
  const highStakes = Array.from({ length: 9 }, (_, i) => 10000 + i * 5000);

  const maxUnlockedAmount = userProfile?.maxUnlockedAmount || 100;

  const FeeTier = ({ fees, tier }: { fees: number[], tier: 'low' | 'medium' | 'high' }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {fees.map(fee => {
        const isLocked = tier === 'low' ? false : fee > maxUnlockedAmount;
        return (
          <EntryFeeCard
            key={fee}
            fee={fee}
            onPlay={handlePlayClick}
            isLocked={isLocked}
            commissionPercentage={commissionPercentage}
          />
        )
      })}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
        {checkedLocalStorage && isSearching && user && userProfile && <SearchingOverlay user={user} userProfile={userProfile} onCancel={handleCancelSearch} />}

        {/* Balance Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-primary"/>
                        Confirm Match Entry
                    </DialogTitle>
                    <DialogDescription>
                        Please confirm that you want to join a match with an entry fee of ₹{selectedFee}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Current Wallet Balance:</span>
                        <span className="font-medium">₹{(userProfile?.walletBalance ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Entry Fee:</span>
                        <span className="font-medium text-destructive">- ₹{selectedFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed my-2"></div>
                    <div className="flex justify-between items-center font-semibold text-md">
                        <span className="text-muted-foreground">Estimated Balance After:</span>
                        <span>₹{((userProfile?.walletBalance ?? 0) - selectedFee).toFixed(2)}</span>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleConfirmPlay}>Confirm & Play for ₹{selectedFee}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Room Code Dialog */}
        <Dialog open={showRoomCodeDialog} onOpenChange={setShowRoomCodeDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Do you have a Ludo King room code?</DialogTitle>
                    <DialogDescription>
                        If you have a code, you&apos;ll be matched with someone looking for one.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center space-x-2">
                        <input type="radio" id="has-code" name="roomCodeOption" value="yes" checked={hasRoomCode} onChange={() => setHasRoomCode(true)} />
                        <Label htmlFor="has-code">Yes, I have a room code</Label>
                    </div>
                    {hasRoomCode && (
                        <div className="pl-6">
                            <Label htmlFor="room-code-input">Enter 8-digit Room Code</Label>
                            <Input id="room-code-input" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={8} placeholder="8-digit code" />
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                         <input type="radio" id="no-code" name="roomCodeOption" value="no" checked={!hasRoomCode} onChange={() => setHasRoomCode(false)} />
                         <Label htmlFor="no-code">No, find a match for me</Label>
                    </div>
                </div>
                <DialogFooter>
                     <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                     <Button onClick={enterQueue}>Enter Queue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
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
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Select Your Stake</DialogTitle>
                            <DialogDescription>Choose an entry fee to find an opponent.</DialogDescription>
                        </DialogHeader>
                         <Tabs defaultValue="low" className="w-full pt-4">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="low">Low Stakes</TabsTrigger>
                                <TabsTrigger value="medium">Medium Stakes</TabsTrigger>
                                <TabsTrigger value="high">High Stakes</TabsTrigger>
                            </TabsList>
                            <ScrollArea className="h-96 md:h-[500px] pr-4">
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
                            <li>Select an entry fee and click <strong>Play</strong>.</li>
                            <li>Wait for us to find a suitable opponent for you.</li>
                            <li>Once a match is found, you will be automatically redirected to the match room.</li>
                            <li>Copy the room code and use it to play in your Ludo King app.</li>
                            <li>After the game, take a screenshot of the win/loss screen.</li>
                            <li>Come back to the app and submit your result with the screenshot to claim your winnings.</li>
                        </ol>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <LiveMatchList />
    </div>
  );
}

