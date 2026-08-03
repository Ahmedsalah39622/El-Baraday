'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Drawer, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, IconButton, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
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
import { printThermalReceipt } from '@/lib/printReceipt';

export default function POSPage() {
  const { products, fetchProducts } = useProductStore();
  const { items, addItem, updateQuantity, removeItem, clearOrder, orderType, setOrderType } = useOrderStore();
  const { invoices } = useInvoiceStore();
  const { activeShift } = useShiftStore();
  const { branches, selectedBranchId, setSelectedBranchId, fetchBranches } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const effectiveBranchId = isAdmin ? selectedBranchId : (user?.branch_id || user?.branchId || 'b1');

  useEffect(() => {
    fetchBranches();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [qtySmall, setQtySmall] = useState(1);
  const [qtyLarge, setQtyLarge] = useState(1);
  const [isSystemLoading, setIsSystemLoading] = useState(true);

  // Offer Customization Modal State
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedOfferProduct, setSelectedOfferProduct] = useState(null);
  const [offerHawawshiSelections, setOfferHawawshiSelections] = useState({});

  const defaultHawawshiFlavors = [
    { id: 'hw_1', name: 'حواوشي لحمة سادة', emoji: '🥩' },
    { id: 'hw_2', name: 'حواوشي ميكس أجبان', emoji: '🧀' },
    { id: 'hw_3', name: 'حواوشي فراخ', emoji: '🍗' },
    { id: 'hw_4', name: 'حواوشي سجق', emoji: '🌭' },
    { id: 'hw_5', name: 'حواوشي حار / حراق', emoji: '🌶️' },
    { id: 'hw_6', name: 'حواوشي بسطرمة', emoji: '🥓' },
  ];

  const getOfferFlavorsAndQuantities = (offerProduct, allCategory1Products, defaultFlavors) => {
    if (!offerProduct) return defaultFlavors;
    const text = `${offerProduct.name || ''} ${offerProduct.description || ''} ${offerProduct.offerComponents || ''}`.toLowerCase();

    const availableFlavors = (allCategory1Products && allCategory1Products.length > 0) 
      ? allCategory1Products 
      : defaultFlavors;

    const flavorRules = [
      { keywords: ['فراخ', 'دجاج', 'chick'], matchName: 'فراخ' },
      { keywords: ['أجبان', 'جبن', 'ميكس أجبان', 'جبنه', 'cheese'], matchName: 'أجبان' },
      { keywords: ['سجق', 'سوسيس'], matchName: 'سجق' },
      { keywords: ['بسطرمة', 'بسطرمه'], matchName: 'بسطرمة' },
      { keywords: ['مشروم', 'فطر'], matchName: 'مشروم' },
      { keywords: ['حراق', 'حار', 'spicy'], matchName: 'حار' },
      { keywords: ['سادة', 'لحمة', 'ساده', 'عادي'], matchName: 'سادة' },
    ];

    const matchedFlavors = availableFlavors.filter(flavor => {
      const fname = flavor.name.toLowerCase();
      for (const rule of flavorRules) {
        const textMatchesRule = rule.keywords.some(kw => text.includes(kw));
        const flavorMatchesRule = rule.keywords.some(kw => fname.includes(kw));
        if (textMatchesRule && flavorMatchesRule) return true;
      }
      return false;
    });

    if (matchedFlavors.length > 0) {
      return matchedFlavors;
    }

    if (text.includes('حواوشي') || text.includes('حواوشى')) {
      const plain = availableFlavors.filter(f => f.name.includes('سادة') || f.name.includes('لحمة'));
      if (plain.length > 0) return plain;
    }

    return availableFlavors;
  };

  const getOfferMaxHawawshi = (product) => {
    if (!product) return 2;
    const text = `${product.name} ${product.description || ''} ${product.offerComponents || ''}`;
    const match = text.match(/(\d+)\s*(?:حواوشي|حواوشى|رغيف|ساندوتش|قطع|قطعة)/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (product.name.includes('كينج') || product.name.includes('بوكس')) return 6;
    return 2;
  };

  const totalOfferHawawshisChosen = Object.values(offerHawawshiSelections).reduce((sum, sel) => sum + (sel.small || 0) + (sel.large || 0), 0);
  const maxOfferHawawshisAllowed = getOfferMaxHawawshi(selectedOfferProduct);

  const handleUpdateOfferHawawshiCount = (key, size, delta) => {
    const current = offerHawawshiSelections[key]?.[size] || 0;
    if (delta > 0 && totalOfferHawawshisChosen >= maxOfferHawawshisAllowed) {
      return; // Reached offer max limit
    }
    const nextVal = Math.max(0, current + delta);
    setOfferHawawshiSelections(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { name: key }),
        [size]: nextVal
      }
    }));
  };

  const handleConfirmAddOffer = () => {
    if (!selectedOfferProduct) return;
    
    const breakdown = [];
    Object.entries(offerHawawshiSelections).forEach(([key, sel]) => {
      const flavorName = sel.name || key;
      if (sel.large > 0) breakdown.push(`${sel.large}x ${flavorName} (كبير)`);
      if (sel.small > 0) breakdown.push(`${sel.small}x ${flavorName} (صغير)`);
    });

    const breakdownText = breakdown.length > 0 ? breakdown.join(' | ') : '';

    addItem({
      id: `${selectedOfferProduct.id}_${Date.now()}`,
      name: `عرض ${selectedOfferProduct.name}`,
      price: selectedOfferProduct.price,
      image: selectedOfferProduct.image,
      notes: breakdownText ? `التشكيل: ${breakdownText}` : '',
      quantity: 1,
    });

    setOfferModalOpen(false);
  };

  const knownOrderIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    // Clear old shift localStorage cache (we no longer use persist for shifts)
    try { localStorage.removeItem('el-baraday-shift-v2'); } catch (e) {}

    // Ultra-Fast Combined Single Init Request (Populates all stores in ~30ms)
    async function loadSystemData() {
      try {
        setIsSystemLoading(true);
        const url = isAdmin && selectedBranchId && selectedBranchId !== 'all'
          ? `/api/init?branch_id=${selectedBranchId}`
          : `/api/init?branch_id=${effectiveBranchId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.error) {
            console.warn('⚠️ Init load API error:', data.error);
            return;
          }
          
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
            data.orders.forEach(o => knownOrderIdsRef.current.add(o.id));
            initialLoadDoneRef.current = true;
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
              createdAt: o.created_at ? (new Date(o.created_at).toISOString ? new Date(o.created_at).toISOString() : String(o.created_at)) : new Date().toISOString(),
              branchId: o.branch_id,
              branch_id: o.branch_id,
            }));
            useInvoiceStore.setState({ invoices: mappedOrders });
          }

          if (data.shifts && Array.isArray(data.shifts)) {
            // Find active shift: for specific branch filter by branch_id, for 'all' find any active shift
            let active = null;
            if (effectiveBranchId && effectiveBranchId !== 'all') {
              active = data.shifts.find(s => s.status === 'active' && (s.branch_id === effectiveBranchId || (!s.branch_id && effectiveBranchId === 'b1')));
            } else {
              // Admin viewing 'all' branches → find any active shift (prefer b1)
              active = data.shifts.find(s => s.status === 'active' && (s.branch_id === 'b1' || !s.branch_id))
                    || data.shifts.find(s => s.status === 'active');
            }
            if (active) {
              const rawStart = active.start_time || active.created_at || new Date().toISOString();
              let formattedTime = '08:00 AM';
              try {
                formattedTime = new Date(rawStart).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {}

              useShiftStore.setState({
                shifts: data.shifts,
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
            } else if (data.shifts.length > 0) {
              // Only clear activeShift if we actually got shift data back (not empty due to error)
              useShiftStore.setState({ activeShift: null, shifts: data.shifts });
            }
            // If data.shifts is empty array, don't touch activeShift (could be DB error)
          }
          // If data.shifts is missing/not array, don't touch activeShift at all
        }
      } catch (err) {
        console.warn('⚠️ Init load fallback:', err.message);
      } finally {
        setIsSystemLoading(false);
      }
    }
    async function pollRealtimeData() {
      try {
        const branchParam = isAdmin && selectedBranchId && selectedBranchId !== 'all'
          ? selectedBranchId
          : effectiveBranchId;
          
        const ordersUrl = `/api/orders?branch_id=${branchParam}`;
        const shiftsUrl = branchParam && branchParam !== 'all'
          ? `/api/shifts?branch_id=${branchParam}`
          : '/api/shifts';

        const [ordersRes, shiftsRes] = await Promise.all([
          fetch(ordersUrl),
          fetch(shiftsUrl)
        ]);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData && !ordersData.error && Array.isArray(ordersData)) {
            const newOrdersToPrint = [];

            ordersData.forEach((o) => {
              if (initialLoadDoneRef.current && !knownOrderIdsRef.current.has(o.id)) {
                const matchBranch = !effectiveBranchId || effectiveBranchId === 'all' || o.branch_id === effectiveBranchId || o.branchId === effectiveBranchId;
                const isRemote = o.cashier_name !== user?.name && o.cashier_name !== user?.username;
                if (matchBranch && isRemote) {
                  newOrdersToPrint.push(o);
                }
              }
              knownOrderIdsRef.current.add(o.id);
            });

            const mappedOrders = ordersData.map((o) => ({
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
              createdAt: o.created_at ? (new Date(o.created_at).toISOString ? new Date(o.created_at).toISOString() : String(o.created_at)) : new Date().toISOString(),
              branchId: o.branch_id,
              branch_id: o.branch_id,
            }));
            useInvoiceStore.setState({ invoices: mappedOrders });

            // Automatically print incoming remote orders for this branch
            newOrdersToPrint.forEach((ord) => {
              try {
                const printObj = {
                  id: ord.id,
                  orderNumber: String(ord.order_number || ord.orderNumber || '1'),
                  orderType: ord.order_type || ord.orderType || 'takeaway',
                  customerName: ord.customer_name || ord.customerName || '',
                  customerPhone: ord.customer_phone || ord.customerPhone || '',
                  customerAddress: ord.customer_address || ord.customerAddress || ord.address || '',
                  customerFloor: ord.customer_floor || ord.customerFloor || ord.floor || '',
                  customerApartment: ord.customer_apartment || ord.customerApartment || ord.apartment || '',
                  cashierName: ord.cashier_name || ord.cashierName || 'الكاشير',
                  driverName: ord.driver_name || ord.driverName || '',
                  items: ord.items || [],
                  subtotal: parseFloat(ord.subtotal || 0),
                  total: parseFloat(ord.total || 0),
                  paidAmount: parseFloat(ord.paid_amount || ord.paidAmount || 0),
                  remainingAmount: parseFloat(ord.remaining_amount || ord.remainingAmount || 0),
                  deliveryFee: parseFloat(ord.delivery_fee || ord.deliveryFee || 0),
                  discount: parseFloat(ord.discount || 0),
                  notes: ord.notes || ord.orderNotes || '',
                  createdAt: ord.created_at || ord.createdAt,
                  branch_id: ord.branch_id || ord.branchId
                };
                printThermalReceipt(printObj);
              } catch (err) {
                console.error('❌ Remote order thermal print failed:', err);
              }
            });
          }
        }

        // Always refresh shift status from DB
        if (shiftsRes.ok) {
          const shiftsData = await shiftsRes.json();
          if (shiftsData && !shiftsData.error && Array.isArray(shiftsData) && shiftsData.length > 0) {
            let active = null;
            if (branchParam && branchParam !== 'all') {
              active = shiftsData.find(s => s.status === 'active' && (s.branch_id === branchParam || (!s.branch_id && branchParam === 'b1')));
            } else {
              active = shiftsData.find(s => s.status === 'active' && (s.branch_id === 'b1' || !s.branch_id))
                    || shiftsData.find(s => s.status === 'active');
            }
            if (active) {
              const rawStart = active.start_time || active.created_at || new Date().toISOString();
              let formattedTime = '08:00 AM';
              try { formattedTime = new Date(rawStart).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
              useShiftStore.setState({
                shifts: shiftsData,
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
              useShiftStore.setState({ activeShift: null, shifts: shiftsData });
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Realtime polling error:', err.message);
      }
    }

    loadSystemData();

    // Re-fetch full data when user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadSystemData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fast 3s background sync (realtime speed, only when tab is visible)
    let isPolling = false;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isPolling) {
        isPolling = true;
        pollRealtimeData().finally(() => { isPolling = false; });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedBranchId, effectiveBranchId, isAdmin]);

  // Active shift resolution for Branch 1 and Branch 2
  const { shifts: allShiftsList } = useShiftStore();
  const getBranchActiveShift = (targetBranchId) => {
    const list = (allShiftsList && allShiftsList.length > 0) ? allShiftsList : (activeShift ? [activeShift] : []);
    const found = list.find(s => s.status === 'active' && (s.branch_id === targetBranchId || (!s.branch_id && targetBranchId === 'b1')));
    if (!found) return null;
    return {
      id: found.id,
      cashierName: found.cashier_name || found.cashierName || 'administrator',
      rawStartTime: found.start_time || found.rawStartTime || found.created_at,
      startAmount: parseFloat(found.start_amount || found.startAmount || 0),
      status: 'active',
      branch_id: found.branch_id || targetBranchId
    };
  };

  const b1ActiveShift = getBranchActiveShift('b1');
  const b2ActiveShift = getBranchActiveShift('b2');

  // Calculate Branch 1 cash drawer amount: Returns 0.00 if Branch 1 shift is CLOSED
  const b1CashSales = !b1ActiveShift ? 0 : b1ActiveShift.startAmount + (invoices || []).reduce((sum, inv) => {
    const invBranch = inv.branchId || inv.branch_id || 'b1';
    if (invBranch !== 'b1') return sum;
    if (inv.status === 'cancelled') return sum;

    if (b1ActiveShift.rawStartTime && inv.createdAt) {
      const invTime = new Date(inv.createdAt).getTime();
      const shiftStartTime = new Date(b1ActiveShift.rawStartTime).getTime();
      if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < (shiftStartTime - 300000)) return sum;
    }

    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    return sum + (parseFloat(inv.paidAmount || inv.total || 0));
  }, 0);

  // Calculate Branch 2 cash drawer amount: Returns 0.00 if Branch 2 shift is CLOSED
  const b2CashSales = !b2ActiveShift ? 0 : b2ActiveShift.startAmount + (invoices || []).reduce((sum, inv) => {
    const invBranch = inv.branchId || inv.branch_id || 'b1';
    if (invBranch !== 'b2') return sum;
    if (inv.status === 'cancelled') return sum;

    if (b2ActiveShift.rawStartTime && inv.createdAt) {
      const invTime = new Date(inv.createdAt).getTime();
      const shiftStartTime = new Date(b2ActiveShift.rawStartTime).getTime();
      if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < (shiftStartTime - 300000)) return sum;
    }

    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    return sum + (parseFloat(inv.paidAmount || inv.total || 0));
  }, 0);

  const isShiftActive = activeShift && activeShift.status === 'active';
  const currentTillCash = isAdmin
    ? (selectedBranchId === 'all'
        ? (b1CashSales + b2CashSales)
        : (selectedBranchId === 'b2' ? b2CashSales : b1CashSales))
    : (effectiveBranchId === 'b2' ? b2CashSales : b1CashSales);

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
    if (product.isOffer || product.categoryId === '5') {
      setSelectedOfferProduct(product);
      const initSelections = {};
      const category1Prods = (products || []).filter(p => p.categoryId === '1');
      const listToUse = getOfferFlavorsAndQuantities(product, category1Prods, defaultHawawshiFlavors);

      listToUse.forEach(item => {
        const itemKey = item.id || item.name;
        initSelections[itemKey] = { small: 0, large: 0, name: item.name };
      });

      setOfferHawawshiSelections(initSelections);
      setOfferModalOpen(true);
    } else if (product.hasMultipleSizes) {
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
        {/* Header Section: Title, Admin Branch Selector, Till Badges, SearchBar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.2,
            width: '100%',
          }}
        >
          {/* Top Row: Title + Admin Branch Selector */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.25rem', md: '1.8rem' } }}>
                الرئيسية
              </Typography>

              {isAdmin && (
                <FormControl size="small" sx={{ minWidth: { xs: 130, sm: 160 } }}>
                  <Select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    sx={{ borderRadius: '12px', bgcolor: '#FFF', fontWeight: 800, height: 36, fontSize: '0.82rem' }}
                  >
                    <MenuItem value="all">🏢 كافـة الفـروع</MenuItem>
                    {(branches || []).map((b) => (
                      <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>

          {/* Mobile Till Cash Badges Row: 2 Balanced Cards (Branch 1 & Branch 2) */}
          {isAdmin && (
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                width: '100%',
                gap: 1,
              }}
            >
              {/* Branch 1 Mobile Cash Pill */}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b1ActiveShift ? '#ECFDF5' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b1ActiveShift ? '#10B981' : '#CBD5E1'),
                  px: 1.2,
                  py: 0.6,
                  borderRadius: '12px',
                  boxShadow: isSystemLoading ? 'none' : (b1ActiveShift ? '0 2px 4px rgba(16, 185, 129, 0.1)' : 'none'),
                }}
              >
                <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (b1ActiveShift ? '#047857' : '#64748B'), fontWeight: 800, fontSize: '0.65rem', display: 'block', lineHeight: 1 }}>
                    فرع عزت
                  </Typography>
                  {isSystemLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                      <CircularProgress size={11} sx={{ color: '#64748B' }} />
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.7rem' }}>جاري التحقق...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: b1ActiveShift ? '#065F46' : '#64748B', fontWeight: 900, fontSize: '0.82rem', lineHeight: 1.1 }}>
                      {b1ActiveShift ? `${b1CashSales.toFixed(0)} ج.م` : '🔒 مغلق'}
                    </Typography>
                  )}
                </Box>
                <Store sx={{ fontSize: 18, color: isSystemLoading ? '#94A3B8' : (b1ActiveShift ? '#10B981' : '#94A3B8') }} />
              </Box>

              {/* Branch 2 Mobile Cash Pill */}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b2ActiveShift ? '#EFF6FF' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b2ActiveShift ? '#3B82F6' : '#CBD5E1'),
                  px: 1.2,
                  py: 0.6,
                  borderRadius: '12px',
                  boxShadow: isSystemLoading ? 'none' : (b2ActiveShift ? '0 2px 4px rgba(59, 130, 246, 0.1)' : 'none'),
                }}
              >
                <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (b2ActiveShift ? '#1E40AF' : '#64748B'), fontWeight: 800, fontSize: '0.65rem', display: 'block', lineHeight: 1 }}>
                    فرع المسلة
                  </Typography>
                  {isSystemLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                      <CircularProgress size={11} sx={{ color: '#64748B' }} />
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.7rem' }}>جاري التحقق...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: b2ActiveShift ? '#1D4ED8' : '#64748B', fontWeight: 900, fontSize: '0.82rem', lineHeight: 1.1 }}>
                      {b2ActiveShift ? `${b2CashSales.toFixed(0)} ج.م` : '🔒 مغلق'}
                    </Typography>
                  )}
                </Box>
                <Store sx={{ fontSize: 18, color: isSystemLoading ? '#94A3B8' : (b2ActiveShift ? '#3B82F6' : '#94A3B8') }} />
              </Box>
            </Box>
          )}

          {/* Search Bar Row */}
          <Box sx={{ width: '100%' }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </Box>
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
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b1ActiveShift ? '#ECFDF5' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b1ActiveShift ? '#10B981' : '#CBD5E1'),
                  px: 1.8,
                  py: 0.6,
                  borderRadius: '12px',
                  boxShadow: isSystemLoading ? 'none' : (b1ActiveShift ? '0 2px 6px rgba(16, 185, 129, 0.12)' : 'none'),
                }}
              >
                <Store sx={{ color: isSystemLoading ? '#94A3B8' : (b1ActiveShift ? '#10B981' : '#64748B'), fontSize: 20 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (b1ActiveShift ? '#047857' : '#64748B'), fontWeight: 800, display: 'block', lineHeight: 1.1, fontSize: '0.72rem' }}>
                    خزنة فرع عزت
                  </Typography>
                  {isSystemLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.2 }}>
                      <CircularProgress size={12} sx={{ color: '#64748B' }} />
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.78rem' }}>جاري التحقق...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="subtitle2" sx={{ color: b1ActiveShift ? '#065F46' : '#64748B', fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>
                      {b1ActiveShift ? `${b1CashSales.toFixed(2)} ج.م` : '🔒 الشيفت مغلق'}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Branch 2 Till Cash */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b2ActiveShift ? '#EFF6FF' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b2ActiveShift ? '#3B82F6' : '#CBD5E1'),
                  px: 1.8,
                  py: 0.6,
                  borderRadius: '12px',
                  boxShadow: isSystemLoading ? 'none' : (b2ActiveShift ? '0 2px 6px rgba(59, 130, 246, 0.12)' : 'none'),
                }}
              >
                <Store sx={{ color: isSystemLoading ? '#94A3B8' : (b2ActiveShift ? '#3B82F6' : '#64748B'), fontSize: 20 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (b2ActiveShift ? '#1E40AF' : '#64748B'), fontWeight: 800, display: 'block', lineHeight: 1.1, fontSize: '0.72rem' }}>
                    خزنة فرع المسلة
                  </Typography>
                  {isSystemLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.2 }}>
                      <CircularProgress size={12} sx={{ color: '#64748B' }} />
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.78rem' }}>جاري التحقق...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="subtitle2" sx={{ color: b2ActiveShift ? '#1D4ED8' : '#64748B', fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>
                      {b2ActiveShift ? `${b2CashSales.toFixed(2)} ج.م` : '🔒 الشيفت مغلق'}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: isSystemLoading ? '#F8FAFC' : (isShiftActive ? '#ECFDF5' : '#FEF2F2'),
                border: '1.5px solid',
                borderColor: isSystemLoading ? '#E2E8F0' : (isShiftActive ? '#10B981' : '#EF4444'),
                px: 2.5,
                py: 0.8,
                borderRadius: '12px',
                boxShadow: isSystemLoading ? 'none' : (isShiftActive ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'),
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  bgcolor: isSystemLoading ? '#94A3B8' : (isShiftActive ? '#10B981' : '#EF4444'),
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSystemLoading ? <CircularProgress size={16} sx={{ color: '#FFF' }} /> : <AccountBalanceWallet sx={{ fontSize: 20 }} />}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (isShiftActive ? '#047857' : '#991B1B'), fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                  {isSystemLoading ? 'جاري التحقق من حالة الوردية' : (isShiftActive ? 'المبلغ في الخزنة حالياً' : 'حالة الوردية')}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: isSystemLoading ? '#64748B' : (isShiftActive ? '#065F46' : '#991B1B'), fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.2 }}>
                  {isSystemLoading ? 'جاري التحميل...' : (isShiftActive ? `${currentTillCash.toFixed(2)} ج.م` : 'شيفت مغلق')}
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
        slotProps={{
          paper: {
            sx: {
              height: '92vh',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              overflow: 'hidden',
            },
          }
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
        slotProps={{
          paper: {
            sx: { borderRadius: '24px', p: 1.5 }
          }
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

      {/* Offer Customization Dialog Modal */}
      <Dialog
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '24px', p: 1.5 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', color: '#1A1A2E', pb: 0.5, fontSize: '1.25rem' }}>
          🏷️ تخصيص مكونات العرض ({selectedOfferProduct?.name})
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Offer Banner Info & Limit Status */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: totalOfferHawawshisChosen === maxOfferHawawshisAllowed ? '#ECFDF5' : '#FFFBEB',
              border: '1.5px solid',
              borderColor: totalOfferHawawshisChosen === maxOfferHawawshisAllowed ? '#10B981' : '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1E293B' }}>
                سعر العرض المميز: {selectedOfferProduct?.price} ج.م
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: totalOfferHawawshisChosen === maxOfferHawawshisAllowed ? '#047857' : '#B45309', display: 'block', mt: 0.2 }}>
                {totalOfferHawawshisChosen === maxOfferHawawshisAllowed
                  ? '✓ تم استيفاء التشكيل المطلوب لهذا العرض بنجاح'
                  : `اختر الأنواع والأحجام المطلوبة (العدد المكتمل المسموح: ${maxOfferHawawshisAllowed} قطعة)`}
              </Typography>
            </Box>

            <Chip
              label={`${totalOfferHawawshisChosen} من ${maxOfferHawawshisAllowed}`}
              sx={{
                bgcolor: totalOfferHawawshisChosen === maxOfferHawawshisAllowed ? '#10B981' : '#F59E0B',
                color: '#FFF',
                fontWeight: 900,
                fontSize: '0.95rem',
                height: 32,
              }}
            />
          </Paper>

          {/* Flavors List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '55vh', overflowY: 'auto', pr: 0.5 }}>
            {(() => {
              const category1Prods = (products || []).filter(p => p.categoryId === '1');
              const listToUse = category1Prods.length > 0 ? category1Prods : defaultHawawshiFlavors;

              return listToUse.map((flavor) => {
                const key = flavor.id || flavor.name;
                const sel = offerHawawshiSelections[key] || { small: 0, large: 0 };
                const isLimitReached = totalOfferHawawshisChosen >= maxOfferHawawshisAllowed;

                return (
                  <Paper
                    key={key}
                    variant="outlined"
                    sx={{
                      p: 1.8,
                      borderRadius: '16px',
                      borderColor: '#E2E8F0',
                      bgcolor: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.2,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E293B', fontSize: '1.05rem' }}>
                      {flavor.emoji || '🍔'} {flavor.name}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      {/* Large Size Control */}
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 140,
                          bgcolor: '#FFFFFF',
                          p: 1.2,
                          borderRadius: '12px',
                          border: '1.5px solid #BFDBFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 900, color: '#1D4ED8', fontSize: '0.9rem' }}>
                          🔵 كبير
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateOfferHawawshiCount(key, 'large', -1)}
                            disabled={!sel.large}
                            sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', width: 28, height: 28, fontWeight: 900 }}
                          >
                            -
                          </IconButton>
                          <Typography sx={{ fontWeight: 900, minWidth: 20, textAlign: 'center', fontSize: '0.95rem', color: '#1E40AF' }}>
                            {sel.large || 0}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateOfferHawawshiCount(key, 'large', 1)}
                            disabled={isLimitReached}
                            sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', width: 28, height: 28, fontWeight: 900 }}
                          >
                            +
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Small Size Control */}
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 140,
                          bgcolor: '#FFFFFF',
                          p: 1.2,
                          borderRadius: '12px',
                          border: '1.5px solid #FCD34D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 900, color: '#D97706', fontSize: '0.9rem' }}>
                          🟡 صغير
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateOfferHawawshiCount(key, 'small', -1)}
                            disabled={!sel.small}
                            sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 28, height: 28, fontWeight: 900 }}
                          >
                            -
                          </IconButton>
                          <Typography sx={{ fontWeight: 900, minWidth: 20, textAlign: 'center', fontSize: '0.95rem', color: '#B45309' }}>
                            {sel.small || 0}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateOfferHawawshiCount(key, 'small', 1)}
                            disabled={isLimitReached}
                            sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 28, height: 28, fontWeight: 900 }}
                          >
                            +
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                );
              });
            })()}
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 1.5 }}>
          <Button onClick={() => setOfferModalOpen(false)} sx={{ color: '#6B7280', fontWeight: 800 }}>
            إلغاء
          </Button>

          <Button
            variant="contained"
            onClick={handleConfirmAddOffer}
            disabled={totalOfferHawawshisChosen !== maxOfferHawawshisAllowed}
            sx={{
              bgcolor: totalOfferHawawshisChosen === maxOfferHawawshisAllowed ? '#10B981' : '#9CA3AF',
              '&:hover': { bgcolor: '#059669' },
              borderRadius: '12px',
              fontWeight: 800,
              px: 3,
              py: 1,
            }}
          >
            إضافة العرض للطلب 🚀
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
