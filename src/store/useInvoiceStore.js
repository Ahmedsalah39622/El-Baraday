"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useInvoiceStore = create(
  persist(
    (set, get) => ({
      invoices: [],
      returns: [],
      nextOrderNumber: 35,
      loading: false,

      // Fetch next order number from DB
      fetchNextOrderNumber: async () => {
        try {
          const res = await fetch('/api/orders/next-number');
          if (res.ok) {
            const data = await res.json();
            set({ nextOrderNumber: parseInt(data.next) || get().nextOrderNumber });
          }
        } catch (err) {
          console.warn('⚠️ Using local order number:', err.message);
        }
      },

      getNextOrderNumber: () => {
        return get().nextOrderNumber;
      },

      // Fetch invoices/orders from DB
      fetchInvoices: async (limit = 100) => {
        set({ loading: true });
        try {
          const res = await fetch(`/api/orders?limit=${limit}`);
          if (res.ok) {
            const rows = await res.json();
            const mapped = rows.map((o) => ({
              id: o.id,
              orderNumber: String(o.order_number),
              invoiceNumber: `INV-${o.order_number}`,
              orderType: o.order_type,
              customerName: o.customer_name,
              customerPhone: o.customer_phone,
              cashierName: o.cashier_name,
              subtotal: parseFloat(o.subtotal),
              total: parseFloat(o.total),
              paidAmount: parseFloat(o.paid_amount),
              remainingAmount: parseFloat(o.remaining_amount),
              deliveryFee: parseFloat(o.delivery_fee),
              discount: parseFloat(o.discount),
              paymentMethod: o.payment_method,
              status: o.status,
              createdAt: o.created_at,
              isReturned: false,
            }));
            set({ invoices: mapped, loading: false });
          }
        } catch (err) {
          console.warn('⚠️ Using cached invoices:', err.message);
          set({ loading: false });
        }
      },

      addInvoice: async (invoice) => {
        const currentNum = get().nextOrderNumber;
        const newInvoice = {
          ...invoice,
          id: Date.now().toString(),
          orderNumber: currentNum.toString(),
          invoiceNumber: `INV-${currentNum}`,
          createdAt: new Date().toISOString(),
          isReturned: false,
        };

        // Optimistic local update
        set((state) => ({
          invoices: [...state.invoices, newInvoice],
          nextOrderNumber: state.nextOrderNumber + 1,
        }));

        // Save to DB
        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_type: invoice.orderType || 'dine_in',
              customer_name: invoice.customerName,
              customer_phone: invoice.customerPhone,
              customer_area: invoice.customerArea,
              customer_address: invoice.customerAddress,
              driver_name: invoice.driverName,
              driver_id: invoice.driverId,
              subtotal: invoice.subtotal,
              delivery_fee: invoice.deliveryFee || 0,
              discount: invoice.discount || 0,
              total: invoice.total,
              paid_amount: invoice.paidAmount || 0,
              remaining_amount: invoice.remainingAmount || 0,
              cashier_name: invoice.cashierName || 'administrator',
              items: invoice.items?.map((item) => ({
                product_id: item.id,
                product_name: item.name,
                price: item.price,
                quantity: item.quantity,
                size: item.size,
                extras: item.extras,
                notes: item.notes,
              })),
            }),
          });
          if (res.ok) {
            const created = await res.json();
            // Update with real DB id and order_number
            set((state) => ({
              invoices: state.invoices.map((inv) =>
                inv.id === newInvoice.id
                  ? { ...inv, id: created.id, orderNumber: String(created.order_number), invoiceNumber: `INV-${created.order_number}` }
                  : inv
              ),
              nextOrderNumber: parseInt(created.order_number) + 1,
            }));
          }
        } catch (err) {
          console.warn('⚠️ Invoice saved locally only:', err.message);
        }

        return newInvoice;
      },

      getInvoiceById: (id) => {
        return get().invoices.find((inv) => inv.id === id);
      },

      searchInvoices: (query) => {
        return get().invoices.filter((inv) =>
          inv.invoiceNumber.toLowerCase().includes(query.toLowerCase())
        );
      },

      returnItem: (invoiceId, itemId, quantity, reason) =>
        set((state) => {
          const invoice = state.invoices.find((inv) => inv.id === invoiceId);
          if (!invoice) return state;
          const item = invoice.items?.find((i) => i.id === itemId);
          if (!item) return state;
          const amount = item.price * quantity;
          const returnEntry = {
            id: Date.now().toString(),
            invoiceId,
            items: [{ ...item, quantity }],
            amount,
            reason,
            createdAt: new Date().toISOString(),
          };
          return {
            returns: [...state.returns, returnEntry],
            invoices: state.invoices.map((inv) =>
              inv.id === invoiceId ? { ...inv, isReturned: true } : inv
            ),
          };
        }),

      getReturnsByDate: (date) => {
        const searchDate = new Date(date).toDateString();
        return get().returns.filter((ret) => new Date(ret.createdAt).toDateString() === searchDate);
      },

      getAllReturns: () => get().returns,

      getDailyInvoices: (date) => {
        const searchDate = new Date(date).toDateString();
        return get().invoices.filter((inv) => new Date(inv.createdAt).toDateString() === searchDate);
      },

      getInvoicesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return get().invoices.filter((inv) => {
          const invDate = new Date(inv.createdAt).getTime();
          return invDate >= start && invDate <= end;
        });
      },
    }),
    {
      name: 'el-baraday-invoices-v2',
    }
  )
);
