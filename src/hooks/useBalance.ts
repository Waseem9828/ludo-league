
import { create } from 'zustand';

interface BalanceState {
  balance: number;
  setBalance: (balance: number) => void;
  increaseBalance: (amount: number) => void;
  decreaseBalance: (amount: number) => void;
}

export const useBalance = create<BalanceState>((set) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
  increaseBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
  decreaseBalance: (amount) => set((state) => ({ balance: state.balance - amount })),
}));
