
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
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Swords } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/functions';
import { Label } from '../ui/label';

const entryFeeOptions = [50, 100, 200, 500];

export function CreateMatchDialog({ canCreate }: { canCreate: boolean }) {
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEntryFee, setSelectedEntryFee] = useState(entryFeeOptions[0]);

  const handleCreateMatch = async () => {
    if (!user || !userProfile) {
      toast({ title: 'You must be logged in to create a match.', variant: 'destructive' });
      return;
    }

    if (userProfile.walletBalance < selectedEntryFee) {
        toast({ title: 'Insufficient wallet balance.', variant: 'destructive' });
        return;
    }
    
    if (!canCreate) {
        toast({ title: 'Match Limit Reached', description: 'You cannot have more than 5 active matches.', variant: 'destructive' });
        return;
    }

    setIsCreating(true);
    try {
        const createMatchFn = httpsCallable(functions, 'createMatch');
        const result = await createMatchFn({ entryFee: selectedEntryFee });
        const data = result.data as { success: boolean, matchId: string, message?: string };

        if (data.success) {
            toast({ title: 'Match Created!', description: 'Your match is now public and waiting for an opponent.'});
            setOpen(false);
        } else {
            throw new Error(data.message || 'Failed to create match.');
        }

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
          Create New Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
             <Swords className='h-6 w-6 text-primary'/>
            Create a New Match
            </DialogTitle>
          <DialogDescription>
            Select an entry fee. The amount will be deducted from your wallet immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entry-fee" className="text-right">
              Entry Fee (₹)
            </Label>
            <div className="col-span-3 flex gap-2">
              {entryFeeOptions.map((fee) => (
                <Button 
                  key={fee} 
                  variant={selectedEntryFee === fee ? 'default' : 'outline'}
                  onClick={() => setSelectedEntryFee(fee)}
                >
                  ₹{fee}
                </Button>
              ))}
            </div>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <Label className="text-right">Prize Pool</Label>
             <div className="col-span-3 font-bold text-lg text-green-600">
                ₹{(selectedEntryFee * 1.8).toFixed(2)}
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
