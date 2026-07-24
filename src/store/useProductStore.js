import { create } from 'zustand';

const defaultHawawshiProducts = [
  { id: 'p1', categoryId: '1', name: 'حواوشي ساده صغير', price: 45, size: 'صغير', image: '/images/hawawshi_sade.png', sortOrder: 1 },
  { id: 'p2', categoryId: '1', name: 'حواوشي ساده كبير', price: 75, size: 'كبير', image: '/images/hawawshi_sade.png', sortOrder: 2 },
  { id: 'p3', categoryId: '1', name: 'حواوشي فراخ صغير', price: 55, size: 'صغير', image: '/images/hawawshi_chicken.png', sortOrder: 3 },
  { id: 'p4', categoryId: '1', name: 'حواوشي فراخ كبير', price: 90, size: 'كبير', image: '/images/hawawshi_chicken.png', sortOrder: 4 },
  { id: 'p5', categoryId: '1', name: 'حواوشي سلامي صغير', price: 65, size: 'صغير', image: '/images/hawawshi_salami.png', sortOrder: 5 },
  { id: 'p6', categoryId: '1', name: 'حواوشي سلامي كبير', price: 110, size: 'كبير', image: '/images/hawawshi_salami.png', sortOrder: 6 },
  { id: 'p7', categoryId: '1', name: 'حواوشي سجق صغير', price: 60, size: 'صغير', image: '/images/hawawshi_sausage.png', sortOrder: 7 },
  { id: 'p8', categoryId: '1', name: 'حواوشي سجق كبير', price: 100, size: 'كبير', image: '/images/hawawshi_sausage.png', sortOrder: 8 },
  { id: 'p9', categoryId: '2', name: 'حواوشي ميكس أجبان صغير', price: 70, size: 'صغير', image: '/images/hawawshi_mixes.png', sortOrder: 9 },
  { id: 'p10', categoryId: '2', name: 'حواوشي ميكس أجبان كبير', price: 120, size: 'كبير', image: '/images/hawawshi_mixes.png', sortOrder: 10 },
  { id: 'p11', categoryId: '4', name: 'إضافة جبنة موتزاريلا', price: 25, size: 'عادي', image: '/images/cheese_addition.png', sortOrder: 11 },
  { id: 'p12', categoryId: '4', name: 'إضافة جبنة رومي', price: 20, size: 'عادي', image: '/images/cheese_addition.png', sortOrder: 12 },
  { id: 'p13', categoryId: '4', name: 'إضافة جبنة شيدر', price: 20, size: 'عادي', image: '/images/cheese_addition.png', sortOrder: 13 },
  { id: 'p14', categoryId: '3', name: 'بيبسي كولا 1 لتر', price: 30, size: '1L', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80', sortOrder: 14 },
  { id: 'p15', categoryId: '3', name: 'مياه معدنية', price: 10, size: 'صغير', image: '/images/mineral_water.png', sortOrder: 15 },
  { id: 'p16', categoryId: '5', name: 'عرض ميكس البردعي الفاخر', price: 140, originalPrice: 185, isOffer: true, offerComponents: '2 حواوشي ميكس أجبان + بيبسي 1 لتر', size: 'وجبة عائلية', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80', sortOrder: 16 },
  { id: 'p17', categoryId: '5', name: 'عرض الصحاب (4 حواوشي)', price: 220, originalPrice: 270, isOffer: true, offerComponents: '4 حواوشي فراخ/سجق + 2 بطاطس + بيبسي', size: 'وجبة 4 أفراد', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', sortOrder: 17 },
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

export const useProductStore = create((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch');
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map(mapProduct).sort((a, b) => a.sortOrder - b.sortOrder);
        set({ products: mapped, loading: false });
      }
    } catch (err) {
      console.warn('⚠️ Fetch products notice:', err.message);
    }
  },

  addProduct: async (product) => {
    const localId = Date.now().toString();
    const nextOrder = get().products.length + 1;
    const newProduct = {
      ...product,
      id: localId,
      sortOrder: nextOrder,
      isOffer: product.isOffer || product.categoryId === '5',
    };

    set((state) => ({
      products: [...state.products, newProduct].sort((a, b) => a.sortOrder - b.sortOrder)
    }));

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          category_id: product.categoryId,
          price: product.price,
          original_price: product.originalPrice,
          is_offer: product.isOffer || product.categoryId === '5',
          offer_components: product.offerComponents,
          size: product.size,
          image_url: product.image,
          description: product.description,
          sort_order: nextOrder,
        }),
      });
      if (res.ok) {
        get().fetchProducts();
      }
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
      get().fetchProducts();
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
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reordered.map((p) => ({ id: p.id, sort_order: p.sortOrder }))),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          set({ products: rows.map(mapProduct).sort((a, b) => a.sortOrder - b.sortOrder) });
        }
      }
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
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reordered.map((p) => ({ id: p.id, sort_order: p.sortOrder }))),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          set({ products: rows.map(mapProduct).sort((a, b) => a.sortOrder - b.sortOrder) });
        }
      }
    } catch (err) {
      console.warn('⚠️ Reorder saved locally:', err.message);
    }
  },

  getProductsByCategory: (categoryId) => {
    if (categoryId === 'all') return get().products;
    return get().products.filter((p) => p.categoryId === categoryId);
  },
}));
