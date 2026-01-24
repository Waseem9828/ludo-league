
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import type { Match } from '@/lib/types';

export default function Lobby() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [openMatches, setOpenMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!firestore) return;

    const openMatchesQuery = query(collection(firestore, 'matches'), where('status', '==', 'OPEN'));
    const openUnsubscribe = onSnapshot(openMatchesQuery, snapshot => {
      const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setOpenMatches(matches);
    });

    if (user) {
      const activeMatchesQuery = query(
        collection(firestore, 'matches'),
        where('playerIds', 'array-contains', user.uid),
        where('status', 'in', ['JOINED', 'PLAYING', 'RESULT_PENDING', 'UNDER_REVIEW'])
      );
      const activeUnsubscribe = onSnapshot(activeMatchesQuery, snapshot => {
        const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
        setActiveMatches(matches);
      });
      return () => {
        openUnsubscribe();
        activeUnsubscribe();
      };
    } else {
        return () => {
            openUnsubscribe();
        }
    }

  }, [firestore, user]);

  return (
    <div className="space-y-8">
      {user && (
        <section>
          <h2 className="text-2xl font-bold mb-4">My Active Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMatches.map(match => (
              <Card key={match.id}>
                 <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-lg">₹{match.entryFee * 2} Contest</CardTitle>
                    {match.status === 'UNDER_REVIEW' && <Badge variant="destructive">Under Review</Badge>}
                    {match.status === 'PLAYING' && <Badge>Playing</Badge>}
                    {match.status === 'JOINED' && <Badge variant="secondary">Joined</Badge>}
                    {match.status === 'RESULT_PENDING' && <Badge variant="secondary">Result Pending</Badge>}
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center">
                        {Object.values(match.players).map(player => (
                            <div key={player.id} className="flex flex-col items-center space-y-2">
                                <Avatar className="w-16 h-16">
                                <AvatarImage src={player.avatarUrl} alt={player.name} />
                                <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{player.name}</span>
                            </div>
                        ))}
                        {Object.keys(match.players).length < 2 && (
                            <div className="flex flex-col items-center space-y-2">
                                 <Avatar className="w-16 h-16 bg-muted flex items-center justify-center">
                                    <span className="text-2xl font-bold">?</span>
                                </Avatar>
                                <span className="text-sm font-medium text-muted-foreground">Waiting...</span>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/match/${match.id}`} className="w-full">
                    <Button className="w-full">View Match</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
          {activeMatches.length === 0 && <p className="text-muted-foreground">You have no active matches.</p>}
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-4">Open Matches</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openMatches.map(match => (
               <Card key={match.id}>
                 <CardHeader>
                    <CardTitle className="text-lg">₹{match.entryFee * 2} Contest</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex items-center space-x-4">
                        <Avatar className="w-16 h-16">
                        <AvatarImage src={match.players[match.creatorId]?.avatarUrl} alt={match.players[match.creatorId]?.name} />
                        <AvatarFallback>{getInitials(match.players[match.creatorId]?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{match.players[match.creatorId]?.name}</p>
                            <p className="text-sm text-muted-foreground">Win Rate: {match.players[match.creatorId]?.winRate || 0}%</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/match/${match.id}`} className="w-full">
                     <Button variant="secondary" className="w-full">Join for ₹{match.entryFee}</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
        </div>
        {openMatches.length === 0 && <p className="text-muted-foreground">No open matches available.</p>}
      </section>
    </div>
  );
}
