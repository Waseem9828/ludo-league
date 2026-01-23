
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

export const claimTaskReward = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to claim a reward.');
  }

  const { taskId } = data;
  if (!taskId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "taskId".');
  }

  const userId = context.auth.uid;
  const taskRef = db.collection('tasks').doc(taskId);
  const userTaskRef = db.collection('user_tasks').doc(userId).collection('tasks').doc(taskId);
  const userRef = db.collection('users').doc(userId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const taskDoc = await transaction.get(taskRef);
      if (!taskDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'The specified task does not exist.');
      }
      const taskData = taskDoc.data()!;

      const userTaskDoc = await transaction.get(userTaskRef);
      if (!userTaskDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'You have not started this task yet.');
      }
      const userTaskData = userTaskDoc.data()!;

      if (userTaskData.claimed) {
        return { success: false, message: 'You have already claimed the reward for this task.' };
      }

      if (userTaskData.progress < taskData.target) {
        throw new functions.https.HttpsError('failed-precondition', 'You have not completed the task requirements yet.');
      }

      // All checks passed, let's give the reward
      transaction.update(userTaskRef, { claimed: true });
      transaction.update(userRef, { walletBalance: admin.firestore.FieldValue.increment(taskData.reward) });

      const transactionRef = db.collection('transactions').doc();
      transaction.set(transactionRef, {
        userId: userId,
        amount: taskData.reward,
        type: 'task_reward',
        status: 'completed',
        description: `Reward for completing task: ${taskData.title}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: `₹${taskData.reward} has been added to your wallet.` };
    });

    return result;
  } catch (error) {
    console.error('Error claiming task reward:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred while claiming the reward.');
  }
});


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

            batch.update(userRef, { walletBalance: admin.firestore.FieldValue.increment(amount) }, { merge: true });

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


export const newDailyLoginBonus = functions.https.onCall(async (data: any, context: functions.https..CallableContext) => {
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

export const processMatchResult = functions.firestore
    .document('matches/{matchId}/results/{userId}')
    .onCreate(async (snap, context) => {
        const { matchId } = context.params;
        const matchRef = db.collection('matches').doc(matchId);

        try {
            await db.runTransaction(async (transaction) => {
                const matchDoc = await transaction.get(matchRef);
                if (!matchDoc.exists) {
                    console.error(`Match ${matchId} not found.`);
                    return;
                }
                const matchData = matchDoc.data()!;

                // Prevent processing if a winner is already decided
                if (matchData.winnerId) {
                    return;
                }

                const resultsCollectionRef = matchRef.collection('results');
                const resultsSnapshot = await transaction.get(resultsCollectionRef);

                if (resultsSnapshot.size < 2) {
                    // Wait for the other player to submit their result
                    return;
                }

                const results = resultsSnapshot.docs.map(doc => doc.data());
                const player1Result = results[0];
                const player2Result = results[1];

                let winnerId: string | null = null;
                let loserId: string | null = null;
                let status = 'completed';

                if (player1Result.status === 'win' && player2Result.status === 'loss') {
                    winnerId = player1Result.userId;
                    loserId = player2Result.userId;
                } else if (player1Result.status === 'loss' && player2Result.status === 'win') {
                    winnerId = player2Result.userId;
                    loserId = player1Result.userId;
                } else {
                    // Disputed match (both won, both lost, or other scenarios)
                    status = 'disputed';
                }

                const matchUpdateData: any = {
                    status: status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (winnerId) {
                    matchUpdateData.winnerId = winnerId;
                    matchUpdateData.loserId = loserId;
                }

                transaction.update(matchRef, matchUpdateData);
            });
        } catch (error) {
            console.error(`Error processing match result for match ${matchId}:`, error);
        }
    });
