
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

export const createMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to create a match.');
    }

    const { entryFee } = data;
    const userId = context.auth.uid;

    if (typeof entryFee !== 'number' || entryFee < 50) {
        throw new HttpsError('invalid-argument', 'A valid entry fee of at least 50 is required.');
    }

    const userRef = db.doc(`users/${userId}`);
    const matchRef = db.collection('matches').doc();

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'User profile not found.');
            }
            const userData = userDoc.data()!;

            if (userData.isBlocked) {
                throw new HttpsError('permission-denied', 'Your account is blocked from playing.');
            }
            if ((userData.activeMatchIds || []).length >= 5) {
                throw new HttpsError('failed-precondition', 'You have reached the maximum of 5 active matches.');
            }
            if (userData.walletBalance < entryFee) {
                throw new HttpsError('failed-precondition', 'Insufficient wallet balance.');
            }

            // Get commission settings within the transaction
            const commissionConfigSnap = await transaction.get(db.doc('matchCommission/settings'));
            const commissionPercentage = commissionConfigSnap.exists() && commissionConfigSnap.data()!.percentage
                ? commissionConfigSnap.data()!.percentage
                : 10;
            const prizePool = entryFee * 2 * (1 - commissionPercentage / 100);

            // 1. Create the entry-fee transaction
            const entryFeeTransactionRef = db.collection("transactions").doc();
            transaction.set(entryFeeTransactionRef, {
                userId: userId,
                type: 'entry-fee',
                amount: -entryFee,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: matchRef.id,
                description: `Entry fee for match ${matchRef.id}`
            });
            
            // 2. Create the match document
            const newPlayer = {
                id: userId,
                name: userData.displayName || 'Player',
                avatarUrl: userData.photoURL || '',
                winRate: userData.winRate || 0,
            };
            transaction.set(matchRef, {
                id: matchRef.id,
                creatorId: userId,
                status: 'waiting',
                entryFee: entryFee,
                prizePool: prizePool,
                commissionPercentage: commissionPercentage, // Store it for later
                maxPlayers: 2,
                playerIds: [userId],
                players: {
                    [userId]: newPlayer
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 3. Update the user's active matches
            transaction.update(userRef, {
                activeMatchIds: admin.firestore.FieldValue.arrayUnion(matchRef.id)
            });
        });

        return { success: true, matchId: matchRef.id };

    } catch (error) {
        console.error("Error creating match:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Could not create match.', error);
    }
});

export const joinMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to join a match.');
    }

    const { matchId } = data;
    const userId = context.auth.uid;

    if (!matchId) {
        throw new HttpsError('invalid-argument', 'matchId is required.');
    }
    
    const userRef = db.doc(`users/${userId}`);
    const matchRef = db.doc(`matches/${matchId}`);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const matchDoc = await transaction.get(matchRef);

            if (!userDoc.exists()) throw new HttpsError('not-found', 'User profile not found.');
            if (!matchDoc.exists()) throw new HttpsError('not-found', 'Match not found.');
            
            const userData = userDoc.data()!;
            const matchData = matchDoc.data()!;

            if (matchData.status !== 'waiting') throw new HttpsError('failed-precondition', 'This match is not available to join.');
            if (userData.isBlocked) throw new HttpsError('permission-denied', 'Your account is blocked.');
            if ((userData.activeMatchIds || []).length >= 5) throw new HttpsError('failed-precondition', 'You have reached the maximum of 5 active matches.');
            if (userData.walletBalance < matchData.entryFee) throw new HttpsError('failed-precondition', 'Insufficient wallet balance.');
            if (matchData.playerIds.includes(userId)) throw new HttpsError('failed-precondition', 'You are already in this match.');
            
            // 1. Create entry-fee transaction for the joining user
            const entryFeeTransactionRef = db.collection("transactions").doc();
            transaction.set(entryFeeTransactionRef, {
                userId: userId,
                type: 'entry-fee',
                amount: -matchData.entryFee,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: matchId,
                description: `Entry fee for match ${matchId}`
            });

            // 2. Update the match document
            const newPlayer = {
                id: userId,
                name: userData.displayName || 'Player',
                avatarUrl: userData.photoURL || '',
                winRate: userData.winRate || 0,
            };
            const isNowFull = matchData.playerIds.length + 1 === matchData.maxPlayers;
            transaction.update(matchRef, {
                [`players.${userId}`]: newPlayer,
                playerIds: admin.firestore.FieldValue.arrayUnion(userId),
                status: isNowFull ? 'in-progress' : 'waiting',
            });

            // 3. Update the user's active matches
            transaction.update(userRef, {
                activeMatchIds: admin.firestore.FieldValue.arrayUnion(matchId)
            });
        });

        // Send notifications
        const matchData = (await matchRef.get()).data()!;
        await sendNotification(matchData.creatorId, "Opponent Joined!", `An opponent has joined your match for ₹${matchData.prizePool}. Time to play!`, `/match/${matchId}`);
        await sendNotification(userId, "Match Joined!", `You have joined a match for ₹${matchData.prizePool}.`, `/match/${matchId}`);

        return { success: true, matchId: matchId };

    } catch (error) {
        console.error("Error joining match:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Could not join match.', error);
    }
});


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

            if (commission > 0) {
                batch.set(db.collection('transactions').doc(), {
                    userId: 'platform', type: 'match_commission', amount: commission, status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(), relatedMatchId: matchId, description: `${commissionPercentage}% commission from match ${matchId}`,
                });
            }

            for (const playerId of playerIds) {
                const userRef = db.collection('users').doc(playerId);
                const isWinner = (playerId === winnerId);
                
                batch.update(userRef, {
                    totalMatchesPlayed: admin.firestore.FieldValue.increment(1),
                    totalMatchesWon: admin.firestore.FieldValue.increment(isWinner ? 1 : 0),
                    activeMatchIds: admin.firestore.FieldValue.arrayRemove(matchId)
                });
            }
            
            batch.update(change.after.ref, { prizeDistributed: true });
            await batch.commit();

            // Recalculate Win Rates separately as it needs the updated totals
            for (const playerId of playerIds) {
                const userRef = db.doc(`users/${playerId}`);
                const userDoc = await userRef.get();
                if (userDoc.exists) {
                    const userData = userDoc.data()!;
                    const newWinRate = userData.totalMatchesPlayed > 0 
                        ? (userData.totalMatchesWon / userData.totalMatchesPlayed) * 100 
                        : 0;
                    await userRef.update({ winRate: newWinRate });
                }
            }
            
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

        if (!['disputed', 'in-progress', 'UNDER_REVIEW'].includes(matchData.status)) {
             throw new HttpsError('failed-precondition', `Match must be in a reviewable state. Current state: ${matchData.status}`);
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
    const { matchId } = context.params;
    const matchRef = db.collection('matches').doc(matchId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const freshMatchDoc = await transaction.get(matchRef);
        if (!freshMatchDoc.exists) return;
        
        const freshMatchData = freshMatchDoc.data()!;
        if (['completed', 'UNDER_REVIEW', 'cancelled'].includes(freshMatchData.status)) return;
        
        const resultsCollectionRef = matchRef.collection('results');
        const resultsSnapshot = await transaction.get(resultsCollectionRef);
        
        // Change status to submitted once the first result is in
        if (resultsSnapshot.size === 1) {
            transaction.update(matchRef, { status: 'RESULT_SUBMITTED' });
        }

        const expectedResults = freshMatchData.playerIds.length;

        if (resultsSnapshot.size < expectedResults) return;

        // --- All results are in, start analysis ---
        const results = resultsSnapshot.docs.map(doc => doc.data());
        
        const winClaims = results.filter(r => r.status === 'win');
        const lossClaims = results.filter(r => r.status === 'loss');
        const drawClaims = results.filter(r => r.status === 'draw');
        
        // Fraud Check: Duplicate screenshots
        const screenshotUrls = results.map(r => r.screenshotUrl);
        const uniqueUrls = new Set(screenshotUrls);
        const hasDuplicateScreenshots = screenshotUrls.length > uniqueUrls.size;

        if (hasDuplicateScreenshots) {
            transaction.update(matchRef, { status: 'UNDER_REVIEW', reviewReason: 'Duplicate screenshots submitted.' });
            return;
        }

        // Case 1: All players claim draw
        if (drawClaims.length === expectedResults) {
            transaction.update(matchRef, { status: 'cancelled', reviewReason: 'Match ended in a draw.' });
            return;
        }
        
        // Case 2: Clean Win/Loss for a 2-player game
        if (expectedResults === 2 && winClaims.length === 1 && lossClaims.length === 1) {
            const winnerId = winClaims[0].userId;
            transaction.update(matchRef, { status: 'completed', winnerId: winnerId });
            return;
        }
        
        // Case 3: Conflicting results (multiple wins, or other mismatches)
        transaction.update(matchRef, { status: 'UNDER_REVIEW', reviewReason: 'Conflicting results submitted by players.' });
      });
    } catch (error) {
      console.error(`Error in onResultSubmit for match ${matchId}:`, error);
      await matchRef.update({ status: 'UNDER_REVIEW', reviewReason: `System error during result processing.` }).catch(()=>{});
    }
     return null;
  });

export const matchCleanup = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - (60 * 60 * 1000));
    const twoHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - (2 * 60 * 60 * 1000));

    const batch = db.batch();

    // Cancel old 'waiting' matches
    const oldWaitingQuery = db.collection('matches').where('status', '==', 'waiting').where('createdAt', '<=', oneHourAgo);
    const oldWaitingSnapshot = await oldWaitingQuery.get();
    oldWaitingSnapshot.forEach(doc => {
        console.log(`Cancelling old waiting match: ${doc.id}`);
        batch.update(doc.ref, { status: 'cancelled', reviewReason: 'Match expired without an opponent.' });
    });

    // Dispute old 'PLAYING' or 'RESULT_SUBMITTED' matches (no result submitted or incomplete results)
    const oldInProgressQuery = db.collection('matches').where('status', 'in', ['PLAYING', 'RESULT_SUBMITTED', 'in-progress']).where('createdAt', '<=', twoHoursAgo);
    const oldInProgressSnapshot = await oldInProgressQuery.get();
    oldInProgressSnapshot.forEach(doc => {
        console.log(`Marking old match for review: ${doc.id}`);
        batch.update(doc.ref, { status: 'UNDER_REVIEW', reviewReason: 'Match timed out without a clear result.' });
    });

    await batch.commit();
    console.log(`Match cleanup finished. Cancelled ${oldWaitingSnapshot.size} and marked ${oldInProgressSnapshot.size} for review.`);
    return null;
});


export const claimSuperAdminRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be authenticated to call this function.");
    }

    const targetUid = '8VHy30yW04XgFsRlnPo1ZzQPCch1';

    if (context.auth.uid !== targetUid) {
        throw new functions.https.HttpsError("permission-denied", "You are not authorized to perform this action.");
    }

    try {
        await admin.auth().setCustomUserClaims(targetUid, { role: 'superAdmin', admin: true });
        await db.collection('users').doc(targetUid).set({ isAdmin: true, role: 'superAdmin' }, { merge: true });
        return { message: `Success! You (${targetUid}) have been granted Super Admin privileges. Please sign out and sign back in to apply the changes.` };
    } catch (error) {
        console.error("Error setting custom claims:", error);
        throw new functions.https.HttpsError("internal", "Unable to set custom claims.");
    }
});


export const setRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const callerClaims = context.auth.token;
  if (callerClaims.role !== "superAdmin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only super admins can set user roles."
    );
  }

  const { uid, role } = data;
  if (typeof uid !== "string" || uid.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'uid'."
    );
  }

  const allowedRoles = ["kycAdmin", "depositAdmin", "withdrawalAdmin", "matchAdmin", "superAdmin", "none"];
  if (!allowedRoles.includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `The 'role' must be one of the following: ${allowedRoles.join(", ")}`
    );
  }

  try {
    const isNowAdmin = role !== 'none';
    
    await admin.auth().setCustomUserClaims(uid, { 
        role: isNowAdmin ? role : null,
        admin: isNowAdmin ? true : null
    });
    
    await db.collection('users').doc(uid).update({ role: isNowAdmin ? role : null, isAdmin: isNowAdmin });

    if (isNowAdmin) {
      return { message: `Success! User ${uid} has been made a ${role}.` };
    } else {
      return { message: `Success! User ${uid} has had their roles removed.` };
    }

  } catch (error) {
    console.error("Error setting custom claims:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to set custom claims."
    );
  }
});


export const listUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'superAdmin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super admins can list users.'
    );
  }

  try {
    const userRecords = await admin.auth().listUsers();
    const users = userRecords.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.customClaims?.role,
    }));
    return users;
  } catch (error) {
    console.error('Error listing users:', error);
    throw new functions.https.HttpsError('internal', 'Unable to list users.');
  }
});

export const getAdminDashboardStats = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Only admins can access dashboard stats.');
    }

    try {
        const usersSnap = await db.collection('users').get();
        const kycSnap = await db.collection('kycApplications').where('status', '==', 'pending').get();
        const depositsSnap = await db.collection('depositRequests').where('status', '==', 'pending').get();
        const withdrawalsSnap = await db.collection('withdrawalRequests').where('status', '==', 'pending').get();
        const matchesSnap = await db.collection('matches').where('status', '==', 'UNDER_REVIEW').get();

        return {
            totalUsers: usersSnap.size,
            pendingKyc: kycSnap.size,
            pendingDeposits: depositsSnap.size,
            pendingWithdrawals: withdrawalsSnap.size,
            disputedMatches: matchesSnap.size,
        };
    } catch (error) {
        console.error("Error getting admin dashboard stats:", error);
        throw new HttpsError('internal', 'Could not retrieve dashboard statistics.');
    }
});

export const getAdminUserStats = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Only admins can access user stats.');
    }

    try {
        const usersRef = db.collection("users");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const totalSnap = await usersRef.get();
        const newTodaySnap = await usersRef.where('createdAt', '>=', today).get();
        const activeSnap = await usersRef.where('lastLogin', '>=', sevenDaysAgo).get();

        return {
            total: totalSnap.size,
            newToday: newTodaySnap.size,
            active: activeSnap.size,
        };
    } catch (error) {
        console.error("Error getting admin user stats:", error);
        throw new HttpsError('internal', 'Could not retrieve user statistics.');
    }
});

export const onDepositRequestUpdate = functions.firestore
.document('depositRequests/{depositId}') 
.onUpdate(async (change, context) => {
  const after = change.after.data();
  const before = change.before.data();

  if (after.status === 'approved' && before.status !== 'approved') {
    const { userId, amount, utr, targetUpiRef } = after;

    if (!targetUpiRef) {
        console.error(`Deposit request ${context.params.depositId} is missing targetUpiRef.`);
        return;
    }

    const transactionRef = db.collection('transactions').doc();
    await transactionRef.set({
        userId: userId,
        type: 'deposit',
        amount: amount,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: `Deposit approved via UTR: ${utr}`,
    });

    await sendNotification(
        userId,
        'Deposit Approved!',
        `Your deposit of ₹${amount} has been approved and added to your wallet.`,
        '/wallet'
    );
    
    const upiConfigDocRef = db.collection('upiConfiguration').doc(targetUpiRef);
    const upiConfigSnap = await upiConfigDocRef.get();

    if (upiConfigSnap.exists()) {
        const upiConfigData = upiConfigSnap.data()!;
        const newReceivedAmount = (upiConfigData.currentReceived || 0) + amount;

        if (newReceivedAmount >= upiConfigData.paymentLimit) {
            const nextUpiQuery = db.collection('upiConfiguration').where('isActive', '==', false).limit(1);
            const nextUpiSnapshot = await nextUpiQuery.get();
            
            const batch = db.batch();
            batch.update(upiConfigDocRef, { isActive: false, currentReceived: newReceivedAmount });

            if(!nextUpiSnapshot.empty) {
                const nextUpiDoc = nextUpiSnapshot.docs[0];
                const activeUpiRef = db.collection('upiConfiguration').doc('active');
                
                batch.update(nextUpiDoc.ref, { isActive: true });
                batch.set(activeUpiRef, { activeUpiId: nextUpiDoc.data().upiId, activeUpiRef: nextUpiDoc.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                
                console.log(`UPI limit reached for ${upiConfigData.upiId}. Switched to ${nextUpiDoc.data().upiId}.`);
            } else {
                console.log("UPI limit reached, but no alternative UPIs available. Deactivating current UPI.");
            }
            await batch.commit();

        } else {
            await upiConfigDocRef.update({ currentReceived: newReceivedAmount });
        }
    }

    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists()) return null;
    
    const userData = userDoc.data()!;
    const referredBy = userData.referredBy;

    if (referredBy && !userData.referralBonusPaid) {
      try {
        await db.runTransaction(async (transaction) => {
          const referrerRef = db.doc(`users/${referredBy}`);
          const referrerDoc = await transaction.get(referrerRef);

          if (!referrerDoc.exists()) return;

          const configRef = db.doc('referralConfiguration/settings');
          const configDoc = await transaction.get(configRef);
          const commissionPercentage = configDoc.exists() ? configDoc.data()!.commissionPercentage : 5;
          
          const commission = (amount * commissionPercentage) / 100;
          
          const commissionTransRef = db.collection('transactions').doc();
          transaction.set(commissionTransRef, {
            userId: referredBy,
            type: 'referral-bonus',
            amount: commission,
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: `Referral commission from ${userData.displayName || userId}'s deposit.`
          });
          
           transaction.update(userRef, { referralBonusPaid: true });
        });
      } catch (error) {
        console.error("Error processing referral commission: ", error);
      }
    }
  } else if (after.status === 'rejected' && before.status !== 'rejected') {
     await sendNotification(
        after.userId,
        'Deposit Rejected',
        `Your deposit request of ₹${after.amount} was rejected. Reason: ${after.rejectionReason || 'Not specified'}.`,
        '/wallet'
    );
  }
  return null;
});

export const onWithdrawalRequestUpdate = functions.firestore
.document('withdrawalRequests/{withdrawalId}')
.onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();
    const { userId, amount } = after;

    if (after.status === 'approved' && before.status !== 'approved') {
        await db.collection('transactions').doc().set({
            userId: userId,
            type: 'withdrawal',
            amount: -amount,
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: `Withdrawal of ₹${amount}`,
            relatedId: context.params.withdrawalId,
        });

        await sendNotification(
            userId,
            'Withdrawal Approved!',
            `Your withdrawal request of ₹${amount} has been approved.`,
            '/wallet'
        );
    } else if (after.status === 'rejected' && before.status !== 'rejected') {
        // Refund the amount to the user's wallet
        await db.collection('transactions').doc().set({
            userId: userId,
            type: 'withdrawal_refund',
            amount: amount, // Positive amount
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: `Refund for rejected withdrawal of ₹${amount}`,
            relatedId: context.params.withdrawalId,
        });
        
        await sendNotification(
            userId,
            'Withdrawal Rejected',
            `Your withdrawal request of ₹${amount} was rejected. Reason: ${after.rejectionReason || 'Not specified'}. The amount has been returned to your wallet.`,
            '/wallet'
        );
    }
    return null;
});

export const newDailyLoginBonus = functions.https.onCall(async (data, context) => {
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
                functions.logger.error("Bonus configuration not set. Please create the document 'bonus_config/settings'");
                throw new functions.https.HttpsError('failed-precondition', 'Bonus configuration is not set.');
            }

            const userData = userDoc.data()!;
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            if (userData.lastLoginDate === today) {
                return { success: true, message: 'Daily bonus already claimed for today.' };
            }

            const isYesterday = (dateString: string) => {
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

            const updateData = {
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

export const claimTaskReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to claim a reward.');
    }
    const { taskId } = data;
    if (!taskId) {
        throw new HttpsError('invalid-argument', 'Task ID is required.');
    }
    
    const userId = context.auth.uid;
    const taskRef = db.doc(`tasks/${taskId}`);
    const userTaskRef = db.doc(`user_tasks/${userId}/tasks/${taskId}`);

    try {
        const result = await db.runTransaction(async (transaction) => {
            const taskDoc = await transaction.get(taskRef);
            const userTaskDoc = await transaction.get(userTaskRef);

            if (!taskDoc.exists) {
                throw new HttpsError('not-found', 'Task not found.');
            }
            if (!userTaskDoc.exists) {
                throw new HttpsError('not-found', 'User task progress not found.');
            }

            const taskData = taskDoc.data()!;
            const userTaskData = userTaskDoc.data()!;

            if (!userTaskData.completed) {
                throw new HttpsError('failed-precondition', 'Task is not yet completed.');
            }
            if (userTaskData.claimed) {
                throw new HttpsError('failed-precondition', 'Reward for this task has already been claimed.');
            }
            if (!taskData.enabled) {
                throw new HttpsError('failed-precondition', 'This task is currently disabled.');
            }

            const reward = taskData.reward;
            const rewardTransactionRef = db.collection('transactions').doc();
            transaction.set(rewardTransactionRef, {
                userId: userId,
                type: 'task-reward',
                amount: reward,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                description: `Reward for completing task: ${taskData.title}`,
            });

            transaction.update(userTaskRef, { claimed: true });

            return { success: true, message: `You have successfully claimed your reward of ₹${reward}!` };
        });

        return result;

    } catch (error) {
        console.error(`Error claiming task reward for user ${userId}, task ${taskId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred while claiming the task reward.');
    }
});


export const distributeTournamentWinnings = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Only admins can perform this action.');
    }

    const { tournamentId, prizeDistribution } = data;
    if (!tournamentId || !prizeDistribution) {
        throw new HttpsError('invalid-argument', 'Missing tournamentId or prizeDistribution.');
    }

    const tournamentRef = db.doc(`tournaments/${tournamentId}`);

    try {
        return await db.runTransaction(async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentRef);
            if (!tournamentDoc.exists) {
                throw new HttpsError('not-found', 'Tournament not found.');
            }
            const tournamentData = tournamentDoc.data()!;

            if (tournamentData.prizeDistributed) {
                throw new HttpsError('failed-precondition', 'Prizes have already been distributed for this tournament.');
            }
            if (tournamentData.status !== 'completed') {
                throw new HttpsError('failed-precondition', 'Tournament is not completed yet.');
            }

            const totalToDistribute = Object.values(prizeDistribution).reduce((sum: number, val: any) => sum + Number(val), 0);
            if (totalToDistribute > tournamentData.prizePool) {
                throw new HttpsError('invalid-argument', 'Prize distribution total exceeds tournament prize pool.');
            }
            
            // Calculate winners based on matches in the subcollection
            const matchesQuery = db.collection(`tournaments/${tournamentId}/matches`).where('status', '==', 'completed');
            const matchesSnapshot = await transaction.get(matchesQuery);

            const playerWins: { [key: string]: number } = {};
            (tournamentData.playerIds || []).forEach((id: string) => {
                playerWins[id] = 0;
            });
            matchesSnapshot.forEach(matchDoc => {
                const matchData = matchDoc.data();
                if (matchData.winnerId && playerWins.hasOwnProperty(matchData.winnerId)) {
                    playerWins[matchData.winnerId]++;
                }
            });

            const sortedPlayers = Object.entries(playerWins).sort(([, winsA], [, winsB]) => winsB - winsA);

            const totalCollected = tournamentData.entryFee * tournamentData.filledSlots;
            const commission = totalCollected - tournamentData.prizePool;
            if (commission > 0) {
                const commissionTransactionRef = db.collection('transactions').doc();
                transaction.set(commissionTransactionRef, {
                    userId: 'platform',
                    type: 'tournament_commission',
                    amount: commission,
                    status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    relatedTournamentId: tournamentId,
                    description: `Commission from ${tournamentData.name}`,
                });
            }

            let rank = 1;
            for (const [playerId] of sortedPlayers) {
                const prizeAmount = prizeDistribution[String(rank)];
                if (prizeAmount > 0) {
                    const winningsTransactionRef = db.collection('transactions').doc();
                    transaction.set(winningsTransactionRef, {
                        userId: playerId,
                        type: 'winnings',
                        amount: prizeAmount,
                        status: 'completed',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        relatedTournamentId: tournamentId,
                        description: `Rank ${rank} prize in ${tournamentData.name}.`,
                    });
                }
                rank++;
            }
            
            transaction.update(tournamentRef, { prizeDistributed: true });
            
            return { success: true, message: 'Winnings distributed successfully.' };
        });
    } catch (error) {
        console.error('Error distributing tournament winnings:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred.', error);
    }
});
