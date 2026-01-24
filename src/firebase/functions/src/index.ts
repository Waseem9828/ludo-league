
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v1/https";

admin.initializeApp();

const db = admin.firestore();

// Helper function to send a notification to a specific user
const sendNotification = async (userId: string, title: string, body: string, link: string) => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found, cannot send notification.`);
            return;
        }
        const user = userDoc.data()!;
        const token = user.fcmToken;

        if (token) {
            const payload = {
                notification: {
                    title: title,
                    body: body,
                    click_action: link,
                },
                webpush: {
                    fcm_options: {
                        link: link
                    }
                }
            };
            await admin.messaging().send({ token, ...payload });
            console.log(`Notification sent to ${userId}.`);
        } else {
            console.log(`User ${userId} does not have an FCM token.`);
        }
    } catch (error) {
        console.error(`Error sending notification to ${userId}:`, error);
    }
};

export const onTransactionCreate = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const { userId, type, amount, status } = transaction;

    if (status !== 'completed' || userId === 'platform') {
        return null;
    }
    
    const userRef = db.collection('users').doc(userId);

    try {
        const updateData: {[key: string]: any} = {};
        
        const balanceAffectingTypes = [
            'deposit', 'withdrawal', 'entry-fee', 'winnings', 'refund', 
            'admin-credit', 'admin-debit', 'referral-bonus', 
            'tournament-fee', 'daily_bonus', 'withdrawal_refund', 'task-reward'
        ];

        if (balanceAffectingTypes.includes(type)) {
            updateData.walletBalance = admin.firestore.FieldValue.increment(amount);
        }

        if (type === 'winnings') {
            updateData.winnings = admin.firestore.FieldValue.increment(amount);
        }
        
        if (type === 'withdrawal') {
            updateData.totalWithdrawals = admin.firestore.FieldValue.increment(-amount); // amount is negative
        }

        if (Object.keys(updateData).length > 0) {
            await userRef.update(updateData);
            console.log(`User ${userId} stats updated for transaction type ${type}.`);
        }

        return null;

    } catch (error) {
        console.error(`Error updating user stats for transaction ${context.params.transactionId}:`, error);
        if (error instanceof Error) {
            return snap.ref.update({ status: 'failed', error: error.message });
        }
        return snap.ref.update({ status: 'failed', error: 'Unknown error during stat update.' });
    }
  });

export const onMatchUpdate = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const { matchId } = context.params;

        // --- Scenario 1: Match has just been completed --- 
        if (after.status === 'completed' && before.status !== 'completed') {
            const { winnerId, playerIds, entryFee, prizePool } = after;

            if (!winnerId || !playerIds || prizePool == null) {
                console.error(`Match ${matchId} is missing required data for completion.`);
                return;
            }
            if (after.prizeDistributed) {
                console.log(`Prize for match ${matchId} has already been distributed.`);
                return;
            }

            const commissionConfigSnap = await db.collection('matchCommission').doc('settings').get();
            const commissionPercentage = commissionConfigSnap.exists() && commissionConfigSnap.data()!.percentage ? commissionConfigSnap.data()!.percentage : 10;
            const commission = (entryFee * playerIds.length) * (commissionPercentage / 100);

            const batch = db.batch();

            batch.set(db.collection('transactions').doc(), {
                userId: winnerId, type: 'winnings', amount: prizePool, status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(), relatedMatchId: matchId, description: `Winnings for match ${matchId}`,
            });

            batch.set(db.collection('transactions').doc(), {
                userId: 'platform', type: 'match_commission', amount: commission, status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(), relatedMatchId: matchId, description: `${commissionPercentage}% commission from match ${matchId}`,
            });

            for (const playerId of playerIds) {
                const userRef = db.collection('users').doc(playerId);
                const isWinner = (playerId === winnerId);
                const incrementWon = isWinner ? 1 : 0;

                batch.update(userRef, {
                    totalMatchesPlayed: admin.firestore.FieldValue.increment(1),
                    totalMatchesWon: admin.firestore.FieldValue.increment(incrementWon),
                    activeMatchIds: admin.firestore.FieldValue.arrayRemove(matchId)
                });
            }
            
            batch.update(change.after.ref, { prizeDistributed: true });
            await batch.commit();
            console.log(`Prize distribution and stats updates completed for match ${matchId}.`);
            
            for (const pId of playerIds) {
                const title = pId === winnerId ? "You Won!" : "Match Result";
                const body = pId === winnerId ? `Congratulations, you won ₹${prizePool}!` : `Match resolved. ${after.players[winnerId]?.name || 'Opponent'} is the winner.`;
                await sendNotification(pId, title, body, `/match/${matchId}`);
            }
        }

        // --- Scenario 2: Match has just been cancelled ---
        else if (after.status === 'cancelled' && before.status !== 'cancelled') {
            if (after.refundsProcessed) {
                console.log(`Refunds for match ${matchId} have already been processed.`);
                return;
            }
            const refundBatch = db.batch();
            
            for (const playerId of after.playerIds) {
                refundBatch.set(db.collection('transactions').doc(), {
                    userId: playerId, type: 'refund', amount: after.entryFee, status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(), description: `Refund for cancelled match ${matchId}`, relatedMatchId: matchId,
                });
                
                const userRef = db.collection('users').doc(playerId);
                refundBatch.update(userRef, { activeMatchIds: admin.firestore.FieldValue.arrayRemove(matchId) });
            }

            refundBatch.update(change.after.ref, { refundsProcessed: true });
            await refundBatch.commit();
            console.log(`Refunds processed for cancelled match ${matchId}.`);

            for (const playerId of after.playerIds) {
                await sendNotification(playerId, "Match Cancelled", `Match ${matchId} has been cancelled. Your entry fee of ₹${after.entryFee} has been refunded.`, '/wallet');
            }
        }
    });

export const declareWinner = functions.https.onCall(async (data, context) => {
    const callerClaims = context.auth?.token;
    if (!callerClaims || (callerClaims.role !== 'matchAdmin' && callerClaims.role !== 'superAdmin')) {
        throw new HttpsError('permission-denied', 'Only match admins or super admins can call this function.');
    }

    const { matchId, winnerId } = data;
    if (!matchId || !winnerId) {
        throw new HttpsError('invalid-argument', 'The function must be called with "matchId" and "winnerId" arguments.');
    }

    const matchRef = db.collection('matches').doc(matchId);

    try {
        const matchDoc = await matchRef.get();
        if (!matchDoc.exists) {
            throw new HttpsError('not-found', 'Match not found.');
        }
        const matchData = matchDoc.data()!;

        if (!['disputed', 'in-progress'].includes(matchData.status)) {
             throw new HttpsError('failed-precondition', `Match must be in a 'disputed' or 'in-progress' state. Current state: ${matchData.status}`);
        }
        if (!matchData.playerIds.includes(winnerId)) {
            throw new HttpsError('invalid-argument', 'The declared winner is not a player in this match.');
        }

        await matchRef.update({ 
            status: 'completed', 
            winnerId: winnerId,
            resolvedBy: context.auth?.uid,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: `Winner declared for match ${matchId}. Prize distribution will process automatically.` };

    } catch (error) {
        console.error(`Error in declareWinner for match ${matchId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});
    
export const onResultSubmit = functions.firestore
  .document('matches/{matchId}/results/{userId}')
  .onCreate(async (snap, context) => {
    const { matchId, userId } = context.params;
    const matchRef = db.collection('matches').doc(matchId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const freshMatchDoc = await transaction.get(matchRef);
        if (!freshMatchDoc.exists) return;
        
        const freshMatchData = freshMatchDoc.data()!;
        if (['completed', 'disputed', 'cancelled'].includes(freshMatchData.status)) return;
        
        const otherPlayerIds = freshMatchData.playerIds.filter((pId: string) => pId !== userId);
        for(const pId of otherPlayerIds) {
            await sendNotification(pId, "Result Submitted", `${freshMatchData.players[userId]?.name || 'Opponent'} has submitted their result.`, `/match/${matchId}`);
        }

        const resultsCollectionRef = matchRef.collection('results');
        const resultsSnapshot = await transaction.get(resultsCollectionRef);
        const expectedResults = freshMatchData.playerIds.length;

        if (resultsSnapshot.size < expectedResults) return;

        const results = resultsSnapshot.docs.map(doc => doc.data());
        const winClaims = results.filter(r => r.status === 'win');
        const lossClaims = results.filter(r => r.status === 'loss');

        if (winClaims.length === 1 && lossClaims.length === 1) {
            transaction.update(matchRef, { status: 'completed', winnerId: winClaims[0].userId });
            return;
        }

        transaction.update(matchRef, { status: 'disputed', reviewReason: 'Conflicting or unclear results submitted.' });
      });
    } catch (error) {
      console.error(`Error in onResultSubmit for match ${matchId}:`, error);
      await matchRef.update({ status: 'disputed', reviewReason: `System error during result processing.` }).catch(()=>{});
    }
     return null;
  });


// --- ALL OTHER FUNCTIONS ---

export { claimSuperAdminRole, setRole, listUsers, getAdminDashboardStats, getAdminUserStats, onDepositRequestUpdate, onWithdrawalRequestUpdate, onTournamentCreate, onMatchComplete, claimTaskReward, createMatch, newDailyLoginBonus, distributeTournamentWinnings } from "./index-copied";

