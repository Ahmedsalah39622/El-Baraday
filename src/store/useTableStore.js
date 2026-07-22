"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTableStore = create(
  persist(
    (set, get) => ({
      tables: [],
      loading: false,

      // Fetch tables from DB
      fetchTables: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/tables');
          if (res.ok) {
            const rows = await res.json();
            set({
              tables: rows.map(t => ({
                id: t.id,
                number: parseInt(t.number.replace('T-', '')) || t.number,
                status: t.status === 'available' ? 'empty' : t.status,
                orderId: t.current_order_id,
                seats: t.seats,
                amount: 0,
                startTime: null,
              })),
              loading: false,
            });
          }
        } catch (err) {
          console.warn('⚠️ Using cached tables:', err.message);
          set({ loading: false });
        }
      },

      initializeTables: (count) => set(() => {
        const initialTables = Array.from({ length: count }, (_, i) => ({
          id: (i + 1).toString(),
          number: i + 1,
          status: 'empty',
          orderId: null,
          amount: 0,
          startTime: null,
        }));
        return { tables: initialTables };
      }),

      openTable: async (number, orderId) => {
        set((state) => ({
          tables: state.tables.map(t =>
            t.number === number ? { ...t, status: 'occupied', orderId, startTime: new Date().toISOString() } : t
          ),
        }));
        const table = get().tables.find(t => t.number === number);
        if (table) {
          try {
            await fetch(`/api/tables/${table.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'occupied', current_order_id: orderId }),
            });
          } catch (err) { /* local fallback */ }
        }
      },

      closeTable: async (number) => {
        const table = get().tables.find(t => t.number === number);
        set((state) => ({
          tables: state.tables.map(t =>
            t.number === number ? { ...t, status: 'empty', orderId: null, amount: 0, startTime: null } : t
          ),
        }));
        if (table) {
          try {
            await fetch(`/api/tables/${table.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'available', current_order_id: null }),
            });
          } catch (err) { /* local fallback */ }
        }
      },

      reserveTable: async (number) => {
        const table = get().tables.find(t => t.number === number);
        set((state) => ({
          tables: state.tables.map(t =>
            t.number === number ? { ...t, status: 'reserved' } : t
          ),
        }));
        if (table) {
          try {
            await fetch(`/api/tables/${table.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'reserved' }),
            });
          } catch (err) { /* local fallback */ }
        }
      },

      getTableByNumber: (number) => get().tables.find(t => t.number === number),
      getOccupiedTables: () => get().tables.filter(t => t.status === 'occupied'),
      updateTableAmount: (number, amount) => set((state) => ({
        tables: state.tables.map(t => t.number === number ? { ...t, amount } : t),
      })),
    }),
    {
      name: 'el-baraday-tables',
    }
  )
);
