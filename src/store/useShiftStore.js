"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useShiftStore = create(
  persist(
    (set, get) => ({
      activeShift: {
        id: 'shift_1',
        cashierName: 'administrator',
        startTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        startAmount: 500,
        status: 'active',
      },

      fetchShifts: async () => {
        try {
          const res = await fetch('/api/shifts');
          if (res.ok) {
            const rows = await res.json();
            if (rows.length > 0) {
              const active = rows.find(r => r.status === 'active') || rows[0];
              set({
                activeShift: {
                  id: active.id,
                  cashierName: active.cashier_name || 'administrator',
                  startTime: active.start_time || new Date().toLocaleTimeString('ar-EG'),
                  startAmount: parseFloat(active.start_amount || 500),
                  status: active.status || 'active'
                }
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ Using local shift:', err.message);
        }
      },

      closeShift: async (endAmount, totalSales, totalOrders) => {
        const current = get().activeShift;
        const closed = {
          ...current,
          endAmount,
          totalSales,
          totalOrders,
          status: 'closed',
          endTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        };
        set({ activeShift: null });

        try {
          await fetch(`/api/shifts/${current.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              end_time: new Date().toISOString(),
              end_amount: endAmount,
              cash_sales: totalSales,
              total_orders: totalOrders,
              status: 'closed'
            })
          });
        } catch (e) {}
      }
    }),
    {
      name: 'el-baraday-shift-v1',
    }
  )
);
