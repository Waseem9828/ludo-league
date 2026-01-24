
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import type { Match } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ResolveMatchDialogProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResolveMatchDialog({ match, isOpen, onClose }: ResolveMatchDialogProps) {
  const functions = useFunctions();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResolve = async (winnerId: string | null, isDraw: boolean = false) => {
    if (!functions) return;
    setIsSubmitting(true);

    const resolveDisputedMatch = httpsCallable(functions, 'resolveDisputedMatch');

    try {
      await resolveDisputedMatch({ matchId: match.id, winnerId, isDraw });
      toast({ title: 'Match Resolved', description: 'The match has been successfully resolved.' });
      onClose();
    } catch (error: any) {
      console.error("Error resolving match:", error);
      toast({ title: 'Resolution Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resolve Match: {match.id}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {Object.values(match.players).map(player => (
            <div key={player.id} className="space-y-4">
              <h3 className="font-bold text-lg">{player.name}</h3>
              <div className="relative w-full h-96 bg-muted rounded-md overflow-hidden">
                 {match.results?.[player.id]?.screenshotUrl && (
                    <Image 
                        src={match.results[player.id].screenshotUrl} 
                        alt={`Screenshot from ${player.name}`} 
                        layout="fill"
                        objectFit="contain"
                    />
                 )}
              </div>
              <p>Submitted Result: <span className="font-semibold">{match.results?.[player.id]?.result}</span></p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button 
            variant="secondary" 
            onClick={() => handleResolve(null, true)} 
            disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Declare Draw & Refund
          </Button>
          {Object.values(match.players).map(player => (
            <Button 
                key={player.id} 
                onClick={() => handleResolve(player.id)} 
                disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Declare {player.name} as Winner
              </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
