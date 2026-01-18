
import { Timestamp } from "firebase/firestore";

export enum MatchStatus {
    PENDING = 'pending',
    WAITING = 'waiting',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    DISPUTED = 'disputed',
    CANCELLED = 'cancelled',
}

export type UserProfile = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isAdmin?: boolean;
    walletBalance: number;
    kycStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
    kycRejectionReason?: string;
    upiId?: string;
    bankDetails?: string;
    isBlocked?: boolean;
    referralCode?: string;
    referredBy?: string;
    referralBonusPaid?: boolean;
    fcmToken?: string;
    activeMatchIds?: string[];
    // Rank and progression
    rank: number; // 0 for Beginner, 1 for Learner, etc.
    winnings: number; // Cumulative net winnings
    maxUnlockedAmount: number; // The highest entry fee this user can join
    totalMatchesPlayed: number;
    totalMatchesWon: number;
    totalWithdrawals: number;
    winRate: number;
    // Loss prevention
    dailyLoss: number;
    lossStreak: number;
    joinedTournamentIds?: string[];
    lastLoginBonus?: Timestamp;
    loginStreak?: number;
    lastLoginDate?: string;
    createdAt?: Timestamp;
    lastLogin?: Timestamp;
  };

  export type MatchPlayer = {
    id: string;
    name: string;
    avatarUrl: string;
    winRate?: number;
    isCreator?: boolean;
  };
  
  export type Match = {
    id: string;
    creatorId: string;
    players: { [key: string]: MatchPlayer };
    playerIds: string[];
    status: MatchStatus | string;
    entryFee: number;
    prizePool: number;
    maxPlayers: number;
    winnerId?: string | null;
    loserId?: string | null;
    roomCode?: string;
    prizeDistributed?: boolean;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    reviewReason?: string;
    betAmount?: number;
    createdBy?: string;
    round?: number;
    tournamentId?: string;
    resolvedBy?: string;
    resolvedAt?: Timestamp;
    game?: any;
  };
  
  export type Transaction = {
    id: string;
    userId: string;
    type: 'deposit' | 'withdrawal' | 'entry-fee' | 'winnings' | 'refund' | 'admin-credit' | 'admin-debit' | 'referral-bonus' | 'tournament-fee' | 'daily_bonus' | 'match_commission' | 'tournament_commission' | 'withdrawal_refund';
    amount: number;
    status: 'pending' | 'completed' | 'rejected' | 'approved' | 'failed';
    createdAt: Timestamp;
    description?: string;
    utr?: string;
    screenshotUrl?: string;
    relatedMatchId?: string;
    relatedTournamentId?: string;
  };

  export type Wallet = {
    balance: number;
    lastTransaction?: string;
    updatedAt: Timestamp;
  };

  export type DepositRequest = {
    id: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
    amount: number;
    utr: string;
    screenshotUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
    reviewedAt?: Timestamp;
    reviewedBy?: string; // Admin UID
    rejectionReason?: string;
    processedWithUpiId?: string;
  }

  export type WithdrawalRequest = {
    id: string;
    userId: string;
    userName?: string;
    userAvatar?: string;
    amount: number;
    upiId: string;
    bankDetails?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
    processedAt?: Timestamp;
    rejectionReason?: string;
    processedBy?: string; // Admin UID
  }
  
  export type Tournament = {
    id: string;
    name: string;
    bannerImageUrl: string;
    entryFee: number;
    totalSlots: number;
    filledSlots: number;
    prizePool: number;
    startTime: Timestamp;
    endTime: Timestamp;
    status: 'upcoming' | 'live' | 'completed' | 'cancelled' | 'paused';
    commissionType: 'percentage' | 'fixed';
    commissionValue: number;
    rules: string;
    playerIds: string[];
    createdBy: string;
    prizeDistributed?: boolean;
    bracket?: any[];
    winners?: string[];
  };
  
  export type UpiConfiguration = {
      id: string;
      upiId: string;
      isActive: boolean;
      paymentLimit: number;
      currentReceived: number;
  };
  
  export type ActiveUpi = {
      activeUpiId: string;
      activeUpiRef: string;
      updatedAt: Timestamp;
  };

  export type News = {
      id: string;
      title: string;
      content: string;
      authorId: string;
      authorName: string;
      createdAt: Timestamp;
  }
  
  export const getTournamentStatus = (tournament: Tournament): Tournament['status'] => {
    // If the status is already settled, don't recalculate.
    if (tournament.status === 'completed' || tournament.status === 'cancelled' || tournament.status === 'paused') {
        return tournament.status;
    }
    
    // Guard against incomplete tournament data
    if (!tournament || !tournament.startTime || !tournament.endTime) {
        return tournament?.status || 'upcoming'; // Return existing status or a safe default
    }

    const now = new Date();
    const startTime = tournament.startTime.toDate();
    const endTime = tournament.endTime.toDate();

    if (now < startTime) {
        return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
        return 'live';
    } else {
        return 'completed';
    }
};

export interface KycApplication {
    id: string;
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: Timestamp;
    reviewedAt?: Timestamp;
    rejectionReason?: string;
    aadhaarUrl?: string;
    panUrl?: string;
    selfieUrl: string;
    bankDetails?: string;
    upiId?: string;
    userName?: string;
    userAvatar?: string;
    fullName?: string;
    dateOfBirth?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    reviewedBy?: string;
  }
  
  export interface MatchResult {
      id: string;
      userId: string;
      position: number;
      status: 'win' | 'loss';
      screenshotUrl: string;
      submittedAt: Timestamp;
      isFlaggedForFraud?: boolean;
  }

  export interface ImagePlaceholder {
    id: string;
    description: string;
    imageUrl: string;
    imageHint: string;
  }

  export type ActivityLog = {
    id: string;
    action: string;
    details: Record<string, any>;
    timestamp: Timestamp;
    actor: { id: string; name: string };
  };

  export type Banner = {
    id: string;
    name: string;
    imageUrl: string;
    targetPage: string;
    isActive: boolean;
    createdAt: Timestamp;
  };

  export type Announcement = {
    id: string;
    text: string;
    isActive: boolean;
    createdAt: Timestamp;
  };
