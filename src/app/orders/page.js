'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Print,
  VisibilityOutlined,
  Close,
  Person,
  Phone,
  LocationOn,
  ReceiptLong,
  Store,
  CancelOutlined,
  AccountBalanceWallet,
  DeliveryDining,
  LocalShipping,
  History,
  CheckCircle,
  EditOutlined,
} from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import { printThermalReceipt } from '@/lib/printReceipt';
import DeliveryTimerBadge from '@/components/delivery/DeliveryTimerBadge';
import EditOrderModal from '@/components/dialogs/EditOrderModal';

export default function OrdersPage() {
  const { invoices, fetchInvoices, cancelOrder } = useInvoiceStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { activeShift, fetchShifts, shifts: allShiftsList } = useShiftStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [showPreviousShifts, setShowPreviousShifts] = useState(false);

  // View Order Details Modal State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Edit Order Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);

  const effectiveBranch = (user && user.role !== 'admin' && user.branch_id) ? user.branch_id : selectedBranchId;
  const targetBranch = effectiveBranch || 'all';

  const activeShiftsList = (allShiftsList && allShiftsList.length > 0)
    ? allShiftsList.filter(s => s.status === 'active')
    : (activeShift && activeShift.status === 'active' ? [activeShift] : []);

  const isShiftActive = targetBranch === 'all'
    ? activeShiftsList.length > 0
    : activeShiftsList.some(s => s.branch_id === targetBranch || (!s.branch_id && targetBranch === 'b1'));

  useEffect(() => {
    fetchInvoices(500, targetBranch);
    fetchShifts(targetBranch);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInvoices(500, targetBranch);
        fetchShifts(targetBranch);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [targetBranch, user]);

  // Filter orders strictly by selected branch, shift time, & search query
  const filteredOrders = (invoices || []).filter((inv) => {
    const matchBranch = !targetBranch || targetBranch === 'all' || inv.branchId === targetBranch || inv.branch_id === targetBranch;
    if (!matchBranch) return false;

    // When NOT showing previous shifts: hide old orders
    if (!showPreviousShifts) {
      const invBranch = inv.branchId || inv.branch_id || 'b1';
      const branchActiveShift = (allShiftsList && allShiftsList.length > 0)
        ? allShiftsList.find(s => s.status === 'active' && (s.branch_id === invBranch || (!s.branch_id && invBranch === 'b1')))
        : (activeShift && (activeShift.branch_id === invBranch || (!activeShift.branch_id && invBranch === 'b1')) ? activeShift : null);

      if (!branchActiveShift) return false;

      const rawShiftStart = branchActiveShift.start_time || branchActiveShift.rawStartTime || branchActiveShift.created_at;
      if (rawShiftStart && (inv.createdAt || inv.created_at)) {
        const invTime = new Date(inv.createdAt || inv.created_at).getTime();
        const shiftStartTime = new Date(rawShiftStart).getTime();
        if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < (shiftStartTime - 300000)) {
          return false;
        }
      }
    }

    if (!searchQuery) return true;
    const cleanSearch = searchQuery.toLowerCase().trim();
    return (
      inv.id?.toLowerCase().includes(cleanSearch) ||
      inv.orderNumber?.includes(cleanSearch) ||
      inv.customerName?.toLowerCase().includes(cleanSearch) ||
      inv.customerPhone?.includes(cleanSearch)
    );
  });

  // Dynamic calculations for selected branch (excluding cancelled orders).
  const branchSummaryOrders = useMemo(() => {
    return (invoices || []).filter((inv) => {
      const matchBranch = !targetBranch || targetBranch === 'all' || inv.branchId === targetBranch || inv.branch_id === targetBranch;
      if (!matchBranch || inv.status === 'cancelled') return false;

      // When a shift is active, keep the KPI cards aligned with the current shift window.
      const invBranch = inv.branchId || inv.branch_id || 'b1';
      const branchActiveShift = (allShiftsList && allShiftsList.length > 0)
        ? allShiftsList.find(s => s.status === 'active' && (s.branch_id === invBranch || (!s.branch_id && invBranch === 'b1')))
        : (activeShift && (activeShift.branch_id === invBranch || (!activeShift.branch_id && invBranch === 'b1')) ? activeShift : null);

      if (!branchActiveShift) return false;

      const rawShiftStart = branchActiveShift.start_time || branchActiveShift.rawStartTime || branchActiveShift.created_at;
      if (rawShiftStart && (inv.createdAt || inv.created_at)) {
        const invTime = new Date(inv.createdAt || inv.created_at).getTime();
        const shiftStartTime = new Date(rawShiftStart).getTime();
        if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < shiftStartTime) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, targetBranch, activeShift, allShiftsList]);

  // 1. Total Cash in Drawer (إجمالي النقدية في الخزنة) - Exactly aligned with POS till logic
  const totalCashInDrawer = useMemo(() => {
    const relevantShifts = targetBranch === 'all'
      ? activeShiftsList
      : activeShiftsList.filter(s => s.branch_id === targetBranch || (!s.branch_id && targetBranch === 'b1'));

    const startCash = relevantShifts.reduce((sum, s) => sum + (parseFloat(s.startAmount || s.start_amount || 0)), 0);

    const cashSalesSum = branchSummaryOrders.reduce((sum, inv) => {
      const invBranch = inv.branchId || inv.branch_id || 'b1';
      const invShift = relevantShifts.find(s => s.branch_id === invBranch || (!s.branch_id && invBranch === 'b1'));

      if (invShift && invShift.rawStartTime && inv.createdAt) {
        const invTime = new Date(inv.createdAt).getTime();
        const shiftStartTime = new Date(invShift.rawStartTime).getTime();
        if (!isNaN(invTime) && !isNaN(shiftStartTime) && invTime < shiftStartTime) {
          return sum; // Skip invoices before current active shift start
        }
      }

      // Exclude uncollected delivery cash
      const isDelivery = inv.orderType === 'delivery' || inv.order_type === 'delivery';
      if (isDelivery) {
        const isCashCollected = inv.is_cash_collected === true || inv.isCashCollected === true || inv.status === 'cash_collected';
        if (!isCashCollected) return sum;
      }

      // Cash payments only
      const pm = inv.paymentMethod || inv.payment_method || 'cash';
      if (pm !== 'cash') return sum;

      return sum + (parseFloat(inv.paidAmount || inv.total || 0));
    }, 0);

    return startCash + cashSalesSum;
  }, [branchSummaryOrders, activeShift, allShiftsList, targetBranch]);

  // 2. Total Delivery Sales (إجمالي مبيعات الدليفري)
  const totalDeliverySales = useMemo(() => {
    return branchSummaryOrders
      .filter((inv) => inv.orderType === 'delivery' || inv.order_type === 'delivery')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  }, [branchSummaryOrders]);

  // 3. Total Delivery Service Fee (إجمالي خدمة الدليفري)
  const totalDeliveryFee = useMemo(() => {
    return branchSummaryOrders
      .filter((inv) => inv.orderType === 'delivery' || inv.order_type === 'delivery')
      .reduce((sum, inv) => sum + (parseFloat(inv.deliveryFee || inv.delivery_fee) || 0), 0);
  }, [branchSummaryOrders]);

  // Total All Sales for the branch
  const totalBranchSales = useMemo(() => {
    return branchSummaryOrders.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  }, [branchSummaryOrders]);

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleCancelOrder = async (order) => {
    const orderNum = order.orderNumber || order.id?.slice(0, 8);
    const orderTotal = (parseFloat(order.total) || 0).toLocaleString();

    const confirmMsg = `هل أنت تأكد من إلغاء الطلب رقم #${orderNum}؟\n\n` +
      `⚠️ عند الإلغاء سيتم تغيير حالة الطلب إلى (ملغي)، وتخصيم قيمته (${orderTotal} ج.م) وتصفير مبلغه تلقائياً من المبيعات والشيفت والحسابات.`;

    if (!confirm(confirmMsg)) return;

    const res = await cancelOrder(order.id);
    if (res.success) {
      alert(`✅ تم إلغاء الطلب رقم #${orderNum} وتخصيم المجموع من المبيعات والشيفت بنجاح.`);
      setDetailsOpen(false);
      fetchInvoices(100, targetBranch);
    } else {
      alert(`❌ حدث خطأ أثناء إلغاء الطلب: ${res.error || 'خطأ غير معروف'}`);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
            سجل الطلبات والفواتير
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            إجمالي الطلبات المسجلة للفرع المحدد ({filteredOrders.length})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Branch Switch Control (كل الفروع / فرع عزت / فرع المسلة) */}
          <Paper elevation={0} sx={{ borderRadius: '14px', p: 0.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <Tabs
              value={selectedBranchId || 'all'}
              onChange={(e, val) => setSelectedBranchId(val)}
              sx={{
                minHeight: 38,
                '& .MuiTab-root': {
                  minHeight: 38,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  borderRadius: '10px',
                  mx: 0.2,
                  px: 2,
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

          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث برقم الطلب أو اسم العميل..." />

          {/* Toggle Previous Shifts Button */}
          <Button
            variant={showPreviousShifts ? 'contained' : 'outlined'}
            startIcon={<History sx={{ fontSize: '18px !important' }} />}
            onClick={() => setShowPreviousShifts(!showPreviousShifts)}
            size="small"
            sx={{
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.78rem',
              px: 1.8,
              py: 0.8,
              minHeight: 36,
              whiteSpace: 'nowrap',
              border: '1.5px solid',
              borderColor: showPreviousShifts ? '#1E40AF' : '#CBD5E1',
              bgcolor: showPreviousShifts ? '#1E40AF' : '#F8FAFC',
              color: showPreviousShifts ? '#FFF' : '#475569',
              boxShadow: showPreviousShifts ? '0 2px 8px rgba(30, 64, 175, 0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              '&:hover': {
                bgcolor: showPreviousShifts ? '#1E3A8A' : '#F1F5F9',
                borderColor: showPreviousShifts ? '#1E3A8A' : '#94A3B8',
              },
            }}
          >
            {showPreviousShifts ? '✕ إخفاء السابقة' : '📋 طلبات الشيفتات السابقة'}
          </Button>
        </Box>
      </Box>

      {/* KPI Dynamic Summary Cards based on Selected Branch */}
      <Grid container spacing={2}>
        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #ECFDF5', bgcolor: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#10B981', color: '#FFF' }}>
              <AccountBalanceWallet sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800 }}>
                إجمالي الخزنة (النقدية)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#065F46' }}>
                {totalCashInDrawer.toLocaleString()} ج.م
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #FFF3EB', bgcolor: '#FFF3EB', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#E06B1F', color: '#FFF' }}>
              <DeliveryDining sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 800 }}>
                إجمالي مبيعات الدليفري
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#9A3412' }}>
                {totalDeliverySales.toLocaleString()} ج.م
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #FEF3C7', bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#F59E0B', color: '#FFF' }}>
              <LocalShipping sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 800 }}>
                إجمالي خدمة الدليفري
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#78350F' }}>
                {totalDeliveryFee.toLocaleString()} ج.م
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #EFF6FF', bgcolor: '#EFF6FF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#4285F4', color: '#FFF' }}>
              <ReceiptLong sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 800 }}>
                إجمالي مبيعات الفرع الكلية
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E3A8A' }}>
                {totalBranchSales.toLocaleString()} ج.م
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Orders Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>أصناف الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>طريقة الدفع</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>حالة الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السعر الإجمالي</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراءات والتفاصيل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((row) => {
              const hasItems = Array.isArray(row.items) && row.items.length > 0;
              const isDelivery = row.orderType === 'delivery';
              const pm = row.paymentMethod || row.payment_method || 'cash';

              const branchObj = branches.find((b) => b.id === (row.branchId || row.branch_id));
              const displayBranchName = row.branchName || (branchObj ? branchObj.name : ((row.branchId || row.branch_id) === 'b2' ? 'الفرع الثاني' : 'الفرع الأول - الرئيسي'));

              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.95rem' }}>
                    #{row.orderNumber || row.id?.slice(0, 8)}
                  </TableCell>

                  <TableCell>
                    <Chip
                      icon={<Store sx={{ fontSize: '0.9rem !important', color: '#1E40AF' }} />}
                      label={displayBranchName}
                      size="small"
                      sx={{
                        bgcolor: '#EFF6FF',
                        color: '#1E40AF',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700, color: '#374151' }}>
                    {row.customerName || 'عميل كاشير'}
                    {row.customerPhone ? ` (${row.customerPhone})` : ''}
                  </TableCell>

                  <TableCell sx={{ color: '#4B5563', maxWidth: 280 }}>
                    {hasItems ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {row.items.slice(0, 3).map((it, idx) => (
                          <Chip
                            key={idx}
                            label={`${it.quantity || 1}× ${it.name || it.product_name || 'صنف'}`}
                            size="small"
                            sx={{ bgcolor: '#F1F5F9', color: '#1E293B', fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        ))}
                        {row.items.length > 3 && (
                          <Chip
                            label={`+${row.items.length - 3} أصناف أخرى`}
                            size="small"
                            sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.72rem' }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                        طلب كاشير بدون تفاصيل
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ color: '#6B7280', fontSize: '0.85rem' }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'اليوم'}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={isDelivery ? 'دليفري' : row.orderType === 'takeaway' ? 'تيك أوي' : 'صالة'}
                      size="small"
                      sx={{
                        bgcolor: isDelivery ? '#FFF3EB' : '#EFF6FF',
                        color: isDelivery ? '#E06B1F' : '#1D4ED8',
                        fontWeight: 800,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    {pm === 'instapay' ? (
                      <Chip label="⚡ إنستا باي" size="small" sx={{ bgcolor: '#F3E8FF', color: '#7E22CE', fontWeight: 800 }} />
                    ) : pm === 'vodafone_cash' ? (
                      <Chip label="📱 فودافون كاش" size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 800 }} />
                    ) : pm === 'card' ? (
                      <Chip label="💳 شبكة/فيزا" size="small" sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 800 }} />
                    ) : (
                      <Chip label="💵 كاش" size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 800 }} />
                    )}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                      <Chip
                        label={row.status === 'cancelled' ? '🔴 ملغي' : (row.status || 'completed')}
                        size="small"
                        sx={{
                          bgcolor: row.status === 'cancelled' ? '#FEF2F2' : '#D1FAE5',
                          color: row.status === 'cancelled' ? '#DC2626' : '#065F46',
                          fontWeight: 800
                        }}
                      />
                      {(isDelivery || row.status === 'delivered' || row.status === 'cash_collected') && row.status !== 'cancelled' && (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: '13px !important', color: '#059669' }} />}
                          label="تم التوصيل"
                          size="small"
                          sx={{ bgcolor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 800, fontSize: '0.72rem' }}
                        />
                      )}
                      {isDelivery && row.status !== 'cancelled' && (row.dispatched_at || row.createdAt) && (
                        <DeliveryTimerBadge dispatchedAt={row.dispatched_at || row.createdAt} status={row.status} />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 900, color: row.status === 'cancelled' ? '#9CA3AF' : '#4285F4', fontSize: '0.95rem', textDecoration: row.status === 'cancelled' ? 'line-through' : 'none' }}>
                    {(parseFloat(row.total) || 0).toFixed(2)} ج.م
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {/* Cancel Order Button */}
                      {row.status !== 'cancelled' ? (
                        <Tooltip title="إلغاء هذا الطلب وتخصيم المجموع من المبيعات" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleCancelOrder(row)}
                            sx={{ color: '#EF4444', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}
                          >
                            <CancelOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Chip label="ملغي" size="small" color="error" variant="outlined" sx={{ fontWeight: 800 }} />
                      )}

                      {/* Reprint Invoice Button */}
                      {row.status !== 'cancelled' && (
                        <Tooltip title="إعادة طباعة الفاتورة" arrow>
                          <IconButton
                            size="small"
                            onClick={() => printThermalReceipt({
                              orderNumber: row.orderNumber || row.order_number || '1',
                              dateStr: new Date(row.createdAt || row.created_at || Date.now()).toLocaleString('ar-EG'),
                              cashierName: row.cashierName || row.cashier_name || 'الكاشير',
                              driverName: row.driverName || row.driver_name || '',
                              customerName: row.customerName || row.customer_name || '',
                              customerPhone: row.customerPhone || row.customer_phone || '',
                              customerAddress: row.customerAddress || row.customer_address || row.address || row.customerArea || row.customer_area || '',
                              customerFloor: row.customerFloor || row.customer_floor || row.floor || '',
                              customerApartment: row.customerApartment || row.customer_apartment || row.apartment || '',
                              items: row.items || [],
                              subtotal: row.subtotal || row.total,
                              deliveryFee: row.deliveryFee || row.delivery_fee || 0,
                              discount: row.discount || 0,
                              total: row.total,
                              paidAmount: row.paidAmount || row.paid_amount || row.total,
                              remainingAmount: row.remainingAmount || row.remaining_amount || 0,
                              paymentMethod: row.paymentMethod || row.payment_method || 'cash',
                              orderType: row.orderType || row.order_type || 'takeaway',
                              isCashCollected: row.is_cash_collected || row.isCashCollected || false,
                              notes: row.notes || row.orderNotes || '',
                            })}
                            sx={{ color: '#4285F4', bgcolor: '#F0F7FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                          >
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* View Details Button */}
                      <Tooltip title="عرض تفاصيل الطلب والفاتورة الكاملة" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDetails(row)}
                          sx={{ color: '#10B981', bgcolor: '#ECFDF5', '&:hover': { bgcolor: '#D1FAE5' } }}
                        >
                          <VisibilityOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <ReceiptLong sx={{ fontSize: 48, color: '#D1D5DB' }} />
                    <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 800 }}>
                      {!isShiftActive && !showPreviousShifts
                        ? 'الشيفت مقفول — مفيش طلبات للعرض'
                        : isShiftActive && !showPreviousShifts
                        ? 'لا توجد طلبات في الشيفت الحالي بعد'
                        : 'لا توجد نتائج بحث مطابقة'}
                    </Typography>
                    {!showPreviousShifts && (
                      <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 600 }}>
                        {!isShiftActive
                          ? 'افتح وردية جديدة من صفحة ملخص الشيفت، أو اضغط "عرض طلبات الشيفتات السابقة" لعرض الطلبات القديمة.'
                          : 'الطلبات الجديدة هتظهر هنا تلقائياً. أو اضغط على "عرض طلبات الشيفتات السابقة" لعرض الطلبات القديمة.'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Full Order Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
            }
          }
        }}
      >
        {selectedOrder && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #E5E7EB' }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                تفاصيل الفاتورة رقم #{selectedOrder.orderNumber || selectedOrder.id?.slice(0, 8)}
              </Typography>
              <IconButton onClick={() => setDetailsOpen(false)}>
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#F8FAFC' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563EB', mb: 1 }}>بيانات العميل والإشغال:</Typography>
                  <Typography variant="body2"><strong>الاسم:</strong> {selectedOrder.customerName || 'غير مسجل'}</Typography>
                  <Typography variant="body2"><strong>التليفون:</strong> {selectedOrder.customerPhone || 'غير مسجل'}</Typography>
                  <Typography variant="body2"><strong>العنوان:</strong> {selectedOrder.customerAddress || 'غير مسجل'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#F8FAFC' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563EB', mb: 1 }}>تفاصيل الطلب والدفع:</Typography>
                  <Typography variant="body2">
                    <strong>تاريخ الطلب:</strong> {new Date(selectedOrder.createdAt || Date.now()).toLocaleString('ar-EG')}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>طريقة الدفع:</strong>{' '}
                    {(selectedOrder.paymentMethod === 'vodafone_cash' || selectedOrder.payment_method === 'vodafone_cash') ? (
                      <Chip label="📱 فودافون كاش (Vodafone)" size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 800 }} />
                    ) : (selectedOrder.paymentMethod === 'card' || selectedOrder.payment_method === 'card') ? (
                      <Chip label="💳 شبكة / فيزا (Card)" size="small" sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 800 }} />
                    ) : (
                      <Chip label="💵 نقداً (كاش)" size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 800 }} />
                    )}
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A1A2E', mt: 1 }}>📦 الأصناف:</Typography>
              <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>الصنف</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{it.name || it.product_name || 'صنف'}</TableCell>
                        <TableCell align="center">{it.quantity || 1}</TableCell>
                        <TableCell align="left">{(parseFloat(it.price || 0) * (it.quantity || 1)).toFixed(2)} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#FAFBFC', borderTop: '1px solid #E5E7EB', justifyContent: 'space-between' }}>
              <Button onClick={() => setDetailsOpen(false)} sx={{ color: '#64748B', fontWeight: 700 }}>إغلاق</Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {selectedOrder.status !== 'cancelled' && (
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditOutlined />}
                    onClick={() => {
                      setOrderToEdit(selectedOrder);
                      setDetailsOpen(false);
                      setEditModalOpen(true);
                    }}
                    sx={{ borderRadius: '10px', fontWeight: 800 }}
                  >
                    تعديل الطلب ✏️
                  </Button>
                )}
                {selectedOrder.status !== 'cancelled' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelOutlined />}
                    onClick={() => handleCancelOrder(selectedOrder)}
                    sx={{ borderRadius: '10px', fontWeight: 800 }}
                  >
                    إلغاء الطلب وتخصيم المجموع 🚫
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<Print />}
                  onClick={() => {
                    printThermalReceipt({
                      orderNumber: selectedOrder.orderNumber || '1',
                      dateStr: new Date(selectedOrder.createdAt || Date.now()).toLocaleString('ar-EG'),
                      cashierName: selectedOrder.cashierName || 'أحمد محمود',
                      customerName: selectedOrder.customerName,
                      customerPhone: selectedOrder.customerPhone,
                      items: selectedOrder.items || [],
                      subtotal: selectedOrder.subtotal || selectedOrder.total,
                      deliveryFee: selectedOrder.deliveryFee || 0,
                      total: selectedOrder.total,
                      orderType: selectedOrder.orderType || 'takeaway'
                    });
                  }}
                  sx={{ bgcolor: '#4285F4', borderRadius: '10px', px: 3, fontWeight: 800 }}
                >
                  طباعة الفاتورة 🖨️
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDIT ORDER MODAL */}
      <EditOrderModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        order={orderToEdit}
        onSaveSuccess={() => fetchInvoices(500, targetBranch)}
      />
    </Box>
  );
}
