'use client';

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  type User,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc, getDocs, query, where, collection, limit, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';


const generateReferralCode = (name: string) => {
    const namePart = name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePart}${randomPart}`;
};

const createNewUserProfile = async (user: User, referralCode?: string) => {
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
    
    const userProfileRef = doc(db, 'users', user.uid);
    await setDoc(userProfileRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || `Player${user.uid.substring(0, 5)}`,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
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
}

export async function sendOtp(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) {
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

export async function verifyOtpAndSignIn(confirmationResult: ConfirmationResult, otp: string, referralCode?: string) {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;
    let isNewUser = false;

    const userProfileRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userProfileRef);

    if (!userDoc.exists()) {
      isNewUser = true;
      await createNewUserProfile(user, referralCode);
    } else {
      await setDoc(userProfileRef, { lastLogin: serverTimestamp() }, { merge: true });
    }

    return { user, isNewUser };
}


export async function signInWithGoogle(referralCode?: string): Promise<{ user: User; isNewUser: boolean; }> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    let isNewUser = false;

    const userProfileRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userProfileRef);

    if (!userDoc.exists()) {
      isNewUser = true;
      await createNewUserProfile(user, referralCode);
    } else {
      isNewUser = false;
      await setDoc(userProfileRef, {
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp(),
      }, { merge: true });
    }

    return { user, isNewUser };
    
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      return { user: null, isNewUser: false } as any;
    }
    throw error;
  }
}

export async function signOut() {
  return firebaseSignOut(auth);
}
