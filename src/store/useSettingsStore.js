"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      companyName: 'مطعم البرادعى للحواوشي',
      companyAddress: '',
      companyPhone: '',
      companyLogo: null,
      taxRate: 0,
      minTableAmount: 0,
      currentShift: null,
      counterName: 'الكاونتر الرئيسي',
      loading: false,

      // Fetch settings from DB
      fetchSettings: async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            set({
              companyName: data.company_name || get().companyName,
              companyPhone: data.company_phone || get().companyPhone,
              companyAddress: data.company_address || get().companyAddress,
              taxRate: parseFloat(data.tax_rate) || 0,
              counterName: data.counter_name || get().counterName,
            });
          }
        } catch (err) {
          console.warn('⚠️ Using cached settings:', err.message);
        }
      },

      updateCompanyInfo: async (updates) => {
        set((state) => ({ ...state, ...updates }));
        try {
          const dbUpdates = {};
          if (updates.companyName) dbUpdates.company_name = updates.companyName;
          if (updates.companyPhone) dbUpdates.company_phone = updates.companyPhone;
          if (updates.companyAddress) dbUpdates.company_address = updates.companyAddress;
          if (updates.counterName) dbUpdates.counter_name = updates.counterName;
          if (updates.taxRate !== undefined) dbUpdates.tax_rate = String(updates.taxRate);
          if (Object.keys(dbUpdates).length > 0) {
            await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dbUpdates),
            });
          }
        } catch (err) {
          console.warn('⚠️ Settings saved locally:', err.message);
        }
      },

      startShift: async (cashierName, startAmount) => {
        const shift = {
          id: Date.now().toString(),
          startTime: new Date().toISOString(),
          cashierName,
          startAmount,
        };
        set({ currentShift: shift });

        try {
          const res = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cashier_name: cashierName, start_amount: startAmount }),
          });
          if (res.ok) {
            const created = await res.json();
            set({ currentShift: { ...shift, id: created.id } });
          }
        } catch (err) { /* local fallback */ }
      },

      endShift: async () => {
        const shift = get().currentShift;
        if (!shift) return null;

        const summary = { ...shift, endTime: new Date().toISOString() };
        set({ currentShift: null });

        try {
          await fetch(`/api/shifts/${shift.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ end_amount: 0, cash_sales: 0, total_orders: 0 }),
          });
        } catch (err) { /* local fallback */ }

        return summary;
      },

      setCounterName: (name) => set({ counterName: name }),
      setTaxRate: (rate) => set({ taxRate: rate }),
      setMinTableAmount: (amount) => set({ minTableAmount: amount }),
    }),
    {
      name: 'el-baraday-settings',
    }
  )
);
