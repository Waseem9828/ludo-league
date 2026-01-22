
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Helper function to get user profile data
async function getUserProfile(userId: string) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        // Fallback to default data if a user profile doesn't exist for some reason
        return { id: userId, name: 'Player', avatar: '' };
    }
    const userData = userDoc.data()!;
    return {
        id: userId,
        name: userData.name || 'Player', // Fallback to 'Player' if name is not set
        avatar: userData.avatarUrl || '' // Fallback to empty string if avatar is not set
    };
}

export const distributeWinnings = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (context.auth?.token.admin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
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
    
    if (!Array.isArray(tournament.winners)) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Tournament winners list is missing or invalid.'
        );
    }

    const batch = db.batch();

    for (const rankStr in prizeDistribution) {
        const rank = parseInt(rankStr, 10);
        const winnerId = tournament.winners[rank - 1]; // Assuming winners are stored in an array by rank
        const amount = Number(prizeDistribution[rankStr]);

        if (!amount || amount <= 0) continue;
        
        if (winnerId) {
            const userRef = db.collection('users').doc(winnerId);
            const transactionRef = db.collection('transactions').doc();

            batch.set(userRef, { walletBalance: admin.firestore.FieldValue.increment(amount) }, { merge: true });

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


export const advanceWinner = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
        const before = change.before.data();
        const after = change.after.data();

        if(!before || !after) {
            return null;
        }
        
        if (after.processed === true) {
            return null; // Already processed
        }

        if (after.winnerId && !before.winnerId && after.tournamentId) {
            const { tournamentId, round, winnerId } = after;
            const matchId = context.params.matchId;

            const tournamentRef = db.collection('tournaments').doc(tournamentId);
            const batch = db.batch();

            try {
                const tournamentDoc = await tournamentRef.get();
                if (!tournamentDoc.exists) { throw new Error("Tournament not found"); }
    
                const tournament = tournamentDoc.data()!;
                if (!tournament.bracket) { throw new Error("Tournament bracket not found"); }
                
                const currentMatchIndex = tournament.bracket.findIndex((m: any) => m && m.matchId === matchId);
                if (currentMatchIndex === -1) { throw new Error("Match not found in bracket"); }
    
                const totalPlayers = tournament.playerIds.length;
                const totalRounds = Math.ceil(Math.log2(totalPlayers));
    
                if (round === totalRounds) {
                     batch.update(tournamentRef, {
                        status: 'completed',
                        winnerId: winnerId,
                        winners: [winnerId], 
                        endTime: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
                    // Corrected bracket logic
                    const numMatchesInR1 = Math.pow(2, totalRounds - 1);
                    const currentRoundMatchesStart = numMatchesInR1 - Math.pow(2, totalRounds - round);
                    const relativeIndex = currentMatchIndex - currentRoundMatchesStart;

                    const nextRoundMatchesStart = numMatchesInR1 - Math.pow(2, totalRounds - (round + 1));
                    const nextRoundSlotIndex = nextRoundMatchesStart + Math.floor(relativeIndex / 2);

                    const existingNextRoundSlot = tournament.bracket[nextRoundSlotIndex];
                    const newBracket = [...tournament.bracket];

                    if (existingNextRoundSlot && existingNextRoundSlot.players && existingNextRoundSlot.players.length === 1) {
                        // Opponent found, create match
                        const opponentId = existingNextRoundSlot.players[0];
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
                        
                        newBracket[nextRoundSlotIndex] = { matchId: newMatchRef.id, players: [winnerId, opponentId] };
                        batch.update(tournamentRef, { bracket: newBracket });

                    } else {
                        // I'm the first, create/update placeholder
                        if (!newBracket[nextRoundSlotIndex]) {
                             newBracket[nextRoundSlotIndex] = { matchId: null, players: [winnerId] };
                             batch.update(tournamentRef, { bracket: newBracket });
                        } else {
                            functions.logger.warn("Unexpected state in bracket", { tournamentId, matchId });
                        }
                    }
                }
                
                // Mark current match as processed
                batch.update(change.after.ref, { processed: true });
                await batch.commit();

            } catch (error) {
                 functions.logger.error("Error in advanceWinner", error);
            }
        }
        return null;
    });


export const newDailyLoginBonus = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to claim a bonus.');
    }

    const userId = context.auth.uid;
    const userRef = db.doc(`users/${userId}`);
    const configRef = db.doc('bonus_config/settings');

    try {
        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const configDoc = await transaction.get(configRef);

            if (!userDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'User profile not found.');
            }

            if (!configDoc.exists()) {
                functions.logger.error('Bonus configuration not set. Please create the document \'bonus_config/settings\'');
                throw new functions.https.HttpsError('failed-precondition', 'Bonus configuration is not set.');
            }

            const userData = userDoc.data()!;
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            
            if (userData.lastLoginDate === today) {
                return { success: true, message: 'Daily bonus already claimed for today.' };
            }

            const isYesterday = (dateString: string | undefined): boolean => {
                if (!dateString) return false;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === dateString;
            };
            const currentStreak = isYesterday(userData.lastLoginDate) ? (userData.loginStreak || 0) + 1 : 1;

            const config = configDoc.data()!;
            if (!config.enabled) {
                transaction.update(userRef, { lastLoginDate: today, loginStreak: currentStreak });
                return { success: true, message: 'The daily bonus system is currently disabled.' };
            }

            let totalBonus = Number(config.dailyBonus) || 0;

            if (config.streakBonus && typeof config.streakBonus === 'object' && config.streakBonus !== null) {
                const streakBonusForDay = config.streakBonus[String(currentStreak)];
                if (streakBonusForDay) {
                    const streakBonusAmount = Number(streakBonusForDay) || 0;
                    totalBonus += streakBonusAmount;
                }
            } else if (config.streakBonus) {
                functions.logger.warn(`'streakBonus' field in 'bonus_config/settings' is not a valid object: ${JSON.stringify(config.streakBonus)}`);
            }

            const updateData: any = {
                lastLoginDate: today,
                loginStreak: currentStreak,
            };

            if (totalBonus > 0) {
                const bonusTransactionRef = db.collection('transactions').doc();
                transaction.set(bonusTransactionRef, {
                    userId: userId,
                    type: 'daily_bonus',
                    amount: totalBonus,
                    status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Daily login bonus (Streak: ${currentStreak} day${currentStreak > 1 ? 's' : ''}).`,
                });
            }
            
            transaction.update(userRef, updateData);

            if (totalBonus > 0) {
                return { success: true, message: `₹${totalBonus} daily bonus claimed! Your current streak is ${currentStreak} day${currentStreak > 1 ? 's' : ''}.` };
            } else {
                return { success: true, message: "Logged in! No bonus to claim today, but your streak is updated." };
            }
        });

        return result;

    } catch (error) {
        functions.logger.error('Error in newDailyLoginBonus function:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while claiming the bonus. Please check the function logs for more details.');
    }
});
