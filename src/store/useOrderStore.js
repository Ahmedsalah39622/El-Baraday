import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOrderStore = create(
  persist(
    (set, get) => ({
      items: [
        { id: 'p2', name: 'حواوشي ساده كبير', price: 75, quantity: 2, image: '/images/hawawshi_sade.png', extras: 'مستردة', notes: 'بدون بصل' },
        { id: 'p10', name: 'حواوشي ميكس أجبان كبير', price: 120, quantity: 1, image: '/images/hawawshi_mixes.png' }
      ],
      orderType: 'delivery', // dine_in, takeaway, delivery
      selectedTableNumber: null,

      // Delivery & Customer Information
      driverName: 'محمد علي الصوفي',
      cashierName: 'administrator',
      customerName: ' ',
      customerPhone: ' ',
      customerArea: ' ',
      customerStreet: 'قهوة المشربية',
      customerLandmark: 'علامة مميزة',
      deliveryFee: 15,
      paidAmount: 300, // Amount paid by customer
      discountAmount: 0,
      taxRate: 0, // No Tax

      addItem: (product, quantity = 1, extras = '', notes = '') => set((state) => {
        const existingIndex = state.items.findIndex((item) => item.id === product.id);
        if (existingIndex > -1) {
          const updatedItems = [...state.items];
          updatedItems[existingIndex].quantity += quantity;
          return { items: updatedItems };
        } else {
          return {
            items: [
              ...state.items,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity,
                extras,
                notes,
              },
            ],
          };
        }
      }),

      updateQuantity: (id, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter((item) => item.id !== id) };
        }
        return {
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),

      setOrderType: (type) => set({ orderType: type }),
      setPaidAmount: (amount) => set({ paidAmount: amount }),
      setDeliveryInfo: (info) => set((state) => ({ ...state, ...info })),
      setDeliveryFee: (fee) => set({ deliveryFee: fee }),
      setDriverName: (name) => set({ driverName: name }),

      clearOrder: () => set({
        items: [],
        selectedTableNumber: null,
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        customerLandmark: '',
        discountAmount: 0,
        paidAmount: 0,
      }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getTax: () => {
        return 0; // Tax removed
      },

      getDeliveryFee: () => {
        return get().orderType === 'delivery' ? (get().deliveryFee || 15) : 0;
      },

      getTotal: () => {
        const sub = get().getSubtotal();
        const del = get().getDeliveryFee();
        const disc = get().discountAmount || 0;
        return Math.max(0, sub + del - disc);
      },

      getRemainingAmount: () => {
        const total = get().getTotal();
        const paid = get().paidAmount || 0;
        return Math.max(0, paid - total);
      },
    }),
    {
      name: 'el-baraday-order-store-v6',
    }
  )
);
