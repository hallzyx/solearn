/**
 * Global refresh store.
 * Any component can call triggerRefresh() after an on-chain tx
 * to force the WalletButton header to refresh balances.
 */
import { create } from "zustand";

interface RefreshState {
  counter: number;
  triggerBalanceRefresh: () => void;
  triggerResultRefresh: () => void;
  resultCounter: number;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  counter: 0,
  triggerBalanceRefresh: () => set((s) => ({ counter: s.counter + 1 })),
  resultCounter: 0,
  triggerResultRefresh: () => set((s) => ({ resultCounter: s.resultCounter + 1 })),
}));
