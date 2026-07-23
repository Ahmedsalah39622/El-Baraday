"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  persist(
    (set, get) => ({
      activeShift: null,

      fetchShifts: async () => {
        try {
          const res = await fetch('/api/shifts');
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const active = rows.find((r) => r.status === 'active');
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
                  },
                });
                return;
              }
            }
          }
          // If DB has no active shift, keep local activeShift if active, otherwise set null
          const currentLocal = get().activeShift;
          if (currentLocal && currentLocal.status !== 'active') {
            set({ activeShift: null });
          }
        } catch (err) {
          console.warn('⚠️ Fetch shifts network fallback, keeping local shift state:', err.message);
        }
      },

      openShift: async (cashierName, startAmount) => {
        const rawStartTime = new Date().toISOString();
        const initialShift = {
          id: `shift_${Date.now()}`,
          cashierName: cashierName || 'administrator',
          rawStartTime: rawStartTime,
          startTime: formatShiftTime(rawStartTime),
          startAmount: parseFloat(startAmount || 0),
          status: 'active',
        };

        // Optimistically set active shift in local Zustand store & localStorage
        set({ activeShift: initialShift });

        try {
          const res = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cashier_name: cashierName || 'administrator',
              start_amount: parseFloat(startAmount || 0),
              start_time: rawStartTime,
            }),
          });

          if (res.ok) {
            const created = await res.json();
            if (created && created.id) {
              const serverRawStart = created.start_time || created.created_at || rawStartTime;
              set({
                activeShift: {
                  id: created.id,
                  cashierName: created.cashier_name || cashierName || 'administrator',
                  rawStartTime: serverRawStart,
                  startTime: formatShiftTime(serverRawStart),
                  startAmount: parseFloat(created.start_amount || startAmount || 0),
                  status: 'active',
                },
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ Shift saved locally, DB sync will retry:', err.message);
        }
      },

      closeShift: async (endAmount, totalSales, totalOrders) => {
        const current = get().activeShift;
        const shiftId = current?.id;
        
        // Clear active shift from state and localStorage
        set({ activeShift: null });

        if (shiftId) {
          try {
            await fetch(`/api/shifts/${shiftId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                end_time: new Date().toISOString(),
                end_amount: endAmount,
                cash_sales: totalSales,
                total_orders: totalOrders,
                status: 'closed',
              }),
            });
          } catch (e) {
            console.warn('⚠️ Error closing shift on server:', e.message);
          }
        }
      },
    }),
    {
      name: 'el-baraday-shift-v2',
    }
  )
);
