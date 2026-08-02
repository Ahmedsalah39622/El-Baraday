"use client";

import { create } from 'zustand';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';

function formatShiftTime(isoOrDateStr) {
  if (!isoOrDateStr) return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoOrDateStr;
  }
}

export const useShiftStore = create(
  (set, get) => ({
    shifts: [],
    activeShift: null,

    fetchShifts: async (branchId = 'all') => {
      try {
        const url = branchId && branchId !== 'all' ? `/api/shifts?branch_id=${branchId}` : '/api/shifts';
        const res = await fetch(url);
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.error) {
            console.warn('⚠️ Fetch shifts API error:', rows.error);
            return; // Exit without clearing activeShift
          }
          if (Array.isArray(rows)) {
            set({ shifts: rows });
            const active = branchId && branchId !== 'all'
              ? rows.find((r) => r.status === 'active' && (r.branch_id === branchId || (!r.branch_id && branchId === 'b1')))
              : null;
            if (active) {
              const rawStart = active.start_time || active.created_at || new Date().toISOString();
              set({
                activeShift: {
                  id: active.id,
                  cashierName: active.cashier_name || 'administrator',
                  rawStartTime: rawStart,
                  startTime: formatShiftTime(rawStart),
                  startAmount: parseFloat(active.start_amount || 0),
                  status: 'active',
                  branch_id: active.branch_id || 'b1'
                },
              });
              return;
            }
          }
          // No active shift found in DB → always clear local state
          set({ activeShift: null, shifts: Array.isArray(rows) ? rows : [] });
        }
      } catch (err) {
        console.warn('⚠️ Fetch shifts network error:', err.message);
        // Do NOT clear activeShift on transient network/connection-limit errors!
      }
    },

    openShift: async (cashierName, startAmount, branchIdArg) => {
      const rawStartTime = new Date().toISOString();

      const user = useAuthStore.getState().user;
      const storeBranch = useBranchStore.getState().selectedBranchId;

      let targetBranch = 'b1';
      if (branchIdArg && branchIdArg !== 'all') {
        targetBranch = branchIdArg;
      } else if (user?.branch_id || user?.branchId) {
        targetBranch = user.branch_id || user.branchId;
      } else if (storeBranch && storeBranch !== 'all') {
        targetBranch = storeBranch;
      }

      try {
        const res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashier_name: cashierName || user?.name || 'administrator',
            start_amount: parseFloat(startAmount || 0),
            start_time: rawStartTime,
            branch_id: targetBranch
          }),
        });

        if (res.ok) {
          const created = await res.json();
          const serverRawStart = created.start_time || created.created_at || rawStartTime;
          const newShift = {
            id: created.id || `shift_${Date.now()}`,
            cashierName: created.cashier_name || cashierName || 'administrator',
            rawStartTime: serverRawStart,
            startTime: formatShiftTime(serverRawStart),
            startAmount: parseFloat(created.start_amount || startAmount || 0),
            status: 'active',
            branch_id: created.branch_id || targetBranch
          };
          set((state) => ({
            activeShift: newShift,
            shifts: [created, ...(state.shifts || []).filter(s => s.id !== created.id)]
          }));
        } else {
          // Server failed → set local shift as fallback
          const newShift = {
            id: `shift_${Date.now()}`,
            cashierName: cashierName || 'administrator',
            rawStartTime: rawStartTime,
            startTime: formatShiftTime(rawStartTime),
            startAmount: parseFloat(startAmount || 0),
            status: 'active',
            branch_id: targetBranch
          };
          set((state) => ({
            activeShift: newShift,
            shifts: [{ ...newShift, start_amount: startAmount, start_time: rawStartTime, cashier_name: cashierName }, ...(state.shifts || [])]
          }));
        }
        useInvoiceStore.getState().fetchNextOrderNumber(targetBranch);
      } catch (err) {
        console.warn('⚠️ Shift open network error, setting local fallback:', err.message);
        const newShift = {
          id: `shift_${Date.now()}`,
          cashierName: cashierName || 'administrator',
          rawStartTime: rawStartTime,
          startTime: formatShiftTime(rawStartTime),
          startAmount: parseFloat(startAmount || 0),
          status: 'active',
          branch_id: targetBranch
        };
        set((state) => ({
          activeShift: newShift,
          shifts: [{ ...newShift, start_amount: startAmount, start_time: rawStartTime, cashier_name: cashierName }, ...(state.shifts || [])]
        }));
        useInvoiceStore.getState().fetchNextOrderNumber(targetBranch);
      }
    },

    closeShift: async (endAmount, expectedAmount, totalSales, totalOrders, notes = '') => {
      const current = get().activeShift;
      const shiftId = current?.id;
      
      // Clear active shift from state immediately (no localStorage cache)
      set({ activeShift: null });
      useInvoiceStore.setState({ nextOrderNumber: 1 });

      if (shiftId) {
        try {
          await fetch(`/api/shifts/${shiftId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              end_time: new Date().toISOString(),
              end_amount: endAmount,
              expected_amount: expectedAmount,
              cash_sales: totalSales,
              total_orders: totalOrders,
              notes: notes,
              status: 'closed',
            }),
          });
        } catch (e) {
          console.warn('⚠️ Error closing shift on server:', e.message);
        }
      }
    },
  })
);
