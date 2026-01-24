
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v1/https";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();

const db = admin.firestore();

// =================================================================
//          --- HELPER & UTILITY FUNCTIONS ---
// =================================================================

/**
 * Sends a push notification to a user.
 * @param {string} userId The user's UID.
 * @param {string} title The notification title.
 * @param {string} body The notification body.
 * @param {string} link The URL link for the notification.
 */
const sendNotification = async (userId: string, title: string, body: string, link: string) => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found, cannot send notification.`);
            return;
        }
        const token = userDoc.data()!.fcmToken;

        if (token) {
            const payload = {
                notification: { title, body, click_action: link },
                webpush: { fcm_options: { link } },
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

/**
 * Placeholder for fraud detection logic.
 * In a real-world scenario, this would involve image hashing, metadata analysis, etc.
 * @param {any} resultData The result object containing screenshotUrl.
 * @return {Promise<{isFraud: boolean, reason: string}>} A report on the fraud check.
 */
const analyzeScreenshotForFraud = async (resultData: any): Promise<{isFraud: boolean, reason: string}> => {
    // --- ADVANCED FRAUD DETECTION LOGIC WOULD GO HERE ---
    // 1. Download image from screenshotUrl.
    // 2. Calculate image hash (e.g., pHash, dHash).
    // 3. Query a 'screenshotHashes' collection to see if the hash has been used before.
    // 4. Analyze metadata (EXIF data) for signs of editing or forwarding (e.g., missing camera data, WhatsApp tags).
    // 5. Check image resolution and aspect ratio against typical device screenshots.
    
    // For now, we'll simulate a basic check.
    if (resultData.screenshotUrl.includes("suspicious-keyword")) {
        return { isFraud: true, reason: "Potentially forwarded image detected." };
    }

    // Placeholder for hash check
    // const imageHash = await calculateImageHash(resultData.screenshotUrl);
    // const existing = await db.collection('screenshotHashes').where('hash', '==', imageHash).get();
    // if (!existing.isEmpty) {
    //   return { isFraud: true, reason: "Duplicate screenshot detected across matches." };
    // }

    return { isFraud: false, reason: "Clean" };
};


// =================================================================
//          --- CORE MATCH & USER FUNCTIONS ---
// =================================================================

export const onMatchUpdate = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const { matchId } = context.params;
        const matchRef = change.after.ref;

        // --- SCENARIO 1: Result Submission & Auto-Settlement ---
        const resultsBefore = before.results || {};
        const resultsAfter = after.results || {};

        if (JSON.stringify(resultsBefore) !== JSON.stringify(resultsAfter)) {
            const playerIds = after.playerIds as string[];
            const resultsMap = new Map(Object.entries(resultsAfter));

            // Check if both players have submitted their results.
            if (resultsMap.size === playerIds.length && playerIds.every(id => resultsMap.has(id))) {
                console.log(`Both players have submitted results for match ${matchId}. Starting settlement process.`);
                
                const [playerA_Id, playerB_Id] = playerIds;
                const resultA = resultsMap.get(playerA_Id);
                const resultB = resultsMap.get(playerB_Id);

                // --- Fraud Detection Step ---
                const fraudReportA = await analyzeScreenshotForFraud(resultA);
                const fraudReportB = await analyzeScreenshotForFraud(resultB);

                const userARef = db.doc(`users/${playerA_Id}`);
                const userBRef = db.doc(`users/${playerB_Id}`);

                if (fraudReportA.isFraud || fraudReportB.isFraud) {
                    const fraudReason = fraudReportA.isFraud ? `Player A: ${fraudReportA.reason}` : `Player B: ${fraudReportB.reason}`;
                    await matchRef.update({ 
                        status: 'UNDER_REVIEW', 
                        reviewReason: `Fraud Detected: ${fraudReason}` 
                    });
                    // Penalize trust score
                    if (fraudReportA.isFraud) await userARef.update({ trustScore: FieldValue.increment(-25) });
                    if (fraudReportB.isFraud) await userBRef.update({ trustScore: FieldValue.increment(-25) });
                    console.log(`Match ${matchId} moved to UNDER_REVIEW due to fraud.`);
                    return;
                }

                // --- Result Comparison Step ---
                const isConflict = (resultA.result === 'win' && resultB.result === 'win') ||
                                   (resultA.result === 'loss' && resultB.result === 'loss') ||
                                   (resultA.result !== 'draw' && resultB.result === 'draw') ||
                                   (resultA.result === 'draw' && resultB.result !== 'draw');

                if (isConflict) {
                     await matchRef.update({ 
                        status: 'UNDER_REVIEW', 
                        reviewReason: 'Conflicting results submitted by players.' 
                    });
                    // Decrease trust score for submitting conflicting results
                    await userARef.update({ trustScore: FieldValue.increment(-5) });
                    await userBRef.update({ trustScore: FieldValue.increment(-5) });
                    console.log(`Match ${matchId} moved to UNDER_REVIEW due to conflicting results.`);
                    return;
                }
                
                // --- Settlement Step ---
                let winnerId: string | null = null;
                if (resultA.result === 'win' && resultB.result === 'loss') winnerId = playerA_Id;
                if (resultB.result === 'win' && resultA.result === 'loss') winnerId = playerB_Id;
                
                // Increase trust score for clean submission
                await userARef.update({ trustScore: FieldValue.increment(2) });
                await userBRef.update({ trustScore: FieldValue.increment(2) });

                if (winnerId) {
                    // Auto-settle as a win/loss
                    await matchRef.update({ status: 'COMPLETED', winnerId: winnerId });
                } else if (resultA.result === 'draw' && resultB.result === 'draw') {
                    // Auto-settle as a draw (cancel & refund)
                    await matchRef.update({ status: 'CANCELLED', reviewReason: 'Match ended in a draw.' });
                }
                console.log(`Match ${matchId} auto-settled successfully.`);
                return;
            }
        }

        // --- SCENARIO 2: Match has been finalized as 'COMPLETED' ---
        if (after.status === 'COMPLETED' && before.status !== 'COMPLETED') {
            const { winnerId, playerIds, prizePool } = after;

            if (!winnerId || !playerIds || prizePool == null || after.prizeDistributed) {
                console.log(`Match ${matchId} completion is missing data or already processed.`);
                return;
            }

            const commission = (after.entryFee * playerIds.length) * 0.10; // 10% commission
            const batch = db.batch();

            // Credit winner
            batch.set(db.collection('transactions').doc(), {
                userId: winnerId, type: 'winnings', amount: prizePool, status: 'completed',
                createdAt: FieldValue.serverTimestamp(), relatedMatchId: matchId,
                description: `Winnings for match ${matchId}`,
            });

            // Log commission
            batch.set(db.collection('transactions').doc(), {
                userId: 'platform', type: 'match_commission', amount: commission, status: 'completed',
                createdAt: FieldValue.serverTimestamp(), relatedMatchId: matchId,
                description: `10% commission from match ${matchId}`,
            });

            // Update player stats
            for (const playerId of playerIds) {
                const userRef = db.collection('users').doc(playerId);
                batch.update(userRef, {
                    totalMatchesPlayed: FieldValue.increment(1),
                    totalMatchesWon: FieldValue.increment(playerId === winnerId ? 1 : 0),
                    activeMatchIds: FieldValue.arrayRemove(matchId)
                });
            }
            
            batch.update(matchRef, { prizeDistributed: true });
            await batch.commit();
            console.log(`Prize distribution for match ${matchId} completed.`);

            // Send notifications
            for (const pId of playerIds) {
                const title = pId === winnerId ? "You Won!" : "Match Result";
                const body = pId === winnerId ? `Congratulations, you won ₹${prizePool}!` : `Match resolved. Better luck next time!`;
                await sendNotification(pId, title, body, `/match/${matchId}`);
            }
        }

        // --- SCENARIO 3: Match has been 'CANCELLED' ---
        else if (after.status === 'CANCELLED' && before.status !== 'CANCELLED') {
            if (after.refundsProcessed) {
                console.log(`Refunds for match ${matchId} already processed.`);
                return;
            }
            const refundBatch = db.batch();
            
            for (const playerId of after.playerIds) {
                // Refund entry fee
                refundBatch.set(db.collection('transactions').doc(), {
                    userId: playerId, type: 'refund', amount: after.entryFee, status: 'completed',
                    createdAt: FieldValue.serverTimestamp(), description: `Refund for cancelled match ${matchId}`, relatedMatchId: matchId,
                });
                // Remove from active matches
                const userRef = db.collection('users').doc(playerId);
                refundBatch.update(userRef, { activeMatchIds: FieldValue.arrayRemove(matchId) });
            }

            refundBatch.update(matchRef, { refundsProcessed: true });
            await refundBatch.commit();
            console.log(`Refunds processed for cancelled match ${matchId}.`);
        }
    });

/**
 * Updates user wallet balance and other stats when a transaction is created.
 */
export const onTransactionCreate = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap) => {
    const transaction = snap.data();
    if (transaction.status !== 'completed' || transaction.userId === 'platform') return null;

    const userRef = db.collection('users').doc(transaction.userId);
    const updateData: {[key: string]: any} = {};

    const balanceAffectingTypes = [
        'deposit', 'withdrawal', 'entry-fee', 'winnings', 'refund', 
        'admin-credit', 'admin-debit', 'referral-bonus'
    ];

    if (balanceAffectingTypes.includes(transaction.type)) {
        updateData.walletBalance = FieldValue.increment(transaction.amount);
    }
    if (transaction.type === 'winnings') {
        updateData.winnings = FieldValue.increment(transaction.amount);
    }
    
    if (Object.keys(updateData).length > 0) {
        await userRef.update(updateData);
    }
    return null;
  });


// =================================================================
//          --- ADMIN & CALLABLE FUNCTIONS ---
// =================================================================

/**
 * Allows an admin to manually resolve a disputed match.
 */
export const resolveDisputedMatch = functions.https.onCall(async (data, context) => {
    const callerRole = context.auth?.token.role;
    if (!callerRole || !['matchAdmin', 'superAdmin'].includes(callerRole)) {
        throw new HttpsError('permission-denied', 'You do not have permission to resolve matches.');
    }

    const { matchId, winnerId, isDraw } = data;
    if (!matchId || (!winnerId && !isDraw)) {
        throw new HttpsError('invalid-argument', 'matchId and either winnerId or isDraw must be provided.');
    }

    const matchRef = db.doc(`matches/${matchId}`);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists || matchDoc.data()?.status !== 'UNDER_REVIEW') {
        throw new HttpsError('not-found', 'Match is not under review or does not exist.');
    }

    if (isDraw) {
        await matchRef.update({
            status: 'CANCELLED',
            resolvedBy: context.auth?.uid,
            resolvedAt: FieldValue.serverTimestamp(),
            reviewReason: "Admin declared a draw and issued refunds."
        });
        return { success: true, message: "Match resolved as a draw. Refunds will be processed." };
    } else {
        await matchRef.update({
            status: 'COMPLETED',
            winnerId: winnerId,
            resolvedBy: context.auth?.uid,
            resolvedAt: FieldValue.serverTimestamp(),
        });
        return { success: true, message: `Match resolved. ${winnerId} declared winner. Payouts will be processed.` };
    }
});


// Note: Other functions like createMatch, onDepositRequestUpdate, etc. are omitted for brevity
// but would be part of this file in the full project.

