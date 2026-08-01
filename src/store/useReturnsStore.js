import { create } from 'zustand';

export const useReturnsStore = create((set, get) => ({
  returns: [],
  loading: false,

  fetchReturns: async (branchId = 'all') => {
    set({ loading: true });
    try {
      const url = branchId && branchId !== 'all' 
        ? `/api/returns?branch_id=${encodeURIComponent(branchId)}`
        : '/api/returns';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ returns: data || [], loading: false });
        return data;
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
    } finally {
      set({ loading: false });
    }
    return [];
  },

  executeReturn: async (returnData) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData),
      });

      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          returns: [data.returnRecord, ...state.returns],
          loading: false,
        }));
        return { success: true, ...data };
      } else {
        const errData = await res.json();
        set({ loading: false });
        return { success: false, error: errData.error || 'فشل إتمام العملية' };
      }
    } catch (err) {
      set({ loading: false });
      return { success: false, error: err.message };
    }
  },
}));
