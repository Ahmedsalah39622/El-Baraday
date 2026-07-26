import { create } from 'zustand';
import { persist } from 'zustand/middleware';



function mapProduct(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    price: parseFloat(row.price),
    originalPrice: row.original_price ? parseFloat(row.original_price) : null,
    isOffer: row.is_offer || row.category_id === '5' || false,
    offerComponents: row.offer_components || null,
    size: row.size,
    image: row.image_url,
    description: row.description,
    is_available: row.is_available !== false,
    sortOrder: parseInt(row.sort_order) || 0,
  };
}

export const useProductStore = create(
  persist(
    (set, get) => ({
      products: [],
      loading: false,
      error: null,

      fetchProducts: async () => {
        try {
          const res = await fetch('/api/products');
          if (!res.ok) return;
          const rows = await res.json();
          if (Array.isArray(rows)) {
            const mappedFetched = rows.map(mapProduct);
            set({
              products: mappedFetched.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
              loading: false,
            });
          }
        } catch (err) {
          console.warn('⚠️ Fetch products notice:', err.message);
        }
      },

      clearAllProducts: async () => {
        set({ products: [] });
        try {
          await fetch('/api/products', { method: 'DELETE' });
        } catch (err) {
          console.warn('⚠️ Clear products saved locally:', err.message);
        }
      },

      addProduct: async (product) => {
        const localId = 'p_' + Date.now();
        const nextOrder = get().products.length + 1;
        const newProduct = {
          id: localId,
          categoryId: product.categoryId || '1',
          name: product.name,
          price: parseFloat(product.price) || 0,
          originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
          isOffer: product.isOffer || product.categoryId === '5' || false,
          offerComponents: product.offerComponents || null,
          size: product.size || 'كبير',
          image: product.image || '/images/hawawshi_sade.png',
          description: product.description || '',
          is_available: true,
          sortOrder: nextOrder,
        };

        // Immediately update state and persistent storage
        set((state) => ({
          products: [...state.products, newProduct].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
        }));

        try {
          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newProduct.id,
              name: newProduct.name,
              category_id: newProduct.categoryId,
              price: newProduct.price,
              original_price: newProduct.originalPrice,
              is_offer: newProduct.isOffer,
              offer_components: newProduct.offerComponents,
              size: newProduct.size,
              image_url: newProduct.image,
              description: newProduct.description,
              sort_order: nextOrder,
            }),
          });
        } catch (err) {
          console.warn('⚠️ Product saved locally only:', err.message);
        }
      },

      updateProduct: async (id, updates) => {
        let fullProduct = null;

        set((state) => {
          const nextProducts = state.products.map((p) => {
            if (p.id === id) {
              fullProduct = { ...p, ...updates };
              return fullProduct;
            }
            return p;
          });
          return { products: nextProducts };
        });

        if (!fullProduct) return;

        try {
          await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: fullProduct.id,
              name: fullProduct.name,
              category_id: fullProduct.categoryId,
              price: fullProduct.price,
              original_price: fullProduct.originalPrice,
              is_offer: fullProduct.isOffer || fullProduct.categoryId === '5',
              offer_components: fullProduct.offerComponents,
              size: fullProduct.size,
              image_url: fullProduct.image,
              description: fullProduct.description,
              is_available: fullProduct.is_available !== false,
              sort_order: fullProduct.sortOrder || 0,
            }),
          });
        } catch (err) {
          console.warn('⚠️ Product update saved locally:', err.message);
        }
      },

      deleteProduct: async (id) => {
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
        try {
          await fetch(`/api/products/${id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('⚠️ Product delete saved locally:', err.message);
        }
      },

      moveProductUp: async (id) => {
        const currentProducts = [...get().products];
        const index = currentProducts.findIndex((p) => p.id === id);
        if (index <= 0) return;

        const temp = currentProducts[index];
        currentProducts[index] = currentProducts[index - 1];
        currentProducts[index - 1] = temp;

        const reordered = currentProducts.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
        set({ products: reordered });

        try {
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reordered.map((p) => ({ id: p.id, sort_order: p.sortOrder }))),
          });
        } catch (err) {
          console.warn('⚠️ Reorder saved locally:', err.message);
        }
      },

      moveProductDown: async (id) => {
        const currentProducts = [...get().products];
        const index = currentProducts.findIndex((p) => p.id === id);
        if (index === -1 || index >= currentProducts.length - 1) return;

        const temp = currentProducts[index];
        currentProducts[index] = currentProducts[index + 1];
        currentProducts[index + 1] = temp;

        const reordered = currentProducts.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
        set({ products: reordered });

        try {
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reordered.map((p) => ({ id: p.id, sort_order: p.sortOrder }))),
          });
        } catch (err) {
          console.warn('⚠️ Reorder saved locally:', err.message);
        }
      },

      getProductsByCategory: (categoryId) => {
        const prods = get().products || [];
        if (categoryId === 'all') return prods;
        return prods.filter((p) => p.categoryId === categoryId);
      },
    }),
    {
      name: 'el-baraday-products-v8',
    }
  )
);
