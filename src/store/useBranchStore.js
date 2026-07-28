"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBranchStore = create(
  persist(
    (set, get) => ({
      branches: [],
      selectedBranchId: 'all',

      setBranches: (branches) => set({ branches }),
      
      setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),

      fetchBranches: async () => {
        try {
          const res = await fetch('/api/branches');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              set({ branches: data });
            }
          }
        } catch (err) {
          console.error('Failed to fetch branches:', err);
        }
      },

      addBranch: async (branchData) => {
        try {
          const res = await fetch('/api/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branchData),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error('addBranch API error:', data);
            throw new Error(data?.error || 'فشل إضافة الفرع');
          }
          // Optimistically add to local state, then refresh
          if (data && data.id) {
            set((state) => ({ branches: [...state.branches, data] }));
          }
          await get().fetchBranches();
          return data;
        } catch (e) {
          console.error('addBranch error:', e);
          throw e;
        }
      },

      updateBranch: async (id, branchData) => {
        try {
          const res = await fetch('/api/branches', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...branchData }),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error('updateBranch API error:', data);
            throw new Error(data?.error || 'فشل تحديث الفرع');
          }
          await get().fetchBranches();
          return data;
        } catch (e) {
          console.error('updateBranch error:', e);
          throw e;
        }
      },

      getActiveBranchName: () => {
        const { branches, selectedBranchId } = get();
        if (selectedBranchId === 'all') return 'جميع الفروع';
        const found = branches.find(b => b.id === selectedBranchId);
        return found ? found.name : 'الفرع الرئيسي';
      }
    }),
    {
      name: 'el-baraday-branch-v3', // bumped version to clear old cached data
      onRehydrateStorage: () => (state) => {
        // After loading from localStorage, always refresh from DB
        if (state) {
          state.fetchBranches();
        }
      },
    }
  )
);
