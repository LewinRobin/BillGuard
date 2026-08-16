import { create } from 'zustand';
import type { Bill } from '../types/bill.types';

interface BillState {
  bills: Bill[];
  activeBill: Bill | null;
  setBills: (bills: Bill[]) => void;
  setActiveBill: (bill: Bill | null) => void;
  updateBill: (bill: Bill) => void;
  removeBill: (id: string) => void;
}

export const useBillStore = create<BillState>((set) => ({
  bills: [],
  activeBill: null,

  setBills: (bills) => set({ bills }),

  setActiveBill: (bill) => set({ activeBill: bill }),

  updateBill: (updated) =>
    set((state) => ({
      bills: state.bills.map((b) => (b.id === updated.id ? updated : b)),
      activeBill: state.activeBill?.id === updated.id ? updated : state.activeBill,
    })),

  removeBill: (id) =>
    set((state) => ({
      bills: state.bills.filter((b) => b.id !== id),
      activeBill: state.activeBill?.id === id ? null : state.activeBill,
    })),
}));
