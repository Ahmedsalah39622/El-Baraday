'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, Drawer, Badge } from '@mui/material';
import { ShoppingBagOutlined, AccountBalanceWallet } from '@mui/icons-material';
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
import { useShiftStore } from '@/store/useShiftStore';

export default function POSPage() {
  const { products, fetchProducts } = useProductStore();
  const { items, addItem, updateQuantity, removeItem, clearOrder, orderType, setOrderType } = useOrderStore();
  const { fetchCustomers, fetchAreas, fetchDrivers } = useCustomerStore();
  const { fetchTables } = useTableStore();
  const { fetchNextOrderNumber, fetchInvoices, invoices } = useInvoiceStore();
  const { fetchSettings } = useSettingsStore();
  const { activeShift, fetchShifts } = useShiftStore();

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
    fetchShifts();

    // Auto-poll live products every 3s so Desktop reordering syncs instantly to Mobile
    const interval = setInterval(() => {
      fetchProducts();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Calculate current till cash drawer amount:
  // Starting Cash + Total Sales from Invoices
  const startCash = activeShift?.startAmount || 500;
  const totalCashSales = (invoices || []).reduce((sum, inv) => sum + (parseFloat(inv.paidAmount || inv.total || 0)), 0);
  const currentTillCash = startCash + totalCashSales;

  // Filter products by category & search, explicitly sorted by sortOrder
  const filteredProducts = (products || [])
    .filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

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
        pb: { xs: 8, md: 0 },
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

        {/* Bottom Footer Bar: Current Till Cash Drawer Badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            pt: 1.2,
            borderTop: '1px solid #E5E7EB',
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: '#ECFDF5',
              border: '1.5px solid #10B981',
              px: 2.5,
              py: 0.8,
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                bgcolor: '#10B981',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                المبلغ في الخزنة حالياً
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#065F46', fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.2 }}>
                {currentTillCash.toFixed(2)} ج.م
              </Typography>
            </Box>
          </Box>
        </Box>
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
