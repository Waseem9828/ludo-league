"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceWinner = exports.distributeWinnings = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// Helper function to get user profile data
async function getUserProfile(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        // Fallback to default data if a user profile doesn't exist for some reason
        return { id: userId, name: 'Player', avatar: '' };
    }
    const userData = userDoc.data();
    return {
        id: userId,
        name: userData.name || 'Player', // Fallback to 'Player' if name is not set
        avatar: userData.avatarUrl || '' // Fallback to empty string if avatar is not set
    };
}
exports.distributeWinnings = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const adminUser = await admin.auth().getUser(context.auth.uid);
    if (!adminUser.customClaims || !adminUser.customClaims.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can distribute winnings.');
    }
    const { tournamentId, prizeDistribution } = data;
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();
    const tournament = tournamentDoc.data();
    if (!tournament) {
        throw new functions.https.HttpsError('not-found', 'Tournament not found');
    }
    if (tournament.prizeDistributed) {
        throw new functions.https.HttpsError('already-exists', 'Prizes have already been distributed for this tournament.');
    }
    const batch = db.batch();
    for (const rank in prizeDistribution) {
        const winnerId = tournament.winners[rank - 1]; // Assuming winners are stored in an array by rank
        const amount = prizeDistribution[rank];
        if (winnerId) {
            const userRef = db.collection('users').doc(winnerId);
            const transactionRef = db.collection('transactions').doc();
            batch.update(userRef, { walletBalance: admin.firestore.FieldValue.increment(amount) });
            batch.set(transactionRef, {
                userId: winnerId,
                amount: amount,
                type: 'winnings',
                status: 'completed',
                description: `Tournament winnings for ${tournament.name}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedTournamentId: tournamentId
            });
        }
    }
    batch.update(tournamentRef, { prizeDistributed: true });
    await batch.commit();
    return { success: true, message: 'Prizes distributed successfully' };
});
exports.advanceWinner = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (after.winnerId && !before.winnerId && after.tournamentId) {
        const { tournamentId, round, winnerId } = after;
        const matchId = context.params.matchId;
        const tournamentRef = db.collection('tournaments').doc(tournamentId);
        // Note: We are not using a transaction here because fetching user profiles 
        // cannot be done inside a transaction that has already read data.
        // We accept the small risk of inconsistency for the benefit of better UX.
        const tournamentDoc = await tournamentRef.get();
        if (!tournamentDoc.exists) {
            throw new Error("Tournament not found");
        }
        const tournament = tournamentDoc.data();
        if (!tournament.bracket) {
            throw new Error("Tournament bracket not found");
        }
        const currentMatchIndex = tournament.bracket.findIndex((m) => m.matchId === matchId);
        if (currentMatchIndex === -1) {
            throw new Error("Match not found in bracket");
        }
        const totalPlayers = tournament.playerIds.length;
        const totalRounds = Math.ceil(Math.log2(totalPlayers));
        if (round === totalRounds) {
            await tournamentRef.update({
                status: 'completed',
                winnerId: winnerId,
                winners: [winnerId],
                endTime: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        const siblingIndex = currentMatchIndex % 2 === 0 ? currentMatchIndex + 1 : currentMatchIndex - 1;
        const nextRoundMatchIndex = tournament.bracket.length + Math.floor(currentMatchIndex / 2);
        const siblingMatchInfo = tournament.bracket[siblingIndex];
        let opponentId = null;
        if (siblingMatchInfo && siblingMatchInfo.bye) {
            opponentId = siblingMatchInfo.players[0];
        }
        else if (siblingMatchInfo && siblingMatchInfo.matchId) {
            const siblingMatchDoc = await db.collection('matches').doc(siblingMatchInfo.matchId).get();
            const siblingMatch = siblingMatchDoc.data();
            if (siblingMatch && siblingMatch.winnerId) {
                opponentId = siblingMatch.winnerId;
            }
        }
        const batch = db.batch();
        if (opponentId) {
            // We have two players, create the next match.
            const winnerProfile = await getUserProfile(winnerId);
            const opponentProfile = await getUserProfile(opponentId);
            const newMatchRef = db.collection('matches').doc();
            const newMatch = {
                id: newMatchRef.id, tournamentId, round: round + 1, status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                players: {
                    [winnerId]: winnerProfile,
                    [opponentId]: opponentProfile
                },
                playerIds: [winnerId, opponentId],
                betAmount: tournament.entryFee,
            };
            batch.set(newMatchRef, newMatch);
            const newBracket = [...tournament.bracket];
            while (newBracket.length <= nextRoundMatchIndex) {
                newBracket.push(null);
            }
            newBracket[nextRoundMatchIndex] = { matchId: newMatchRef.id, players: [winnerId, opponentId] };
            batch.update(tournamentRef, { bracket: newBracket });
        }
        else {
            // Opponent not determined yet, wait.
            // Create a placeholder for the next match with only our current winner.
            const newBracket = [...tournament.bracket];
            if (!newBracket[nextRoundMatchIndex]) {
                newBracket[nextRoundMatchIndex] = { matchId: null, players: [winnerId] };
                batch.update(tournamentRef, { bracket: newBracket });
            }
        }
        await batch.commit();
    }
    return null;
});
//# sourceMappingURL=index.js.map