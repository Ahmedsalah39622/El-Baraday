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
  const { invoices } = useInvoiceStore();
  const { activeShift } = useShiftStore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    // Ultra-Fast Combined Single Init Request (Populates all stores in ~30ms)
    async function loadSystemData() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const data = await res.json();
          
          if (data.products && data.products.length > 0) {
            useProductStore.setState({
              products: data.products.map((r) => ({
                id: r.id,
                categoryId: r.category_id,
                name: r.name,
                price: parseFloat(r.price),
                size: r.size,
                image: r.image_url,
                description: r.description,
                is_available: r.is_available,
                sortOrder: parseInt(r.sort_order) || 0,
              })).sort((a, b) => a.sortOrder - b.sortOrder)
            });
          }

          if (data.customers && data.customers.length > 0) useCustomerStore.setState({ customers: data.customers });
          if (data.areas && data.areas.length > 0) useCustomerStore.setState({ deliveryAreas: data.areas });
          if (data.drivers && data.drivers.length > 0) useCustomerStore.setState({ drivers: data.drivers });
          if (data.tables && data.tables.length > 0) useTableStore.setState({ tables: data.tables });
          if (data.nextOrderNumber) useInvoiceStore.setState({ nextOrderNumber: data.nextOrderNumber });
          
          if (data.orders && data.orders.length > 0) {
            const mappedOrders = data.orders.map((o) => ({
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
              status: o.status,
              createdAt: o.created_at,
            }));
            useInvoiceStore.setState({ invoices: mappedOrders });
          }

          if (data.shifts && Array.isArray(data.shifts)) {
            const active = data.shifts.find(s => s.status === 'active');
            if (active) {
              const rawStart = active.start_time || active.created_at || new Date().toISOString();
              let formattedTime = '08:00 AM';
              try {
                formattedTime = new Date(rawStart).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {}

              useShiftStore.setState({
                activeShift: {
                  id: active.id,
                  cashierName: active.cashier_name || 'administrator',
                  rawStartTime: rawStart,
                  startTime: formattedTime,
                  startAmount: parseFloat(active.start_amount || 0),
                  status: 'active',
                }
              });
            } else {
              const localShift = useShiftStore.getState().activeShift;
              if (localShift && localShift.status !== 'active') {
                useShiftStore.setState({ activeShift: null });
              }
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Init load fallback:', err.message);
      }
    }

    loadSystemData();

    // Fast 5s background sync for products
    const interval = setInterval(() => {
      fetchProducts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Calculate current till cash drawer amount for active shift only
  const isShiftActive = activeShift && activeShift.status === 'active';
  const startCash = isShiftActive ? (parseFloat(activeShift.startAmount) || 0) : 0;
  
  const totalCashSales = (invoices || []).reduce((sum, inv) => {
    if (!isShiftActive) return sum;
    if (activeShift?.rawStartTime && inv.createdAt) {
      const invTime = new Date(inv.createdAt).getTime();
      const shiftStartTime = new Date(activeShift.rawStartTime).getTime();
      if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < shiftStartTime) {
        return sum; // Skip invoices before shift start
      }
    }
    return sum + (parseFloat(inv.paidAmount || inv.total || 0));
  }, 0);

  const currentTillCash = isShiftActive ? (startCash + totalCashSales) : 0;

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
        pb: { xs: 16, md: 0 },
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
        {/* Header Bar: Home Title + Mobile Till Cash Pill + SearchBar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.2rem', md: '2rem' } }}>
              الرئيسية
            </Typography>

            {/* Compact Mobile Till Cash Drawer Pill Badge */}
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 0.6,
                bgcolor: isShiftActive ? '#ECFDF5' : '#FEF2F2',
                border: '1.5px solid',
                borderColor: isShiftActive ? '#10B981' : '#EF4444',
                px: 1.2,
                py: 0.4,
                borderRadius: '20px',
                boxShadow: isShiftActive ? '0 2px 6px rgba(16, 185, 129, 0.15)' : 'none',
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 16, color: isShiftActive ? '#10B981' : '#EF4444' }} />
              <Typography variant="caption" sx={{ color: isShiftActive ? '#065F46' : '#991B1B', fontWeight: 900, fontSize: '0.78rem' }}>
                {isShiftActive ? `الخزنة: ${currentTillCash.toFixed(0)} ج.م` : 'الخزنة: مغلقة'}
              </Typography>
            </Box>
          </Box>

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

        {/* Desktop Bottom Footer Bar: Current Till Cash Drawer Badge */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
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
              bgcolor: isShiftActive ? '#ECFDF5' : '#FEF2F2',
              border: '1.5px solid',
              borderColor: isShiftActive ? '#10B981' : '#EF4444',
              px: 2.5,
              py: 0.8,
              borderRadius: '12px',
              boxShadow: isShiftActive ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                bgcolor: isShiftActive ? '#10B981' : '#EF4444',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: isShiftActive ? '#047857' : '#991B1B', fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                {isShiftActive ? 'المبلغ في الخزنة حالياً' : 'حالة الوردية'}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: isShiftActive ? '#065F46' : '#991B1B', fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.2 }}>
                {isShiftActive ? `${currentTillCash.toFixed(2)} ج.م` : 'شيفت مغلق'}
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
