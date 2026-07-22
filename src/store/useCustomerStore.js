"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultCustomersList = [
  {
    id: 'c1',
    name: ' ',
    phone: ' ',
    address: '  - بجوار قهوة المشربية',
    floor: '3',
    apartment: '5',
    addresses: [
      { address: '  - بجوار قهوة المشربية', floor: '3', apartment: '5' },
      { address: 'شارع النصر - برج السلام', floor: 'الأرضي', apartment: '1' }
    ]
  },
  {
    id: 'c2',
    name: 'أحمد محمود',
    phone: '01001234567',
    address: 'شارع العشرين - فيصل',
    floor: '2',
    apartment: '1',
    addresses: [
      { address: 'شارع العشرين - فيصل', floor: '2', apartment: '1' }
    ]
  },
  {
    id: 'c3',
    name: 'محمود عبد الفتاح',
    phone: '01229876543',
    address: 'الهرم - أمام سينما رادوبيس',
    floor: '5',
    apartment: '12',
    addresses: [
      { address: 'الهرم - أمام سينما رادوبيس', floor: '5', apartment: '12' }
    ]
  }
];

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customers: defaultCustomersList,
      areas: [],
      drivers: [
        { id: 'd1', name: 'محمد علي الصوفي', phone: '01000000001' },
        { id: 'd2', name: 'أحمد عبد الفتاح', phone: '01000000002' },
        { id: 'd3', name: 'محمود السويفي', phone: '01000000003' },
        { id: 'd4', name: 'خالد طارق', phone: '01000000004' }
      ],
      loading: false,

      // Fetch customers from DB
      fetchCustomers: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/customers');
          if (res.ok) {
            const rows = await res.json();
            if (rows.length > 0) {
              set({
                customers: rows.map(r => {
                  const mainAddress = r.address || '';
                  const mainFloor = r.floor || '';
                  const mainApartment = r.apartment || '';
                  return {
                    id: r.id,
                    name: r.name,
                    phone: r.phone,
                    address: mainAddress,
                    floor: mainFloor,
                    apartment: mainApartment,
                    addresses: [
                      { address: mainAddress, floor: mainFloor, apartment: mainApartment }
                    ],
                    totalTransactions: r.total_orders || 0,
                    totalSpend: parseFloat(r.total_spend || 0)
                  };
                }),
                loading: false
              });
            } else {
              set({ loading: false });
            }
          }
        } catch (err) {
          console.warn('⚠️ Using cached customers:', err.message);
          set({ loading: false });
        }
      },

      // Fetch delivery areas from DB
      fetchAreas: async () => {
        try {
          const res = await fetch('/api/areas');
          if (res.ok) {
            const rows = await res.json();
            set({ areas: rows });
          }
        } catch (err) {
          console.warn('⚠️ Using cached areas:', err.message);
        }
      },

      // Fetch delivery drivers from DB
      fetchDrivers: async () => {
        try {
          const res = await fetch('/api/drivers');
          if (res.ok) {
            const rows = await res.json();
            if (rows.length > 0) set({ drivers: rows });
          }
        } catch (err) {
          console.warn('⚠️ Using cached drivers:', err.message);
        }
      },

      // Search customer by phone substring
      searchCustomersByPhone: (query) => {
        if (!query) return [];
        const clean = query.trim();
        return get().customers.filter(c => c.phone && c.phone.includes(clean));
      },

      // Save customer or append new address if phone exists
      saveOrUpdateCustomer: async (customerData) => {
        const { name, phone, address, floor, apartment } = customerData;
        if (!phone || !phone.trim()) return;

        const currentCustomers = get().customers;
        const existingIdx = currentCustomers.findIndex(c => c.phone === phone.trim());

        const newAddrObj = { address: address || '', floor: floor || '', apartment: apartment || '' };

        if (existingIdx !== -1) {
          // Existing customer → update name and add address if new
          const existing = currentCustomers[existingIdx];
          const hasAddr = (existing.addresses || []).some(a => a.address === newAddrObj.address);
          const updatedAddresses = hasAddr ? (existing.addresses || []) : [...(existing.addresses || []), newAddrObj];
          const updatedCustomer = {
            ...existing,
            name: name || existing.name,
            address: address || existing.address,
            floor: floor || existing.floor,
            apartment: apartment || existing.apartment,
            addresses: updatedAddresses,
          };

          const updatedList = [...currentCustomers];
          updatedList[existingIdx] = updatedCustomer;
          set({ customers: updatedList });

          // API update to Supabase
          try {
            await fetch(`/api/customers/${existing.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: updatedCustomer.name,
                phone: updatedCustomer.phone,
                address: address || existing.address || '',
                floor: floor || existing.floor || '',
                apartment: apartment || existing.apartment || '',
              }),
            });
          } catch (e) { }
        } else {
          // New Customer
          const newId = `cust_${Date.now()}`;
          const newCust = {
            id: newId,
            name: name || 'عميل جديد',
            phone: phone.trim(),
            address: address || '',
            floor: floor || '',
            apartment: apartment || '',
            addresses: [newAddrObj],
            totalTransactions: 1,
            totalSpend: 0,
          };
          set((state) => ({ customers: [newCust, ...state.customers] }));

          try {
            await fetch('/api/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: newId,
                name: newCust.name,
                phone: newCust.phone,
                address: address || '',
                floor: floor || '',
                apartment: apartment || '',
              }),
            });
          } catch (e) { }
        }
      },

      addCustomer: async (customer) => {
        const localId = Date.now().toString();
        const newCust = { ...customer, id: localId, addresses: customer.addresses || [{ address: customer.address || '', floor: customer.floor || '', apartment: customer.apartment || '' }] };
        set((state) => ({ customers: [newCust, ...state.customers] }));
      },

      deleteCustomer: async (id) => {
        set((state) => ({ customers: state.customers.filter(c => c.id !== id) }));
        try { await fetch(`/api/customers/${id}`, { method: 'DELETE' }); } catch (err) { }
      },
    }),
    {
      name: 'el-baraday-customers-v3',
    }
  )
);
