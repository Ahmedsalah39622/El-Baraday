'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Button, Drawer, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Paper, IconButton, FormControl, Select, MenuItem, CircularProgress, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import { ShoppingBagOutlined, AccountBalanceWallet, Store } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import CategoryTabs from '@/components/pos/CategoryTabs';
import ProductGrid from '@/components/pos/ProductGrid';
import OrderDetailsPanel from '@/components/pos/OrderDetailsPanel';
import { useProductStore, mapProduct } from '@/store/useProductStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useTableStore } from '@/store/useTableStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useShiftStore } from '@/store/useShiftStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { printThermalReceipt, playOrderNotificationSound, isOrderPrinted, markOrderAsPrinted } from '@/lib/printReceipt';
import OperationsDashboard from '@/components/dashboard/OperationsDashboard';
import { AssessmentOutlined } from '@mui/icons-material';

export default function POSPage() {
  const { products, fetchProducts } = useProductStore();
  const { items, addItem, updateQuantity, removeItem, clearOrder, orderType, setOrderType } = useOrderStore();
  const { invoices } = useInvoiceStore();
  const { activeShift } = useShiftStore();
  const { branches, selectedBranchId, setSelectedBranchId, fetchBranches } = useBranchStore();
  const { user, hasPermission, canViewSafeBalance } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const canSeeSafe = isAdmin || (typeof canViewSafeBalance === 'function' ? canViewSafeBalance() : user?.permissions?.includes('show_safe_balance'));
  const hasPosPermission = isAdmin || hasPermission('/');
  const [adminViewMode, setAdminViewMode] = useState('pos'); // 'pos' | 'dashboard'
  const effectiveBranchId = isAdmin ? selectedBranchId : (user?.branch_id || user?.branchId || 'b1');

  useEffect(() => {
    useAuthStore.getState().syncUserWithServer?.();
    fetchBranches();
    useCustomerStore.getState().fetchCustomers();
    useCustomerStore.getState().fetchDrivers();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [qtySmall, setQtySmall] = useState(1);
  const [qtyLarge, setQtyLarge] = useState(1);
  const [isSystemLoading, setIsSystemLoading] = useState(true);

  const autoPrintedPosOrders = useRef(new Set());
  const isInitialPosFetch = useRef(true);
  const [incomingOrderNotification, setIncomingOrderNotification] = useState(null);

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
      product_id: selectedOfferProduct.id,
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
          
          if (data.products && Array.isArray(data.products)) {
            const mappedDB = data.products.map(mapProduct);
            useProductStore.setState({
              products: mappedDB.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
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
              paymentMethod: o.payment_method || o.paymentMethod || 'cash',
              payment_method: o.payment_method || o.paymentMethod || 'cash',
              is_cash_collected: Boolean(o.is_cash_collected ?? o.isCashCollected),
              isCashCollected: Boolean(o.is_cash_collected ?? o.isCashCollected),
              status: o.status,
              createdAt: o.created_at ? (new Date(o.created_at).toISOString ? new Date(o.created_at).toISOString() : String(o.created_at)) : new Date().toISOString(),
              shiftId: o.shift_id || o.shiftId || null,
              shift_id: o.shift_id || o.shiftId || null,
              branchId: o.branch_id || o.branchId || 'b1',
              branch_id: o.branch_id || o.branchId || 'b1',
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
          if (ordersData && Array.isArray(ordersData)) {
            const mappedOrders = ordersData.map((o) => ({
              id: o.id,
              orderNumber: String(o.order_number),
              invoiceNumber: `INV-${o.order_number}`,
              orderType: o.order_type,
              customerName: o.customer_name,
              customerPhone: o.customer_phone,
              customerAddress: o.customer_address,
              customerFloor: o.customer_floor || o.floor || '',
              customerApartment: o.customer_apartment || o.apartment || '',
              notes: o.notes || o.order_notes || '',
              orderNotes: o.notes || o.order_notes || '',
              sourceBranchName: o.source_branch_name || o.sourceBranchName || '',
              source_branch_name: o.source_branch_name || o.sourceBranchName || '',
              cashierName: o.cashier_name,
              driverName: o.driver_name,
              subtotal: parseFloat(o.subtotal || 0),
              total: parseFloat(o.total || 0),
              paidAmount: parseFloat(o.paid_amount || 0),
              remainingAmount: parseFloat(o.remaining_amount || 0),
              deliveryFee: parseFloat(o.delivery_fee || 0),
              discount: parseFloat(o.discount || 0),
              paymentMethod: o.payment_method || o.paymentMethod || 'cash',
              payment_method: o.payment_method || o.paymentMethod || 'cash',
              is_cash_collected: Boolean(o.is_cash_collected ?? o.isCashCollected),
              isCashCollected: Boolean(o.is_cash_collected ?? o.isCashCollected),
              status: o.status,
              createdAt: o.created_at ? (new Date(o.created_at).toISOString ? new Date(o.created_at).toISOString() : String(o.created_at)) : new Date().toISOString(),
              shiftId: o.shift_id || o.shiftId || null,
              shift_id: o.shift_id || o.shiftId || null,
              branchId: o.branch_id || o.branchId || 'b1',
              branch_id: o.branch_id || o.branchId || 'b1',
              items: Array.isArray(o.items) ? o.items : [],
            }));

            if (isInitialPosFetch.current) {
              mappedOrders.forEach(o => autoPrintedPosOrders.current.add(String(o.id)));
              isInitialPosFetch.current = false;
            } else {
              mappedOrders.forEach(o => {
                const orderKey = String(o.id);
                if (!autoPrintedPosOrders.current.has(orderKey) && !isOrderPrinted(o.id, o.orderNumber)) {
                  autoPrintedPosOrders.current.add(orderKey);
                  markOrderAsPrinted(o.id, o.orderNumber);
                  const oBranch = o.branch_id || o.branchId || 'b1';
                  if (!effectiveBranchId || effectiveBranchId === 'all' || oBranch === effectiveBranchId) {
                    if (!isAdmin) {
                      playOrderNotificationSound();
                      setIncomingOrderNotification(o);
                      printThermalReceipt({
                        id: o.id,
                        orderNumber: o.orderNumber || '1',
                        dateStr: new Date(o.createdAt || Date.now()).toLocaleString('ar-EG'),
                        cashierName: o.cashierName || 'كاشير',
                        driverName: o.driverName || '',
                        customerName: o.customerName || '',
                        customerPhone: o.customerPhone || '',
                        customerAddress: o.customerAddress || '',
                        customerFloor: o.customerFloor || '',
                        customerApartment: o.customerApartment || '',
                        notes: o.notes || o.orderNotes || '',
                        orderNotes: o.notes || o.orderNotes || '',
                        sourceBranchName: o.sourceBranchName || o.source_branch_name || '',
                        source_branch_name: o.sourceBranchName || o.source_branch_name || '',
                        items: o.items || [],
                        subtotal: o.subtotal || o.total,
                        deliveryFee: o.deliveryFee || 0,
                        discount: o.discount || 0,
                        total: o.total,
                        paidAmount: o.paidAmount || o.total,
                        remainingAmount: o.remainingAmount || 0,
                        paymentMethod: o.paymentMethod || 'cash',
                        orderType: o.orderType || 'takeaway',
                        branch_id: oBranch
                      });
                    }
                  }
                }
              });
            }

            useInvoiceStore.setState((state) => {
              const serverIds = new Set(mappedOrders.map((m) => String(m.id)));
              const localPending = (state.invoices || []).filter(
                (localInv) =>
                  !serverIds.has(String(localInv.id)) &&
                  localInv.createdAt &&
                  Date.now() - new Date(localInv.createdAt).getTime() < 60000
              );
              return { invoices: [...localPending, ...mappedOrders] };
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

  const parseTimestamp = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    const normalized = str.includes('T') ? str : str.replace(' ', 'T');
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Helper to check if an invoice belongs to a branch active shift
  const isInvInShift = (inv, targetBranchId, activeShiftObj) => {
    if (!activeShiftObj) return false;
    const invBranch = inv.branchId || inv.branch_id || 'b1';
    if (invBranch !== targetBranchId) return false;
    if (inv.status === 'cancelled') return false;

    if (inv.shiftId || inv.shift_id) {
      return String(inv.shiftId || inv.shift_id) === String(activeShiftObj.id);
    }
    if (activeShiftObj.rawStartTime && inv.createdAt) {
      const invTime = parseTimestamp(inv.createdAt);
      const shiftStartTime = parseTimestamp(activeShiftObj.rawStartTime);
      if (invTime > 0 && shiftStartTime > 0 && invTime < (shiftStartTime - 60000)) {
        return false;
      }
    }
    return true;
  };

  // Calculate Branch 1 cash drawer amount: Returns 0.00 if Branch 1 shift is CLOSED
  const b1CashSales = !b1ActiveShift ? 0 : b1ActiveShift.startAmount + (invoices || []).reduce((sum, inv) => {
    if (!isInvInShift(inv, 'b1', b1ActiveShift)) return sum;

    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    const pm = inv.paymentMethod || inv.payment_method || 'cash';
    if (pm !== 'cash') return sum;

    return sum + (parseFloat(inv.paidAmount ?? inv.total ?? 0));
  }, 0);

  // Calculate Branch 2 cash drawer amount: Returns 0.00 if Branch 2 shift is CLOSED
  const b2CashSales = !b2ActiveShift ? 0 : b2ActiveShift.startAmount + (invoices || []).reduce((sum, inv) => {
    if (!isInvInShift(inv, 'b2', b2ActiveShift)) return sum;

    const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
    if (isDelivery) {
      const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
      if (!isCashCollected) return sum;
    }

    const pm = inv.paymentMethod || inv.payment_method || 'cash';
    if (pm !== 'cash') return sum;

    return sum + (parseFloat(inv.paidAmount ?? inv.total ?? 0));
  }, 0);

  // Branch 1 Delivery Sales
  const b1DeliverySales = useMemo(() => {
    if (!b1ActiveShift) return 0;
    return (invoices || []).reduce((sum, inv) => {
      if (!isInvInShift(inv, 'b1', b1ActiveShift)) return sum;
      const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
      if (!isDelivery) return sum;
      return sum + (parseFloat(inv.total) || 0);
    }, 0);
  }, [invoices, b1ActiveShift]);

  // Branch 1 Delivery Fees
  const b1DeliveryFees = useMemo(() => {
    if (!b1ActiveShift) return 0;
    return (invoices || []).reduce((sum, inv) => {
      if (!isInvInShift(inv, 'b1', b1ActiveShift)) return sum;
      const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
      if (!isDelivery) return sum;
      return sum + (parseFloat(inv.deliveryFee || inv.delivery_fee) || 0);
    }, 0);
  }, [invoices, b1ActiveShift]);

  // Branch 1 Total Sales
  const b1TotalSales = useMemo(() => {
    if (!b1ActiveShift) return 0;
    return (invoices || []).reduce((sum, inv) => {
      if (!isInvInShift(inv, 'b1', b1ActiveShift)) return sum;
      return sum + (parseFloat(inv.total) || 0);
    }, 0);
  }, [invoices, b1ActiveShift]);

  // Branch 2 Delivery Sales
  const b2DeliverySales = useMemo(() => {
    if (!b2ActiveShift) return 0;
    return (invoices || []).reduce((sum, inv) => {
      if (!isInvInShift(inv, 'b2', b2ActiveShift)) return sum;
      const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
      if (!isDelivery) return sum;
      return sum + (parseFloat(inv.total) || 0);
    }, 0);
  }, [invoices, b2ActiveShift]);

  // Branch 2 Delivery Fees
  const b2DeliveryFees = useMemo(() => {
    if (!b2ActiveShift) return 0;
    return (invoices || []).reduce((sum, inv) => {
      if (!isInvInShift(inv, 'b2', b2ActiveShift)) return sum;
      const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
      if (!isDelivery) return sum;
      return sum + (parseFloat(inv.deliveryFee || inv.delivery_fee) || 0);
    }, 0);
  }, [invoices, b2ActiveShift]);

  // Branch 2 Total Sales
  const b2TotalSales = useMemo(() => {
    if (!b2ActiveShift) return 0;
    return (invoices || []).reduce((sum, inv) => {
      if (!isInvInShift(inv, 'b2', b2ActiveShift)) return sum;
      return sum + (parseFloat(inv.total) || 0);
    }, 0);
  }, [invoices, b2ActiveShift]);

  // Current branch metrics for single-branch cashier
  const currentDeliverySales = effectiveBranchId === 'b2' ? b2DeliverySales : b1DeliverySales;
  const currentDeliveryFees = effectiveBranchId === 'b2' ? b2DeliveryFees : b1DeliveryFees;
  const currentTotalSales = effectiveBranchId === 'b2' ? b2TotalSales : b1TotalSales;

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
    if (product.hasMultipleSizes && !product.isOffer) {
      setSelectedProductForSize(product);
      setQtySmall(1);
      setQtyLarge(1);
      setSizeModalOpen(true);
    } else {
      addItem({
        id: product.id,
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        notes: product.offerComponents || '',
        quantity: 1,
      });
    }
  };

  if (!hasPosPermission || (isAdmin && adminViewMode === 'dashboard')) {
    return (
      <OperationsDashboard
        onSwitchToPos={isAdmin ? () => setAdminViewMode('pos') : null}
      />
    );
  }

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

              {/* Branch Switch Control (Admin Only) */}
              {isAdmin && (
                <Paper elevation={0} sx={{ borderRadius: '14px', p: 0.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                  <Tabs
                    value={selectedBranchId || 'all'}
                    onChange={(e, val) => setSelectedBranchId(val)}
                    sx={{
                      minHeight: 34,
                      '& .MuiTab-root': {
                        minHeight: 34,
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        borderRadius: '10px',
                        mx: 0.2,
                        px: 1.5,
                        color: '#64748B',
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                          bgcolor: '#FFFFFF',
                          color: '#0F172A',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                        }
                      },
                      '& .MuiTabs-indicator': { display: 'none' }
                    }}
                  >
                    <Tab value="all" label="🌐 كل الفروع" />
                    <Tab value="b1" label="🏢 فرع عزت" />
                    <Tab value="b2" label="🏢 فرع المسلة" />
                  </Tabs>
                </Paper>
              )}

              {isAdmin && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AssessmentOutlined />}
                  onClick={() => setAdminViewMode('dashboard')}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 800,
                    borderColor: '#CBD5E1',
                    color: '#334155',
                    bgcolor: '#FFFFFF',
                    px: 1.5,
                    py: 0.6,
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' }
                  }}
                >
                  📊 لوحة الإحصائيات والعمليات
                </Button>
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
              {/* Branch 1 Mobile Card */}
              <Box
                sx={{
                  flex: 1,
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b1ActiveShift ? '#F0FDF4' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b1ActiveShift ? '#10B981' : '#CBD5E1'),
                  p: 1,
                  borderRadius: '12px',
                  boxShadow: isSystemLoading ? 'none' : (b1ActiveShift ? '0 2px 5px rgba(16, 185, 129, 0.1)' : 'none'),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6, borderBottom: '1px solid', borderColor: b1ActiveShift ? '#DCFCE7' : '#E2E8F0', pb: 0.3 }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (b1ActiveShift ? '#047857' : '#64748B'), fontWeight: 800, fontSize: '0.72rem' }}>
                    فرع عزت
                  </Typography>
                  <Store sx={{ fontSize: 16, color: isSystemLoading ? '#94A3B8' : (b1ActiveShift ? '#10B981' : '#94A3B8') }} />
                </Box>

                {isSystemLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5 }}>
                    <CircularProgress size={11} sx={{ color: '#64748B' }} />
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.68rem' }}>جاري التحقق...</Typography>
                  </Box>
                ) : b1ActiveShift ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>💵 خزنة</Typography>
                      <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b1CashSales.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>🛵 دليفري</Typography>
                      <Typography variant="caption" sx={{ color: '#9A3412', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b1DeliverySales.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>📦 خدمة</Typography>
                      <Typography variant="caption" sx={{ color: '#78350F', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b1DeliveryFees.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>⭐ إجمالي</Typography>
                      <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b1TotalSales.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.75rem', display: 'block', textAlign: 'center', py: 0.5 }}>
                    🔒 الشيفت مغلق
                  </Typography>
                )}
              </Box>

              {/* Branch 2 Mobile Card */}
              <Box
                sx={{
                  flex: 1,
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b2ActiveShift ? '#EFF6FF' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b2ActiveShift ? '#3B82F6' : '#CBD5E1'),
                  p: 1,
                  borderRadius: '12px',
                  boxShadow: isSystemLoading ? 'none' : (b2ActiveShift ? '0 2px 5px rgba(59, 130, 246, 0.1)' : 'none'),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6, borderBottom: '1px solid', borderColor: b2ActiveShift ? '#DBEAFE' : '#E2E8F0', pb: 0.3 }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (b2ActiveShift ? '#1E40AF' : '#64748B'), fontWeight: 800, fontSize: '0.72rem' }}>
                    فرع المسلة
                  </Typography>
                  <Store sx={{ fontSize: 16, color: isSystemLoading ? '#94A3B8' : (b2ActiveShift ? '#3B82F6' : '#94A3B8') }} />
                </Box>

                {isSystemLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5 }}>
                    <CircularProgress size={11} sx={{ color: '#64748B' }} />
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.68rem' }}>جاري التحقق...</Typography>
                  </Box>
                ) : b2ActiveShift ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>💵 خزنة</Typography>
                      <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b2CashSales.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>🛵 دليفري</Typography>
                      <Typography variant="caption" sx={{ color: '#9A3412', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b2DeliverySales.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>📦 خدمة</Typography>
                      <Typography variant="caption" sx={{ color: '#78350F', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b2DeliveryFees.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#FFF', px: 0.6, py: 0.3, borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 700, fontSize: '0.58rem', display: 'block', lineHeight: 1 }}>⭐ إجمالي</Typography>
                      <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 900, fontSize: '0.72rem', lineHeight: 1.1 }}>{canSeeSafe ? `${b2TotalSales.toFixed(0)}` : '🔒'}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.75rem', display: 'block', textAlign: 'center', py: 0.5 }}>
                    🔒 الشيفت مغلق
                  </Typography>
                )}
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

        {/* Desktop Bottom Footer Bar: Branch Financial Stats Boxes */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            pt: 1.5,
            borderTop: '1px solid #E5E7EB',
            width: '100%',
          }}
        >
          {isAdmin ? (
            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 2, flexWrap: 'wrap', width: '100%' }}>
              {/* Branch 1 Box */}
              <Box
                sx={{
                  flex: '1 1 360px',
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b1ActiveShift ? '#F0FDF4' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b1ActiveShift ? '#10B981' : '#CBD5E1'),
                  borderRadius: '14px',
                  p: 1.5,
                  boxShadow: isSystemLoading ? 'none' : (b1ActiveShift ? '0 2px 8px rgba(16, 185, 129, 0.12)' : 'none'),
                }}
              >
                {/* Branch Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, pb: 0.8, borderBottom: '1px solid', borderColor: b1ActiveShift ? '#DCFCE7' : '#E2E8F0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Store sx={{ color: isSystemLoading ? '#94A3B8' : (b1ActiveShift ? '#10B981' : '#64748B'), fontSize: 22 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: b1ActiveShift ? '#065F46' : '#64748B', fontSize: '0.92rem' }}>
                      فرع عزت
                    </Typography>
                  </Box>
                  <Chip
                    label={isSystemLoading ? 'جاري التحقق...' : (b1ActiveShift ? '🟢 شيفت مفتوح' : '🔒 الشيفت مغلق')}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      height: 22,
                      bgcolor: b1ActiveShift ? '#DCFCE7' : '#F1F5F9',
                      color: b1ActiveShift ? '#15803D' : '#64748B',
                      border: '1px solid',
                      borderColor: b1ActiveShift ? '#86EFAC' : '#CBD5E1',
                    }}
                  />
                </Box>

                {/* Branch Metrics */}
                {isSystemLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1, gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: '#64748B' }} />
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>جاري تحميل البيانات...</Typography>
                  </Box>
                ) : b1ActiveShift ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                    {/* Cash Drawer */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        💵 الخزنة
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b1CashSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>

                    {/* Delivery Sales */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        🛵 دليفري
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#9A3412', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b1DeliverySales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>

                    {/* Delivery Fee */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        📦 الخدمة
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#78350F', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b1DeliveryFees.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>

                    {/* Total Sales */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        ⭐ الإجمالي
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#1E40AF', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b1TotalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 0.8 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                      لا توجد وردية مفتوحة حالياً في هذا الفرع
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Branch 2 Box */}
              <Box
                sx={{
                  flex: '1 1 360px',
                  bgcolor: isSystemLoading ? '#F8FAFC' : (b2ActiveShift ? '#EFF6FF' : '#F9FAFB'),
                  border: '1.5px solid',
                  borderColor: isSystemLoading ? '#E2E8F0' : (b2ActiveShift ? '#3B82F6' : '#CBD5E1'),
                  borderRadius: '14px',
                  p: 1.5,
                  boxShadow: isSystemLoading ? 'none' : (b2ActiveShift ? '0 2px 8px rgba(59, 130, 246, 0.12)' : 'none'),
                }}
              >
                {/* Branch Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, pb: 0.8, borderBottom: '1px solid', borderColor: b2ActiveShift ? '#DBEAFE' : '#E2E8F0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Store sx={{ color: isSystemLoading ? '#94A3B8' : (b2ActiveShift ? '#3B82F6' : '#64748B'), fontSize: 22 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: b2ActiveShift ? '#1E40AF' : '#64748B', fontSize: '0.92rem' }}>
                      فرع المسلة
                    </Typography>
                  </Box>
                  <Chip
                    label={isSystemLoading ? 'جاري التحقق...' : (b2ActiveShift ? '🟢 شيفت مفتوح' : '🔒 الشيفت مغلق')}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      height: 22,
                      bgcolor: b2ActiveShift ? '#DBEAFE' : '#F1F5F9',
                      color: b2ActiveShift ? '#1D4ED8' : '#64748B',
                      border: '1px solid',
                      borderColor: b2ActiveShift ? '#93C5FD' : '#CBD5E1',
                    }}
                  />
                </Box>

                {/* Branch Metrics */}
                {isSystemLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1, gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: '#64748B' }} />
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>جاري تحميل البيانات...</Typography>
                  </Box>
                ) : b2ActiveShift ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                    {/* Cash Drawer */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        💵 الخزنة
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b2CashSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>

                    {/* Delivery Sales */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        🛵 دليفري
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#9A3412', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b2DeliverySales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>

                    {/* Delivery Fee */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        📦 الخدمة
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#78350F', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b2DeliveryFees.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>

                    {/* Total Sales */}
                    <Box sx={{ bgcolor: '#FFFFFF', p: 0.8, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800, fontSize: '0.68rem', display: 'block', mb: 0.2 }}>
                        ⭐ الإجمالي
                      </Typography>
                      <Typography variant="subtitle2" sx={{ color: '#1E40AF', fontWeight: 900, fontSize: '0.88rem' }}>
                        {canSeeSafe ? `${b2TotalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '🔒'}
                        <Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, mr: 0.3 }}>ج.م</Typography>
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 0.8 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                      لا توجد وردية مفتوحة حالياً في هذا الفرع
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                bgcolor: isSystemLoading ? '#F8FAFC' : (isShiftActive ? '#ECFDF5' : '#FEF2F2'),
                border: '1.5px solid',
                borderColor: isSystemLoading ? '#E2E8F0' : (isShiftActive ? '#10B981' : '#EF4444'),
                px: 2,
                py: 1,
                borderRadius: '14px',
                boxShadow: isSystemLoading ? 'none' : (isShiftActive ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: isSystemLoading ? '#94A3B8' : (isShiftActive ? '#10B981' : '#EF4444'),
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSystemLoading ? <CircularProgress size={16} sx={{ color: '#FFF' }} /> : <AccountBalanceWallet sx={{ fontSize: 22 }} />}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: isSystemLoading ? '#64748B' : (isShiftActive ? '#047857' : '#991B1B'), fontWeight: 800, display: 'block', lineHeight: 1.1 }}>
                    {isSystemLoading ? 'جاري التحقق من حالة الوردية' : (isShiftActive ? `وردية الفرع (${effectiveBranchId === 'b2' ? 'المسلة' : 'عزت'})` : 'حالة الوردية')}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: isSystemLoading ? '#64748B' : (isShiftActive ? '#065F46' : '#991B1B'), fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {isSystemLoading ? 'جاري التحميل...' : (isShiftActive ? '🟢 الوردية مفتوحة' : '🔒 شيفت مغلق')}
                  </Typography>
                </Box>
              </Box>

              {isShiftActive && canSeeSafe && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ bgcolor: '#FFF', px: 1, py: 0.5, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, fontSize: '0.65rem', display: 'block' }}>💵 الخزنة</Typography>
                    <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 900, fontSize: '0.8rem' }}>{currentTillCash.toFixed(0)} ج.م</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FFF', px: 1, py: 0.5, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 800, fontSize: '0.65rem', display: 'block' }}>🛵 دليفري</Typography>
                    <Typography variant="caption" sx={{ color: '#9A3412', fontWeight: 900, fontSize: '0.8rem' }}>{currentDeliverySales.toFixed(0)} ج.م</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FFF', px: 1, py: 0.5, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 800, fontSize: '0.65rem', display: 'block' }}>📦 الخدمة</Typography>
                    <Typography variant="caption" sx={{ color: '#78350F', fontWeight: 900, fontSize: '0.8rem' }}>{currentDeliveryFees.toFixed(0)} ج.م</Typography>
                  </Box>
                  <Box sx={{ bgcolor: '#FFF', px: 1, py: 0.5, borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 800, fontSize: '0.65rem', display: 'block' }}>⭐ الإجمالي</Typography>
                    <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 900, fontSize: '0.8rem' }}>{currentTotalSales.toFixed(0)} ج.م</Typography>
                  </Box>
                </Box>
              )}
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
                        onClick={() => setQtySmall(Math.max(1, (parseInt(qtySmall) || 1) - 1))}
                        sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 30, height: 30, fontWeight: 900 }}
                      >
                        -
                      </IconButton>
                      <input
                        type="number"
                        min="1"
                        value={qtySmall}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setQtySmall('');
                          } else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) setQtySmall(num);
                          }
                        }}
                        onBlur={() => {
                          if (!qtySmall || qtySmall < 1) setQtySmall(1);
                        }}
                        onFocus={(e) => e.target.select()}
                        style={{
                          fontWeight: 900,
                          width: '45px',
                          textAlign: 'center',
                          fontSize: '1rem',
                          color: '#B45309',
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          MozAppearance: 'textfield'
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => setQtySmall((parseInt(qtySmall) || 1) + 1)}
                        sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 30, height: 30, fontWeight: 900 }}
                      >
                        +
                      </IconButton>
                    </Box>

                    {/* Add to Cart Button */}
                    <Button
                      variant="contained"
                      onClick={() => {
                        const finalQty = Math.max(1, parseInt(qtySmall) || 1);
                        addItem({
                          id: `${p.id}_صغير`,
                          product_id: p.id,
                          name: `${p.name} (صغير)`,
                          price: pSmall,
                          image: p.image,
                          size: 'صغير',
                          quantity: finalQty,
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
                      + إضافة {(parseInt(qtySmall) || 1) > 1 ? `(${parseInt(qtySmall) || 1})` : ''} للفاتورة
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
                        onClick={() => setQtyLarge(Math.max(1, (parseInt(qtyLarge) || 1) - 1))}
                        sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', width: 30, height: 30, fontWeight: 900 }}
                      >
                        -
                      </IconButton>
                      <input
                        type="number"
                        min="1"
                        value={qtyLarge}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setQtyLarge('');
                          } else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) setQtyLarge(num);
                          }
                        }}
                        onBlur={() => {
                          if (!qtyLarge || qtyLarge < 1) setQtyLarge(1);
                        }}
                        onFocus={(e) => e.target.select()}
                        style={{
                          fontWeight: 900,
                          width: '45px',
                          textAlign: 'center',
                          fontSize: '1rem',
                          color: '#1E40AF',
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          MozAppearance: 'textfield'
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => setQtyLarge((parseInt(qtyLarge) || 1) + 1)}
                        sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', width: 30, height: 30, fontWeight: 900 }}
                      >
                        +
                      </IconButton>
                    </Box>

                    {/* Add to Cart Button */}
                    <Button
                      variant="contained"
                      onClick={() => {
                        const finalQty = Math.max(1, parseInt(qtyLarge) || 1);
                        addItem({
                          id: `${p.id}_كبير`,
                          product_id: p.id,
                          name: `${p.name} (كبير)`,
                          price: pLarge,
                          image: p.image,
                          size: 'كبير',
                          quantity: finalQty,
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
                      + إضافة {(parseInt(qtyLarge) || 1) > 1 ? `(${parseInt(qtyLarge) || 1})` : ''} للفاتورة
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

      {/* Offer Customization Dialog */}
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

      {/* Incoming Order Realtime Notification Toast */}
      {incomingOrderNotification && (
        <Snackbar
          open={Boolean(incomingOrderNotification)}
          autoHideDuration={10000}
          onClose={() => setIncomingOrderNotification(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={incomingOrderNotification.notes?.includes('تحويل دليفري') ? "info" : "success"}
            variant="filled"
            onClose={() => setIncomingOrderNotification(null)}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  printThermalReceipt(incomingOrderNotification);
                }}
                sx={{ fontWeight: 900, bgcolor: 'rgba(255,255,255,0.25)', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }}
              >
                🖨️ طباعة الفاتورة
              </Button>
            }
            sx={{ width: '100%', fontWeight: 800, fontSize: '0.95rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
          >
            {(() => {
              let transferBranchToast = incomingOrderNotification.sourceBranchName || incomingOrderNotification.source_branch_name || '';
              const notesVal = incomingOrderNotification.notes || incomingOrderNotification.orderNotes || '';
              if (!transferBranchToast && notesVal.includes('طلب دليفري محول من')) {
                const match = notesVal.match(/طلب دليفري محول من\s+([^\]\s]+(?:\s+[^\]\s]+)*?)(?:\s+بواسطة|\])/);
                if (match && match[1]) transferBranchToast = match[1].trim();
              }

              return transferBranchToast
                ? `🚀 وصل طلب دليفري جديد محول من (${transferBranchToast})! (رقم #${incomingOrderNotification.orderNumber || incomingOrderNotification.order_number})`
                : `🔔 وصل أوردر جديد رقم #${incomingOrderNotification.orderNumber || incomingOrderNotification.order_number}!`;
            })()}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
