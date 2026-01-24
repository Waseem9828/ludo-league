
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Match } from '@/lib/types';
import ResolveMatchDialog from '@/components/admin/ResolveMatchDialog';

export default function DisputedMatchesPage() {
  const firestore = useFirestore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const q = query(collection(firestore, 'matches'), where('status', '==', 'UNDER_REVIEW'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const matchesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching disputed matches: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const handleResolveClick = (match: Match) => {
    setSelectedMatch(match);
  };

  const handleCloseDialog = () => {
    setSelectedMatch(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Disputed Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match ID</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Reason for Review</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-mono">{match.id}</TableCell>
                  <TableCell>
                    {Object.values(match.players).map(p => p.name).join(' vs ')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">{match.reviewReason || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleResolveClick(match)}>Resolve</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {matches.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No disputed matches found.</p>
          )}
        </CardContent>
      </Card>

      {selectedMatch && (
        <ResolveMatchDialog 
            match={selectedMatch} 
            isOpen={!!selectedMatch} 
            onClose={handleCloseDialog} 
        />
      )}
    </div>
  );
}
