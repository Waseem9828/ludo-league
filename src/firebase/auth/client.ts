'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDocs, query, where, collection, limit, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';


const generateReferralCode = (name: string) => {
    const namePart = name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePart}${randomPart}`;
};


export async function signUpWithEmail(email: string, password: string, displayName: string, referralCode?: string) {
  let referredBy = '';
  
  if (referralCode) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode.toUpperCase()), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        referredBy = querySnapshot.docs[0].id;
    } else {
        const error: any = new Error('Invalid referral code.');
        error.code = 'auth/invalid-referral-code';
        throw error;
    }
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  await updateProfile(user, { displayName });

  // Create user profile in Firestore
  const userProfileRef = doc(db, 'users', user.uid);
  await setDoc(userProfileRef, {
    uid: user.uid,
    email: user.email,
    displayName: displayName,
    photoURL: user.photoURL,
    walletBalance: 0,
    kycStatus: 'not_submitted',
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    referralCode: generateReferralCode(displayName),
    referredBy: referredBy || null,
    referralBonusPaid: false,
    isAdmin: false,
    rank: 0,
    maxUnlockedAmount: 100,
    winnings: 0,
    totalMatchesPlayed: 0,
    totalMatchesWon: 0,
    totalWithdrawals: 0,
    winRate: 0,
    dailyLoss: 0,
    lossStreak: 0,
    joinedTournamentIds: [],
    activeMatchIds: [],
  }, { merge: true });

  return user;
}


export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const userProfileRef = doc(db, 'users', user.uid);
  await setDoc(userProfileRef, { lastLogin: serverTimestamp() }, { merge: true });
  return userCredential;
}

export async function signInWithGoogle(referralCode?: string) {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userProfileRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userProfileRef);

    if (!userDoc.exists()) {
      let referredBy = '';
      if (referralCode) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('referralCode', '==', referralCode.toUpperCase()), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
              referredBy = querySnapshot.docs[0].id;
          } else {
              const error: any = new Error('Invalid referral code provided.');
              error.code = 'auth/invalid-referral-code';
              throw error;
          }
      }
      // New user signing up with Google
      await setDoc(userProfileRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          walletBalance: 0,
          kycStatus: 'not_submitted',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          referralCode: generateReferralCode(user.displayName || 'user'),
          referredBy: referredBy || null,
          referralBonusPaid: false,
          isAdmin: false,
          rank: 0,
          maxUnlockedAmount: 100,
          winnings: 0,
          totalMatchesPlayed: 0,
          totalMatchesWon: 0,
          totalWithdrawals: 0,
          winRate: 0,
          dailyLoss: 0,
          lossStreak: 0,
          joinedTournamentIds: [],
          activeMatchIds: [],
      }, { merge: true });
    } else {
      // Existing user, just update display name, photo, and last login
      await setDoc(userProfileRef, {
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp(),
      }, { merge: true });
    }


    return user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      // User closed the popup, do nothing
      return null;
    }
    // For other errors, re-throw them
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}


export async function signOut() {
  return firebaseSignOut(auth);
}
