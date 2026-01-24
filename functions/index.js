
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v1/https');

admin.initializeApp();

const db = admin.firestore();

// Helper function to send a notification to a specific user
const sendNotification = async (userId, title, body, link) => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found, cannot send notification.`);
            return;
        }
        const user = userDoc.data();
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

// Atomically updates user stats based on completed transactions.
exports.onTransactionCreate = functions.firestore
    .document('transactions/{transactionId}')
    .onCreate(async (snap, context) => {
        const transaction = snap.data();
        const { userId, type, amount, status } = transaction;

        // Only process completed transactions for actual users.
        if (status !== 'completed' || userId === 'platform') {
            return null;
        }

        const userRef = db.collection('users').doc(userId);

        try {
            const updateData = {};

            // These types directly affect the wallet balance.
            const balanceAffectingTypes = [
                'deposit', 'withdrawal', 'entry-fee', 'winnings', 'refund',
                'admin-credit', 'admin-debit', 'referral-bonus',
                'tournament-fee', 'daily_bonus', 'withdrawal_refund', 'task-reward'
            ];

            if (balanceAffectingTypes.includes(type)) {
                updateData.walletBalance = admin.firestore.FieldValue.increment(amount);
            }

            // Track total winnings separately.
            if (type === 'winnings') {
                updateData.winnings = admin.firestore.FieldValue.increment(amount);
            }

            // Track total withdrawals. Amount is negative, so we increment by its positive value.
            if (type === 'withdrawal') {
                updateData.totalWithdrawals = admin.firestore.FieldValue.increment(-amount);
            }

            // If there's anything to update, perform the update.
            if (Object.keys(updateData).length > 0) {
                await userRef.update(updateData);
                 console.log(`User ${userId} stats updated for transaction type ${type}.`);
            }

            return null;

        } catch (error) {
            console.error(`Error updating user stats for transaction ${context.params.transactionId}:`, error);
            // Mark the transaction as failed to allow for manual review.
            return snap.ref.update({ status: 'failed', error: error.message });
        }
    });


// Handles all logic that should occur when a match document is updated.
exports.onMatchUpdate = functions.firestore
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

            // Prevent duplicate processing.
            if (after.prizeDistributed) {
                console.log(`Prize for match ${matchId} has already been distributed.`);
                return;
            }

            const batch = db.batch();

            // 1. Create winnings transaction for the winner.
            const winningsTransactionRef = db.collection('transactions').doc();
            batch.set(winningsTransactionRef, {
                userId: winnerId,
                type: 'winnings',
                amount: prizePool,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: matchId,
                description: `Winnings for match ${matchId}`,
            });

            // 2. Create commission transaction for the platform.
            const commissionPercentage = after.commissionPercentage || 10; // Use stored or default
            const commission = (entryFee * playerIds.length) * (commissionPercentage / 100);
            const commissionTransactionRef = db.collection('transactions').doc();
            batch.set(commissionTransactionRef, {
                userId: 'platform',
                type: 'match_commission',
                amount: commission,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: matchId,
                description: `${commissionPercentage}% commission from match ${matchId}`,
            });

            // 3. Update stats for all players in the match.
            for (const playerId of playerIds) {
                const userRef = db.collection('users').doc(playerId);
                const isWinner = (playerId === winnerId);
                
                batch.update(userRef, {
                    totalMatchesPlayed: admin.firestore.FieldValue.increment(1),
                    totalMatchesWon: admin.firestore.FieldValue.increment(isWinner ? 1 : 0),
                    activeMatchIds: admin.firestore.FieldValue.arrayRemove(matchId)
                });
            }
            
            // 4. Mark match as distributed to prevent re-processing.
            batch.update(change.after.ref, { prizeDistributed: true });

            await batch.commit();
            console.log(`Prize distribution and stats updates completed for match ${matchId}.`);
            
            // 5. Send notifications to all players.
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
            
            // 1. Create refund transactions for all players.
            for (const playerId of after.playerIds) {
                const transactionRef = db.collection('transactions').doc();
                refundBatch.set(transactionRef, {
                    userId: playerId,
                    type: 'refund',
                    amount: after.entryFee, // Positive amount to credit back
                    status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Refund for cancelled match ${matchId}`,
                    relatedMatchId: matchId,
                });
                
                // 2. Remove active match from user profile.
                const userRef = db.collection('users').doc(playerId);
                refundBatch.update(userRef, {
                     activeMatchIds: admin.firestore.FieldValue.arrayRemove(matchId)
                });
            }

            // 3. Mark match as refunded.
            refundBatch.update(change.after.ref, { refundsProcessed: true });
            await refundBatch.commit();
            console.log(`Refunds processed for cancelled match ${matchId}.`);

            // 4. Send notifications.
            for (const playerId of after.playerIds) {
                await sendNotification(playerId, "Match Cancelled", `Match ${matchId} has been cancelled. Your entry fee of ₹${after.entryFee} has been refunded.`, '/wallet');
            }
        }
    });

// Admin function to resolve a disputed match by declaring a winner.
exports.declareWinner = functions.https.onCall(async (data, context) => {
    const callerClaims = context.auth.token;
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
        const matchData = matchDoc.data();

        if (matchData.status !== 'disputed') {
             throw new HttpsError('failed-precondition', `Match must be in a 'disputed' state. Current state: ${matchData.status}`);
        }

        if (!matchData.playerIds.includes(winnerId)) {
            throw new HttpsError('invalid-argument', 'The declared winner is not a player in this match.');
        }

        // Set the winner and status. The onMatchUpdate trigger will handle the rest.
        await matchRef.update({ 
            status: 'completed', 
            winnerId: winnerId
        });

        return { 
            success: true, 
            message: `Successfully declared ${winnerId} as winner for match ${matchId}. Prize distribution is being processed.`
        };

    } catch (error) {
        console.error(`Error in declareWinner for match ${matchId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});


// This function triggers when a result is submitted and decides if the match is complete or disputed.
exports.onResultSubmit = functions.firestore
  .document('matches/{matchId}/results/{userId}')
  .onCreate(async (snap, context) => {
    const { matchId, userId } = context.params;
    const matchRef = db.collection('matches').doc(matchId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const freshMatchDoc = await transaction.get(matchRef);
        if (!freshMatchDoc.exists) return;
        
        const freshMatchData = freshMatchDoc.data();
        if (['completed', 'disputed', 'cancelled'].includes(freshMatchData.status)) return;
        
        const otherPlayerIds = freshMatchData.playerIds.filter(pId => pId !== userId);
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

        // Scenario 1: Clear Win/Loss -> Mark as completed. onMatchUpdate will do the rest.
        if (winClaims.length === 1 && lossClaims.length === 1) {
            transaction.update(matchRef, { status: 'completed', winnerId: winClaims[0].userId });
            return;
        }

        // Scenario 2: Any other case -> Mark as disputed for admin review.
        transaction.update(matchRef, { status: 'disputed', reviewReason: 'Conflicting or unclear results submitted.' });
      });
    } catch (error) {
      console.error(`Error in onResultSubmit for match ${matchId}:`, error);
      await matchRef.update({ status: 'disputed', reviewReason: `System error during result processing.` }).catch(()=>{});
    }
     return null;
  });

// --- All other functions below are left as they were ---


exports.claimSuperAdminRole = functions.https.onCall(async (data, context) => {
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


exports.setRole = functions.https.onCall(async (data, context) => {
  // 1. Authentication and Authorization Check
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

  // 2. Input Validation
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

  // 3. Set Custom Claim & Firestore field
  try {
    const isNowAdmin = role !== 'none';
    
    await admin.auth().setCustomUserClaims(uid, { 
        role: role === 'none' ? null : role,
        admin: isNowAdmin ? true : null
    });
    
    await db.collection('users').doc(uid).update({ role: role, isAdmin: isNowAdmin });

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


exports.listUsers = functions.https.onCall(async (data, context) => {
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

exports.getAdminDashboardStats = functions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Only admins can access dashboard stats.');
    }

    try {
        const usersSnap = await db.collection('users').get();
        const kycSnap = await db.collection('kycApplications').where('status', '==', 'pending').get();
        const depositsSnap = await db.collection('depositRequests').where('status', '==', 'pending').get();
        const withdrawalsSnap = await db.collection('withdrawalRequests').where('status', '==', 'pending').get();
        const matchesSnap = await db.collection('matches').where('status', '==', 'disputed').get();

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

exports.getAdminUserStats = functions.https.onCall(async (data, context) => {
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

exports.onDepositRequestUpdate = functions.firestore
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
        const upiConfigData = upiConfigSnap.data();
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
    
    const userData = userDoc.data();
    const referredBy = userData.referredBy;

    if (referredBy && !userData.referralBonusPaid) {
      try {
        await db.runTransaction(async (transaction) => {
          const referrerRef = db.doc(`users/${referredBy}`);
          const referrerDoc = await transaction.get(referrerRef);

          if (!referrerDoc.exists()) return;

          const configRef = db.doc('referralConfiguration/settings');
          const configDoc = await transaction.get(configRef);
          const commissionPercentage = configDoc.exists() ? configDoc.data().commissionPercentage : 5;
          
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

exports.onWithdrawalRequestUpdate = functions.firestore
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
        await db.collection('transactions').doc().set({
            userId: userId,
            type: 'withdrawal_refund',
            amount: amount, // Positive amount to credit back
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: `Refund for rejected withdrawal request of ₹${amount}`,
            relatedId: context.params.withdrawalId,
        });
        
        await sendNotification(
            userId,
            'Withdrawal Rejected',
            `Your withdrawal request of ₹${amount} was rejected. Reason: ${after.rejectionReason || 'Not specified'}.`,
            '/wallet'
        );
    }
    return null;
});
