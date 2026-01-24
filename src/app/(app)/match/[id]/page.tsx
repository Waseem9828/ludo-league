
'use client';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Copy,
  Trophy,
  ShieldCheck,
  Swords,
  Users,
  Wallet,
  Loader2,
  Info,
  Trash2,
  LogOut,
  Gamepad2,
  Edit,
  Save,
  Flag,
  Hourglass
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import {
  doc,
  onSnapshot,
  runTransaction,
  collection,
  Timestamp,
  arrayRemove,
  updateDoc,
  arrayUnion,
  DocumentSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Match, MatchPlayer, UserProfile } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OpenLudoKingButton from '@/components/app/OpenLudoKingButton';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/functions';

const PlayerLobby = ({ match, winnerId }: { match: Match, winnerId?: string | null }) => {
    const playersArray = Object.values(match.players);
    const player1 = playersArray[0];
    const player2 = playersArray.length > 1 ? playersArray[1] : null;

    const PlayerAvatar = ({ player, isWinner, position }: { player: any, isWinner: boolean, position: 'left' | 'right' }) => (
        <motion.div
            initial={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-2 relative"
        >
            {isWinner && (
                <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.7 }}
                    className="absolute -top-4 md:-top-8"
                >
                    <Trophy className="h-8 w-8 md:h-12 md:w-12 text-amber-400 drop-shadow-[0_4px_6px_rgba(251,191,36,0.5)]" />
                </motion.div>
            )}
            <Avatar className={cn(
                "h-20 w-20 md:h-28 md:w-28 border-4 md:border-[6px] shadow-lg",
                isWinner ? "border-amber-400" : "border-primary/30"
            )}>
                <AvatarImage src={player.avatarUrl} alt={player.name} />
                <AvatarFallback className="text-2xl md:text-3xl font-bold">{player.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-bold text-base md:text-xl text-foreground truncate max-w-[120px] md:max-w-[150px]">{player.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Win Rate: {player.winRate || 0}%</p>
            </div>
        </motion.div>
    );

    return (
        <div className="w-full rounded-2xl bg-gradient-to-tr from-card to-muted/50 p-4 md:p-6 shadow-xl border border-border">
            <div className="flex items-center justify-around">
                {player1 && <PlayerAvatar player={player1} isWinner={winnerId === player1.id} position="left" />}
                
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-primary mx-2 md:mx-4 drop-shadow-sm"
                >
                    VS
                </motion.div>

                {player2 ? (
                    <PlayerAvatar player={player2} isWinner={winnerId === player2.id} position="right" />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col items-center gap-2 text-muted-foreground"
                    >
                         <Avatar className="h-20 w-20 md:h-28 md:w-28 border-4 border-dashed flex items-center justify-center bg-muted/50">
                            <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-primary"/>
                        </Avatar>
                        <div className="text-center">
                            <h3 className="font-semibold text-base md:text-xl text-foreground">Waiting...</h3>
                            <p className="text-xs md:text-sm">For Opponent</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};


const MatchDetailsCard = ({ match }: { match: Match }) => (
    <div className="w-full text-center rounded-xl bg-gradient-primary p-4 md:p-6 shadow-2xl">
        <div className="flex justify-around items-center">
            <div className="text-primary-foreground">
                <p className="text-xs md:text-sm font-semibold opacity-80 uppercase tracking-wider flex items-center gap-2"><Wallet className="h-4 w-4"/> Entry Fee</p>
                <p className="text-2xl md:text-3xl font-bold">₹{match.entryFee.toLocaleString()}</p>
            </div>
            <div className="h-12 md:h-16 w-px bg-white/20"></div>
            <div className="text-primary-foreground">
                <p className="text-xs md:text-sm font-semibold opacity-80 uppercase tracking-wider flex items-center gap-2"><Trophy className="h-4 w-4"/> Prize Pool</p>
                <p className="text-2xl md:text-3xl font-bold">₹{match.prizePool.toLocaleString()}</p>
            </div>
        </div>
    </div>
);

const WaitingForOpponentCard = () => (
    <Card>
        <CardHeader className='items-center text-center'>
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <CardTitle>Waiting for Opponent</CardTitle>
            <CardDescription>The match will begin once another player joins. Your match is listed publicly.</CardDescription>
        </CardHeader>
    </Card>
);

const ResultSubmittedCard = () => (
    <Card>
        <CardHeader className='items-center text-center'>
            <Hourglass className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Result Submitted</CardTitle>
            <CardDescription>Your result has been recorded. Waiting for the opponent to submit their result. The match will be settled automatically.</CardDescription>
        </CardHeader>
    </Card>
);

const UnderReviewCard = ({ reason }: { reason?: string }) => (
     <Card className="border-amber-500/50 bg-amber-500/10">
        <CardHeader className='items-center text-center'>
            <ShieldCheck className="h-8 w-8 text-amber-600 mb-2" />
            <CardTitle className="text-amber-700">Match Under Review</CardTitle>
            <CardDescription className="text-amber-600">
                An admin is reviewing this match due to a discrepancy.
                {reason && <span className="block mt-2 font-semibold">Reason: {reason}</span>}
            </CardDescription>
        </CardHeader>
    </Card>
);


const JoinMatchButton = ({ match, userProfile, isActionLoading, handleJoinMatch }: { match: Match, userProfile: UserProfile | null, isActionLoading: boolean, handleJoinMatch: () => void}) => {
    const hasSufficientBalance = userProfile && userProfile.walletBalance >= match.entryFee;
    const isAlreadyInMatch = userProfile && userProfile.activeMatchIds && userProfile.activeMatchIds.includes(match.id);
    const hasReachedMatchLimit = userProfile && userProfile.activeMatchIds && userProfile.activeMatchIds.length >= 5;


    if (hasReachedMatchLimit && !isAlreadyInMatch) {
        return (
            <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Match Limit Reached</AlertTitle>
                <AlertDescription>You already have 5 active matches. Please complete one before joining a new one.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Join This Match</CardTitle>
                <CardDescription>Click the button below to join the match. The entry fee will be deducted from your wallet.</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasSufficientBalance && (
                     <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Insufficient Balance</AlertTitle>
                        <AlertDescription>
                            You do not have enough funds to join this match. 
                            <Button variant="link" className="p-0 h-auto ml-1" asChild><Link href="/wallet">Add funds?</Link></Button>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter>
                 <Button size="lg" className="w-full font-bold text-lg bg-gradient-primary" onClick={handleJoinMatch} disabled={!!(isActionLoading || !hasSufficientBalance || isAlreadyInMatch || hasReachedMatchLimit)}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Swords className="mr-2 h-4 w-4"/>}
                    Join Match (₹{match.entryFee})
                </Button>
            </CardFooter>
        </Card>
    );
}

const RoomCodeManager = ({ match, isCreator }: { match: Match; isCreator: boolean }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [roomCode, setRoomCode] = useState(match.roomCode || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setRoomCode(match.roomCode || '');
    }, [match.roomCode]);

    const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 8) {
            setRoomCode(value);
        }
    };

    const handleSaveRoomCode = async () => {
        if (!/^\d{8}$/.test(roomCode)) {
            toast({ title: 'Invalid Room Code', description: 'Room code must be exactly 8 digits.', variant: 'destructive' });
            return;
        }
        if (!firestore) return;

        setIsSubmitting(true);
        try {
            const matchRef = doc(firestore, 'matches', match.id);
            await updateDoc(matchRef, {
                roomCode: roomCode,
                status: 'PLAYING'
            });
            toast({ title: 'Room code saved!', className: 'bg-green-100 text-green-800' });
        } catch (error: any) {
            toast({ title: 'Error saving code', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!match.roomCode) {
        if (isCreator) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Enter Room Code</CardTitle>
                        <CardDescription>The match is full. Create a room in Ludo King and enter the 8-digit code below to start.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label htmlFor="room-code">Ludo King Room Code</Label>
                        <Input id="room-code" value={roomCode} onChange={handleRoomCodeChange} placeholder="8-digit code" type="text" inputMode="numeric" maxLength={8} pattern="\d{8}" />
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveRoomCode} disabled={isSubmitting} className="w-full bg-gradient-primary">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit & Start Match
                        </Button>
                    </CardFooter>
                </Card>
            );
        } else {
            return (
                <Card>
                    <CardHeader className='items-center text-center'>
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <CardTitle>Waiting for Room Code</CardTitle>
                        <CardDescription>The match creator is entering the Ludo King room code. The page will update automatically.</CardDescription>
                    </CardHeader>
                </Card>
            );
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-primary" /> Play Now!</CardTitle>
                <CardDescription>Use the room code to join the match in your Ludo King app. If the code is wrong, the creator can edit it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <OpenLudoKingButton />
            </CardContent>
        </Card>
    );
};


const IdAndCodeCard = ({ match, id, isCreator }: { match: Match, id: string, isCreator: boolean }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [roomCode, setRoomCode] = useState(match.roomCode || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        setRoomCode(match.roomCode || '');
    }, [match.roomCode]);

    const handleCopy = async (text: string, type: 'Match ID' | 'Room Code') => {
        try {
            await navigator.clipboard.writeText(text);
            toast({ title: `${type} copied!` });
        } catch (error) {
            console.error('Failed to copy:', error);
            toast({
                title: 'Failed to Copy',
                description: 'Could not copy to clipboard. Please try again.',
                variant: 'destructive',
            });
        }
    }

    const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 8) setRoomCode(value);
    };

    const handleSaveRoomCode = async () => {
        if (!/^\d{8}$/.test(roomCode)) {
            toast({ title: 'Invalid Room Code', description: 'Room code must be exactly 8 digits.', variant: 'destructive' });
            return;
        }
        if (!firestore) return;
        
        setIsSubmitting(true);
        try {
            const matchRef = doc(firestore, 'matches', match.id);
            await updateDoc(matchRef, { roomCode: roomCode });
            toast({ title: 'Room code saved!', className: 'bg-green-100 text-green-800' });
            setIsDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Error saving code', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Match Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Match ID</Label>
                    <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <p className="text-sm font-mono text-muted-foreground truncate">{id}</p>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(id, 'Match ID')}><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
                 {match.roomCode && (
                    <div>
                        <Label>Room Code</Label>
                        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                            <p className="text-sm font-mono text-muted-foreground">{match.roomCode}</p>
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => handleCopy(match.roomCode!, 'Room Code')}><Copy className="h-4 w-4" /></Button>
                                {isCreator && (
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Edit Room Code</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Label htmlFor="room-code-edit">8-digit Room Code</Label>
                                                <Input id="room-code-edit" value={roomCode} onChange={handleRoomCodeChange} maxLength={8} />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                <Button onClick={handleSaveRoomCode} disabled={isSubmitting}>
                                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="h-4 w-4 mr-2" />}
                                                    Save
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </div>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}

const MatchConcludedCard = ({ match }: {match: Match}) => {
    const router = useRouter();
    let title = "Match Concluded";
    let description = "This match has finished. Winnings are being processed or are already distributed.";

    if (match.status === 'cancelled') {
        title = "Match Cancelled";
        description = "This match was cancelled. Any entry fees have been refunded."
    }

    return (
         <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary"/> {title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button className='w-full bg-gradient-primary' onClick={() => router.push('/lobby')}>Back to Lobby</Button>
            </CardFooter>
        </Card>
    )
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params ? params.id as string : '';
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { toast } = useToast();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!firestore || !id) return;
    setLoading(true);
    const matchRef = doc(firestore, 'matches', id);
    const unsubscribe = onSnapshot(matchRef, (doc: DocumentSnapshot) => {
        if (doc.exists()) {
            const matchData = { id: doc.id, ...doc.data() } as Match;
            setMatch(matchData);

            if (user) {
                const resultsRef = doc(firestore, `matches/${id}/results`, user.uid);
                onSnapshot(resultsRef, (resultDoc) => {
                    setHasSubmitted(resultDoc.exists());
                });
            }
        }
        else {
          toast({ title: "Match not found", variant: "destructive" });
          router.push('/lobby');
        }
        setLoading(false);
      }, (error) => {
        console.error('Error fetching match:', error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [firestore, id, router, toast, user]);
  
  useEffect(() => {
    if (user && userProfile && match && ['cancelled', 'completed'].includes(match.status)) {
      if (userProfile.activeMatchIds?.includes(match.id)) {
        const userRef = doc(firestore, 'users', user.uid);
        updateDoc(userRef, { activeMatchIds: arrayRemove(match.id) });
      }
    }
  }, [match, user, userProfile, firestore]);


  const handleJoinMatch = async () => {
    if (!user || !match) return;

    setIsActionLoading(true);
    try {
        const joinMatchFn = httpsCallable(functions, 'joinMatch');
        const result = await joinMatchFn({ matchId: match.id });
        const data = result.data as { success: boolean; matchId: string; message?: string };
        
        if (data.success) {
            toast({ title: "Successfully Joined!", description: "You have been added to the match." });
        } else {
            throw new Error(data.message || 'Failed to join match.');
        }
    } catch (error: any) {
        console.error('Error joining match:', error);
        toast({ title: 'Error Joining Match', description: error.message, variant: 'destructive' });
    } finally {
        setIsActionLoading(false);
    }
  };

   const handleLeaveOrDeleteMatch = async () => {
    if (!firestore ||!user || !match || match.status !== 'waiting') return;
    setIsActionLoading(true);
    const isCreator = user.uid === match.creatorId;

    try {
        await runTransaction(firestore, async (transaction) => {
            const matchRef = doc(firestore, 'matches', match.id);
            const userRef = doc(firestore, 'users', user.uid);

            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) throw new Error("Match not found");
            const currentMatch = matchDoc.data() as Match;

            const refundTransactionRef = doc(collection(firestore, 'transactions'));
            transaction.set(refundTransactionRef, {
                userId: user.uid, type: 'refund', amount: match.entryFee, status: 'completed', createdAt: Timestamp.now(),
                relatedMatchId: match.id, description: `Refund for leaving/deleting match ${match.id}`,
            });
            transaction.update(userRef, { activeMatchIds: arrayRemove(match.id) });

            if (isCreator) {
                 if (Object.keys(currentMatch.players).length > 1) throw new Error("Cannot delete a match another player has joined.");
                 transaction.delete(matchRef);
            } else {
                const updatedPlayers = { ...currentMatch.players };
                delete updatedPlayers[user.uid];
                transaction.update(matchRef, { players: updatedPlayers });
            }
        });

        toast({ title: isCreator ? 'Match Deleted' : 'You Left the Match', description: 'Your entry fee has been refunded.' });
        router.push('/lobby');
    } catch (error: any) {
      console.error('Error leaving/deleting match:', error);
      toast({ title: 'Error performing action', description: error.message, variant: 'destructive' });
      setIsActionLoading(false);
    }
  };

  if (loading || !user || !userProfile) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!match) {
    return <Alert variant="destructive"><Info className="h-4 w-4" /><AlertTitle>Match Not Found</AlertTitle><AlertDescription>The match may have been removed.</AlertDescription></Alert>;
  }
  
  const isCreator = user.uid === match.creatorId;
  const isPlayer = Object.keys(match.players).includes(user.uid);
  const isMatchFull = Object.keys(match.players).length === match.maxPlayers;
  
  const ActionArea = () => {
    switch (match.status) {
        case 'waiting':
            if (isPlayer) return <WaitingForOpponentCard />;
            return <JoinMatchButton {...{match, userProfile, isActionLoading, handleJoinMatch}} />;
        case 'in-progress':
            return <RoomCodeManager match={match} isCreator={isCreator} />;
        case 'PLAYING':
            if (hasSubmitted) return <ResultSubmittedCard />;
            return <RoomCodeManager match={match} isCreator={isCreator} />;
        case 'RESULT_SUBMITTED':
            if (hasSubmitted) return <ResultSubmittedCard />;
            return <p>Opponent has submitted. Please submit your result.</p>; // This case might need a proper UI card
        case 'UNDER_REVIEW':
            return <UnderReviewCard reason={match.reviewReason} />;
        case 'completed':
        case 'cancelled':
            return <MatchConcludedCard match={match} />;
        default:
            return <Card><CardContent><p>Loading match status...</p></CardContent></Card>;
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-4 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <MatchDetailsCard match={match} />
                <PlayerLobby match={match} winnerId={match.winnerId} /> 
                <ActionArea />
            </div>

            <div className="space-y-6">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle>Match Status</CardTitle>
                        <Badge variant={match.status === 'UNDER_REVIEW' ? 'destructive' : 'secondary'}>{match.status}</Badge>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {isMatchFull ? 'Match is full and ready to start.' : `Waiting for ${(match.maxPlayers ?? 2) - Object.keys(match.players).length} more player(s).`}
                        </p>
                    </CardContent>
                     {match.status === 'waiting' && isPlayer && (
                        <CardFooter>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleLeaveOrDeleteMatch}
                                disabled={isActionLoading}
                            >
                                {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isCreator ? <Trash2 className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />)}
                                {isCreator ? 'Delete Match' : 'Leave Match'}
                            </Button>
                        </CardFooter>
                    )}
                    {(match.status === 'PLAYING' && isPlayer && !hasSubmitted) && (
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/match/${id}/submit`}>
                                    <Flag className="mr-2 h-4 w-4" />
                                    Confirm & Submit Result
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                 </Card>
                <IdAndCodeCard id={id} match={match} isCreator={isCreator}/>
            </div>
        </div>
    </div>
  );
}
