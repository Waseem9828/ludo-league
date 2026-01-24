
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import type { Match } from '@/lib/types';

export default function MatchPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !matchId) return;

    const matchRef = doc(firestore, 'matches', matchId);
    const unsubscribe = onSnapshot(matchRef, (doc) => {
      if (doc.exists()) {
        setMatch({ id: doc.id, ...doc.data() } as Match);
      } else {
        // Handle match not found
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, matchId]);

  const renderActionForStatus = () => {
    if (!match || !user) return null;

    const isPlayer = match.playerIds.includes(user.uid);
    const playerResultSubmitted = match.results && match.results[user.uid];

    if (match.status === 'UNDER_REVIEW') {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Match Under Review</AlertTitle>
          <AlertDescription>
            {match.reviewReason || "This match has been flagged for administrative review. Please wait for a decision."}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (match.status === 'PLAYING' && isPlayer && !playerResultSubmitted) {
        return (
             <Link href={`/match/${matchId}/submit`} className="w-full">
                <Button className="w-full">Submit Result</Button>
            </Link>
        )
    }

    if (match.status === 'RESULT_PENDING' && isPlayer && !playerResultSubmitted) {
        return (
             <Link href={`/match/${matchId}/submit`} className="w-full">
                <Button className="w-full">Submit Your Result</Button>
            </Link>
        )
    }
    
    if (match.status === 'RESULT_PENDING' && playerResultSubmitted) {
        return <p className="text-center text-muted-foreground">Waiting for opponent to submit result.</p>
    }

    return <p className="text-center text-muted-foreground">Match Status: <Badge>{match.status}</Badge></p>;
  };

  if (loading || !match) {
    return <div>Loading...</div>; // Or a proper skeleton loader
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>Match ID: {match.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-around items-center">
            {Object.values(match.players).map(player => (
              <div key={player.id} className="flex flex-col items-center space-y-2">
                <Avatar className="w-24 h-24 border-4">
                  <AvatarImage src={player.avatarUrl} />
                  <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                </Avatar>
                <span className="font-bold text-lg">{player.name}</span>
                {match.winnerId === player.id && <Badge className="bg-green-500">Winner</Badge>}
              </div>
            ))}
          </div>
          <div className="pt-6">
            {renderActionForStatus()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
