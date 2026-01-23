

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
    
    await admin.auth().setCustomUserClaims(uid, { role: isNowAdmin ? role : null, admin: isNowAdmin ? true : null });
    await db.collection('users').set({ isAdmin: isNowAdmin, role: isNowAdmin ? role : null }, { merge: true });


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

export const getAdminUserStats = functions.https.onCall(async (data, context) => {
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

export const onTransactionCreate = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    const { userId, type, amount, status } = transaction;

    if (status !== 'completed') {
        return null;
    }
    
    if (userId === 'platform') {
        return null;
    }
    
    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User ${userId} not found`);
            }
            const userData = userDoc.data()!;
            const updateData: {[key: string]: any} = {};

            const balanceAffectingTypes = ['deposit', 'withdrawal', 'entry-fee', 'winnings', 'refund', 'admin-credit', 'admin-debit', 'referral-bonus', 'tournament-fee', 'daily_bonus', 'withdrawal_refund', 'task-reward'];
            if (balanceAffectingTypes.includes(type)) {
                const currentBalance = userData.walletBalance || 0;
                const newBalance = currentBalance + amount;

                if (newBalance < 0) {
                    throw new Error(`Insufficient balance for user ${userId}.`);
                }
                updateData.walletBalance = newBalance;
            }

            if (type === 'withdrawal') {
                const currentTotalWithdrawals = userData.totalWithdrawals || 0;
                updateData.totalWithdrawals = currentTotalWithdrawals - amount;
            }

            if (Object.keys(updateData).length > 0) {
                 t.update(userRef, updateData);
            }
        });

        return null;

    } catch (error) {
        console.error('Error handling transaction:', error);
        if (error instanceof Error) {
            return snap.ref.update({ status: 'failed', error: error.message });
        }
        return snap.ref.update({ status: 'failed', error: 'Unknown error' });
    }
  });

export const onDepositRequestUpdate = functions.firestore
.document('depositRequests/{depositId}') 
.onUpdate(async (change, context) => {
  try {
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

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists()) {
        return null;
        }
        const userData = userDoc.data()!;
        const referredBy = userData.referredBy;

        if (referredBy && !userData.referralBonusPaid) {
        try {
            await db.runTransaction(async (transaction) => {
            const referrerRef = db.collection('users').doc(referredBy);
            const referrerDoc = await transaction.get(referrerRef);

            if (!referrerDoc.exists()) {
                return;
            }

            const configRef = db.collection('referralConfiguration').doc('settings');
            const configDoc = await transaction.get(configRef);
            const commissionPercentage = configDoc.exists() ? configDoc.data()!.commissionPercentage : 5; // Default 5%
            
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
  } catch (error) {
      console.error(`Error in onDepositRequestUpdate for deposit ${context.params.depositId}:`, error);
      await change.after.ref.set({ status: 'failed', error: 'An internal error occurred during processing.' }, { merge: true }).catch();
  }
  return null;
});

export const onWithdrawalRequestUpdate = functions.firestore
.document('withdrawalRequests/{withdrawalId}')
.onUpdate(async (change, context) => {
    try {
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
            const transactionRef = db.collection('transactions').doc();
            await transactionRef.set({
                userId: userId,
                type: 'withdrawal_refund',
                amount: amount, 
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
    } catch (error) {
        console.error(`Error in onWithdrawalRequestUpdate for withdrawal ${context.params.withdrawalId}:`, error);
        await change.after.ref.set({ status: 'failed', error: 'An internal error occurred during processing.' }, { merge: true }).catch();
    }
    return null;
});

export const onTournamentCreate = functions.firestore
  .document('tournaments/{tournamentId}')
  .onCreate(async (snap, context) => {
    const tournament = snap.data();
    
    const usersSnapshot = await db.collection('users').get();
    const tokens: string[] = [];
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

export const onResultSubmit = functions.firestore
  .document('matches/{matchId}/results/{userId}')
  .onCreate(async (snap, context) => {
    const { matchId, userId } = context.params;
    const matchRef = db.collection('matches').doc(matchId);
    let shouldNotify = false;
    let otherPlayerIds: string[] = [];
    let submitterName = 'Opponent';
    
    try {
      await db.runTransaction(async (transaction) => {
        const freshMatchDoc = await transaction.get(matchRef);
        if (!freshMatchDoc.exists) {
          console.log(`Match ${matchId} not found, exiting.`);
          return;
        }
        const freshMatchData = freshMatchDoc.data()!;

        otherPlayerIds = freshMatchData.playerIds.filter((pId: string) => pId !== userId);
        submitterName = freshMatchData.players[userId]?.name || 'Opponent';
        shouldNotify = true;
        
        if (['completed', 'disputed', 'cancelled'].includes(freshMatchData.status)) {
          console.log(`Match ${matchId} is already concluded with status: ${freshMatchData.status}. No action taken.`);
          shouldNotify = false;
          return; 
        }
        
        const expectedResults = freshMatchData.playerIds.length;
        const resultsCollectionRef = matchRef.collection('results');
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

        if (winClaims.length === 1 && lossClaims.length === 1 && screenshotUrls.length === expectedResults && uniqueUrls.size === screenshotUrls.length) {
            const winnerId = winClaims[0].userId;
            console.log(`Match ${matchId} completed automatically. Winner: ${winnerId}`);
            transaction.update(matchRef, { status: 'completed', winnerId: winnerId, reviewReason: 'Automatically resolved.' });
            shouldNotify = false;
            return;
        }

        if (winClaims.length > 1) {
          console.log(`Dispute for match ${matchId}: Multiple win claims.`);
          transaction.update(matchRef, { status: 'disputed', reviewReason: 'Multiple players claimed victory.' });
          return;
        }

        if (screenshotUrls.length > uniqueUrls.size) {
           console.log(`Dispute for match ${matchId}: Duplicate screenshots detected.`);
           transaction.update(matchRef, { status: 'disputed', reviewReason: 'Duplicate screenshots submitted.' });
           return;
        }
        
        console.log(`Dispute for match ${matchId}: Unclear results.`);
        transaction.update(matchRef, { status: 'disputed', reviewReason: 'Conflicting or unclear results submitted.' });
      });

      if (shouldNotify) {
        for(const pId of otherPlayerIds) {
            await sendNotification(pId, "Result Submitted", `${submitterName} has submitted their match result.`, `/match/${matchId}`);
        }
      }
    } catch (error) {
      console.error(`Error in onResultSubmit transaction for match ${matchId}:`, error);
      await matchRef.update({ status: 'disputed', reviewReason: `System error during result processing.` }).catch(e => console.error("Failed to update match status to disputed on error:", e));
    }
     return null;
  });

export const declareWinnerAndDistribute = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
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
        const commissionConfigSnap = await db.collection('matchCommission').doc('settings').get();
        const commissionPercentage = commissionConfigSnap.exists() && commissionConfigSnap.data()!.percentage ? commissionConfigSnap.data()!.percentage : 10;
        
        let winningPlayerName = 'Unknown Player';
        let prizePoolAmount = 0;
        let playerIds: string[] = [];

        await db.runTransaction(async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists) {
                throw new HttpsError('not-found', 'Match not found.');
            }
            const matchData = matchDoc.data()!;
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
            const commission = (matchData.entryFee * matchData.playerIds.length) * (commissionPercentage / 100);

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
                description: `${commissionPercentage}% commission from match ${matchId}`,
            });

            for (const playerId of matchData.playerIds) {
                const userRef = db.collection('users').doc(playerId);
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                    const userData = userDoc.data()!;
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
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        throw new HttpsError('internal', `An unexpected error occurred during prize distribution: ${errorMessage}`);
    }
});

export const newDailyLoginBonus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to claim a bonus.');
    }

    const userId = context.auth.uid;
    const userRef = db.collection('users').doc(userId);
    const configRef = db.collection('bonus_config').doc('settings');

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

            const updateData: {[key: string]: any} = {
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

export const distributeTournamentWinnings = functions.https.onCall(async (data, context) => {
    if (context.auth?.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Only admins can perform this action.');
    }

    const { tournamentId, prizeDistribution } = data;
    if (!tournamentId || !prizeDistribution) {
        throw new HttpsError('invalid-argument', 'Missing tournamentId or prizeDistribution.');
    }

    const tournamentRef = db.collection('tournaments').doc(tournamentId);

    try {
        const tournamentDoc = await tournamentRef.get();
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
        
        if (!Array.isArray(tournamentData.winners)) {
            throw new HttpsError(
                'failed-precondition',
                'Tournament winners list is missing or invalid.'
            );
        }

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
        
        for (const rankStr in prizeDistribution) {
            const rank = parseInt(rankStr, 10);
            const winnerId = tournamentData.winners[rank - 1]; 
            const amount = Number(prizeDistribution[rankStr]);

            if (!amount || amount <= 0) continue;

            if (winnerId) {
                const userRef = db.collection('users').doc(winnerId);
                const transactionRef = db.collection('transactions').doc();
                batch.set(userRef, { walletBalance: admin.firestore.FieldValue.increment(amount) }, { merge: true });
                batch.set(transactionRef, {
                    userId: winnerId,
                    type: 'winnings',
                    amount: amount,
                    status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    relatedTournamentId: tournamentId,
                    description: `Rank ${rank} prize in ${tournamentData.name}.`,
                });
            }
        }
        
        batch.update(tournamentRef, { prizeDistributed: true });
        await batch.commit();

        return { success: true, message: 'Winnings distributed successfully.' };

    } catch (error) {
        console.error('Error distributing tournament winnings:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred.', error as any);
    }
});

export const onMatchComplete = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    try {
        const before = change.before.data();
        const after = change.after.data();

        if (after.status === 'completed' && before.status !== 'completed') {
            const { playerIds, winnerId } = after;

            const tasksSnap = await db.collection('tasks').where('enabled', '==', true).get();
            if (tasksSnap.empty) return;

            const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            for (const playerId of playerIds) {
                for (const task of tasks) {
                    const progressRef = db.collection('user_tasks').doc(playerId).collection('tasks').doc(task.id);
                    
                    try {
                        await db.runTransaction(async (transaction) => {
                            const progressDoc = await transaction.get(progressRef);
                            let progressData;
                            if (!progressDoc.exists()) {
                                progressData = { progress: 0, completed: false, claimed: false };
                            } else {
                                progressData = progressDoc.data()!;
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
    } catch (error) {
        console.error(`Error in onMatchComplete for match ${context.params.matchId}:`, error);
    }
  });

export const claimTaskReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }
    const { taskId } = data;
    if (!taskId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "taskId" argument.');
    }

    const userId = context.auth.uid;
    const taskProgressRef = db.collection('user_tasks').doc(userId).collection('tasks').doc(taskId);
    const taskRef = db.collection('tasks').doc(taskId);

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
            
            const progressData = progressDoc.data()!;
            const taskData = taskDoc.data()!;

            if (!progressData.completed) {
                throw new functions.https.HttpsError('failed-precondition', 'Task is not yet complete.');
            }
            if (progressData.claimed) {
                throw new functions.https.HttpsError('failed-precondition', 'Reward has already been claimed.');
            }

            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId: userId,
                type: 'task-reward',
                amount: taskData.reward,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                description: `Reward for completing task: ${taskData.title}`,
            });

            transaction.update(taskProgressRef, { claimed: true });
            
            return { success: true, message: `₹${taskData.reward} has been added to your wallet!`};
        });
    } catch (error) {
         console.error('Error claiming task reward:', error);
         if (error instanceof HttpsError) throw error;
         throw new functions.https.HttpsError('internal', 'An unexpected error occurred.');
    }
});

export const createMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be authenticated to create a match.");
    }

    const { entryFee } = data;
    const userId = context.auth.uid;

    if (!Number.isInteger(entryFee) || entryFee < 50) {
        throw new functions.https.HttpsError("invalid-argument", "A valid entry fee of at least 50 is required.");
    }

    const userRef = db.collection('users').doc(userId);
    const commissionConfigRef = db.collection('matchCommission').doc('settings');
    
    try {
        // Read commission settings BEFORE the transaction
        const commissionConfigSnap = await commissionConfigRef.get();
        const commissionPercentage = commissionConfigSnap.exists() && commissionConfigSnap.data()!.percentage ? commissionConfigSnap.data()!.percentage : 10;
        const prizePool = entryFee * 2 * (1 - (commissionPercentage / 100));

        let newMatchRefId: string | undefined;
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new functions.https.HttpsError("not-found", "User profile not found.");
            }

            const userData = userDoc.data()!;
            if (userData.isBlocked) {
                throw new functions.https.HttpsError("permission-denied", "Your account is blocked.");
            }
            if ((userData.activeMatchIds || []).length >= 5) {
                throw new functions.https.HttpsError("resource-exhausted", "You have reached the maximum of 5 active matches.");
            }
            if ((userData.walletBalance || 0) < entryFee) {
                throw new functions.https.HttpsError("failed-precondition", "Insufficient balance.");
            }
            
            const newPlayer = {
                id: userId,
                name: userData.displayName || "Player",
                avatarUrl: userData.photoURL || "",
                winRate: userData.winRate || 0,
            };

            const matchRef = db.collection('matches').doc();
            newMatchRefId = matchRef.id;

            transaction.set(matchRef, {
                id: newMatchRefId,
                creatorId: userId,
                status: 'waiting',
                entryFee: entryFee,
                prizePool: prizePool,
                maxPlayers: 2,
                playerIds: [userId],
                players: { [userId]: newPlayer },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId: userId,
                type: 'entry-fee',
                amount: -entryFee,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                relatedMatchId: newMatchRefId,
                description: `Entry fee for match ${newMatchRefId}`
            });

            transaction.update(userRef, {
                activeMatchIds: admin.firestore.FieldValue.arrayUnion(newMatchRefId)
            });
        });

        return { success: true, matchId: newMatchRefId };
        
    } catch(error) {
        console.error("Error creating match:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred while creating the match.");
    }
});
