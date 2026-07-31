'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Button, Drawer, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, IconButton } from '@mui/material';
import { ShoppingBagOutlined, AccountBalanceWallet, Store } from '@mui/icons-material';
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
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function POSPage() {
  const { products, fetchProducts } = useProductStore();
  const { items, addItem, updateQuantity, removeItem, clearOrder, orderType, setOrderType } = useOrderStore();
  const { invoices } = useInvoiceStore();
  const { activeShift } = useShiftStore();
  const { selectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [qtySmall, setQtySmall] = useState(1);
  const [qtyLarge, setQtyLarge] = useState(1);

  useEffect(() => {
    // Ultra-Fast Combined Single Init Request (Populates all stores in ~30ms)
    async function loadSystemData() {
      try {
        const url = selectedBranchId && selectedBranchId !== 'all' ? `/api/init?branch_id=${selectedBranchId}` : '/api/init';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          
          if (data.products && data.products.length > 0) {
            const mappedDB = data.products.map((r) => ({
              id: r.id,
              categoryId: r.category_id,
              name: r.name,
              price: parseFloat(r.price),
              size: r.size,
              image: r.image_url,
              description: r.description,
              is_available: r.is_available,
              sortOrder: parseInt(r.sort_order) || 0,
            }));

            const currentProds = useProductStore.getState().products || [];
            const dbMap = new Map(mappedDB.map(i => [i.id, i]));
            const merged = currentProds.map(p => dbMap.has(p.id) ? { ...p, ...dbMap.get(p.id) } : p);
            dbMap.forEach((val, key) => {
              if (!currentProds.some(cp => cp.id === key)) {
                merged.push(val);
              }
            });

            useProductStore.setState({
              products: merged.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            });
          }

          if (data.customers && data.customers.length > 0) {
            const mappedCustomers = data.customers.map(r => {
              const mainAddress = r.address || '';
              const mainFloor = r.floor || '';
              const mainApartment = r.apartment || '';
              const mainDeliveryFee = r.delivery_fee !== undefined && r.delivery_fee !== null ? parseFloat(r.delivery_fee) : (r.deliveryFee !== undefined ? parseFloat(r.deliveryFee) : 15);

              let parsedAddresses = [];
              if (Array.isArray(r.addresses)) {
                parsedAddresses = r.addresses;
              } else if (typeof r.addresses === 'string') {
                try { parsedAddresses = JSON.parse(r.addresses); } catch (e) {}
              }

              if (!Array.isArray(parsedAddresses) || parsedAddresses.length === 0) {
                parsedAddresses = [{ address: mainAddress, floor: mainFloor, apartment: mainApartment, deliveryFee: mainDeliveryFee }];
              } else {
                parsedAddresses = parsedAddresses.map(a => ({
                  ...a,
                  deliveryFee: a.deliveryFee !== undefined ? parseFloat(a.deliveryFee) : (a.delivery_fee !== undefined ? parseFloat(a.delivery_fee) : mainDeliveryFee)
                }));
              }

              return {
                id: r.id,
                name: r.name,
                phone: r.phone,
                address: mainAddress,
                floor: mainFloor,
                apartment: mainApartment,
                deliveryFee: mainDeliveryFee,
                addresses: parsedAddresses,
                totalTransactions: r.total_orders || 0,
                totalSpend: parseFloat(r.total_spend || 0)
              };
            });
            useCustomerStore.setState({ customers: mappedCustomers });
          }
          if (data.areas && data.areas.length > 0) useCustomerStore.setState({ deliveryAreas: data.areas });
          if (data.drivers && data.drivers.length > 0) useCustomerStore.setState({ drivers: data.drivers });
          if (data.activeAttendanceQueue) useCustomerStore.setState({ activeQueue: data.activeAttendanceQueue });
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
              branchId: o.branch_id,
              branch_id: o.branch_id,
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
                  branch_id: active.branch_id
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
  }, [selectedBranchId]);

  // Calculate current till cash drawer amount for active shift and isolated branch only
  const isShiftActive = activeShift && activeShift.status === 'active';
  const startCash = isShiftActive ? (parseFloat(activeShift.startAmount) || 0) : 0;
  
  const totalCashSales = (invoices || []).reduce((sum, inv) => {
    if (!isShiftActive) return sum;
    if (selectedBranchId && selectedBranchId !== 'all') {
      const invBranch = inv.branchId || inv.branch_id || 'b1';
      if (invBranch !== selectedBranchId) return sum;
    }
    if (activeShift?.rawStartTime && inv.createdAt) {
      const invTime = new Date(inv.createdAt).getTime();
      const shiftStartTime = new Date(activeShift.rawStartTime).getTime();
      if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < shiftStartTime) {
        return sum; // Skip invoices before shift start
      }
    }

    // Exclude delivery orders from till cash drawer until cash is explicitly collected from driver
    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    return sum + (parseFloat(inv.paidAmount || inv.total || 0));
  }, 0);

  const currentTillCash = isShiftActive ? (startCash + totalCashSales) : 0;

  // Calculate Cash drawer totals for Branch 1 and Branch 2 for Admin View (excluding uncollected delivery cash)
  const b1CashSales = (invoices || []).reduce((sum, inv) => {
    const invBranch = inv.branchId || inv.branch_id || 'b1';
    if (invBranch !== 'b1') return sum;

    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    return sum + (parseFloat(inv.paidAmount || inv.total || 0));
  }, 0);

  const b2CashSales = (invoices || []).reduce((sum, inv) => {
    const invBranch = inv.branchId || inv.branch_id || 'b1';
    if (invBranch !== 'b2') return sum;

    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    return sum + (parseFloat(inv.paidAmount || inv.total || 0));
  }, 0);

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
  const total = subtotal;

  const handleSelectProduct = (product) => {
    if (product.hasMultipleSizes) {
      setSelectedProductForSize(product);
      setQtySmall(1);
      setQtyLarge(1);
      setSizeModalOpen(true);
    } else {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }
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
        {/* Header Bar: Home Title + Mobile Till Cash Badges (Both Branches) + SearchBar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 1.5,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.2rem', md: '2rem' } }}>
              الرئيسية
            </Typography>

            {/* Mobile Till Cash Badges: Displaying Both Branches 1 & 2 */}
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 0.8,
              }}
            >
              {/* Branch 1 Mobile Cash Pill */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: '#ECFDF5',
                  border: '1.5px solid #10B981',
                  px: 1,
                  py: 0.3,
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)',
                }}
              >
                <Store sx={{ fontSize: 14, color: '#10B981' }} />
                <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, fontSize: '0.6rem', display: 'block', lineHeight: 1 }}>
                    ف 1 الرئيسي
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.78rem', lineHeight: 1.1 }}>
                    {b1CashSales.toFixed(0)} ج.م
                  </Typography>
                </Box>
              </Box>

              {/* Branch 2 Mobile Cash Pill */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: '#EFF6FF',
                  border: '1.5px solid #3B82F6',
                  px: 1,
                  py: 0.3,
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
                }}
              >
                <Store sx={{ fontSize: 14, color: '#3B82F6' }} />
                <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 800, fontSize: '0.6rem', display: 'block', lineHeight: 1 }}>
                    ف 2 الثاني
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 900, fontSize: '0.78rem', lineHeight: 1.1 }}>
                    {b2CashSales.toFixed(0)} ج.م
                  </Typography>
                </Box>
              </Box>
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
          {isAdmin ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Branch 1 Till Cash */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: '#ECFDF5',
                  border: '1.5px solid #10B981',
                  px: 1.8,
                  py: 0.6,
                  borderRadius: '12px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.12)',
                }}
              >
                <Store sx={{ color: '#10B981', fontSize: 20 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, display: 'block', lineHeight: 1.1, fontSize: '0.72rem' }}>
                    خزنة الفرع الأول
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {b1CashSales.toFixed(2)} ج.م
                  </Typography>
                </Box>
              </Box>

              {/* Branch 2 Till Cash */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: '#EFF6FF',
                  border: '1.5px solid #3B82F6',
                  px: 1.8,
                  py: 0.6,
                  borderRadius: '12px',
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.12)',
                }}
              >
                <Store sx={{ color: '#3B82F6', fontSize: 20 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 800, display: 'block', lineHeight: 1.1, fontSize: '0.72rem' }}>
                    خزنة الفرع الثاني
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: '#1D4ED8', fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {b2CashSales.toFixed(2)} ج.م
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
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
          )}
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
          total={total}
          onCloseMobile={() => setMobileCartOpen(false)}
        />
      </Drawer>

      {/* Size Selection Dialog Modal */}
      <Dialog
        open={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '24px', p: 1.5 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', color: '#1A1A2E', pb: 0.5, fontSize: '1.3rem' }}>
          📏 اختر الحجم والكمية المطلـوبة
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#4285F4', mb: 2, fontSize: '1.1rem' }}>
            {selectedProductForSize?.name}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Small Size Option Card */}
            {(() => {
              const p = selectedProductForSize;
              const pSmall = p?.priceSmall || p?.sizes?.[0]?.price || 45;

              return (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    borderColor: '#F59E0B',
                    bgcolor: '#FFFBEB',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#D97706', fontSize: '1.1rem' }}>
                      🟡 حجم صغير
                    </Typography>
                    <Chip
                      label={`${pSmall} ج.م`}
                      sx={{ bgcolor: '#F59E0B', color: '#FFF', fontWeight: 900, fontSize: '0.95rem' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                    {/* Quantity Stepper */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: '#FFFFFF', p: 0.5, borderRadius: '12px', border: '1.5px solid #FCD34D' }}>
                      <IconButton
                        size="small"
                        onClick={() => setQtySmall(Math.max(1, qtySmall - 1))}
                        sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 30, height: 30, fontWeight: 900 }}
                      >
                        -
                      </IconButton>
                      <Typography sx={{ fontWeight: 900, px: 1, minWidth: 22, textAlign: 'center', fontSize: '1rem', color: '#B45309' }}>
                        {qtySmall}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setQtySmall(qtySmall + 1)}
                        sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 30, height: 30, fontWeight: 900 }}
                      >
                        +
                      </IconButton>
                    </Box>

                    {/* Add to Cart Button */}
                    <Button
                      variant="contained"
                      onClick={() => {
                        addItem({
                          id: `${p.id}_صغير`,
                          name: `${p.name} (صغير)`,
                          price: pSmall,
                          image: p.image,
                          size: 'صغير',
                          quantity: qtySmall,
                        });
                        setSizeModalOpen(false);
                      }}
                      sx={{
                        bgcolor: '#F59E0B',
                        '&:hover': { bgcolor: '#D97706' },
                        borderRadius: '12px',
                        fontWeight: 800,
                        px: 2,
                        py: 0.8,
                        fontSize: '0.85rem',
                      }}
                    >
                      + إضافة {qtySmall > 1 ? `(${qtySmall})` : ''} للفاتورة
                    </Button>
                  </Box>
                </Paper>
              );
            })()}

            {/* Large Size Option Card */}
            {(() => {
              const p = selectedProductForSize;
              const pLarge = p?.priceLarge || p?.sizes?.[1]?.price || p?.price || 75;

              return (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    borderColor: '#3B82F6',
                    bgcolor: '#F0F7FF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#1D4ED8', fontSize: '1.1rem' }}>
                      🔵 حجم كبير
                    </Typography>
                    <Chip
                      label={`${pLarge} ج.م`}
                      sx={{ bgcolor: '#3B82F6', color: '#FFF', fontWeight: 900, fontSize: '0.95rem' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                    {/* Quantity Stepper */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: '#FFFFFF', p: 0.5, borderRadius: '12px', border: '1.5px solid #BFDBFE' }}>
                      <IconButton
                        size="small"
                        onClick={() => setQtyLarge(Math.max(1, qtyLarge - 1))}
                        sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', width: 30, height: 30, fontWeight: 900 }}
                      >
                        -
                      </IconButton>
                      <Typography sx={{ fontWeight: 900, px: 1, minWidth: 22, textAlign: 'center', fontSize: '1rem', color: '#1E40AF' }}>
                        {qtyLarge}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setQtyLarge(qtyLarge + 1)}
                        sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', width: 30, height: 30, fontWeight: 900 }}
                      >
                        +
                      </IconButton>
                    </Box>

                    {/* Add to Cart Button */}
                    <Button
                      variant="contained"
                      onClick={() => {
                        addItem({
                          id: `${p.id}_كبير`,
                          name: `${p.name} (كبير)`,
                          price: pLarge,
                          image: p.image,
                          size: 'كبير',
                          quantity: qtyLarge,
                        });
                        setSizeModalOpen(false);
                      }}
                      sx={{
                        bgcolor: '#3B82F6',
                        '&:hover': { bgcolor: '#1D4ED8' },
                        borderRadius: '12px',
                        fontWeight: 800,
                        px: 2,
                        py: 0.8,
                        fontSize: '0.85rem',
                      }}
                    >
                      + إضافة {qtyLarge > 1 ? `(${qtyLarge})` : ''} للفاتورة
                    </Button>
                  </Box>
                </Paper>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pt: 1 }}>
          <Button onClick={() => setSizeModalOpen(false)} sx={{ color: '#6B7280', fontWeight: 800, fontSize: '0.95rem' }}>
            إلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
