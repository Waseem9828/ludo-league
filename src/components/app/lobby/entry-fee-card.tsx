'use client';

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Lock, Swords } from "lucide-react";

export const EntryFeeCard = ({
    fee,
    onPlay,
    isLocked = false,
    commissionPercentage
}: {
    fee: number;
    onPlay: (fee: number) => void;
    isLocked: boolean;
    commissionPercentage: number;
}) => {

    const prize = fee * 2 * (1 - (commissionPercentage / 100));

    const cardContent = (
      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-[url('/entry-fee-card-background.png')] bg-cover bg-center shadow-lg text-primary-foreground p-4 flex flex-col justify-between card-premium">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
                <p className="text-sm text-primary-foreground/80">Entry Fee</p>
                <h3 className="text-3xl font-bold">
                    ₹{fee}
                </h3>
                <p className="text-md font-semibold mt-2">
                    Prize: <span className="text-green-400 font-bold">₹{prize.toFixed(0)}</span>
                </p>
            </div>
            
            <div className="mt-auto">
                 <Button className="w-full h-10 text-md font-bold shadow-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30" onClick={() => onPlay(fee)} disabled={isLocked}>
                    {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Swords className="mr-2 h-4 w-4" />}
                    Play
                </Button>
            </div>
        </div>
      </div>
    );

  if (isLocked) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-not-allowed">
                        <div className="relative">
                            {cardContent}
                             <div className="absolute inset-0 bg-background/70 rounded-lg"></div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Win more matches to unlock higher stakes.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
  }

  return cardContent;
};
