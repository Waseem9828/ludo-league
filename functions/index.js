
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
    
    await admin.auth().setCustomUserClaims(uid, { role: isNowAdmin ? role : null, admin: isNowAdmin ? true : null });
    await db.collection('users').doc(uid).update({ isAdmin: isNowAdmin, role: isNowAdmin ? role : null });

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
    if (!context.auth || context.auth.token.role !== 'superAdmin') {
        throw new HttpsError('permission-denied', 'Only super admins can access dashboard stats.');
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
    if (!context.auth || context.auth.token.role !== 'superAdmin') {
        throw new HttpsError('permission-denied', 'Only super admins can access user stats.');
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


// Securely handles wallet balance updates when a transaction is created.
exports.onTransactionCreate = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const { userId, type, amount, status } = transaction;

    if (status !== 'completed') {
        return null;
    }
    
    if (userId === 'platform') {
        // This is a platform transaction, like commission. No user balance to update.
        return null;
    }
    
    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User ${userId} not found`);
            }
            const userData = userDoc.data();
            const updateData = {};

            // Update wallet balance for relevant transaction types
            const balanceAffectingTypes = ['deposit', 'withdrawal', 'entry-fee', 'winnings', 'refund', 'admin-credit', 'admin-debit', 'referral-bonus', 'tournament-fee', 'daily_bonus', 'withdrawal_refund', 'task-reward'];
            if (balanceAffectingTypes.includes(type)) {
                const currentBalance = userData.walletBalance || 0;
                const newBalance = currentBalance + amount;

                if (newBalance < 0) {
                    throw new Error(`Insufficient balance for user ${userId}.`);
                }
                updateData.walletBalance = newBalance;
            }

            // Update total withdrawals
            if (type === 'withdrawal') {
                const currentTotalWithdrawals = userData.totalWithdrawals || 0;
                // amount is negative for withdrawals, so we subtract it (effectively adding a positive value)
                updateData.totalWithdrawals = currentTotalWithdrawals - amount;
            }

            // If there's anything to update, perform the transaction update
            if (Object.keys(updateData).length > 0) {
                 t.update(userRef, updateData);
            }
        });

        return null;

    } catch (error) {
        console.error('Error handling transaction:', error);
        return snap.ref.update({ status: 'failed', error: error.message });
    }
  });


  // This function triggers when a deposit request is updated.
exports.onDepositRequestUpdate = functions.firestore
.document('depositRequests/{depositId}') 
.onUpdate(async (change, context) => {
  const after = change.after.data();
  const before = change.before.data();

  // Check if the deposit just got approved
  if (after.status === 'approved' && before.status !== 'approved') {
    const { userId, amount, utr, targetUpiRef } = after;

    if (!targetUpiRef) {
        console.error(`Deposit request ${context.params.depositId} is missing targetUpiRef.`);
        // Optionally, mark the deposit as failed or require manual intervention.
        return;
    }

    // --- Create Transaction First ---
    // This will trigger onTransactionCreate to update the wallet balance.
    const transactionRef = db.collection('transactions').doc();
    await transactionRef.set({
        userId: userId,
        type: 'deposit',
        amount: amount,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: `Deposit approved via UTR: ${utr}`,
    });

    // Send a notification to the user
    await sendNotification(
        userId,
        'Deposit Approved!',
        `Your deposit of ₹${amount} has been approved and added to your wallet.`,
        '/wallet'
    );
    
    // --- UPI Limit Management (Robust Version) ---
    const upiConfigDocRef = db.collection('upiConfiguration').doc(targetUpiRef);
    const upiConfigSnap = await upiConfigDocRef.get();

    if (upiConfigSnap.exists()) {
        const upiConfigData = upiConfigSnap.data();
        const newReceivedAmount = (upiConfigData.currentReceived || 0) + amount;

        if (newReceivedAmount >= upiConfigData.paymentLimit) {
            // Limit reached, find a new UPI to activate
            const nextUpiQuery = db.collection('upiConfiguration').where('isActive', '==', false).limit(1);
            const nextUpiSnapshot = await nextUpiQuery.get();
            
            const batch = db.batch();
            // Deactivate current
            batch.update(upiConfigDocRef, { isActive: false, currentReceived: newReceivedAmount });

            if(!nextUpiSnapshot.empty) {
                const nextUpiDoc = nextUpiSnapshot.docs[0];
                const activeUpiRef = db.collection('upiConfiguration').doc('active');
                
                // Activate next
                batch.update(nextUpiDoc.ref, { isActive: true });
                // Update the global active reference
                batch.set(activeUpiRef, { activeUpiId: nextUpiDoc.data().upiId, activeUpiRef: nextUpiDoc.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                
                console.log(`UPI limit reached for ${upiConfigData.upiId}. Switched to ${nextUpiDoc.data().upiId}.`);
            } else {
                console.log("UPI limit reached, but no alternative UPIs available. Deactivating current UPI.");
            }
            await batch.commit();

        } else {
            // Limit not reached, just update the current amount
            await upiConfigDocRef.update({ currentReceived: newReceivedAmount });
        }
    }
    // --- End UPI Limit Management ---

    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists()) {
      return null;
    }
    const userData = userDoc.data();
    const referredBy = userData.referredBy;

    // Handle referral bonus for first deposit
    if (referredBy && !userData.referralBonusPaid) {
      try {
        await db.runTransaction(async (transaction) => {
          const referrerRef = db.doc(`users/${referredBy}`);
          const referrerDoc = await transaction.get(referrerRef);

          if (!referrerDoc.exists()) {
            return;
          }

          const configRef = db.doc('referralConfiguration/settings');
          const configDoc = await transaction.get(configRef);
          const commissionPercentage = configDoc.exists() ? configDoc.data().commissionPercentage : 5; // Default 5%
          
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

// This function triggers when a withdrawal request is updated.
exports.onWithdrawalRequestUpdate = functions.firestore
.document('withdrawalRequests/{withdrawalId}')
.onUpdate(async (change, context) => {
    const after = change.after.data();
    const before = change.before.data();
    const { userId, amount } = after;

    if (after.status === 'approved' && before.status !== 'approved') {
        const transactionRef = db.collection('transactions').doc();
        await transactionRef.set({
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
        const transactionRef = db.collection('transactions').doc();
        await transactionRef.set({
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


const findAndCreateMatch = async (entry, queueName) => {
    const { entryFee, userId } = entry;
    
    // Determine the opposite queue
    const oppositeQueueName = queueName === 'roomCodeCreators' ? 'roomCodeSeekers' : 'roomCodeCreators';
    
    const oppositeQueueRef = db.collection(oppositeQueueName);
    const q = oppositeQueueRef.where('entryFee', '==', entryFee).limit(1);

    const snapshot = await q.get();

    if (snapshot.empty) {
        // No opponent found yet
        return null;
    }

    const opponentDoc = snapshot.docs[0];
    const opponent = opponentDoc.data();

    const creator = queueName === 'roomCodeCreators' ? entry : opponent;
    const seeker = queueName === 'roomCodeSeekers' ? entry : opponent;

    const creatorQueueRef = db.doc(`roomCodeCreators/${creator.userId}`);
    const seekerQueueRef = db.doc(`roomCodeSeekers/${seeker.userId}`);

    let newMatchRefId;

    try {
        await db.runTransaction(async (transaction) => {
            const matchRef = db.collection('matches').doc();
            newMatchRefId = matchRef.id;

            const prizePool = entryFee * 1.8;
            const newMatchData = {
                id: newMatchRefId,
                creatorId: creator.userId,
                status: 'in-progress', // Match starts immediately
                entryFee: entryFee,
                prizePool: prizePool,
                maxPlayers: 2,
                playerIds: [creator.userId, seeker.userId],
                players: {
                    [creator.userId]: { id: creator.userId, name: creator.userName, avatarUrl: creator.userAvatar, winRate: creator.winRate || 0 },
                    [seeker.userId]: { id: seeker.userId, name: seeker.userName, avatarUrl: seeker.userAvatar, winRate: seeker.winRate || 0 },
                },
                roomCode: creator.roomCode,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            transaction.set(matchRef, newMatchData);

            // Debit entry fees
            const creatorTransRef = db.collection('transactions').doc();
            const seekerTransRef = db.collection('transactions').doc();
            const transactionData = {
                type: 'entry-fee',
                amount: -entryFee,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: newMatchRefId,
            };
            transaction.set(creatorTransRef, { ...transactionData, userId: creator.userId, description: `Entry fee for match ${newMatchRefId}` });
            transaction.set(seekerTransRef, { ...transactionData, userId: seeker.userId, description: `Entry fee for match ${newMatchRefId}` });

            // Update user profiles with active match
            const creatorUserRef = db.doc(`users/${creator.userId}`);
            const seekerUserRef = db.doc(`users/${seeker.userId}`);
            transaction.update(creatorUserRef, { activeMatchIds: admin.firestore.FieldValue.arrayUnion(newMatchRefId) });
            transaction.update(seekerUserRef, { activeMatchIds: admin.firestore.FieldValue.arrayUnion(newMatchRefId) });

            // Remove players from queues
            transaction.delete(creatorQueueRef);
            transaction.delete(seekerQueueRef);
        });

        // Send notifications
        if (newMatchRefId) {
            const matchLink = `/match/${newMatchRefId}`;
            await sendNotification(creator.userId, "Match Found!", `Your match against ${seeker.userName} is ready.`, matchLink);
            await sendNotification(seeker.userId, "Match Found!", `Your match against ${creator.userName} is ready.`, matchLink);
        }
    } catch (error) {
        console.error("Error in findAndCreateMatch transaction:", error);
    }
};

exports.onRoomCodeCreatorWrite = functions.firestore
  .document('roomCodeCreators/{userId}')
  .onCreate(async (snap, context) => {
    return findAndCreateMatch(snap.data(), 'roomCodeCreators');
  });

exports.onRoomCodeSeekerWrite = functions.firestore
  .document('roomCodeSeekers/{userId}')
  .onCreate(async (snap, context) => {
    return findAndCreateMatch(snap.data(), 'roomCodeSeekers');
  });


exports.onTournamentCreate = functions.firestore
  .document('tournaments/{tournamentId}')
  .onCreate(async (snap, context) => {
    const tournament = snap.data();
    
    const usersSnapshot = await db.collection('users').get();
    const tokens = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.fcmToken) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return null;
    }

    const payload = {
      notification: {
        title: 'New Tournament Alert!',
        body: `${tournament.name} is now open for registration with a prize pool of ₹${tournament.prizePool}!`,
        clickAction: `/tournaments/${snap.id}`,
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast({ tokens, ...payload });
      console.log(`Sent tournament notification. Success: ${response.successCount}, Failure: ${response.failureCount}`);
      return response;
    } catch (error) {
      console.error('Error sending tournament notifications:', error);
      return null;
    }
});

// New, advanced onResultSubmit function
exports.onResultSubmit = functions.firestore
  .document('matches/{matchId}/results/{userId}')
  .onCreate(async (snap, context) => {
    const { matchId, userId } = context.params;
    const matchRef = db.collection('matches').doc(matchId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const freshMatchDoc = await transaction.get(matchRef);
        if (!freshMatchDoc.exists) {
          console.log(`Match ${matchId} not found, exiting.`);
          return;
        }
        const freshMatchData = freshMatchDoc.data();

        // **CRITICAL FIX**: Check if the match has already been processed.
        if (['completed', 'disputed', 'cancelled'].includes(freshMatchData.status)) {
          console.log(`Match ${matchId} is already concluded with status: ${freshMatchData.status}. No action taken.`);
          return; // Exit transaction if match is already resolved.
        }
        
        // Notify other players
        const otherPlayerIds = freshMatchData.playerIds.filter(pId => pId !== userId);
        for(const pId of otherPlayerIds) {
            await sendNotification(pId, "Result Submitted", `${freshMatchData.players[userId]?.name || 'Opponent'} has submitted their match result.`, `/match/${matchId}`);
        }

        const expectedResults = freshMatchData.playerIds.length;
        const resultsCollectionRef = matchRef.collection('results');
        // Fetch results within the transaction to ensure consistency
        const resultsSnapshot = await transaction.get(resultsCollectionRef);

        if (resultsSnapshot.size < expectedResults) {
            console.log(`Waiting for all players in match ${matchId} to submit results. Have ${resultsSnapshot.size}/${expectedResults}.`);
            return;
        }

        const results = resultsSnapshot.docs.map(doc => doc.data());
        console.log(`All players submitted for match ${matchId}. Analyzing results...`);

        const winClaims = results.filter(r => r.status === 'win');
        const lossClaims = results.filter(r => r.status === 'loss');
        const screenshotUrls = results.map(r => r.screenshotUrl).filter(Boolean); 
        const uniqueUrls = new Set(screenshotUrls);

        // Scenario 1: Clear Win/Loss
        if (winClaims.length === 1 && lossClaims.length === 1 && screenshotUrls.length === expectedResults) {
            const winnerId = winClaims[0].userId;
            console.log(`Match ${matchId} completed automatically. Winner: ${winnerId}`);
            transaction.update(matchRef, { status: 'completed', winnerId: winnerId });
            return;
        }

        // Scenario 2: Multiple win claims
        if (winClaims.length > 1) {
          console.log(`Dispute for match ${matchId}: Multiple win claims.`);
          transaction.update(matchRef, { status: 'disputed', reviewReason: 'Multiple players claimed victory.' });
          return;
        }

        // Scenario 3: Duplicate screenshots
        if (screenshotUrls.length > uniqueUrls.size) {
           console.log(`Dispute for match ${matchId}: Duplicate screenshots detected.`);
           transaction.update(matchRef, { status: 'disputed', reviewReason: 'Duplicate screenshots submitted.' });
           return;
        }
        
        // Scenario 4: Any other conflicting or unclear state
        console.log(`Dispute for match ${matchId}: Unclear results.`);
        transaction.update(matchRef, { status: 'disputed', reviewReason: 'Conflicting or unclear results submitted.' });
      });
    } catch (error) {
      console.error(`Error in onResultSubmit transaction for match ${matchId}:`, error);
      // Attempt to update status to disputed as a fallback on error, but don't re-throw to prevent retries
      await matchRef.update({ status: 'disputed', reviewReason: `System error during result processing.` }).catch(e => console.error("Failed to update match status to disputed on error:", e));
    }
     return null;
  });

  exports.declareWinnerAndDistribute = functions.https.onCall(async (data, context) => {
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
        let winningPlayerName = 'Unknown Player';
        let prizePoolAmount = 0;
        let playerIds = [];

        await db.runTransaction(async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists) {
                throw new HttpsError('not-found', 'Match not found.');
            }
            const matchData = matchDoc.data();
            playerIds = matchData.playerIds;

            if (matchData.prizeDistributed) {
                throw new HttpsError('failed-precondition', 'Winnings have already been distributed for this match.');
            }

            if (!matchData.playerIds.includes(winnerId)) {
                throw new HttpsError('invalid-argument', 'The declared winner is not a player in this match.');
            }
            
            const winningPlayer = matchData.players[winnerId];
            if (winningPlayer) {
              winningPlayerName = winningPlayer.name;
            } else {
              console.log(`Could not find player details for ID ${winnerId} in match ${matchId}.`);
            }
            
            prizePoolAmount = matchData.prizePool;
            const commission = (matchData.entryFee * matchData.playerIds.length) * 0.10;

            const winningsTransactionRef = db.collection('transactions').doc();
            transaction.set(winningsTransactionRef, {
                userId: winnerId,
                type: 'winnings',
                amount: prizePoolAmount,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: matchId,
                description: `Winnings for match ${matchId}`,
            });

            const commissionTransactionRef = db.collection('transactions').doc();
            transaction.set(commissionTransactionRef, {
                userId: 'platform',
                type: 'match_commission',
                amount: commission,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: matchId,
                description: `10% commission from match ${matchId}`,
            });

            for (const playerId of matchData.playerIds) {
                const userRef = db.collection('users').doc(playerId);
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const totalMatchesPlayed = (userData.totalMatchesPlayed || 0) + 1;
                    const totalMatchesWon = (userData.totalMatchesWon || 0) + (playerId === winnerId ? 1 : 0);
                    const winRate = totalMatchesPlayed > 0 ? (totalMatchesWon / totalMatchesPlayed) * 100 : 0;
                    const winnings = (userData.winnings || 0) + (playerId === winnerId ? prizePoolAmount : 0);
                    
                    transaction.update(userRef, {
                        totalMatchesPlayed: totalMatchesPlayed,
                        totalMatchesWon: totalMatchesWon,
                        winRate: winRate,
                        winnings: winnings,
                        activeMatchIds: admin.firestore.FieldValue.arrayRemove(matchId)
                    });
                }
            }

            transaction.update(matchRef, { 
                status: 'completed', 
                winnerId: winnerId,
                prizeDistributed: true,
            });
        });
        
        // Send notifications outside the transaction
        for (const pId of playerIds) {
            const title = pId === winnerId ? "You Won!" : "Match Result";
            const body = pId === winnerId ? `Congratulations, you won ₹${prizePoolAmount}!` : `Match resolved. ${winningPlayerName} is the winner.`;
            await sendNotification(pId, title, body, `/match/${matchId}`);
        }

        return { 
            success: true, 
            message: `Successfully declared ${winningPlayerName} as winner and distributed prize of ₹${prizePoolAmount}.`
        };

    } catch (error) {
        console.error('Error in declareWinnerAndDistribute:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred during prize distribution.', error);
    }
});

exports.dailyLoginBonus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to claim a bonus.');
    }

    const userId = context.auth.uid;
    const userRef = db.doc(`users/${userId}`);
    const configRef = db.doc('bonus_config/settings');

    try {
        const result = await db.runTransaction(async (transaction) => {
            // 1. All reads first
            const userDoc = await transaction.get(userRef);
            const configDoc = await transaction.get(configRef);

            // 2. Pre-condition checks
            if (!userDoc.exists()) {
                return { error: 'not-found', message: 'User profile not found.' };
            }
            const userData = userDoc.data();
            const today = new Date().toISOString().split('T')[0];
            if (userData.lastLoginDate === today) {
                return { success: true, message: 'Daily bonus already claimed for today.' };
            }

            const isYesterday = (dateString) => {
                if (!dateString) return false;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return dateString === yesterday.toISOString().split('T')[0];
            };
            const currentStreak = isYesterday(userData.lastLoginDate) ? (userData.loginStreak || 0) + 1 : 1;

            if (!configDoc.exists() || !configDoc.data().enabled) {
                 // Just update login date and streak, but return a "disabled" message
                transaction.update(userRef, { lastLoginDate: today, loginStreak: currentStreak });
                return { success: true, message: 'The daily bonus system is currently disabled.' };
            }

            // 3. Logic and writes
            const config = configDoc.data();
            
            let totalBonus = Number(config.dailyBonus) || 0;
            if (config.streakBonus && config.streakBonus[currentStreak]) {
                const streakBonusAmount = Number(config.streakBonus[currentStreak]) || 0;
                totalBonus += streakBonusAmount;
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

        // 4. Handle results outside the transaction
        if (result.error) {
            if (result.error === 'not-found') {
                throw new functions.https.HttpsError('not-found', result.message);
            }
        }

        return { success: result.success, message: result.message };

    } catch (error) {
        console.error('Error in dailyLoginBonus function:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while claiming the bonus.');
    }
});


exports.distributeTournamentWinnings = functions.https.onCall(async (data, context) => {
    const callerClaims = context.auth.token;
    if (!callerClaims || (callerClaims.role !== 'matchAdmin' && callerClaims.role !== 'superAdmin')) {
        throw new HttpsError('permission-denied', 'Only match admins or super admins can perform this action.');
    }

    const { tournamentId, prizeDistribution } = data;
    if (!tournamentId || !prizeDistribution) {
        throw new HttpsError('invalid-argument', 'Missing tournamentId or prizeDistribution.');
    }

    const tournamentRef = db.doc(`tournaments/${tournamentId}`);

    try {
        const tournamentDoc = await tournamentRef.get();
        if (!tournamentDoc.exists) {
            throw new HttpsError('not-found', 'Tournament not found.');
        }
        const tournamentData = tournamentDoc.data();

        if (tournamentData.prizeDistributed) {
            throw new HttpsError('failed-precondition', 'Prizes have already been distributed for this tournament.');
        }
        if (tournamentData.status !== 'completed') {
            throw new HttpsError('failed-precondition', 'Tournament is not completed yet.');
        }

        const totalToDistribute = Object.values(prizeDistribution).reduce((sum, val) => sum + Number(val), 0);
        if (totalToDistribute > tournamentData.prizePool) {
            throw new HttpsError('invalid-argument', 'Prize distribution total exceeds tournament prize pool.');
        }

        const matchesSnapshot = await db.collection(`tournaments/${tournamentId}/matches`).get();
        const playerWins = {};

        tournamentData.playerIds.forEach(id => {
            playerWins[id] = 0;
        });

        matchesSnapshot.forEach(matchDoc => {
            const matchData = matchDoc.data();
            if (matchData.winnerId && playerWins.hasOwnProperty(matchData.winnerId)) {
                playerWins[matchData.winnerId]++;
            }
        });

        const sortedPlayers = Object.entries(playerWins).sort(([, winsA], [, winsB]) => winsB - winsA);

        const batch = db.batch();
        
        const totalCollected = tournamentData.entryFee * tournamentData.filledSlots;
        const commission = totalCollected - tournamentData.prizePool;

        if (commission > 0) {
            const commissionTransactionRef = db.collection('transactions').doc();
            batch.set(commissionTransactionRef, {
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
        for (const [playerId, wins] of sortedPlayers) {
            const prizeAmount = prizeDistribution[String(rank)];
            if (prizeAmount > 0) {
                const transactionRef = db.collection('transactions').doc();
                batch.set(transactionRef, {
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
        
        batch.update(tournamentRef, { prizeDistributed: true });
        await batch.commit();

        return { success: true, message: 'Winnings distributed successfully.' };

    } catch (error) {
        console.error('Error distributing tournament winnings:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred.', error);
    }
});

exports.onMatchComplete = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if the match has just been completed
    if (after.status === 'completed' && before.status !== 'completed') {
      const { playerIds, winnerId } = after;

      const tasksSnap = await db.collection('tasks').where('enabled', '==', true).get();
      if (tasksSnap.empty) return;

      const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      for (const playerId of playerIds) {
        for (const task of tasks) {
          const progressRef = db.doc(`user_tasks/${playerId}/tasks/${task.id}`);
          
          try {
            await db.runTransaction(async (transaction) => {
                const progressDoc = await transaction.get(progressRef);
                let progressData;
                if (!progressDoc.exists) {
                    progressData = { progress: 0, completed: false, claimed: false };
                } else {
                    progressData = progressDoc.data();
                }

                if (progressData.completed) return;

                let progressMade = false;
                if (task.type === 'PLAY_COUNT') {
                    progressData.progress += 1;
                    progressMade = true;
                }
                if (task.type === 'WIN_BASED' && playerId === winnerId) {
                    progressData.progress += 1;
                    progressMade = true;
                }

                if(progressMade) {
                    if(progressData.progress >= task.target) {
                        progressData.completed = true;
                        sendNotification(playerId, 'Mission Complete!', `You have completed the mission: "${task.title}". Go to the Missions page to claim your reward!`, '/tasks');
                    }
                    transaction.set(progressRef, progressData, { merge: true });
                }
            });
          } catch (e) {
              console.error(`Error updating task progress for user ${playerId}, task ${task.id}:`, e);
          }
        }
      }
    }
  });


exports.claimTaskReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const { taskId } = data;
    if (!taskId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "taskId" argument.');
    }

    const userId = context.auth.uid;
    const taskProgressRef = db.doc(`user_tasks/${userId}/tasks/${taskId}`);
    const taskRef = db.doc(`tasks/${taskId}`);

    try {
        return await db.runTransaction(async (transaction) => {
            const progressDoc = await transaction.get(taskProgressRef);
            const taskDoc = await transaction.get(taskRef);

            if (!progressDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'Task progress not found. Play some games to start!');
            }
            if (!taskDoc.exists()) {
                throw new functions.https.HttpsError('not-found', 'Task definition not found.');
            }
            
            const progressData = progressDoc.data();
            const taskData = taskDoc.data();

            if (!progressData.completed) {
                throw new functions.https.HttpsError('failed-precondition', 'Task is not yet complete.');
            }
            if (progressData.claimed) {
                throw new functions.https.HttpsError('failed-precondition', 'Reward has already been claimed.');
            }

            // Create a transaction to award the user
            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId: userId,
                type: 'task-reward',
                amount: taskData.reward,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                description: `Reward for completing task: ${taskData.title}`,
            });

            // Mark the task as claimed
            transaction.update(taskProgressRef, { claimed: true });
            
            return { success: true, message: `₹${taskData.reward} has been added to your wallet!`};
        });
    } catch (error) {
         console.error('Error claiming task reward:', error);
         if (error instanceof HttpsError) throw error;
         throw new functions.https.HttpsError('internal', 'An unexpected error occurred.');
    }
});
