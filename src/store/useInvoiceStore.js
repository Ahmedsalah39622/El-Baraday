import { create } from 'zustand';

export const useInvoiceStore = create((set, get) => ({
  invoices: [],
  nextOrderNumber: 1,
  loading: false,

  fetchNextOrderNumber: async (branchId = 'b1') => {
    try {
      const res = await fetch(`/api/orders/next-number?branch_id=${branchId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.next) set({ nextOrderNumber: parseInt(data.next) || 1 });
      }
    } catch (e) {}
  },

  // Fetch invoices/orders from DB with optional branch filter
  fetchInvoices: async (limit = 100, branchId = 'all') => {
    set({ loading: true });
    try {
      const url = branchId && branchId !== 'all' ? `/api/orders?limit=${limit}&branch_id=${branchId}` : `/api/orders?limit=${limit}`;
      const res = await fetch(url);
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
          subtotal: parseFloat(o.subtotal || 0),
          total: parseFloat(o.total || 0),
          paidAmount: parseFloat(o.paid_amount || 0),
          remainingAmount: parseFloat(o.remaining_amount || 0),
          deliveryFee: parseFloat(o.delivery_fee || 0),
          discount: parseFloat(o.discount || 0),
          paymentMethod: o.payment_method,
          status: o.status,
          createdAt: o.created_at,
          branchId: o.branch_id,
          branch_id: o.branch_id,
          branchName: o.branch_name,
          items: Array.isArray(o.items) ? o.items : [],
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
    const targetBranch = invoice.branch_id || invoice.branchId || 'b1';
    const currentNum = get().nextOrderNumber;
    const newInvoice = {
      ...invoice,
      id: Date.now().toString(),
      orderNumber: currentNum.toString(),
      invoiceNumber: `INV-${currentNum}`,
      createdAt: new Date().toISOString(),
      branchId: targetBranch,
      branch_id: targetBranch,
      items: invoice.items || [],
      isReturned: false,
    };

    // Optimistic local update
    set((state) => ({
      invoices: [newInvoice, ...state.invoices],
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
          branch_id: targetBranch,
          items: invoice.items?.map((item) => ({
            product_id: item.id || item.product_id,
            product_name: item.name || item.product_name,
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
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === newInvoice.id
              ? {
                  ...inv,
                  id: created.id,
                  orderNumber: String(created.order_number),
                  invoiceNumber: `INV-${created.order_number}`,
                  branchId: created.branch_id,
                  branch_id: created.branch_id,
                  items: created.items || inv.items
                }
              : inv
          ),
        }));
        get().fetchNextOrderNumber(targetBranch);
      }
    } catch (err) {
      console.warn('⚠️ Order saved locally only:', err.message);
    }
  },

  getTodayInvoices: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().invoices.filter((inv) => inv.createdAt && inv.createdAt.startsWith(today));
  },
}));
