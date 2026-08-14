'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialPurchases = [
  {
    id: 'purch-1',
    branch_id: 'b1',
    branch_name: 'الفرع الأول - الرئيسي',
    supplier_name: 'شركة الأمل للحوم والدواجن',
    item_name: 'لحم مفروم كاندوز ممتاز',
    quantity: 50,
    unit: 'كجم',
    cost_per_unit: 320,
    total_amount: 16000,
    paid_amount: 6000,
    remaining_amount: 10000,
    payment_status: 'partial', // 'paid', 'credit', 'partial'
    notes: 'تم دفع 6000 كاش والباقي 10000 آجل يسدد آخر الأسبوع',
    purchase_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
  },
  {
    id: 'purch-2',
    branch_id: 'b1',
    branch_name: 'الفرع الأول - الرئيسي',
    supplier_name: 'مخبز البركة البلدي',
    item_name: 'عيش بلدي حواوشي مخصوص',
    quantity: 1000,
    unit: 'رغيف',
    cost_per_unit: 2.5,
    total_amount: 2500,
    paid_amount: 2500,
    remaining_amount: 0,
    payment_status: 'paid',
    notes: 'مسدد بالكامل كاش عند الاستلام',
    purchase_date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
  },
  {
    id: 'purch-3',
    branch_id: 'b2',
    branch_name: 'فرع المسلة',
    supplier_name: 'مزارع الوطنية للدواجن',
    item_name: 'صدور فراخ متبلة',
    quantity: 30,
    unit: 'كجم',
    cost_per_unit: 190,
    total_amount: 5700,
    paid_amount: 0,
    remaining_amount: 5700,
    payment_status: 'credit',
    notes: 'فاتورة آجل بالكامل حتى جرد أول الشهر',
    purchase_date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'purch-4',
    branch_id: 'b2',
    branch_name: 'فرع المسلة',
    supplier_name: 'شركة النيل للزيوت والبقالة',
    item_name: 'زيت خليط طهي 18 لتر',
    quantity: 5,
    unit: 'كرتونة',
    cost_per_unit: 850,
    total_amount: 4250,
    paid_amount: 2000,
    remaining_amount: 2250,
    payment_status: 'partial',
    notes: 'دفعة مقدمة والباقي مع التوريد القادم',
    purchase_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
  },
];

const initialExpenses = [
  {
    id: 'exp-1',
    branch_id: 'b1',
    branch_name: 'فرع عزت',
    title: 'فاتورة كهرباء شهر يوليو',
    category: 'مرافق وخدمات',
    amount: 3400,
    payment_method: 'تحويل بنكي',
    notes: 'العداد الرئيسي للمطعم',
    expense_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
  },
  {
    id: 'exp-2',
    branch_id: 'b2',
    branch_name: 'فرع المسلة',
    title: 'شحن أسطوانات غاز تجاري (3 أسطوانات)',
    category: 'مستلزمات تشغيل',
    amount: 1350,
    payment_method: 'كاش الخزنة',
    notes: 'غاز خط الجريل والفرن',
    expense_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
  },
  {
    id: 'exp-3',
    branch_id: 'b1',
    branch_name: 'الفرع الأول - الرئيسي',
    title: 'صيانة وتغيير سير مفرمة اللحم',
    category: 'صيانة معدات',
    amount: 800,
    payment_method: 'كاش الخزنة',
    notes: 'فني صيانة خارج',
    expense_date: new Date().toISOString().split('T')[0],
  },
];

export const useFinancesStore = create(
  persist(
    (set, get) => ({
      purchases: initialPurchases,
      expenses: initialExpenses,
      selectedBranchId: 'all',

      setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),

      fetchFinances: async () => {
        try {
          const [purchRes, expRes] = await Promise.all([
            fetch('/api/finances/purchases'),
            fetch('/api/finances/expenses'),
          ]);
          if (purchRes.ok) {
            const pData = await purchRes.json();
            if (Array.isArray(pData) && pData.length > 0) {
              set({ purchases: pData });
            }
          }
          if (expRes.ok) {
            const eData = await expRes.json();
            if (Array.isArray(eData) && eData.length > 0) {
              set({ expenses: eData });
            }
          }
        } catch (err) {
          console.warn('⚠️ Error fetching finances from API:', err);
        }
      },

      deletePurchase: async (id) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));
        try {
          await fetch(`/api/finances/purchases?id=${id}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('API DELETE purchase failed:', e);
        }
      },

      deleteExpense: async (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
        try {
          await fetch(`/api/finances/expenses?id=${id}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('API DELETE expense failed:', e);
        }
      },

      addPurchase: async (purchaseData) => {
        const total = parseFloat(purchaseData.total_amount) || 0;
        const paid = parseFloat(purchaseData.paid_amount) || 0;
        const remaining = Math.max(0, total - paid);

        let status = purchaseData.payment_status;
        if (!status) {
          if (paid >= total) status = 'paid';
          else if (paid === 0) status = 'credit';
          else status = 'partial';
        }

        const newPurchase = {
          id: 'purch-' + Date.now(),
          branch_id: purchaseData.branch_id || 'b1',
          branch_name: purchaseData.branch_name || 'الفرع الأول - الرئيسي',
          supplier_name: purchaseData.supplier_name,
          item_name: purchaseData.item_name,
          quantity: parseFloat(purchaseData.quantity) || 1,
          unit: purchaseData.unit || 'كيلو',
          cost_per_unit: parseFloat(purchaseData.cost_per_unit) || 0,
          total_amount: total,
          paid_amount: paid,
          remaining_amount: remaining,
          payment_status: status,
          notes: purchaseData.notes || '',
          purchase_date: purchaseData.purchase_date || new Date().toISOString().split('T')[0],
        };

        try {
          await fetch('/api/finances/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPurchase),
          });
        } catch (e) {
          console.warn('API POST purchase failed, using local store', e);
        }

        set((state) => ({
          purchases: [newPurchase, ...state.purchases],
        }));
      },

      recordPayment: async (purchaseId, paymentAmount) => {
        const payVal = parseFloat(paymentAmount) || 0;
        if (payVal <= 0) return;

        set((state) => ({
          purchases: state.purchases.map((item) => {
            if (item.id === purchaseId) {
              const newPaid = item.paid_amount + payVal;
              const newRemaining = Math.max(0, item.total_amount - newPaid);
              let newStatus = 'partial';
              if (newRemaining <= 0) newStatus = 'paid';
              else if (newPaid === 0) newStatus = 'credit';

              return {
                ...item,
                paid_amount: newPaid,
                remaining_amount: newRemaining,
                payment_status: newStatus,
              };
            }
            return item;
          }),
        }));

        try {
          await fetch('/api/finances/purchases', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: purchaseId, additional_payment: payVal }),
          });
        } catch (e) {
          console.warn('API PUT payment failed, using local store', e);
        }
      },

      addExpense: async (expenseData) => {
        const newExpense = {
          id: 'exp-' + Date.now(),
          branch_id: expenseData.branch_id || 'b1',
          branch_name: expenseData.branch_name || 'الفرع الأول - الرئيسي',
          title: expenseData.title,
          category: expenseData.category || 'نثريات',
          amount: parseFloat(expenseData.amount) || 0,
          payment_method: expenseData.payment_method || 'كاش الخزنة',
          notes: expenseData.notes || '',
          expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
        };

        try {
          await fetch('/api/finances/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExpense),
          });
        } catch (e) {
          console.warn('API POST expense failed, using local store', e);
        }

        set((state) => ({
          expenses: [newExpense, ...state.expenses],
        }));
      },
    }),
    {
      name: 'el-baraday-finances-v2',
    }
  )
);
