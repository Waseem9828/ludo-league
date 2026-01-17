'use server';
import { getFirebaseApp } from '@/firebase/server'
import { Match, MatchPlayer, Tournament } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';


export async function getTournaments() {
    const { firestore } = await getFirebaseApp();
    const tournamentsCollection = firestore.collection('tournaments');
    const snapshot = await tournamentsCollection.get();
    const tournaments: Tournament[] = [];
    snapshot.forEach(doc => {
        tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
    });
    return tournaments;
}

export async function getTournament(id: string) {
    const { firestore } = await getFirebaseApp();
    const tournamentDoc = await firestore.collection('tournaments').doc(id).get();
    if (!tournamentDoc.exists) {
        throw new Error(`Tournament with id ${id} not found`);
    }

    const tournament = { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;
    const matchesSnapshot = await firestore.collection('tournaments').doc(id).collection('matches').get();
    const matches: Match[] = [];
    matchesSnapshot.forEach(doc => {
        matches.push({ id: doc.id, ...doc.data() } as Match);
    });

    return { tournament, matches };
}

export async function joinTournament(tournamentId: string, userId: string, userName: string) {
    const { firestore } = await getFirebaseApp();
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);

    await tournamentRef.update({
        players: FieldValue.arrayUnion({ id: userId, name: userName })
    });

    revalidatePath(`/tournaments/${tournamentId}`);
}

export async function reportScore(tournamentId: string, matchId: string, player1Score: number, player2Score: number, winnerId: string) {
    const { firestore } = await getFirebaseApp();
    const matchRef = firestore.collection('tournaments').doc(tournamentId).collection('matches').doc(matchId);

    await matchRef.update({
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: winnerId,
        status: 'completed'
    });

    revalidatePath(`/tournaments/${tournamentId}`);
}




