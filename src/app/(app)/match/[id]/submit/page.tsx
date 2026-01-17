'use client';

import { SubmitResultForm } from '@/components/app/submit-result-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Match } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SubmitResultPage() {
    const params = useParams();
    const router = useRouter();
    const id = params ? params.id as string : '';
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !id || !user) return;
        const matchRef = doc(firestore, 'matches', id);
        getDoc(matchRef).then((docSnap) => {
            if (docSnap.exists()) {
                const matchData = { id: docSnap.id, ...docSnap.data() } as Match;
                 // Basic validation
                if (!Object.keys(matchData.players).includes(user.uid)) {
                     router.replace(`/match/${id}`);
                }
                setMatch(matchData);
            } else {
                 router.replace('/lobby');
            }
            setLoading(false);
        });
    }, [firestore, id, router, user]);

    if (loading || userLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!match) {
        return <p>Match not found.</p>;
    }


    return (
        <div className="container mx-auto max-w-lg py-8">
             <Button asChild variant="outline" className="mb-4">
                <Link href={`/match/${id}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Match
                </Link>
             </Button>
            <Card>
                 <CardHeader>
                    <CardTitle>Submit Result for Match</CardTitle>
                    <CardDescription>Match ID: {id}</CardDescription>
                </CardHeader>
                <CardContent>
                    <SubmitResultForm matchId={id} />
                </CardContent>
            </Card>
        </div>
    );
}
