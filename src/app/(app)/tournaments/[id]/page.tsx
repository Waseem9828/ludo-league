'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, runTransaction, collection, Timestamp, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Tournament } from '@/lib/types';
import { getTournamentStatus } from '@/lib/types';
import { Loader2, Calendar, Users, Trophy, Ticket, ArrowLeft, Info, UserCheck, LogOut, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params ? params.id as string : '';
  const firestore = useFirestore();
  const { user, userProfile, isAdmin } = useUser();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!firestore || !id) return;
    setLoading(true);
    const unsub = onSnapshot(doc(firestore, 'tournaments', id), (doc) => {
      if (doc.exists()) {
        setTournament({ id: doc.id, ...doc.data() } as Tournament);
      } else {
        toast({ title: 'Tournament not found', variant: 'destructive' });
        router.push('/tournaments');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [firestore, id, router, toast]);

  const handleJoinLeave = async (action: 'join' | 'leave') => {
    if (!firestore || !user || !tournament || !userProfile) return;
    setIsProcessing(true);

    const tournamentRef = doc(firestore, 'tournaments', tournament.id);
    const userRef = doc(firestore, 'users', user.uid);
    const fee = tournament.entryFee;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const tourneyDoc = await transaction.get(tournamentRef);
            const userDoc = await transaction.get(userRef);

            if (!tourneyDoc.exists() || !userDoc.exists()) {
                throw new Error("Tournament or user not found.");
            }
            const tourneyData = tourneyDoc.data() as Tournament;

            const newTransactionRef = doc(collection(firestore, "transactions"));

            if (action === 'join') {
                if(tourneyData.filledSlots >= tourneyData.totalSlots) throw new Error("Tournament is full.");
                if(userProfile.walletBalance < fee) throw new Error("Insufficient wallet balance.");

                transaction.update(tournamentRef, {
                    playerIds: arrayUnion(user.uid),
                    filledSlots: tourneyData.filledSlots + 1
                });
                transaction.update(userRef, { joinedTournamentIds: arrayUnion(tournament.id) });
                transaction.set(newTransactionRef, {
                    userId: user.uid,
                    type: 'tournament-fee',
                    amount: -fee,
                    status: 'completed',
                    createdAt: Timestamp.now(),
                    relatedTournamentId: tournament.id,
                    description: `Entry fee for ${tournament.name}`
                });
            } else { // leave
                transaction.update(tournamentRef, {
                    playerIds: arrayRemove(user.uid),
                    filledSlots: tourneyData.filledSlots - 1
                });
                 transaction.update(userRef, { joinedTournamentIds: arrayRemove(tournament.id) });
                 transaction.set(newTransactionRef, {
                    userId: user.uid,
                    type: 'refund',
                    amount: fee,
                    status: 'completed',
                    createdAt: Timestamp.now(),
                    relatedTournamentId: tournament.id,
                    description: `Refund for leaving ${tournament.name}`
                });
            }
        });
        toast({ title: `Successfully ${action === 'join' ? 'joined' : 'left'} the tournament!`, className: "bg-green-100 text-green-800" });
    } catch(error: any) {
        toast({ title: `Could not ${action} tournament`, description: error.message, variant: 'destructive'});
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleUpdateStatus = async (newStatus: Tournament['status']) => {
      if (!firestore || !isAdmin || !tournament) return;
      setIsProcessing(true);
      const tourneyRef = doc(firestore, 'tournaments', tournament.id);
      try {
          await updateDoc(tourneyRef, { status: newStatus });
          toast({ title: `Tournament status updated to ${newStatus}`, className: "bg-green-100 text-green-800" });
      } catch (error: any) {
          toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
      } finally {
          setIsProcessing(false);
      }
  }


  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if (!tournament) {
    return <Alert variant="destructive"><AlertTitle>Not Found</AlertTitle><AlertDescription>This tournament could not be found.</AlertDescription></Alert>;
  }

  const status = getTournamentStatus(tournament);
  const isJoined = user ? tournament.playerIds.includes(user.uid) : false;
  const isFull = tournament.filledSlots >= tournament.totalSlots;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back to Tournaments</Button>

      {tournament.bannerImageUrl && (
        <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-lg shadow-lg">
          <Image src={tournament.bannerImageUrl} alt={tournament.name} fill className="object-cover" />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{tournament.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 pt-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(tournament.startTime.seconds * 1000).toLocaleString()} to {new Date(tournament.endTime.seconds * 1000).toLocaleString()}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Rules</h3>
              <p className="prose prose-sm dark:prose-invert text-muted-foreground">{tournament.rules}</p>
            </CardContent>
          </Card>
          
           <Card>
                <CardHeader>
                    <CardTitle>Registered Players ({tournament.filledSlots} / {tournament.totalSlots})</CardTitle>
                </CardHeader>
                <CardContent>
                    {tournament.playerIds.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {tournament.playerIds.map(playerId => (
                                <div key={playerId} className="flex items-center gap-2 text-sm">
                                    <UserCheck className="h-4 w-4 text-green-500" />
                                    <span className="truncate">{playerId.substring(0, 10)}...</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No players have registered yet.</p>
                    )}
                </CardContent>
           </Card>

        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><Ticket className="h-4 w-4" /> Entry Fee</span>
                <span className="font-semibold">₹{tournament.entryFee}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><Trophy className="h-4 w-4" /> Prize Pool</span>
                <span className="font-semibold text-green-600">₹{tournament.prizePool}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Slots</span>
                <span className="font-semibold">{tournament.filledSlots} / {tournament.totalSlots}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge className={cn("text-xs font-bold", {
                    "bg-yellow-500 text-white": status === 'upcoming',
                    "bg-red-600 text-white animate-pulse": status === 'live',
                    "bg-green-600 text-white": status === 'completed',
                    "bg-gray-500 text-white": status === 'cancelled' || status === 'paused',
                })}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
              </div>
                {status === 'upcoming' && (
                    <div className="pt-4">
                        {isJoined ? (
                            <Button className="w-full" variant="destructive" onClick={() => handleJoinLeave('leave')} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
                                Leave Tournament
                            </Button>
                        ) : (
                            <Button className="w-full" variant="default" onClick={() => handleJoinLeave('join')} disabled={isProcessing || isFull}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCheck className="mr-2 h-4 w-4" />}
                                {isFull ? 'Tournament Full' : 'Join Now'}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
            {tournament.prizeDistributed && (
                <CardFooter>
                    <p className='text-sm text-green-600 font-semibold w-full text-center'>Prizes have been distributed for this tournament.</p>
                </CardFooter>
            )}
          </Card>
          
          {isAdmin && (
              <Card>
                  <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('upcoming')} disabled={isProcessing}>Set to Upcoming</Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('live')} disabled={isProcessing}>Set to Live</Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('completed')} disabled={isProcessing}>Set to Completed</Button>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('paused')} disabled={isProcessing}>Set to Paused</Button>
                      <Button size="sm" variant="destructive" className="col-span-2" onClick={() => handleUpdateStatus('cancelled')} disabled={isProcessing}>Cancel Tournament</Button>
                       <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="default" className="col-span-2" disabled={isProcessing || tournament.prizeDistributed}>Distribute Winnings</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirm Prize Distribution</DialogTitle>
                                    <DialogDescription>This will trigger the cloud function to distribute prizes to the winners. This action cannot be undone.</DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                                    <Button onClick={() => alert('Winnings distribution logic not implemented yet.')}>Confirm & Distribute</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                  </CardContent>
              </Card>
          )}

        </div>
      </div>
    </div>
  );
}
