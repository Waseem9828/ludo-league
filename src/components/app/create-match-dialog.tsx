
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, doc, runTransaction, Timestamp } from 'firebase/firestore';
import { Loader2, PlusCircle, Swords } from 'lucide-react';
import { MatchPlayer } from '@/lib/types';

// This component is no longer used in the new matchmaking flow, but kept for reference or future use.
export function CreateMatchDialog({ canCreate }: { canCreate: boolean }) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [entryFee, setEntryFee] = useState(50);

  const handleCreateMatch = async () => {
    if (!user || !firestore || !userProfile) {
      toast({ title: 'You must be logged in to create a match.', variant: 'destructive' });
      return;
    }

    if (entryFee < 50) {
        toast({ title: 'Entry fee must be at least ₹50.', variant: 'destructive'});
        return;
    }

    if (userProfile.walletBalance < entryFee) {
        toast({ title: 'Insufficient wallet balance.', variant: 'destructive' });
        return;
    }

    setIsCreating(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const matchRef = doc(collection(firestore, 'matches'));
        const transactionRef = doc(collection(firestore, 'transactions'));
        
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found!");
            }
            if ((userDoc.data().walletBalance || 0) < entryFee) {
                throw new Error("Insufficient funds. Your balance might have changed.");
            }

            // DO NOT update balance here. The onTransactionCreate function will handle it.

            // 1. Log the transaction
            transaction.set(transactionRef, {
                userId: user.uid,
                type: 'entry-fee',
                amount: -entryFee,
                status: 'completed',
                createdAt: Timestamp.now(),
                relatedMatchId: matchRef.id,
                description: `Created match ${matchRef.id}`
            });

            const newPlayer: MatchPlayer = {
                id: user.uid,
                name: user.displayName || 'Anonymous',
                avatarUrl: user.photoURL || '',
            };

            // 2. Create the match
            transaction.set(matchRef, {
                id: matchRef.id,
                creatorId: user.uid,
                status: 'waiting',
                entryFee: entryFee,
                prizePool: entryFee * 1.8, // Assuming a 10% commission
                maxPlayers: 2,
                playerIds: [user.uid],
                players: {
                    [user.uid]: newPlayer
                },
                createdAt: serverTimestamp(),
            });
        });

        toast({ title: 'Match Created!', description: 'Your match is now waiting for an opponent.'});
        setOpen(false);

    } catch (error: any) {
        console.error("Error creating match:", error);
        toast({ title: 'Failed to create match', description: error.message || "An unexpected error occurred.", variant: 'destructive' });
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Match (Old)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
             <Swords className='h-6 w-6 text-primary'/>
            Create a New Match
            </DialogTitle>
          <DialogDescription>
            The entry fee will be deducted from your wallet immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entry-fee" className="text-right">
              Entry Fee (₹)
            </Label>
            <Input
              id="entry-fee"
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(Number(e.target.value))}
              className="col-span-3"
              min="50"
              step="10"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <Label className="text-right">Prize Pool</Label>
             <div className="col-span-3 font-bold text-lg text-green-600">
                ₹{(entryFee * 1.8).toFixed(2)}
             </div>
           </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
          <Button onClick={handleCreateMatch} disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Confirm & Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
