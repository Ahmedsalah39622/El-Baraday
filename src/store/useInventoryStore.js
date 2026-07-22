"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultInventoryItems = [
  { id: 'inv1', name: 'لحم مفروم بلدي', unit: 'كيلو', currentStock: 45, minStock: 10, costPerUnit: 320, category: 'لحوم' },
  { id: 'inv2', name: 'صدور فراخ مفرومة', unit: 'كيلو', currentStock: 30, minStock: 8, costPerUnit: 210, category: 'دواجن' },
  { id: 'inv3', name: 'عيش بلدي طازج', unit: 'رغيف', currentStock: 450, minStock: 100, costPerUnit: 2.5, category: 'مخبوزات' },
  { id: 'inv4', name: 'جبنة موزاريلا طبيعي', unit: 'كيلو', currentStock: 25, minStock: 5, costPerUnit: 180, category: 'ألبان' },
  { id: 'inv5', name: 'سجق بلدي خلطة', unit: 'كيلو', currentStock: 20, minStock: 5, costPerUnit: 280, category: 'لحوم' },
  { id: 'inv6', name: 'بسطرمة نمرة 1', unit: 'كيلو', currentStock: 12, minStock: 3, costPerUnit: 420, category: 'مصنعات' },
  { id: 'inv7', name: 'زيت وقلي', unit: 'لتر', currentStock: 60, minStock: 15, costPerUnit: 75, category: 'زيوت' },
  { id: 'inv8', name: 'فحم شواء خشابي', unit: 'كيلو', currentStock: 100, minStock: 20, costPerUnit: 35, category: 'وقود' },
];

export const useInventoryStore = create(
  persist(
    (set, get) => ({
      items: defaultInventoryItems,
      loading: false,
      inventoryCounts: [],
      inventorySessions: [],

      fetchInventory: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/inventory');
          if (res.ok) {
            const rows = await res.json();
            if (rows.length > 0) {
              set({
                items: rows.map(r => ({
                  id: r.id,
                  name: r.name,
                  unit: r.unit,
                  currentStock: parseFloat(r.current_stock || 0),
                  minStock: parseFloat(r.min_stock || 0),
                  costPerUnit: parseFloat(r.cost_per_unit || 0),
                  category: r.category || 'عام'
                })),
                loading: false
              });
            } else {
              set({ loading: false });
            }
          }
        } catch (err) {
          console.warn('⚠️ Using cached inventory items:', err.message);
          set({ loading: false });
        }
      },

      updateStock: async (id, newQty) => {
        set((state) => ({
          items: state.items.map(item => item.id === id ? { ...item, currentStock: newQty } : item)
        }));
        try {
          await fetch(`/api/inventory/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_stock: newQty })
          });
        } catch (e) {}
      },

      addItem: async (itemData) => {
        const newId = `inv_${Date.now()}`;
        const newItem = { id: newId, ...itemData };
        set((state) => ({ items: [...state.items, newItem] }));
        try {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
          });
        } catch (e) {}
      },

      startInventorySession: (type, startDate, endDate) => set((state) => {
        const newSession = {
          id: Date.now().toString(),
          type,
          startDate,
          endDate,
          counts: [],
          status: 'in_progress',
          createdAt: new Date().toISOString()
        };
        return { inventorySessions: [...state.inventorySessions, newSession] };
      }),
    }),
    {
      name: 'el-baraday-inventory-v2',
    }
  )
);
