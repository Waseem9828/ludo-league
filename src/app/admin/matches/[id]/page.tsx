
'use client';
import Image from 'next/image';
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
  Crown,
  ShieldCheck,
  Loader2,
  Info,
  Trash2,
  AlertTriangle,
  Eye,
  User,
  Gavel,
  BadgeCent,
  KeyRound
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import {
  doc,
  onSnapshot,
  collection,
  Timestamp,
  writeBatch,
  runTransaction,
  getDocs,
  getDoc,
  where,
  query,
  updateDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEffect, useState, useCallback } from 'react';
import type { Match, MatchPlayer, MatchResult, UserProfile, Transaction } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';


const MatchDetailsCard = ({ match, onRemoveRoomCode, isProcessing }: { match: Match, onRemoveRoomCode: () => void, isProcessing: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle>Match Info</CardTitle>
            <CardDescription>ID: {match.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                 <Badge 
                    variant={match.status === 'disputed' 
                        ? 'destructive' 
                        : match.status === 'completed' 
                        ? 'default'
                        : 'secondary'}
                    className={cn({
                        'bg-green-100 text-green-800': match.status === 'completed',
                        'bg-yellow-100 text-yellow-800': match.status === 'in-progress',
                    })}
                >
                    {match.status}
                </Badge>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Room Code</span>
                {match.roomCode ? (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted p-1 rounded">{match.roomCode}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemoveRoomCode} disabled={isProcessing}>
                           {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> :<Trash2 className="h-4 w-4 text-destructive"/>}
                        </Button>
                    </div>
                ) : <span className="font-semibold">N/A</span>}
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Entry Fee</span>
                <span className="font-semibold">₹{match.entryFee}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Prize Pool</span>
                <span className="font-semibold">₹{match.prizePool}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Created At</span>
                <span className="font-semibold">{match.createdAt?.toDate ? match.createdAt.toDate().toLocaleString('en-GB') : 'N/A'}</span>
            </div>
            {match.winnerId && (
                 <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Winner</span>
                    <span className="font-semibold text-green-600 flex items-center gap-2"><Crown className="h-4 w-4"/> {Object.values(match.players).find((p: MatchPlayer) => p.id === match.winnerId)?.name || 'N/A'}</span>
                </div>
            )}
             {match.reviewReason && (
                 <div className="flex flex-col gap-1 pt-2 border-t">
                    <span className="text-muted-foreground">Review Reason</span>
                    <span className="font-semibold text-destructive">{match.reviewReason}</span>
                </div>
            )}
        </CardContent>
    </Card>
);

const PlayerResultCard = ({ result, player }: { result: MatchResult, player: UserProfile }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={player?.photoURL || ''} />
                        <AvatarFallback>{player?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <CardTitle>{player?.displayName || 'Unknown Player'}</CardTitle>
                        <CardDescription>Wins: {player?.totalMatchesWon || 0} / Losses: {(player?.totalMatchesPlayed || 0) - (player?.totalMatchesWon || 0)}</CardDescription>
                    </div>
                    {player?.kycStatus === 'approved' && <ShieldCheck className="h-5 w-5 text-green-500"/>}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Claimed Status</span>
                    <Badge variant={result.status === 'win' ? 'default' : 'destructive'} className={result.status === 'win' ? 'bg-green-100 text-green-800' : ''}>
                        {result.status.toUpperCase()}
                    </Badge>
                </div>
                <Button asChild className="w-full">
                    <a href={result.screenshotUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="mr-2 h-4 w-4" /> View Screenshot
                    </a>
                </Button>
            </CardContent>
        </Card>
    );
};

const AdminActionCard = ({ match, onDeclareWinner, onCancelMatch, isProcessing }: { match: Match, onDeclareWinner: (winnerId: string) => void, onCancelMatch: () => void, isProcessing: boolean }) => {
    const [selectedWinner, setSelectedWinner] = useState<string>('');

    return (
        <Card className="border-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gavel/>Admin Actions</CardTitle>
                <CardDescription>Manually resolve this match. This action is final and will process payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="winner-select">Declare Winner</Label>
                    <Select onValueChange={setSelectedWinner} value={selectedWinner}>
                        <SelectTrigger id="winner-select">
                            <SelectValue placeholder="Select a player to be the winner" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(match.players).map((p: MatchPlayer) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                 <Button className="w-full" onClick={() => onDeclareWinner(selectedWinner)} disabled={!selectedWinner || isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Crown className="mr-2 h-4 w-4"/>}
                    Declare Winner & Distribute Prize
                </Button>
                 <Button className="w-full" variant="destructive" onClick={onCancelMatch} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                    Cancel Match & Refund All
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function AdminMatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params ? params.id as string : '';
  const { user: adminUser } = useUser();
  const firestore = useFirestore();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !id) return;
    setLoading(true);

    const matchRef = doc(firestore, 'matches', id);
    const resultsRef = collection(firestore, 'matches', id, 'results');

    const unsubMatch = onSnapshot(matchRef, (doc) => {
        if (doc.exists()) {
            const matchData = { id: doc.id, ...doc.data() } as Match;
            setMatch(matchData);
            if (matchData.players) {
                fetchPlayerProfiles(Object.keys(matchData.players));
            }
        } else {
            toast({ title: "Match not found", variant: "destructive" });
            router.push('/admin/matches');
        }
    }, (error) => console.error("Error fetching match:", error));

    const unsubResults = onSnapshot(resultsRef, (snapshot) => {
        setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchResult)));
        setLoading(false);
    }, (error) => console.error("Error fetching results:", error));

    const fetchPlayerProfiles = async (playerIds: string[]) => {
        if (!firestore) return;
        const profiles: UserProfile[] = [];
        for (const pid of playerIds) {
             try {
                const userDocRef = doc(firestore, 'users', pid);
                const playerDoc = await getDoc(userDocRef);
                 if (playerDoc.exists()) {
                    profiles.push({uid: playerDoc.id, ...playerDoc.data()} as UserProfile);
                }
             } catch (e) {
                console.error(`Could not fetch profile for ${pid}`, e);
             }
        }
        setPlayers(profiles);
    }

    return () => {
        unsubMatch();
        unsubResults();
    };

  }, [firestore, id, router, toast]);

  const handleDeclareWinner = async (winnerId: string) => {
    if(!firestore || !match || !adminUser) return;
    setIsProcessing(true);

    const functions = getFunctions();
    const declareWinnerFn = httpsCallable(functions, 'declareWinnerAndDistribute');

    try {
        const result = await declareWinnerFn({ matchId: match.id, winnerId });
        toast({ title: 'Winner Declared!', description: (result.data as any).message, className: 'bg-green-100 text-green-800'});
        router.push('/admin/matches');

    } catch (error: any) {
        toast({ title: 'Error Declaring Winner', description: error.message, variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  }

  const handleCancelMatch = async () => {
    if(!firestore || !match || !adminUser) return;
    setIsProcessing(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const matchRef = doc(firestore, 'matches', match.id);
            const matchDoc = await transaction.get(matchRef);

             if (!matchDoc.exists() || !['in-progress', 'disputed', 'waiting'].includes(matchDoc.data()?.status as string)) {
                throw new Error('Match cannot be cancelled in its current state.');
            }

            transaction.update(matchRef, { 
                status: 'cancelled',
                resolvedBy: adminUser.uid,
                resolvedAt: Timestamp.now()
            });

            // Refund players
            for(const playerId of Object.keys(match.players)) {
                const refundTransactionRef = doc(collection(firestore, 'transactions'));
                transaction.set(refundTransactionRef, {
                    userId: playerId,
                    amount: match.entryFee,
                    type: 'refund',
                    status: 'completed',
                    description: `Refund for cancelled match ${match.id}`,
                    createdAt: Timestamp.now(),
                    relatedMatchId: match.id
                });
            }
        });

        toast({ title: 'Match Cancelled', description: 'Players have been refunded.', variant: 'destructive'});
        router.push('/admin/matches');

    } catch(error: any) {
        toast({ title: 'Error Cancelling Match', description: error.message, variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  }

  const handleRemoveRoomCode = async () => {
    if (!firestore || !match) return;
    setIsProcessing(true);
    try {
        const matchRef = doc(firestore, 'matches', id);
        await updateDoc(matchRef, { roomCode: null });
        toast({ title: 'Room Code Removed' });
    } catch (error: any) {
        toast({ title: 'Error', description: 'Could not remove room code.', variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  }
  

  if (loading || !match) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto max-w-6xl py-4 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {results.length > 0 ? results.map(result => {
                    const player = players.find(p => p.uid === result.userId);
                    return player ? <PlayerResultCard key={result.id} result={result} player={player} /> : null;
                }) : (
                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle>Waiting for Results</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">No players have submitted their results yet.</p></CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-6">
                 <MatchDetailsCard match={match} onRemoveRoomCode={handleRemoveRoomCode} isProcessing={isProcessing} />
                 {(match.status === 'disputed' || match.status === 'in-progress' || match.status === 'waiting') && (
                    <AdminActionCard match={match} onDeclareWinner={handleDeclareWinner} onCancelMatch={handleCancelMatch} isProcessing={isProcessing} />
                 )}
                 {match.prizeDistributed && (
                    <Alert variant="default" className="bg-green-100 border-green-500 text-green-900">
                        <BadgeCent className="h-4 w-4" />
                        <AlertTitle>Prize Distributed</AlertTitle>
                        <AlertDescription>Winnings for this match have already been paid out.</AlertDescription>
                    </Alert>
                 )}
            </div>
        </div>
    </div>
  );
}
