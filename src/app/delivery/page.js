'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, TextField, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  InputAdornment, FormControl, InputLabel, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Tooltip, Alert, CircularProgress, Divider, Avatar
} from '@mui/material';
import {
  DeliveryDining, AccessTime, LocationOn, Person, Phone, Home, Print, CheckCircle,
  Warning, Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh, HowToReg, Store, CheckCircleOutlined, PlayArrow, WhatsApp,
  AccountBalanceWallet, AttachMoney, MonetizationOn, FilterList, PictureAsPdf, History
} from '@mui/icons-material';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import DeliveryTimerBadge from '@/components/delivery/DeliveryTimerBadge';
import { printThermalReceipt } from '@/lib/printReceipt';
import { sendDeliveryWhatsApp } from '@/lib/whatsapp';
import { generateReportPDF } from '@/lib/reportPdfExport';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2.5, pb: 4 }}>{children}</Box>}
    </div>
  );
}

export default function DeliveryPage() {
  const [tabValue, setTabValue] = useState(0);
  const { customers, fetchCustomers, saveOrUpdateCustomer, updateCustomerAddresses, deleteCustomer, areas, fetchAreas, addArea, deleteArea, drivers, fetchDrivers, activeQueue, fetchAttendanceQueue } = useCustomerStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const { activeShift, fetchShifts } = useShiftStore();
  const isShiftActive = activeShift && activeShift.status === 'active';
  const [showPreviousShifts, setShowPreviousShifts] = useState(false);
  const isAdmin = user?.role === 'admin';

  // Live Orders State
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryTimerMinutes, setDeliveryTimerMinutes] = useState(30);

  // Driver Settlement Tab State
  const [selectedDriverForSettlement, setSelectedDriverForSettlement] = useState('all');
  const [settlementCashFilter, setSettlementCashFilter] = useState('pending'); // 'pending' hides collected orders automatically
  const [collectedOrdersDialogOpen, setCollectedOrdersDialogOpen] = useState(false);

  // Dispatch Dialog State
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState(null);
  const [selectedDriverForOrder, setSelectedDriverForOrder] = useState('');

  // Customer & Area Dialogs
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({ phone: '', name: '', address: '', area: '', floor: '', apartment: '' });
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  const effectiveBranch = (user && user.role !== 'admin' && user.branch_id) ? user.branch_id : selectedBranchId;

  const autoPrintedOrderIds = useRef(new Set());
  const isInitialFetch = useRef(true);

  // Fetch Delivery Orders & Settings
  const fetchDeliveryData = async (isSilent = false) => {
    if (!isSilent) setLoadingOrders(true);
    try {
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setObj = await setRes.json();
        if (setObj.delivery_timer_minutes) setDeliveryTimerMinutes(parseInt(setObj.delivery_timer_minutes) || 30);
      }

      const url = effectiveBranch && effectiveBranch !== 'all' ? `/api/orders?branch_id=${effectiveBranch}` : '/api/orders';
      const res = await fetch(url);
      if (res.ok) {
        const rows = await res.json();
        const delOrders = (rows || []).filter(o => {
          const isDelivery = o.order_type === 'delivery' || o.orderType === 'delivery';
          if (!isDelivery) return false;
          if (effectiveBranch && effectiveBranch !== 'all') {
            return o.branch_id === effectiveBranch || o.branchId === effectiveBranch;
          }
          return true;
        });

        // Mark existing orders as seen on initial load
        if (isInitialFetch.current) {
          delOrders.forEach(o => { if (o.id) autoPrintedOrderIds.current.add(o.id); });
          isInitialFetch.current = false;
        } else {
          // Auto-print only newly arrived orders on background updates
          delOrders.forEach(o => {
            if (o.id && !autoPrintedOrderIds.current.has(o.id)) {
              autoPrintedOrderIds.current.add(o.id);
              setTimeout(() => {
                try { handlePrintDelivery(o); } catch (e) {}
              }, 300);
            }
          });
        }

        setDeliveryOrders(delOrders);
      }
    } catch (e) {
      console.error('❌ Error fetching delivery orders:', e);
    } finally {
      if (!isSilent) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchDeliveryData(false);
    fetchCustomers();
    fetchAreas();
    fetchDrivers();
    fetchShifts(effectiveBranch);
    fetchAttendanceQueue(effectiveBranch);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDeliveryData(true);
        fetchAttendanceQueue(effectiveBranch);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [effectiveBranch, selectedBranchId, user]);

  // Filter delivery orders based on active shift boundaries and showPreviousShifts toggle
  const visibleDeliveryOrders = (deliveryOrders || []).filter(o => {
    if (showPreviousShifts) return true;
    if (!isShiftActive) return false;
    if (activeShift?.rawStartTime && (o.created_at || o.createdAt)) {
      const orderTime = new Date(o.created_at || o.createdAt).getTime();
      const shiftStart = new Date(activeShift.rawStartTime).getTime();
      if (!isNaN(orderTime) && !isNaN(shiftStart) && orderTime < shiftStart) {
        return false;
      }
    }
    return true;
  });

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // Build clean, deduplicated driver options for dispatch selector
  const checkedInDrivers = (activeQueue || []).filter(q => !selectedBranchId || selectedBranchId === 'all' || q.branch_id === selectedBranchId);
  const readyDrivers = checkedInDrivers.filter(q => q.status === 'ready');
  const onDeliveryDrivers = checkedInDrivers.filter(q => q.status === 'on_delivery');

  const dispatchDriverOptions = [];

  readyDrivers.forEach((q, idx) => {
    if (q.driver_name && !dispatchDriverOptions.some(opt => opt.name === q.driver_name)) {
      dispatchDriverOptions.push({
        id: q.id || `q_${idx}`,
        name: q.driver_name,
        label: `${idx === 0 ? '👑' : '🟢'} ${q.driver_name} (الدور ${idx + 1} - التالي)`
      });
    }
  });

  onDeliveryDrivers.forEach((q) => {
    if (q.driver_name && !dispatchDriverOptions.some(opt => opt.name === q.driver_name)) {
      dispatchDriverOptions.push({
        id: q.id,
        name: q.driver_name,
        label: `🛵 ${q.driver_name} (في مشوار توصيل حالياً)`
      });
    }
  });

  (drivers || []).filter(d => !selectedBranchId || selectedBranchId === 'all' || d.branch_id === selectedBranchId).forEach(d => {
    if (d.name && !dispatchDriverOptions.some(opt => opt.name === d.name)) {
      dispatchDriverOptions.push({
        id: d.id || d.name,
        name: d.name,
        label: `${d.name} (غير حاضر بالتمام)`
      });
    }
  });

  // Action: Open Dispatch Dialog
  const handleOpenDispatch = (order) => {
    setSelectedOrderForDispatch(order);
    const topReady = dispatchDriverOptions.find(d => d.label.includes('👑') || d.label.includes('🟢'));
    const initialDriver = order.driver_name || order.driverName || (topReady ? topReady.name : (dispatchDriverOptions[0] ? dispatchDriverOptions[0].name : ''));
    setSelectedDriverForOrder(initialDriver);
    setDispatchDialog(true);
  };

  // Action 1: Driver Picked Up Order (الطيار استلم)
  const handleDriverPickedUp = async (order) => {
    const assignedDriver = order.driver_name || order.driverName;
    if (!assignedDriver || assignedDriver === 'لم يحدد طيار بعد') {
      handleOpenDispatch(order);
      return;
    }

    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
          driver_name: assignedDriver
        })
      });
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);
    } catch (e) {
      console.error('❌ Failed to mark driver picked up:', e);
    }
  };

  // Action: Confirm Dispatching Order with Selected Driver
  const handleConfirmDispatch = async () => {
    if (!selectedOrderForDispatch) return;
    if (!selectedDriverForOrder || !selectedDriverForOrder.trim()) {
      alert('برجاء اختيار طيار التوصيل أولاً!');
      return;
    }

    try {
      await fetch(`/api/orders/${selectedOrderForDispatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_name: selectedDriverForOrder.trim(),
          dispatched_at: new Date().toISOString(),
          status: 'dispatched'
        })
      });

      setDispatchDialog(false);
      setSelectedOrderForDispatch(null);
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);
    } catch (e) {
      console.error('❌ Failed to dispatch order:', e);
    }
  };

  // Action 2: Mark Order Fully Delivered (تم التوصيل)
  const handleMarkDelivered = async (order) => {
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          driver_name: order.driver_name || order.driverName
        })
      });
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);
    } catch (e) {
      console.error('❌ Failed to mark delivered:', e);
    }
  };

  // Action 3: Confirm Cash Collected (تم استلام النقدية وتوريد المبلغ للخزينة)
  const handleConfirmCashCollected = async (order) => {
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_cash_collected: true,
          status: 'completed'
        })
      });
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);
    } catch (e) {
      console.error('❌ Failed to mark cash collected:', e);
    }
  };

  // Action 4: Bulk Settle Driver Cash (تسليم عهدة الطيار بالكامل مع تفصيل الخدمات والأوردرات)
  const handleSettleDriverAllCash = async (driverName) => {
    const targetOrders = (deliveryOrders || []).filter(o =>
      (o.driver_name === driverName || o.driverName === driverName) &&
      (!o.is_cash_collected && !o.isCashCollected && o.status !== 'cash_collected')
    );

    if (targetOrders.length === 0) {
      alert(`لا توجد عُهَد نقديّة معلّقة للطيار (${driverName}) لتسليمها!`);
      return;
    }

    const ordersSubtotal = targetOrders.reduce((sum, o) => {
      const tot = parseFloat(o.total || 0);
      const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
      return sum + (parseFloat(o.subtotal || 0) || Math.max(0, tot - fee));
    }, 0);

    const deliveryFeesSum = targetOrders.reduce((sum, o) => sum + (parseFloat(o.delivery_fee || o.deliveryFee) || 0), 0);
    const grandTotal = targetOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    const confirmMsg = `تأكيد استلام وتسليم عهدة الطيار (${driverName}):\n` +
      `-------------------------------------------\n` +
      `• عدد الطلبات: ${targetOrders.length} طلبات\n` +
      `• إجمالي سعر الأوردرات الصافي: ${ordersSubtotal.toLocaleString()} ج.م\n` +
      `• إجمالي خدمة التوصيل (الدليفري): ${deliveryFeesSum.toLocaleString()} ج.م\n` +
      `-------------------------------------------\n` +
      `• الإجمالي الكلي للعهدة: ${grandTotal.toLocaleString()} ج.م\n\n` +
      `هل ترغب في تسليم هذه العهدة وتوريدها للخزينة بالكامل؟`;

    if (!confirm(confirmMsg)) return;

    try {
      for (const order of targetOrders) {
        await fetch(`/api/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_cash_collected: true,
            status: 'completed'
          })
        });
      }
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);

      const successMsg = `✅ تم تسليم عهدة الطيار (${driverName}) بنجاح!\n\n` +
        `• إجمالي الأوردرات: ${ordersSubtotal.toLocaleString()} ج.م\n` +
        `• إجمالي الخدمات: ${deliveryFeesSum.toLocaleString()} ج.م\n` +
        `• المبلغ المورّد للخزينة: ${grandTotal.toLocaleString()} ج.م`;

      alert(successMsg);
    } catch (e) {
      console.error('❌ Failed to bulk settle driver cash:', e);
    }
  };

  // Action: Print Delivery Receipt
  const handlePrintDelivery = (order) => {
    printThermalReceipt({
      orderNumber: order.order_number || order.orderNumber || '1',
      dateStr: new Date(order.created_at || order.createdAt || Date.now()).toLocaleString('ar-EG'),
      driverName: order.driver_name || order.driverName || 'طيار الدليفري',
      cashierName: order.cashier_name || order.cashierName || 'كاشير',
      customerName: order.customer_name || order.customerName || '',
      customerPhone: order.customer_phone || order.customerPhone || '',
      customerAddress: order.customer_address || order.customerAddress || '',
      customerFloor: order.customer_floor || order.customerFloor || '',
      customerApartment: order.customer_apartment || order.customerApartment || '',
      items: order.items || [],
      subtotal: parseFloat(order.subtotal || order.total || 0),
      deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || 0),
      total: parseFloat(order.total || 0),
      paidAmount: parseFloat(order.paid_amount || order.paidAmount || order.total || 0),
      remainingAmount: 0,
      orderType: 'delivery'
    });
  };

  // Action: Send WhatsApp Notification to Customer
  const handleSendWhatsAppToCustomer = async (order) => {
    const driverName = order.driver_name || order.driverName;
    const foundDriver = (activeQueue || []).find(q => q.driver_name === driverName || q.name === driverName)
                     || (drivers || []).find(d => d.name === driverName);
    const driverPhone = foundDriver?.driver_phone || foundDriver?.phone || '';

    try {
      const res = await sendDeliveryWhatsApp({
        orderData: {
          orderNumber: order.order_number || order.orderNumber,
          customerName: order.customer_name || order.customerName,
          customerPhone: order.customer_phone || order.customerPhone,
          customerAddress: order.customer_address || order.customerAddress,
          customerFloor: order.customer_floor || order.customerFloor,
          customerApartment: order.customer_apartment || order.customerApartment,
          driverName: driverName || 'طاقم التوصيل',
          subtotal: parseFloat(order.subtotal || 0),
          deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || 0),
          total: parseFloat(order.total || 0),
          items: order.items || []
        },
        driverPhone,
        companySettings: { company_name: 'مطعم البرادعي للحواوشي' },
        autoOpenBrowser: false
      });

      if (res && (res.sentVia === 'api' || res.success)) {
        alert('✅ تم إرسال رسالة الواتساب للعميل عبر Green API تلقائياً بنجاح!');
      } else {
        const cleanPhone = formatWhatsAppPhone(order.customer_phone || order.customerName);
        const msg = generateDeliveryMessage(order, driverPhone, { company_name: 'مطعم البرادعي للحواوشي' });
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (err) {
      console.error('Error sending WhatsApp:', err);
    }
  };

  // Filtered Live Delivery Orders
  const filteredOrders = (visibleDeliveryOrders || []).filter(o => {
    const isPrep = !o.dispatched_at && o.status !== 'delivered' && o.status !== 'مكتمل' && o.status !== 'completed';
    const isDisp = !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'مكتمل' && o.status !== 'completed';
    const isDeliv = o.status === 'delivered' || o.status === 'مكتمل' || o.status === 'completed';

    if (orderStatusFilter === 'preparing' && !isPrep) return false;
    if (orderStatusFilter === 'dispatched' && !isDisp) return false;
    if (orderStatusFilter === 'delivered' && !isDeliv) return false;

    if (!searchTerm) return true;
    const cleanSearch = searchTerm.toLowerCase().trim();
    return (
      (o.order_number || o.orderNumber || '').toString().includes(cleanSearch) ||
      (o.customer_name || o.customerName || '').toLowerCase().includes(cleanSearch) ||
      (o.customer_phone || o.customerPhone || '').includes(cleanSearch) ||
      (o.driver_name || o.driverName || '').toLowerCase().includes(cleanSearch)
    );
  });

  const preparingCount = (visibleDeliveryOrders || []).filter(o => !o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed').length;
  const dispatchedCount = (visibleDeliveryOrders || []).filter(o => !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed').length;
  const deliveredCount = (visibleDeliveryOrders || []).filter(o => o.status === 'delivered' || o.status === 'completed').length;

  // Driver Settlement Profile Aggregations
  const driverProfiles = (drivers || []).filter(d => !selectedBranchId || selectedBranchId === 'all' || d.branch_id === selectedBranchId).map(d => {
    const driverOrders = (visibleDeliveryOrders || []).filter(o => (o.driver_name === d.name || o.driverName === d.name || o.driver_id === d.id));
    const pendingOrders = driverOrders.filter(o => !o.is_cash_collected && !o.isCashCollected && o.status !== 'cash_collected');
    const collectedOrders = driverOrders.filter(o => o.is_cash_collected || o.isCashCollected || o.status === 'cash_collected');

    const pendingCashTotal = pendingOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const pendingDeliveryFees = pendingOrders.reduce((sum, o) => sum + (parseFloat(o.delivery_fee || o.deliveryFee) || 0), 0);
    const pendingOrdersSubtotal = pendingOrders.reduce((sum, o) => {
      const tot = parseFloat(o.total || 0);
      const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
      return sum + (parseFloat(o.subtotal || 0) || Math.max(0, tot - fee));
    }, 0);

    const collectedCashTotal = collectedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const collectedDeliveryFees = collectedOrders.reduce((sum, o) => sum + (parseFloat(o.delivery_fee || o.deliveryFee) || 0), 0);
    const collectedOrdersSubtotal = collectedOrders.reduce((sum, o) => {
      const tot = parseFloat(o.total || 0);
      const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
      return sum + (parseFloat(o.subtotal || 0) || Math.max(0, tot - fee));
    }, 0);

    const totalDeliveryFees = driverOrders.reduce((sum, o) => sum + (parseFloat(o.delivery_fee || o.deliveryFee) || 0), 0);
    const totalOrdersSubtotal = driverOrders.reduce((sum, o) => {
      const tot = parseFloat(o.total || 0);
      const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
      return sum + (parseFloat(o.subtotal || 0) || Math.max(0, tot - fee));
    }, 0);

    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      totalOrdersCount: driverOrders.length,
      pendingOrdersCount: pendingOrders.length,
      collectedOrdersCount: collectedOrders.length,
      pendingCashTotal,
      pendingDeliveryFees,
      pendingOrdersSubtotal,
      collectedCashTotal,
      collectedDeliveryFees,
      collectedOrdersSubtotal,
      totalDeliveryFees,
      totalOrdersSubtotal,
    };
  });

  const totalPendingAllDriversCash = driverProfiles.reduce((sum, p) => sum + p.pendingCashTotal, 0);
  const totalCollectedAllDriversCash = driverProfiles.reduce((sum, p) => sum + p.collectedCashTotal, 0);

  // Settlement Orders Filtered for Selected Driver View
  const settlementFilteredOrders = (visibleDeliveryOrders || []).filter(o => {
    const driverName = o.driver_name || o.driverName;
    if (selectedDriverForSettlement !== 'all' && driverName !== selectedDriverForSettlement) return false;

    const isCollected = o.is_cash_collected || o.isCashCollected || o.status === 'cash_collected';
    if (settlementCashFilter === 'pending' && isCollected) return false;
    if (settlementCashFilter === 'collected' && !isCollected) return false;

    return true;
  });

  // Collected Orders List (For History Popup Modal)
  const collectedOrdersList = (visibleDeliveryOrders || []).filter(o => {
    const isCollected = o.is_cash_collected || o.isCashCollected || o.status === 'cash_collected';
    if (!isCollected) return false;
    const driverName = o.driver_name || o.driverName;
    if (selectedDriverForSettlement !== 'all' && driverName !== selectedDriverForSettlement) return false;
    return true;
  });

  // Action: Print Driver Custody Report (A4 PDF)
  const handlePrintCustodyPDF = () => {
    if (settlementFilteredOrders.length === 0) {
      alert('لا توجد طلبات لعرضها في الكشف!');
      return;
    }

    const totalOrdersSubtotal = settlementFilteredOrders.reduce((sum, ord) => {
      const ordTotal = parseFloat(ord.total || 0);
      const ordDeliveryFee = parseFloat(ord.delivery_fee || ord.deliveryFee || 0);
      const ordSubtotal = parseFloat(ord.subtotal || 0) || Math.max(0, ordTotal - ordDeliveryFee);
      return sum + ordSubtotal;
    }, 0);

    const totalDeliveryFeesSum = settlementFilteredOrders.reduce((sum, ord) => {
      return sum + (parseFloat(ord.delivery_fee || ord.deliveryFee || 0));
    }, 0);

    const grandTotalSum = settlementFilteredOrders.reduce((sum, ord) => {
      return sum + (parseFloat(ord.total || 0));
    }, 0);

    const targetDriverName = selectedDriverForSettlement !== 'all' ? selectedDriverForSettlement : 'كافة الطيارين';

    const stats = [
      { title: 'الطيار / الفلتر', value: targetDriverName },
      { title: 'إجمالي قيمة الأوردرات (صافي)', value: `${totalOrdersSubtotal.toLocaleString()} ج.م` },
      { title: 'إجمالي خدمة الدليفري', value: `${totalDeliveryFeesSum.toLocaleString()} ج.م` },
      { title: 'الإجمالي الكلي للعهدة', value: `${grandTotalSum.toLocaleString()} ج.م` }
    ];

    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'رقم الطلب', accessor: (o) => `#${o.order_number || o.orderNumber}` },
      { label: 'الطيار', accessor: (o) => o.driver_name || o.driverName || '—' },
      { label: 'العميل والفرع', accessor: (o) => `${o.customer_name || o.customerName || 'عميل'} (${o.branch_name || 'الرئيسي'})` },
      { label: 'قيمة الأوردر (صافي)', accessor: (o) => {
          const tot = parseFloat(o.total || 0);
          const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
          const sub = parseFloat(o.subtotal || 0) || Math.max(0, tot - fee);
          return `${sub.toLocaleString()} ج.م`;
        }
      },
      { label: 'خدمة الدليفري', accessor: (o) => `+${(parseFloat(o.delivery_fee || o.deliveryFee || 0)).toLocaleString()} ج.م` },
      { label: 'الإجمالي الكلي', accessor: (o) => `${(parseFloat(o.total || 0)).toLocaleString()} ج.م` },
      { label: 'حالة العهدة والنقدية', accessor: (o) => (o.is_cash_collected || o.isCashCollected || o.status === 'cash_collected') ? '🟢 تم التوريد للخزينة' : '🔴 عهدة معلقة مع الطيار' }
    ];

    generateReportPDF({
      title: `كشف أوردرات العهدة والتسليمات - ${targetDriverName}`,
      subtitle: 'تفصيل قيمة الأوردرات + رسوم خدمة الدليفري لكل طيار',
      branchName: 'الفرع الرئيسي',
      dateRangeStr: new Date().toLocaleDateString('ar-EG'),
      stats,
      columns,
      data: settlementFilteredOrders,
      totals: {
        0: '',
        1: 'إجمالي الكشف',
        2: '',
        3: '',
        4: `${totalOrdersSubtotal.toLocaleString()} ج.م`,
        5: `${totalDeliveryFeesSum.toLocaleString()} ج.م`,
        6: `${grandTotalSum.toLocaleString()} ج.م`,
      }
    });
  };

  const renderOrderCard = (order) => {
    const isDispatched = !!order.dispatched_at;
    const isDelivered = order.status === 'delivered' || order.status === 'completed' || order.status === 'cash_collected';
    const isCashCollected = order.is_cash_collected || order.isCashCollected || order.status === 'cash_collected';

    return (
      <Card
        key={order.id}
        sx={{
          borderRadius: '16px',
          border: '2px solid',
          borderColor: isDelivered ? '#10B981' : (isDispatched ? '#3B82F6' : '#F59E0B'),
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }
        }}
      >
        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Top Header: Order #, Branch & Live Timer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={900} color="#1A1A2E">
                أوردر #{order.order_number || order.orderNumber}
              </Typography>
              <Chip label={order.branch_name || 'الفرع الرئيسي'} size="small" sx={{ bgcolor: '#F3F4F6', fontWeight: 800, fontSize: '0.7rem' }} />
            </Box>

            <DeliveryTimerBadge
              dispatchedAt={order.dispatched_at}
              isDelivered={isDelivered}
              targetMinutes={deliveryTimerMinutes}
            />
          </Box>

          <Divider />

          {/* Customer Info & Address */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person sx={{ color: '#4285F4', fontSize: 18 }} />
                <Typography variant="body2" fontWeight={800} color="#1E293B">
                  {order.customer_name || order.customerName || 'عميل ديليفري'}
                </Typography>
              </Box>
              {order.customer_phone && (
                <Tooltip title="إرسال إشعار واتساب للعميل بالطلب وبيانات الطيار">
                  <Button
                    size="small"
                    startIcon={<WhatsApp sx={{ color: '#25D366' }} />}
                    onClick={() => handleSendWhatsAppToCustomer(order)}
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      bgcolor: '#F0FDF4',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      py: 0.2,
                      px: 1,
                      '&:hover': { bgcolor: '#BBF7D0' }
                    }}
                  >
                    واتساب
                  </Button>
                </Tooltip>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 0.5 }}>
              <Home sx={{ color: '#9CA3AF', fontSize: 18, mt: 0.3 }} />
              <Typography variant="caption" fontWeight={700} color="#475569" sx={{ lineHeight: 1.4 }}>
                الوجهة: {order.customer_address || order.customerAddress || 'عنوان غير محدد'}
                {order.customer_floor ? ` - (د ${order.customer_floor}` : ''}
                {order.customer_apartment ? ` ش ${order.customer_apartment})` : order.customer_floor ? ')' : ''}
              </Typography>
            </Box>
          </Box>

          {/* Order Items Breakdown Details */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <Paper sx={{ p: 1.2, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', my: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="#334155" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                📦 الأصناف المطلوبة ({order.items.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0)}):
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                {order.items.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <Typography variant="caption" fontWeight={700} color="#1E293B">
                      • {item.product_name || item.name || item.productName || 'صنف'} {item.size ? `(${item.size})` : ''} × {item.quantity || 1}
                    </Typography>
                    <Typography variant="caption" fontWeight={800} color="#059669">
                      {(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toLocaleString()} ج.م
                    </Typography>
                  </Box>
                ))}
              </Box>
              {(order.notes || order.orderNotes) && (
                <Typography variant="caption" color="#D97706" fontWeight={800} sx={{ display: 'block', mt: 0.5, pt: 0.5, borderTop: '1px dashed #CBD5E1' }}>
                  📝 ملاحظات: {order.notes || order.orderNotes}
                </Typography>
              )}
            </Paper>
          )}

          {/* Driver Status Banner */}
          <Paper
            sx={{
              p: 1.2,
              borderRadius: '12px',
              bgcolor: isDelivered ? '#ECFDF5' : (isDispatched ? '#DBEAFE' : '#FFFBEB'),
              border: '1px solid',
              borderColor: isDelivered ? '#A7F3D0' : (isDispatched ? '#BFDBFE' : '#FDE68A'),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DeliveryDining sx={{ color: isDelivered ? '#047857' : (isDispatched ? '#1D4ED8' : '#D97706') }} />
              <Typography variant="caption" fontWeight={800} color={isDelivered ? '#065F46' : (isDispatched ? '#1E40AF' : '#92400E')}>
                {isDelivered
                  ? `✅ اكتمل التوصيل | الطيار: ${order.driver_name || order.driverName || '—'}`
                  : (isDispatched
                      ? `🚀 خارج للتوصيل | الطيار: ${order.driver_name || order.driverName || '—'}`
                      : `⏳ قيد التحضير بالمطبخ | الطيار: ${order.driver_name || order.driverName || 'لم يحدد بعد'}`
                    )
                }
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight={900} color="#059669">
              {parseFloat(order.total || 0).toLocaleString()} ج.م
            </Typography>
          </Paper>

          {/* Action Buttons Grid */}
          <Grid container spacing={1} sx={{ mt: 0.5 }}>
            <Grid xs={3}>
              <Button
                fullWidth
                size="small"
                variant={isDispatched ? 'outlined' : 'contained'}
                disabled={isDelivered}
                onClick={() => handleDriverPickedUp(order)}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  px: 0.5,
                  py: 0.8,
                  bgcolor: isDispatched ? 'transparent' : '#E06B1F',
                  color: isDispatched ? '#E06B1F' : '#FFF',
                  borderColor: '#E06B1F',
                  '&:hover': { bgcolor: isDispatched ? 'rgba(224,107,31,0.08)' : '#C85A17' }
                }}
              >
                الطيار استلم
              </Button>
            </Grid>

            <Grid xs={3}>
              <Button
                fullWidth
                size="small"
                variant={isDispatched && !isDelivered ? 'contained' : 'outlined'}
                disabled={!isDispatched || isDelivered}
                onClick={() => handleMarkDelivered(order)}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  px: 0.5,
                  py: 0.8,
                  bgcolor: isDispatched && !isDelivered ? '#10B981' : 'transparent',
                  color: isDispatched && !isDelivered ? '#FFF' : '#10B981',
                  borderColor: '#10B981',
                  '&:hover': { bgcolor: isDispatched && !isDelivered ? '#059669' : 'rgba(16,185,129,0.08)' }
                }}
              >
                تم التوصيل
              </Button>
            </Grid>

            <Grid xs={3}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                disabled={isDelivered}
                onClick={() => handleOpenDispatch(order)}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  px: 0.5,
                  py: 0.8,
                  color: '#3B82F6',
                  borderColor: '#3B82F6',
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.08)' }
                }}
              >
                تغيير الطيار
              </Button>
            </Grid>

            <Grid xs={3}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                startIcon={<Print sx={{ fontSize: '14px !important' }} />}
                onClick={() => handlePrintDelivery(order)}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  px: 0.5,
                  py: 0.8,
                  color: '#4B5563',
                  borderColor: '#9CA3AF',
                  '&:hover': { bgcolor: 'rgba(156,163,175,0.1)' }
                }}
              >
                طباعة
              </Button>
            </Grid>
          </Grid>

          {/* Prominent Cash Collection Button (تم استلام النقدية وتوريد المبلغ) */}
          <Box sx={{ mt: 1 }}>
            {isCashCollected ? (
              <Box sx={{ bgcolor: '#DCFCE7', color: '#166534', p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, border: '1px solid #86EFAC' }}>
                <CheckCircle sx={{ fontSize: 18, color: '#16A34A' }} />
                <Typography variant="caption" fontWeight={900}>
                  🟢 تم استلام النقدية وتوريد المبلغ للخزينة
                </Typography>
              </Box>
            ) : (
              <Button
                fullWidth
                size="small"
                variant="contained"
                onClick={() => handleConfirmCashCollected(order)}
                sx={{
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  py: 0.9,
                  bgcolor: '#059669',
                  color: '#FFF',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                  '&:hover': { bgcolor: '#047857' }
                }}
              >
                💵 تم استلام النقدية (تُسجل بالشيفت)
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
            لوحة إدارة الدليفري والتوصيل
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            متابعة الطلبات الحية، طوابير الطيارين، عُهد ونقدية التوصيل، ودليل العملاء
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                sx={{ borderRadius: '12px', bgcolor: '#FFF', fontWeight: 800 }}
              >
                <MenuItem value="all">🏢 كافـة الفـروع</MenuItem>
                {branches.map(b => (
                  <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant={showPreviousShifts ? 'contained' : 'outlined'}
            startIcon={<History />}
            onClick={() => setShowPreviousShifts(!showPreviousShifts)}
            sx={{
              borderRadius: '12px',
              fontWeight: 800,
              py: 1,
              bgcolor: showPreviousShifts ? '#1E40AF' : 'transparent',
              color: showPreviousShifts ? '#FFF' : '#3B82F6',
              borderColor: '#3B82F6',
              '&:hover': { bgcolor: showPreviousShifts ? '#1E3A8A' : 'rgba(59,130,246,0.08)' }
            }}
          >
            {showPreviousShifts ? '✕ إخفاء الشيفتات السابقة' : '📋 إظهار طلبات الشيفتات السابقة'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDeliveryData}
            sx={{ borderRadius: '12px', fontWeight: 800, py: 1 }}
          >
            تحديث اللحظة
          </Button>
        </Box>
      </Box>

      {/* KPI Stats Bar */}
      <Grid container spacing={2}>
        <Grid xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccessTime sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>قيد التجهيز بالمطبخ</Typography>
              <Typography variant="h6" fontWeight={900} color="#D97706">{preparingCount} طلب</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #3B82F6', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#3B82F6', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeliveryDining sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="#1E40AF" fontWeight={700}>خارج للتوصيل (مع العداد)</Typography>
              <Typography variant="h6" fontWeight={900} color="#1D4ED8">{dispatchedCount} طلب</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #10B981', bgcolor: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="#065F46" fontWeight={700}>تم التوصيل واكتمال الطلبات</Typography>
              <Typography variant="h6" fontWeight={900} color="#047857">{deliveredCount} طلب</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Control Navigation Tabs Bar */}
      <Paper
        elevation={2}
        sx={{
          borderRadius: '16px',
          border: '1.5px solid #CBD5E1',
          bgcolor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 54,
            '& .MuiTab-root': {
              minHeight: 54,
              fontSize: { xs: '0.85rem', md: '0.95rem' },
              fontWeight: 800,
              px: { xs: 2, md: 3 },
              color: '#475569',
              '&.Mui-selected': {
                color: '#2563EB',
                fontWeight: 900
              }
            }
          }}
        >
          <Tab icon={<DeliveryDining sx={{ fontSize: 22 }} />} iconPosition="start" label="لوحة الأوردرات اللحظية" />
          <Tab icon={<HowToReg sx={{ fontSize: 22 }} />} iconPosition="start" label="طابور دور الطيارين" />
          <Tab icon={<AccountBalanceWallet sx={{ fontSize: 22, color: '#D97706' }} />} iconPosition="start" label="💰 عُهَد وحسابات الطيارين" />
          <Tab icon={<Person sx={{ fontSize: 22 }} />} iconPosition="start" label="سجل العملاء والعناوين" />
          <Tab icon={<LocationOn sx={{ fontSize: 22 }} />} iconPosition="start" label="مناطق التوصيل والرسوم" />
        </Tabs>
      </Paper>

      {/* Tab 0: Live Delivery Control Board & Timers */}
      <TabPanel value={tabValue} index={0}>
        {/* Top 3 Delivery Status KPI Cards (Matching Screenshot 1) */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* 1. Preparing in Kitchen */}
          <Grid xs={12} sm={4}>
            <Paper
              elevation={0}
              onClick={() => setOrderStatusFilter('preparing')}
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: '#FFFDF5',
                border: '2px solid',
                borderColor: orderStatusFilter === 'preparing' ? '#D97706' : '#FDE68A',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(245,158,11,0.15)' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="#D97706" display="block">
                    ⏳ قيد التجهيز بالمطبخ
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="#B45309" sx={{ mt: 0.5 }}>
                    {preparingCount} <Typography component="span" variant="subtitle2" fontWeight={800}>طلب</Typography>
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccessTime sx={{ fontSize: 28 }} />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* 2. Out for Delivery */}
          <Grid xs={12} sm={4}>
            <Paper
              elevation={0}
              onClick={() => setOrderStatusFilter('dispatched')}
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: '#F8FAFC',
                border: '2px solid',
                borderColor: orderStatusFilter === 'dispatched' ? '#1D4ED8' : '#BFDBFE',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(59,130,246,0.15)' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="#1D4ED8" display="block">
                    🚀 خارج للتوصيل (مع العداد)
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="#1E40AF" sx={{ mt: 0.5 }}>
                    {dispatchedCount} <Typography component="span" variant="subtitle2" fontWeight={800}>طلب</Typography>
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DeliveryDining sx={{ fontSize: 28 }} />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* 3. Delivered */}
          <Grid xs={12} sm={4}>
            <Paper
              elevation={0}
              onClick={() => setOrderStatusFilter('delivered')}
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: '#F0FDF4',
                border: '2px solid',
                borderColor: orderStatusFilter === 'delivered' ? '#047857' : '#86EFAC',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(16,185,129,0.15)' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" fontWeight={800} color="#047857" display="block">
                    ✅ تم التوصيل واكتمال الطلبات
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="#166534" sx={{ mt: 0.5 }}>
                    {deliveredCount} <Typography component="span" variant="subtitle2" fontWeight={800}>طلب</Typography>
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#DCFCE7', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle sx={{ fontSize: 28 }} />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {/* Status Filter Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `الكل (${deliveryOrders.length})` },
              { id: 'preparing', label: `⏳ قيد التجهيز (${preparingCount})` },
              { id: 'dispatched', label: `🚀 خارج للتوصيل (${dispatchedCount})` },
              { id: 'delivered', label: `✅ تم التوصيل (${deliveredCount})` },
            ].map(filter => (
              <Chip
                key={filter.id}
                label={filter.label}
                onClick={() => setOrderStatusFilter(filter.id)}
                color={orderStatusFilter === filter.id ? 'primary' : 'default'}
                variant={orderStatusFilter === filter.id ? 'filled' : 'outlined'}
                sx={{ fontWeight: 800, borderRadius: '10px', px: 1 }}
              />
            ))}
          </Box>

          <TextField
            placeholder="بحث برقم الأوردر، العميل، التليفون أو الطيار..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }
            }}
            sx={{ width: { xs: '100%', sm: '320px' }, bgcolor: '#FFF' }}
          />
        </Box>

        {loadingOrders ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px', bgcolor: '#FAFAFA' }}>
            <DeliveryDining sx={{ fontSize: 60, color: '#D1D5DB', mb: 1 }} />
            <Typography variant="h6" fontWeight={800} color="text.secondary">لا توجد طلبات ديليفري مطابقة حالياً</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {/* 1. COLUMN 1: قيد التحضير بالمطبخ */}
            {(orderStatusFilter === 'all' || orderStatusFilter === 'preparing') && (
              <Grid xs={12} lg={orderStatusFilter === 'preparing' ? 12 : 4}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#FFFDF5', border: '2px solid #FDE68A', height: '100%' }}>
                  {/* Column Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '2px solid #FEF3C7' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AccessTime sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={900} color="#B45309">
                          ⏳ قيد التحضير بالمطبخ
                        </Typography>
                        <Typography variant="caption" color="#D97706" fontWeight={700}>
                          إجمالي: {(filteredOrders.filter(o => !o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected').reduce((s,o) => s + (parseFloat(o.total)||0), 0)).toLocaleString()} ج.م
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${filteredOrders.filter(o => !o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected').length} طلب`}
                      size="small"
                      sx={{ bgcolor: '#F59E0B', color: '#FFF', fontWeight: 900, fontSize: '0.78rem' }}
                    />
                  </Box>

                  {/* Column Card List */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredOrders
                      .filter(o => !o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected')
                      .map(order => renderOrderCard(order))}

                    {filteredOrders.filter(o => !o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected').length === 0 && (
                      <Paper sx={{ p: 3, textAlign: 'center', borderRadius: '12px', bgcolor: '#FFF', border: '1px dashed #FDE68A' }}>
                        <Typography variant="body2" color="#D97706" fontWeight={700}>
                          لا توجد طلبات قيد التحضير حالياً 👍
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* 2. COLUMN 2: خارج للتوصيل (مع الطيار) */}
            {(orderStatusFilter === 'all' || orderStatusFilter === 'dispatched') && (
              <Grid xs={12} lg={orderStatusFilter === 'dispatched' ? 12 : 4}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#F8FAFC', border: '2px solid #BFDBFE', height: '100%' }}>
                  {/* Column Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '2px solid #DBEAFE' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DeliveryDining sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={900} color="#1E40AF">
                          🚀 خارج للتوصيل (مع العداد)
                        </Typography>
                        <Typography variant="caption" color="#2563EB" fontWeight={700}>
                          إجمالي: {(filteredOrders.filter(o => !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected').reduce((s,o) => s + (parseFloat(o.total)||0), 0)).toLocaleString()} ج.م
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${filteredOrders.filter(o => !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected').length} طلب`}
                      size="small"
                      sx={{ bgcolor: '#3B82F6', color: '#FFF', fontWeight: 900, fontSize: '0.78rem' }}
                    />
                  </Box>

                  {/* Column Card List */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredOrders
                      .filter(o => !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected')
                      .map(order => renderOrderCard(order))}

                    {filteredOrders.filter(o => !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cash_collected').length === 0 && (
                      <Paper sx={{ p: 3, textAlign: 'center', borderRadius: '12px', bgcolor: '#FFF', border: '1px dashed #BFDBFE' }}>
                        <Typography variant="body2" color="#1E40AF" fontWeight={700}>
                          لا توجد طلبات خارجة للتوصيل حالياً
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* 3. COLUMN 3: تم التوصيل واكتمال الطلبات */}
            {(orderStatusFilter === 'all' || orderStatusFilter === 'delivered') && (
              <Grid xs={12} lg={orderStatusFilter === 'delivered' ? 12 : 4}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#F0FDF4', border: '2px solid #86EFAC', height: '100%' }}>
                  {/* Column Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '2px solid #DCFCE7' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={900} color="#166534">
                          ✅ تم التوصيل (مكتمل)
                        </Typography>
                        <Typography variant="caption" color="#15803D" fontWeight={700}>
                          إجمالي: {(filteredOrders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cash_collected').reduce((s,o) => s + (parseFloat(o.total)||0), 0)).toLocaleString()} ج.م
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${filteredOrders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cash_collected').length} طلب`}
                      size="small"
                      sx={{ bgcolor: '#10B981', color: '#FFF', fontWeight: 900, fontSize: '0.78rem' }}
                    />
                  </Box>

                  {/* Column Card List */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredOrders
                      .filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cash_collected')
                      .map(order => renderOrderCard(order))}

                    {filteredOrders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cash_collected').length === 0 && (
                      <Paper sx={{ p: 3, textAlign: 'center', borderRadius: '12px', bgcolor: '#FFF', border: '1px dashed #86EFAC' }}>
                        <Typography variant="body2" color="#166534" fontWeight={700}>
                          لا توجد طلبات مكتملة التوصيل بعد
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 1: Live Driver Attendance Queue */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          <Typography variant="h6" fontWeight={800} color="#1A1A2E" gutterBottom>
            طابور ترتيب دور الطيارين (Queue Manager)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            الطيار في بداية الطابور (👑) هو من يستلم الأوردر القادم أوتوماتيكياً.
          </Typography>

          <Grid container spacing={2}>
            {checkedInDrivers.map((q, idx) => (
              <Grid xs={12} sm={6} md={4} key={q.id || idx}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    border: '2px solid',
                    borderColor: idx === 0 ? '#F59E0B' : '#E5E7EB',
                    bgcolor: idx === 0 ? '#FFFDF5' : '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: idx === 0 ? '#F59E0B' : '#3B82F6', fontWeight: 900 }}>
                      {idx === 0 ? '👑' : idx + 1}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={900}>
                        {q.driver_name || q.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {q.status === 'on_delivery' ? '🛵 في مشوار توصيل' : '🟢 جاهز في المحل'}
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    label={q.status === 'on_delivery' ? 'خارج بالمحل' : `دور #${idx + 1}`}
                    size="small"
                    color={q.status === 'on_delivery' ? 'warning' : (idx === 0 ? 'primary' : 'default')}
                    sx={{ fontWeight: 800 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </TabPanel>

      {/* Tab 2: 💰 Driver Shift Settlement & Cash Profiles (عُهَد وحسابات الطيارين) */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Header Summary Banner */}
          <Grid container spacing={2}>
            <Grid xs={12} sm={4}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFFBEB', border: '2px solid #F59E0B' }}>
                <Typography variant="caption" fontWeight={800} color="#D97706">إجمالي العُهَد المعلّقة مع الطيارين (لم تُسلّم)</Typography>
                <Typography variant="h4" fontWeight={900} color="#B45309" sx={{ mt: 0.5 }}>
                  {totalPendingAllDriversCash.toLocaleString()} ج.م
                </Typography>
                <Typography variant="caption" color="#92400E" sx={{ mt: 0.5, display: 'block' }}>
                  مبالغ الدليفري المطلوب توريدها للخزينة
                </Typography>
              </Paper>
            </Grid>

            <Grid xs={12} sm={4}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#ECFDF5', border: '2px solid #10B981' }}>
                <Typography variant="caption" fontWeight={800} color="#047857">إجمالي النقدية المورّدة والمستلمة بالخزينة</Typography>
                <Typography variant="h4" fontWeight={900} color="#065F46" sx={{ mt: 0.5 }}>
                  {totalCollectedAllDriversCash.toLocaleString()} ج.م
                </Typography>
                <Typography variant="caption" color="#047857" sx={{ mt: 0.5, display: 'block' }}>
                  مبالغ تم استلامها وإدراجها بفرع الشيفت
                </Typography>
              </Paper>
            </Grid>

            <Grid xs={12} sm={4}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#EFF6FF', border: '2px solid #3B82F6' }}>
                <Typography variant="caption" fontWeight={800} color="#1E40AF">إجمالي طاقم التوصيل المسجل</Typography>
                <Typography variant="h4" fontWeight={900} color="#1D4ED8" sx={{ mt: 0.5 }}>
                  {driverProfiles.length} طيارين
                </Typography>
                <Typography variant="caption" color="#1E40AF" sx={{ mt: 0.5, display: 'block' }}>
                  متابعة العُهَد لكل طيار بشكل منفصل
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Driver Profile Cards Carousel / Grid */}
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={900} color="#1A1A2E">
                👨‍✈️ بروفايلات وحسابات عُهَد الطيارين
              </Typography>
              <Chip
                label={selectedDriverForSettlement === 'all' ? 'عرض كافة الطيارين' : `محدد: ${selectedDriverForSettlement}`}
                color="primary"
                sx={{ fontWeight: 800 }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid xs={12} sm={6} md={3}>
                <Card
                  onClick={() => setSelectedDriverForSettlement('all')}
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: selectedDriverForSettlement === 'all' ? '#3B82F6' : '#E5E7EB',
                    bgcolor: selectedDriverForSettlement === 'all' ? '#EFF6FF' : '#FFF',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-2px)' }
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={900} color="#1E293B">
                    🏢 كافة الطيارين
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    عرض مجمّع لكل عُهد الطلبات
                  </Typography>
                </Card>
              </Grid>

              {driverProfiles.map((p) => {
                const isSelected = selectedDriverForSettlement === p.name;
                return (
                  <Grid xs={12} sm={6} md={3} key={p.id || p.name}>
                    <Card
                      onClick={() => setSelectedDriverForSettlement(p.name)}
                      sx={{
                        p: 2,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isSelected ? '#F59E0B' : '#E5E7EB',
                        bgcolor: isSelected ? '#FFFDF5' : '#FFF',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={900} color="#1A1A2E">
                          🚴 {p.name}
                        </Typography>
                        <Chip
                          label={`${p.totalOrdersCount} أوردر`}
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: '#F3F4F6', fontSize: '0.68rem' }}
                        />
                      </Box>

                      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>الأوردرات (صافي):</Typography>
                          <Typography variant="caption" fontWeight={800} color="#1E293B">
                            {p.pendingOrdersSubtotal.toLocaleString()} ج.م
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>خدمات الدليفري:</Typography>
                          <Typography variant="caption" fontWeight={800} color="#D97706">
                            +{p.pendingDeliveryFees.toLocaleString()} ج.م
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.4, borderTop: '1px dashed #E2E8F0' }}>
                          <Typography variant="caption" color="#92400E" fontWeight={900}>إجمالي العهدة:</Typography>
                          <Typography variant="caption" fontWeight={900} color={p.pendingCashTotal > 0 ? '#B45309' : '#10B981'} sx={{ fontSize: '0.85rem' }}>
                            {p.pendingCashTotal.toLocaleString()} ج.م
                          </Typography>
                        </Box>

                        {p.collectedCashTotal > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.2 }}>
                            <Typography variant="caption" color="#047857" fontWeight={700}>المسلم للخزينة:</Typography>
                            <Typography variant="caption" fontWeight={900} color="#059669">
                              {p.collectedCashTotal.toLocaleString()} ج.م
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {p.pendingCashTotal > 0 && (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSettleDriverAllCash(p.name);
                          }}
                          sx={{
                            mt: 1.5,
                            borderRadius: '8px',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            py: 0.6,
                            bgcolor: '#D97706',
                            color: '#FFF',
                            '&:hover': { bgcolor: '#B45309' }
                          }}
                        >
                          💵 تسليم عهدة {p.name}
                        </Button>
                      )}
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>

          {/* Filters & Orders List for Driver Settlement */}
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight={900} color="#1A1A2E">
                  📋 كشف أوردرات العهدة والتسليمات {selectedDriverForSettlement !== 'all' ? `للتيار: ${selectedDriverForSettlement}` : ''}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdf />}
                  onClick={handlePrintCustodyPDF}
                  sx={{ borderRadius: '10px', fontWeight: 800, borderColor: '#CBD5E1', color: '#1E293B', bgcolor: '#FFF' }}
                >
                  طباعة كشف العهدة (PDF)
                </Button>
              </Box>

              {/* Filters */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { id: 'pending', label: '🔴 عُهَد لم تُسلّم' },
                  { id: 'collected', label: '🟢 كافة المُستلمات' },
                  { id: 'all', label: 'الكل' },
                ].map(f => (
                  <Chip
                    key={f.id}
                    label={f.label}
                    onClick={() => setSettlementCashFilter(f.id)}
                    color={settlementCashFilter === f.id ? 'primary' : 'default'}
                    variant={settlementCashFilter === f.id ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 800, borderRadius: '10px' }}
                  />
                ))}

                <Button
                  variant="contained"
                  startIcon={<CheckCircleOutlined />}
                  onClick={() => setCollectedOrdersDialogOpen(true)}
                  sx={{ borderRadius: '10px', fontWeight: 900, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                >
                  📜 سجل المحصلات ({collectedOrdersList.length})
                </Button>

                {selectedDriverForSettlement !== 'all' && (
                  <Button
                    variant="contained"
                    startIcon={<MonetizationOn />}
                    onClick={() => handleSettleDriverAllCash(selectedDriverForSettlement)}
                    sx={{ borderRadius: '10px', fontWeight: 900, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                  >
                    تسليم عهدة {selectedDriverForSettlement} بالكامل
                  </Button>
                )}
              </Box>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #F3F4F6', borderRadius: '12px' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>الطيار</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>العميل والفرع</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>مبلغ الأوردر (صافي)</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#D97706' }}>خدمة الدليفري</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#059669' }}>الإجمالي الكلي</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>حالة التوصيل</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>حالة العهدة والنقدية</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>التحكم والتوريد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {settlementFilteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#9CA3AF', fontWeight: 700 }}>
                        لا توجد طلبات عُهد مطابقة حالياً لهذا الفلتر.
                      </TableCell>
                    </TableRow>
                  ) : (
                    settlementFilteredOrders.map((ord) => {
                      const isCollected = ord.is_cash_collected || ord.isCashCollected || ord.status === 'cash_collected';
                      const driverName = ord.driver_name || ord.driverName || 'لم يحدد طيار';

                      const ordTotal = parseFloat(ord.total || 0);
                      const ordDeliveryFee = parseFloat(ord.delivery_fee || ord.deliveryFee || 0);
                      const ordSubtotal = parseFloat(ord.subtotal || 0) || Math.max(0, ordTotal - ordDeliveryFee);

                      return (
                        <TableRow key={ord.id} hover>
                          <TableCell sx={{ fontWeight: 900 }}>
                            #{ord.order_number || ord.orderNumber}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#1E40AF' }}>
                            🚴 {driverName}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={800}>{ord.customer_name || ord.customerName || 'عميل'}</Typography>
                            <Typography variant="caption" color="text.secondary">{ord.branch_name || 'الفرع الرئيسي'}</Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>
                            {ordSubtotal.toLocaleString()} ج.م
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#D97706' }}>
                            +{ordDeliveryFee.toLocaleString()} ج.م
                          </TableCell>
                          <TableCell sx={{ fontWeight: 900, color: '#059669', fontSize: '0.95rem' }}>
                            {ordTotal.toLocaleString()} ج.م
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ord.status === 'delivered' || ord.status === 'completed' ? '✅ تم التوصيل' : '🚀 خارج للتوصيل'}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                bgcolor: ord.status === 'delivered' || ord.status === 'completed' ? '#DCFCE7' : '#DBEAFE',
                                color: ord.status === 'delivered' || ord.status === 'completed' ? '#166534' : '#1E40AF',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {isCollected ? (
                              <Chip label="🟢 نقدية مُستلمة (بالشيفت)" size="small" sx={{ fontWeight: 900, bgcolor: '#DCFCE7', color: '#15803D' }} />
                            ) : (
                              <Chip label="🔴 عُهدة ممسوكة مع الطيار" size="small" sx={{ fontWeight: 900, bgcolor: '#FEF3C7', color: '#B45309' }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {isCollected ? (
                              <Typography variant="caption" fontWeight={800} color="#16A34A">
                                ✓ تم التوريد للخزينة
                              </Typography>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleConfirmCashCollected(ord)}
                                sx={{
                                  borderRadius: '8px',
                                  fontWeight: 900,
                                  fontSize: '0.75rem',
                                  bgcolor: '#059669',
                                  color: '#FFF',
                                  '&:hover': { bgcolor: '#047857' }
                                }}
                              >
                                💵 استلام النقدية
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>

                {settlementFilteredOrders.length > 0 && (
                  <TableFooter sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow sx={{ '& td': { borderTop: '2px solid #CBD5E1', fontWeight: 900, fontSize: '0.88rem' } }}>
                      <TableCell colSpan={3} sx={{ color: '#0F172A', fontWeight: 900 }}>
                        📊 إجمالي الكشف ({settlementFilteredOrders.length} طلبات):
                      </TableCell>
                      <TableCell sx={{ color: '#0F172A', fontWeight: 900 }}>
                        {settlementFilteredOrders.reduce((sum, ord) => {
                          const tot = parseFloat(ord.total || 0);
                          const fee = parseFloat(ord.delivery_fee || ord.deliveryFee || 0);
                          return sum + (parseFloat(ord.subtotal || 0) || Math.max(0, tot - fee));
                        }, 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell sx={{ color: '#D97706', fontWeight: 900 }}>
                        +{settlementFilteredOrders.reduce((sum, ord) => sum + parseFloat(ord.delivery_fee || ord.deliveryFee || 0), 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell sx={{ color: '#059669', fontWeight: 900, fontSize: '1rem' }}>
                        {settlementFilteredOrders.reduce((sum, ord) => sum + parseFloat(ord.total || 0), 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </TabPanel>

      {/* Tab 3: Customers Directory */}
      <TabPanel value={tabValue} index={3}>
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            دليل سجل العملاء والعناوين المحفوظة
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>اسم العميل</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>رقم الهاتف</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>العنوان المنزلي</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>المنطقة</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>عدد الطلبات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell sx={{ fontWeight: 800 }}>{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.address || '—'}</TableCell>
                    <TableCell>{c.area || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#3B82F6' }}>{c.total_orders || c.totalOrders || 1} طلبات</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Tab 4: Delivery Areas Manager */}
      <TabPanel value={tabValue} index={4}>
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={800}>
              مناطق وتكلفة التوصيل والخدمة
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAreaDialogOpen(true)}>
              إضافة منطقة جديدة
            </Button>
          </Box>

          <Grid container spacing={2}>
            {areas.map((a) => (
              <Grid xs={12} sm={4} key={a.id}>
                <Paper sx={{ p: 2, borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>{a.name}</Typography>
                    <Typography variant="caption" color="text.secondary">رسوم التوصيل: {a.fee || a.delivery_fee || 15} ج.م</Typography>
                  </Box>
                  <IconButton color="error" onClick={() => deleteArea(a.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </TabPanel>

      {/* Dispatch Modal Dialog */}
      <Dialog open={dispatchDialog} onClose={() => setDispatchDialog(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', color: '#1A1A2E' }}>
          🚴 اختيار وتعيين طيار التوصيل
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            أوردر #{selectedOrderForDispatch?.order_number || selectedOrderForDispatch?.orderNumber} - العميل: {selectedOrderForDispatch?.customer_name || selectedOrderForDispatch?.customerName}
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>طيار التوصيل</InputLabel>
            <Select
              value={selectedDriverForOrder}
              onChange={(e) => setSelectedDriverForOrder(e.target.value)}
              label="طيار التوصيل"
            >
              {dispatchDriverOptions.map(opt => (
                <MenuItem key={opt.id} value={opt.name}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDispatchDialog(false)} color="inherit">إلغاء</Button>
          <Button onClick={handleConfirmDispatch} variant="contained" color="primary" sx={{ fontWeight: 800 }}>
            تأكيد التعيين وبدء المشوار 🚀
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collected Orders History Popup Dialog */}
      <Dialog
        open={collectedOrdersDialogOpen}
        onClose={() => setCollectedOrdersDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleOutlined sx={{ color: '#059669' }} />
            <Typography variant="h6" fontWeight={900}>
              📜 سجل الأوردرات المُحصّلة والمُورّدة للخزينة {selectedDriverForSettlement !== 'all' ? `للتيار: ${selectedDriverForSettlement}` : ''}
            </Typography>
          </Box>
          <Chip label={`${collectedOrdersList.length} طلبات`} color="success" sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {collectedOrdersList.length === 0 ? (
            <Alert severity="info" sx={{ fontWeight: 700, borderRadius: '12px' }}>
              لا توجد أوردرات مُحصّلة ومُورّدة حالياً لهذا الفلتر.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F0FDF4' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>رقم الطلب</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>الطيار</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>العميل والفرع</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>مبلغ الأوردر (صافي)</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#D97706' }}>خدمة الدليفري</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#059669' }}>الإجمالي الكلي</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>حالة التوريد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {collectedOrdersList.map((ord) => {
                    const driverName = ord.driver_name || ord.driverName || 'لم يحدد طيار';
                    const ordTotal = parseFloat(ord.total || 0);
                    const ordDeliveryFee = parseFloat(ord.delivery_fee || ord.deliveryFee || 0);
                    const ordSubtotal = parseFloat(ord.subtotal || 0) || Math.max(0, ordTotal - ordDeliveryFee);

                    return (
                      <TableRow key={ord.id} hover>
                        <TableCell sx={{ fontWeight: 900 }}>
                          #{ord.order_number || ord.orderNumber}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1E40AF' }}>
                          🚴 {driverName}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800}>{ord.customer_name || ord.customerName || 'عميل'}</Typography>
                          <Typography variant="caption" color="text.secondary">{ord.branch_name || 'الفرع الرئيسي'}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>
                          {ordSubtotal.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#D97706' }}>
                          +{ordDeliveryFee.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#059669' }}>
                          {ordTotal.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell align="center">
                          <Chip label="🟢 تم التوريد بالخزينة" size="small" sx={{ fontWeight: 900, bgcolor: '#DCFCE7', color: '#15803D' }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow sx={{ '& td': { borderTop: '2px solid #CBD5E1', fontWeight: 900, fontSize: '0.88rem' } }}>
                    <TableCell colSpan={3} sx={{ color: '#0F172A', fontWeight: 900 }}>
                      📊 إجمالي المحصّلات ({collectedOrdersList.length} طلبات):
                    </TableCell>
                    <TableCell sx={{ color: '#0F172A', fontWeight: 900 }}>
                      {collectedOrdersList.reduce((sum, ord) => {
                        const tot = parseFloat(ord.total || 0);
                        const fee = parseFloat(ord.delivery_fee || ord.deliveryFee || 0);
                        return sum + (parseFloat(ord.subtotal || 0) || Math.max(0, tot - fee));
                      }, 0).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell sx={{ color: '#D97706', fontWeight: 900 }}>
                      +{collectedOrdersList.reduce((sum, ord) => sum + parseFloat(ord.delivery_fee || ord.deliveryFee || 0), 0).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell sx={{ color: '#059669', fontWeight: 900, fontSize: '1rem' }}>
                      {collectedOrdersList.reduce((sum, ord) => sum + parseFloat(ord.total || 0), 0).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            onClick={() => {
              if (collectedOrdersList.length === 0) return;
              const totalSub = collectedOrdersList.reduce((sum, o) => {
                const tot = parseFloat(o.total || 0);
                const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
                return sum + (parseFloat(o.subtotal || 0) || Math.max(0, tot - fee));
              }, 0);
              const totalFee = collectedOrdersList.reduce((sum, o) => sum + parseFloat(o.delivery_fee || o.deliveryFee || 0), 0);
              const grandTot = collectedOrdersList.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

              generateReportPDF({
                title: `سجل الأوردرات المحصلة والموردة بالخزينة - ${selectedDriverForSettlement !== 'all' ? selectedDriverForSettlement : 'كافة الطيارين'}`,
                subtitle: 'تقرير كشف المبالغ والنقدية المسلمة بالكامل',
                branchName: 'الفرع الرئيسي',
                dateRangeStr: new Date().toLocaleDateString('ar-EG'),
                stats: [
                  { title: 'الطيار', value: selectedDriverForSettlement !== 'all' ? selectedDriverForSettlement : 'كافة الطيارين' },
                  { title: 'إجمالي صافي الأوردرات', value: `${totalSub.toLocaleString()} ج.م` },
                  { title: 'إجمالي خدمات الدليفري', value: `${totalFee.toLocaleString()} ج.م` },
                  { title: 'الإجمالي المسلم بالخزينة', value: `${grandTot.toLocaleString()} ج.م` }
                ],
                columns: [
                  { label: '#', accessor: (_, idx) => idx + 1 },
                  { label: 'رقم الطلب', accessor: (o) => `#${o.order_number || o.orderNumber}` },
                  { label: 'الطيار', accessor: (o) => o.driver_name || o.driverName || '—' },
                  { label: 'العميل', accessor: (o) => o.customer_name || o.customerName || 'عميل' },
                  { label: 'صافي الأوردر', accessor: (o) => {
                      const tot = parseFloat(o.total || 0);
                      const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
                      return `${(parseFloat(o.subtotal || 0) || Math.max(0, tot - fee)).toLocaleString()} ج.م`;
                    }
                  },
                  { label: 'خدمة الدليفري', accessor: (o) => `+${(parseFloat(o.delivery_fee || o.deliveryFee || 0)).toLocaleString()} ج.م` },
                  { label: 'الإجمالي المحصل', accessor: (o) => `${(parseFloat(o.total || 0)).toLocaleString()} ج.م` },
                  { label: 'حالة التوريد', accessor: () => '🟢 تم التوريد بالخزينة' }
                ],
                data: collectedOrdersList,
                totals: {
                  0: '',
                  1: 'إجمالي المحصلات',
                  2: '',
                  3: '',
                  4: `${totalSub.toLocaleString()} ج.م`,
                  5: `${totalFee.toLocaleString()} ج.م`,
                  6: `${grandTot.toLocaleString()} ج.م`,
                  7: ''
                }
              });
            }}
            sx={{ borderRadius: '10px', fontWeight: 800 }}
          >
            طباعة تقرير المحصلات (PDF)
          </Button>
          <Button onClick={() => setCollectedOrdersDialogOpen(false)} variant="contained" sx={{ borderRadius: '10px', fontWeight: 800 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
