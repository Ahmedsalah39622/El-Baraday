import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultHawawshiProducts = [
  { id: 'p1', categoryId: '1', name: 'حواوشي ساده صغير', price: 45, size: 'صغير', image: '/images/hawawshi_sade.png', sortOrder: 1, is_available: true },
  { id: 'p2', categoryId: '1', name: 'حواوشي ساده كبير', price: 75, size: 'كبير', image: '/images/hawawshi_sade.png', sortOrder: 2, is_available: true },
  { id: 'p3', categoryId: '1', name: 'حواوشي فراخ صغير', price: 55, size: 'صغير', image: '/images/hawawshi_chicken.png', sortOrder: 3, is_available: true },
  { id: 'p4', categoryId: '1', name: 'حواوشي فراخ كبير', price: 90, size: 'كبير', image: '/images/hawawshi_chicken.png', sortOrder: 4, is_available: true },
  { id: 'p5', categoryId: '1', name: 'حواوشي سلامي صغير', price: 65, size: 'صغير', image: '/images/hawawshi_salami.png', sortOrder: 5, is_available: true },
  { id: 'p6', categoryId: '1', name: 'حواوشي سلامي كبير', price: 110, size: 'كبير', image: '/images/hawawshi_salami.png', sortOrder: 6, is_available: true },
  { id: 'p7', categoryId: '1', name: 'حواوشي سجق صغير', price: 60, size: 'صغير', image: '/images/hawawshi_sausage.png', sortOrder: 7, is_available: true },
  { id: 'p8', categoryId: '1', name: 'حواوشي سجق كبير', price: 100, size: 'كبير', image: '/images/hawawshi_sausage.png', sortOrder: 8, is_available: true },
  { id: 'p9', categoryId: '2', name: 'حواوشي ميكس أجبان صغير', price: 70, size: 'صغير', image: '/images/hawawshi_mixes.png', sortOrder: 9, is_available: true },
  { id: 'p10', categoryId: '2', name: 'حواوشي ميكس أجبان كبير', price: 120, size: 'كبير', image: '/images/hawawshi_mixes.png', sortOrder: 10, is_available: true },
  { id: 'p11', categoryId: '4', name: 'إضافة جبنة موتزاريلا', price: 25, size: 'عادي', image: '/images/cheese_addition.png', sortOrder: 11, is_available: true },
  { id: 'p12', categoryId: '4', name: 'إضافة جبنة رومي', price: 20, size: 'عادي', image: '/images/cheese_addition.png', sortOrder: 12, is_available: true },
  { id: 'p13', categoryId: '4', name: 'إضافة جبنة شيدر', price: 20, size: 'عادي', image: '/images/cheese_addition.png', sortOrder: 13, is_available: true },
  { id: 'p14', categoryId: '3', name: 'بيبسي كولا 1 لتر', price: 30, size: '1L', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80', sortOrder: 14, is_available: true },
  { id: 'p15', categoryId: '3', name: 'مياه معدنية', price: 10, size: 'صغير', image: '/images/mineral_water.png', sortOrder: 15, is_available: true },
  { id: 'p16', categoryId: '5', name: 'عرض ميكس البردعي الفاخر', price: 140, originalPrice: 185, isOffer: true, offerComponents: '2 حواوشي ميكس أجبان + بيبسي 1 لتر', size: 'وجبة عائلية', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80', sortOrder: 16, is_available: true },
  { id: 'p17', categoryId: '5', name: 'عرض الصحاب (4 حواوشي)', price: 220, originalPrice: 270, isOffer: true, offerComponents: '4 حواوشي فراخ/سجق + 2 بطاطس + بيبسي', size: 'وجبة 4 أفراد', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', sortOrder: 17, is_available: true },
];

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
    is_available: row.is_available,
    sortOrder: parseInt(row.sort_order) || 0,
  };
}

export const useProductStore = create(
  persist(
    (set, get) => ({
      products: defaultHawawshiProducts,
      loading: false,
      error: null,

      fetchProducts: async () => {
        try {
          const res = await fetch('/api/products');
          if (!res.ok) return;
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const mappedFetched = rows.map(mapProduct);

            set((state) => {
              const currentProds = state.products && state.products.length > 0 ? state.products : defaultHawawshiProducts;
              const fetchedMap = new Map(mappedFetched.map(item => [item.id, item]));

              // Merge fetched DB items into current state without deleting local-only additions
              const merged = currentProds.map(localItem => {
                if (fetchedMap.has(localItem.id)) {
                  const fetchedItem = fetchedMap.get(localItem.id);
                  fetchedMap.delete(localItem.id);
                  return { ...localItem, ...fetchedItem };
                }
                return localItem;
              });

              // Add newly fetched items from DB
              fetchedMap.forEach(item => merged.push(item));

              return {
                products: merged.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
                loading: false,
              };
            });
          }
        } catch (err) {
          console.warn('⚠️ Fetch products notice:', err.message);
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
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));

        try {
          await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: updates.name,
              category_id: updates.categoryId,
              price: updates.price,
              original_price: updates.originalPrice,
              is_offer: updates.isOffer || updates.categoryId === '5',
              offer_components: updates.offerComponents,
              size: updates.size,
              image_url: updates.image,
              description: updates.description,
              is_available: updates.is_available,
              sort_order: updates.sortOrder,
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
      name: 'el-baraday-products-v5',
    }
  )
);
