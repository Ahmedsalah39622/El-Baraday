'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, TextField, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  InputAdornment, FormControl, InputLabel, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Tooltip, Alert, CircularProgress, Divider
} from '@mui/material';
import {
  DeliveryDining, AccessTime, LocationOn, Person, Phone, Home, Print, CheckCircle,
  Warning, Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh, HowToReg, Store, CheckCircleOutlined, DirectionsRun
} from '@mui/icons-material';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import DeliveryTimerBadge from '@/components/delivery/DeliveryTimerBadge';
import { printThermalReceipt } from '@/lib/printReceipt';

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
  const isAdmin = user?.role === 'admin';

  // Live Orders State
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryTimerMinutes, setDeliveryTimerMinutes] = useState(30);

  // Dispatch Dialog State
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState(null);
  const [selectedDriverForOrder, setSelectedDriverForOrder] = useState('');

  // Customer & Area Dialogs
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({ phone: '', name: '', address: '', area: '', floor: '', apartment: '' });
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  // Fetch Delivery Orders & Settings
  const fetchDeliveryData = async () => {
    setLoadingOrders(true);
    try {
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setObj = await setRes.json();
        if (setObj.delivery_timer_minutes) setDeliveryTimerMinutes(parseInt(setObj.delivery_timer_minutes) || 30);
      }

      const url = selectedBranchId && selectedBranchId !== 'all' ? `/api/orders?branch_id=${selectedBranchId}` : '/api/orders';
      const res = await fetch(url);
      if (res.ok) {
        const rows = await res.json();
        const delOrders = (rows || []).filter(o => o.order_type === 'delivery' || o.orderType === 'delivery');
        setDeliveryOrders(delOrders);
      }
    } catch (e) {
      console.error('❌ Error fetching delivery orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchDeliveryData();
    fetchCustomers();
    fetchAreas();
    fetchDrivers();
    fetchAttendanceQueue(selectedBranchId);

    const interval = setInterval(() => {
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedBranchId]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // Build clean, deduplicated driver options for dispatch selector (Ready drivers ranked first)
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

  (drivers || []).forEach(d => {
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

  // Action: Confirm Dispatching Order with Driver
  const handleConfirmDispatch = async () => {
    if (!selectedOrderForDispatch) return;
    if (!selectedDriverForOrder || !selectedDriverForOrder.trim()) {
      alert('برجاء اختيار طيار التوصيل أولاً للخروج بالطلب!');
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

  // Action Phase 2: Mark Order Delivered to Customer (Starts return trip timer!)
  const handleMarkCustomerDelivered = async (order) => {
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'customer_delivered',
          delivered_to_customer_at: new Date().toISOString(),
          driver_name: order.driver_name || order.driverName
        })
      });
      fetchDeliveryData();
      fetchAttendanceQueue(selectedBranchId);
    } catch (e) {
      console.error('❌ Failed to mark customer delivered:', e);
    }
  };

  // Action Phase 3: Mark Order Fully Completed (Driver arrived back at restaurant)
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

  // Filtered Live Delivery Orders
  const filteredOrders = (deliveryOrders || []).filter(o => {
    const isPrep = !o.dispatched_at && o.status !== 'delivered' && o.status !== 'مكتمل' && o.status !== 'completed' && o.status !== 'customer_delivered';
    const isDisp = !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'مكتمل' && o.status !== 'completed' && o.status !== 'customer_delivered';
    const isCustDeliv = o.status === 'customer_delivered';
    const isDeliv = o.status === 'delivered' || o.status === 'مكتمل' || o.status === 'completed';

    if (orderStatusFilter === 'preparing' && !isPrep) return false;
    if (orderStatusFilter === 'dispatched' && !isDisp) return false;
    if (orderStatusFilter === 'customer_delivered' && !isCustDeliv) return false;
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

  // Stats Counters
  const preparingCount = deliveryOrders.filter(o => !o.dispatched_at && o.status !== 'delivered' && o.status !== 'مكتمل' && o.status !== 'completed' && o.status !== 'customer_delivered').length;
  const dispatchedCount = deliveryOrders.filter(o => !!o.dispatched_at && o.status !== 'delivered' && o.status !== 'مكتمل' && o.status !== 'completed' && o.status !== 'customer_delivered').length;
  const customerDeliveredCount = deliveryOrders.filter(o => o.status === 'customer_delivered').length;
  const deliveredCount = deliveryOrders.filter(o => o.status === 'delivered' || o.status === 'مكتمل' || o.status === 'completed').length;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflowY: 'auto', pb: { xs: 14, md: 8 } }}>
      {/* Top Banner Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '16px', bgcolor: 'rgba(224, 107, 31, 0.1)', color: '#E06B1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DeliveryDining sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
              مركـز إدارة وتنظيـم الدليفـري والتوصيـل
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              متابعة حركة الطيارين اللحظية بالتايمر، توجيه الأوردرات للوجهات والمناطق، وإدارة عهد التحصيل
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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
        <Grid xs={6} sm={3}>
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

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #3B82F6', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#3B82F6', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeliveryDining sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="#1E40AF" fontWeight={700}>خارج للتوصيل (مع التايمر)</Typography>
              <Typography variant="h6" fontWeight={900} color="#1D4ED8">{dispatchedCount} طلب</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #A855F7', bgcolor: '#F3E8FF', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#A855F7', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="#6B21A8" fontWeight={700}>تم تسليم العميل (في الرجوع)</Typography>
              <Typography variant="h6" fontWeight={900} color="#7E22CE">{customerDeliveredCount} طلب</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #10B981', bgcolor: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="#065F46" fontWeight={700}>تم عودة الطيار واكتمال الأوردر</Typography>
              <Typography variant="h6" fontWeight={900} color="#047857">{deliveredCount} طلب</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Control Navigation Tabs */}
      <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab icon={<DeliveryDining />} iconPosition="start" label="لوحة الأوردرات والتايمرات اللحظية" sx={{ fontWeight: 800 }} />
          <Tab icon={<HowToReg />} iconPosition="start" label="طابور دور الطيارين المباشر" sx={{ fontWeight: 800 }} />
          <Tab icon={<Person />} iconPosition="start" label="سجل العملاء والعناوين المحفوظة" sx={{ fontWeight: 800 }} />
          <Tab icon={<LocationOn />} iconPosition="start" label="مناطق التوصيل والرسوم" sx={{ fontWeight: 800 }} />
        </Tabs>
      </Paper>

      {/* Tab 1: Live Delivery Control Board & Timers */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {/* Status Filter Chips */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `الكل (${deliveryOrders.length})` },
              { id: 'preparing', label: `⏳ قيد التجهيز (${preparingCount})` },
              { id: 'dispatched', label: `🚀 خارج للتوصيل (${dispatchedCount})` },
              { id: 'customer_delivered', label: `🏠 تم تسليم العميل (${customerDeliveredCount})` },
              { id: 'delivered', label: `✅ تم عودة الطيار (${deliveredCount})` },
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
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={36} /></Box>
        ) : filteredOrders.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: '16px', fontWeight: 700, py: 3 }}>
            لا يوجد طلبات دليفري مطابقة للفلتر المحدد حالياً.
          </Alert>
        ) : (
          <Grid container spacing={2.5}>
            {filteredOrders.map(order => {
              const isDispatched = !!order.dispatched_at && order.status !== 'customer_delivered';
              const isCustomerDelivered = order.status === 'customer_delivered';
              const isDelivered = order.status === 'delivered' || order.status === 'مكتمل' || order.status === 'completed';
              const branchName = order.branch_name || 'الفرع الرئيسي';

              return (
                <Grid xs={12} sm={6} md={4} key={order.id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: '20px',
                      border: '2px solid',
                      borderColor: isDelivered ? '#10B981' : (isCustomerDelivered ? '#A855F7' : (isDispatched ? '#3B82F6' : '#F59E0B')),
                      bgcolor: isDelivered ? '#F0FDF4' : (isCustomerDelivered ? '#FAF5FF' : (isDispatched ? '#EFF6FF' : '#FFFFFF')),
                      boxShadow: isDispatched || isCustomerDelivered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}
                  >
                    <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Top Header Card */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" fontWeight={900} color="#1A1A2E">
                            أوردر #{order.order_number || order.orderNumber}
                          </Typography>
                          <Chip
                            icon={<Store sx={{ fontSize: '14px !important' }} />}
                            label={branchName}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                          />
                        </Box>

                        {/* Realtime Delivery Timer Badge */}
                        <DeliveryTimerBadge
                          dispatchedAt={order.dispatched_at}
                          deliveredToCustomerAt={order.delivered_to_customer_at}
                          targetMinutes={deliveryTimerMinutes}
                          status={order.status}
                          isDelivered={isDelivered}
                        />
                      </Box>

                      <Divider sx={{ my: 0.5 }} />

                      {/* Customer Info */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person sx={{ color: '#4285F4', fontSize: 18 }} />
                          <Typography variant="body2" fontWeight={800} color="#1E293B">
                            {order.customer_name || order.customerName || 'عميل دليفري'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ color: '#6B7280', fontSize: 18 }} />
                          <Typography variant="body2" fontWeight={700} color="#3B82F6" dir="ltr" sx={{ textAlign: 'right' }}>
                            {order.customer_phone || order.customerPhone || '—'}
                          </Typography>
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

                      {/* Driver Status Banner */}
                      <Paper sx={{ p: 1.2, borderRadius: '12px', bgcolor: isCustomerDelivered ? '#F3E8FF' : (isDispatched ? '#DBEAFE' : '#FFFBEB'), border: '1px solid', borderColor: isCustomerDelivered ? '#E9D5FF' : (isDispatched ? '#BFDBFE' : '#FDE68A'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DeliveryDining sx={{ color: isCustomerDelivered ? '#9333EA' : (isDispatched ? '#1D4ED8' : '#D97706') }} />
                          <Typography variant="caption" fontWeight={800} color={isCustomerDelivered ? '#6B21A8' : (isDispatched ? '#1E40AF' : '#92400E')}>
                            الطيار: {order.driver_name || order.driverName || 'لم يحدد طيار بعد'}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" fontWeight={900} color="#059669">
                          {parseFloat(order.total || 0).toLocaleString()} ج.م
                        </Typography>
                      </Paper>

                      {/* Action Buttons Footer */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        {!isDelivered ? (
                          isCustomerDelivered ? (
                            /* Phase 3 Button: Driver returned to restaurant */
                            <Button
                              fullWidth
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => handleMarkDelivered(order)}
                              sx={{ borderRadius: '10px', fontWeight: 800, py: 1, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                            >
                              ✅ تأكيد عودة الطيار للمحل
                            </Button>
                          ) : isDispatched ? (
                            /* Phase 2 Buttons: Out on delivery -> Mark customer received or change driver */
                            <>
                              <Button
                                fullWidth
                                size="small"
                                variant="contained"
                                startIcon={<Home />}
                                onClick={() => handleMarkCustomerDelivered(order)}
                                sx={{ borderRadius: '10px', fontWeight: 800, bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                              >
                                🏠 تم التسليم للعميل
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleOpenDispatch(order)}
                                sx={{ borderRadius: '10px', fontWeight: 800, minWidth: '95px' }}
                              >
                                تغيير الطيار
                              </Button>
                            </>
                          ) : (
                            /* Phase 1 Button: Dispatch order with driver */
                            <Button
                              fullWidth
                              size="small"
                              variant="contained"
                              startIcon={<DeliveryDining />}
                              onClick={() => handleOpenDispatch(order)}
                              sx={{ borderRadius: '10px', fontWeight: 800, bgcolor: '#E06B1F', '&:hover': { bgcolor: '#C85A17' } }}
                            >
                              🚀 خروج للتوصيل
                            </Button>
                          )
                        ) : (
                          <Chip
                            icon={<CheckCircleOutlined sx={{ fontSize: '16px !important', color: '#047857 !important' }} />}
                            label="تم الوصول والعودة بنجاح"
                            variant="filled"
                            sx={{ width: '100%', py: 1.8, bgcolor: '#ECFDF5', color: '#047857', border: '1.5px solid #10B981', fontWeight: 800 }}
                          />
                        )}

                        <Tooltip title="طباعة بون التوصيل">
                          <IconButton
                            size="small"
                            onClick={() => handlePrintDelivery(order)}
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '10px', p: 1 }}
                          >
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 2: Live Driver Attendance Queue */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HowToReg sx={{ color: '#10B981', fontSize: 28 }} />
              <Typography variant="h6" fontWeight={800}>
                طابور دور الطيارين الحاضرين بالشيفت (مرتب أوتوماتيكياً بالدقيقة)
              </Typography>
            </Box>
            <Button variant="contained" href="/attendance" sx={{ borderRadius: '12px', bgcolor: '#10B981', fontWeight: 800 }}>
              شاشة تمامات الطيارين الكاملة
            </Button>
          </Box>

          <Grid container spacing={2}>
            {(() => {
              const readyQueue = (activeQueue || []).filter(q => q.status === 'ready');

              return (activeQueue || []).map((item) => {
                const isOnDelivery = item.status === 'on_delivery';
                const readyIndex = readyQueue.findIndex(q => q.id === item.id);
                const isTopReady = !isOnDelivery && readyIndex === 0;

                let badgeLabel = `🟢 الدور ${readyIndex + 1}`;
                let badgeStyle = { bgcolor: '#E5E7EB', color: '#374151' };
                let cardStyle = { borderColor: '#E5E7EB', bgcolor: '#FFFFFF' };

                if (isOnDelivery) {
                  badgeLabel = '🛵 في مشوار توصيل (خارج بالطلب)';
                  badgeStyle = { bgcolor: '#3B82F6', color: '#FFFFFF' };
                  cardStyle = { borderColor: '#3B82F6', bgcolor: '#EFF6FF' };
                } else if (isTopReady) {
                  badgeLabel = '👑 الدور 1 (التالي للخروج)';
                  badgeStyle = { bgcolor: '#10B981', color: '#FFFFFF' };
                  cardStyle = { borderColor: '#10B981', bgcolor: '#F0FDF4' };
                }

                return (
                  <Grid xs={12} sm={6} md={4} key={item.id}>
                    <Card sx={{ p: 2, borderRadius: '16px', border: '2px solid', ...cardStyle }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip label={badgeLabel} size="small" sx={{ ...badgeStyle, fontWeight: 900, fontSize: '0.8rem' }} />
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          حضور: {item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={900} sx={{ mt: 1.5, color: '#1A1A2E' }}>
                        {item.driver_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        الهاتف: {item.driver_phone || '—'} | الفرع: {item.branch_name || 'الرئيسي'}
                      </Typography>
                    </Card>
                  </Grid>
                );
              });
            })()}

            {(!activeQueue || activeQueue.length === 0) && (
              <Grid xs={12}>
                <Alert severity="warning" sx={{ borderRadius: '12px', fontWeight: 700 }}>
                  لا يوجد طيارين حاضرين بالسيستم حالياً. يمكنك إثبات حضورهم من شاشة التمامات.
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      </TabPanel>

      {/* Tab 3: Customer Management & Multiple Addresses */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <TextField
            placeholder="بحث برقم التليفون أو الاسم..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }
            }}
            sx={{ width: '320px', bgcolor: '#FFF' }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentCustomer({ phone: '', name: '', address: '', area: '', floor: '', apartment: '' });
              setCustomerDialogOpen(true);
            }}
            sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#4285F4' }}
          >
            إضافة عميل جديد
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell fontWeight="bold">الاسم</TableCell>
                <TableCell fontWeight="bold">التليفون</TableCell>
                <TableCell fontWeight="bold">العنوان الرئيسي</TableCell>
                <TableCell fontWeight="bold">العناوين المحفوظة</TableCell>
                <TableCell fontWeight="bold">عدد الطلبات</TableCell>
                <TableCell fontWeight="bold">إجمالي التعاملات</TableCell>
                <TableCell fontWeight="bold" align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.filter(c => (c.name || '').includes(searchTerm) || (c.phone || '').includes(searchTerm)).map((row) => {
                const addrs = row.addresses || [];
                return (
                  <TableRow key={row.id}>
                    <TableCell fontWeight={800}>{row.name}</TableCell>
                    <TableCell sx={{ color: '#3B82F6', fontWeight: 800, dir: 'ltr', textAlign: 'right' }}>{row.phone}</TableCell>
                    <TableCell>{row.address || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<LocationOn sx={{ fontSize: '14px !important' }} />}
                        label={`${addrs.length || 1} عناوين`}
                        size="small"
                        sx={{ bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell fontWeight={700}>{row.totalTransactions || 0} طلب</TableCell>
                    <TableCell fontWeight={800} color="#059669">{(row.totalSpend || 0).toLocaleString()} ج.م</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => { setCurrentCustomer(row); setCustomerDialogOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => deleteCustomer(row.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 4: Delivery Areas & Fees */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={800}>
            مناطق التوصيل ورسوم خدمة الدليفري
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAreaDialogOpen(true)} sx={{ borderRadius: '12px', fontWeight: 800 }}>
            إضافة منطقة جديدة
          </Button>
        </Box>
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          <List>
            {areas?.map((area) => (
              <ListItem key={area.id} divider>
                <ListItemText
                  primary={<Typography fontWeight={800}>📍 {area.name}</Typography>}
                  secondary={`رسوم التوصيل: ${area.delivery_fee || 15} ج.م`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" color="error" onClick={() => deleteArea(area.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {(!areas || areas.length === 0) && (
              <ListItem><ListItemText primary="لا يوجد مناطق مضافة حالياً." sx={{ textAlign: 'center', color: 'text.secondary' }}/></ListItem>
            )}
          </List>
        </Paper>
      </TabPanel>

      {/* Dispatch Order Dialog */}
      <Dialog open={dispatchDialog} onClose={() => setDispatchDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#E06B1F' }}>
          🛵 توجيه وخروج الطلب للتوصيل
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {selectedOrderForDispatch && (
            <>
              <Typography variant="subtitle2" fontWeight={800}>
                أوردر رقم #{selectedOrderForDispatch.order_number || selectedOrderForDispatch.orderNumber} لـ {selectedOrderForDispatch.customer_name || selectedOrderForDispatch.customerName}
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>اختيار طيار التوصيل المكلف</InputLabel>
                <Select
                  value={selectedDriverForOrder}
                  label="اختيار طيار التوصيل المكلف"
                  onChange={(e) => setSelectedDriverForOrder(e.target.value)}
                  sx={{ borderRadius: '10px' }}
                >
                  {dispatchDriverOptions.map((d) => (
                    <MenuItem key={d.id || d.name} value={d.name}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.8rem' }}>
                عند التأكيد، سيبدأ التايمر التفاعلي اللحظي فوراً بالعداد التنازلي للتوصيل.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDispatchDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmDispatch} variant="contained" sx={{ bgcolor: '#E06B1F', fontWeight: 800 }}>
            تأكيد الخروج للتوصيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Customer Dialog */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{currentCustomer.id ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="التليفون *" value={currentCustomer.phone} onChange={(e) => setCurrentCustomer({...currentCustomer, phone: e.target.value})} fullWidth size="small" />
            <TextField label="الاسم *" value={currentCustomer.name} onChange={(e) => setCurrentCustomer({...currentCustomer, name: e.target.value})} fullWidth size="small" />
            <TextField label="العنوان" value={currentCustomer.address} onChange={(e) => setCurrentCustomer({...currentCustomer, address: e.target.value})} fullWidth size="small" />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField label="الدور" value={currentCustomer.floor} onChange={(e) => setCurrentCustomer({...currentCustomer, floor: e.target.value})} fullWidth size="small" />
              <TextField label="الشقة" value={currentCustomer.apartment} onChange={(e) => setCurrentCustomer({...currentCustomer, apartment: e.target.value})} fullWidth size="small" />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCustomerDialogOpen(false)}>إلغاء</Button>
          <Button onClick={async () => {
            await saveOrUpdateCustomer(currentCustomer);
            setCustomerDialogOpen(false);
          }} variant="contained" color="primary">حفظ البيانات</Button>
        </DialogActions>
      </Dialog>

      {/* Add Area Dialog */}
      <Dialog open={areaDialogOpen} onClose={() => setAreaDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>إضافة منطقة توصيل جديدة</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="اسم المنطقة" fullWidth variant="outlined" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} sx={{ mt: 1 }}/>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAreaDialogOpen(false)}>إلغاء</Button>
          <Button onClick={() => {
            if (newAreaName) {
              addArea({ id: Date.now().toString(), name: newAreaName });
              setNewAreaName('');
              setAreaDialogOpen(false);
            }
          }} variant="contained">حفظ المنطقة</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
