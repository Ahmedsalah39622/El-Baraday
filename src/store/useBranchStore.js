"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBranchStore = create(
  persist(
    (set, get) => ({
      branches: [
        { id: 'b1', name: 'الفرع الأول - الرئيسي', phone: '01000000001', address: 'المركز الرئيسي' },
        { id: 'b2', name: 'الفرع الثاني', phone: '01000000002', address: 'الفرع الثاني' }
      ],
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
            body: JSON.stringify(branchData)
          });
          if (res.ok) {
            get().fetchBranches();
          }
        } catch (e) {}
      },

      updateBranch: async (id, branchData) => {
        try {
          const res = await fetch('/api/branches', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...branchData })
          });
          if (res.ok) {
            get().fetchBranches();
          }
        } catch (e) {}
      },

      getActiveBranchName: () => {
        const { branches, selectedBranchId } = get();
        if (selectedBranchId === 'all') return 'جميع الفروع';
        const found = branches.find(b => b.id === selectedBranchId);
        return found ? found.name : 'الفرع الرئيسي';
      }
    }),
    {
      name: 'el-baraday-branch-v2',
    }
  )
);
