"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customers: [],
      areas: [],
      drivers: [],
      activeQueue: [],
      loading: false,

      // Fetch customers from DB
      fetchCustomers: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/customers');
          if (res.ok) {
            const rows = await res.json();
            set({
              customers: (rows || []).map(r => {
                const mainAddress = r.address || '';
                const mainFloor = r.floor || '';
                const mainApartment = r.apartment || '';

                let parsedAddresses = [];
                if (Array.isArray(r.addresses)) {
                  parsedAddresses = r.addresses;
                } else if (typeof r.addresses === 'string') {
                  try { parsedAddresses = JSON.parse(r.addresses); } catch (e) {}
                }

                if (!Array.isArray(parsedAddresses) || parsedAddresses.length === 0) {
                  parsedAddresses = [{ address: mainAddress, floor: mainFloor, apartment: mainApartment }];
                }

                return {
                  id: r.id,
                  name: r.name,
                  phone: r.phone,
                  address: mainAddress,
                  floor: mainFloor,
                  apartment: mainApartment,
                  addresses: parsedAddresses,
                  totalTransactions: r.total_orders || 0,
                  totalSpend: parseFloat(r.total_spend || 0)
                };
              }),
              loading: false
            });
          } else {
            set({ customers: [], loading: false });
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
            set({ drivers: rows || [] });
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
          // Existing customer → update name and append address if new
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
                addresses: updatedAddresses
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
                addresses: [newAddrObj]
              }),
            });
          } catch (e) { }
        }
      },

      addCustomer: async (customer) => {
        const localId = Date.now().toString();
        const initialAddresses = customer.addresses || [{ address: customer.address || '', floor: customer.floor || '', apartment: customer.apartment || '' }];
        const newCust = { ...customer, id: localId, addresses: initialAddresses };
        set((state) => ({ customers: [newCust, ...state.customers] }));

        try {
          await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: localId,
              name: newCust.name,
              phone: newCust.phone,
              address: newCust.address || '',
              floor: newCust.floor || '',
              apartment: newCust.apartment || '',
              addresses: initialAddresses
            })
          });
        } catch (e) {}
      },

      updateCustomerAddresses: async (customerId, addressesList) => {
        const currentCustomers = get().customers;
        const target = currentCustomers.find(c => c.id === customerId);
        if (!target) return;

        const mainAddr = addressesList[0] || { address: '', floor: '', apartment: '' };
        const updated = {
          ...target,
          address: mainAddr.address,
          floor: mainAddr.floor,
          apartment: mainAddr.apartment,
          addresses: addressesList
        };

        set((state) => ({
          customers: state.customers.map(c => c.id === customerId ? updated : c)
        }));

        try {
          await fetch(`/api/customers/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: updated.name,
              phone: updated.phone,
              address: mainAddr.address,
              floor: mainAddr.floor,
              apartment: mainAddr.apartment,
              addresses: addressesList
            })
          });
        } catch (e) {}
      },

      deleteCustomer: async (id) => {
        set((state) => ({ customers: state.customers.filter(c => c.id !== id) }));
        try { await fetch(`/api/customers/${id}`, { method: 'DELETE' }); } catch (err) { }
      },
    }),
    {
      name: 'el-baraday-customers-v6',
    }
  )
);
