'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, Drawer, Badge } from '@mui/material';
import { ShoppingBagOutlined, Close } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import CategoryTabs from '@/components/pos/CategoryTabs';
import ProductGrid from '@/components/pos/ProductGrid';
import OrderDetailsPanel from '@/components/pos/OrderDetailsPanel';
import { useProductStore } from '@/store/useProductStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useTableStore } from '@/store/useTableStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function POSPage() {
  const { products, fetchProducts } = useProductStore();
  const { items, addItem, updateQuantity, removeItem, clearOrder, orderType, setOrderType } = useOrderStore();
  const { fetchCustomers, fetchAreas, fetchDrivers } = useCustomerStore();
  const { fetchTables } = useTableStore();
  const { fetchNextOrderNumber, fetchInvoices } = useInvoiceStore();
  const { fetchSettings } = useSettingsStore();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchAreas();
    fetchDrivers();
    fetchTables();
    fetchNextOrderNumber();
    fetchInvoices();
    fetchSettings();
  }, []);


  // Filter products by category & search
  const filteredProducts = (products || []).filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handleSelectProduct = (product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        bgcolor: 'background.default',
        position: 'relative',
        pb: { xs: 8, md: 0 }, // padding for mobile bottom bar
      }}
    >
      {/* Desktop Right Panel: Order Details (Hidden on mobile) */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, height: '100%' }}>
        <OrderDetailsPanel
          items={items}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
          onRemoveItem={(id) => removeItem(id)}
          onClearOrder={clearOrder}
          subtotal={subtotal}
          tax={tax}
          total={total}
        />
      </Box>

      {/* Middle/Full Area: Products & Categories */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 2, md: 3 },
          gap: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header Bar: Home Title + SearchBar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 1.5,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '2rem' } }}>
            الرئيسية
          </Typography>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </Box>

        {/* Categories Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6B7280' }}>
            الأقسام
          </Typography>
          <CategoryTabs
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </Box>

        {/* Product Grid */}
        <ProductGrid
          products={filteredProducts}
          onSelectProduct={handleSelectProduct}
          categoryTitle={selectedCategory === 'all' ? 'الأكثر مبيعاً' : 'المنتجات'}
        />
      </Box>

      {/* Mobile Floating Cart Action Bar */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 66,
          left: 16,
          right: 16,
          zIndex: 90,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          onClick={() => setMobileCartOpen(true)}
          startIcon={<ShoppingBagOutlined />}
          sx={{
            py: 1.5,
            borderRadius: '16px',
            bgcolor: '#4285F4',
            fontSize: '1rem',
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            px: 2.5,
            boxShadow: '0 8px 20px rgba(66, 133, 244, 0.4)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>عرض الفاتورة والطلب</span>
            <Badge badgeContent={items.length} color="error" />
          </Box>
          <span>{total.toFixed(0)} ج.م</span>
        </Button>
      </Box>

      {/* Mobile Order Drawer / Sheet */}
      <Drawer
        anchor="bottom"
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        PaperProps={{
          sx: {
            height: '92vh',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            overflow: 'hidden',
          },
        }}
      >
        <OrderDetailsPanel
          items={items}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
          onRemoveItem={(id) => removeItem(id)}
          onClearOrder={clearOrder}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onCloseMobile={() => setMobileCartOpen(false)}
        />
      </Drawer>
    </Box>
  );
}
