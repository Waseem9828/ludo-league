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
import { Loader2, PlusCircle, Swords, Lock } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/functions';
import { cn } from '@/lib/utils';

// Expanded entry fee options
const entryFeeOptions = [50, 100, 250, 500, 1000, 2500, 5000];

// New component for selectable cards
const SelectableFeeCard = ({ 
    fee, 
    prize, 
    isSelected, 
    isLocked, 
    onSelect 
}: { 
    fee: number, 
    prize: string, 
    isSelected: boolean, 
    isLocked: boolean, 
    onSelect: (fee: number) => void 
}) => {
    return (
        <div
            onClick={() => !isLocked && onSelect(fee)}
            className={cn(
                "relative cursor-pointer rounded-lg border-2 p-4 text-center transition-all",
                isLocked 
                    ? "cursor-not-allowed bg-muted/30 border-dashed" 
                    : "hover:border-primary",
                isSelected 
                    ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background" 
                    : "border-border"
            )}
        >
            {isLocked && <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />}
            <p className="text-sm font-medium text-muted-foreground">Entry Fee</p>
            <p className="text-2xl font-bold">₹{fee}</p>
            <p className="mt-1 text-sm font-semibold text-green-600">Prize: ₹{prize}</p>
        </div>
    );
};


export function CreateMatchDialog({ canCreate }: { canCreate: boolean }) {
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEntryFee, setSelectedEntryFee] = useState(entryFeeOptions[0]);
  
  const maxUnlockedAmount = userProfile?.maxUnlockedAmount ?? 100;

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
             <Swords className='h-6 w-6 text-primary'/>
            Create a New Match
            </DialogTitle>
          <DialogDescription>
            Select an entry fee. The amount will be deducted from your wallet immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {entryFeeOptions.map((fee) => {
                    const isLocked = fee > maxUnlockedAmount;
                    const prize = (fee * 1.8).toFixed(0);
                    return (
                        <SelectableFeeCard
                            key={fee}
                            fee={fee}
                            prize={prize}
                            isSelected={selectedEntryFee === fee}
                            isLocked={isLocked}
                            onSelect={setSelectedEntryFee}
                        />
                    );
                })}
            </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
          <Button onClick={handleCreateMatch} disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Confirm & Create (₹{selectedEntryFee})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
