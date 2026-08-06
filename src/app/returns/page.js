'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Alert,
  Badge,
} from '@mui/material';
import {
  AssignmentReturnOutlined,
  Search,
  Print,
  CheckCircle,
  Refresh,
  Receipt,
  RemoveCircleOutlined,
  AddCircleOutlined,
  MonetizationOn,
  History,
  Store,
  Close,
  ArrowBack,
  FilterList,
} from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useReturnsStore } from '@/store/useReturnsStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { printThermalReceipt, printReturnReceipt } from '@/lib/printReceipt';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2.5 }}>{children}</Box>}
    </div>
  );
}

export default function ReturnsPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { returns, fetchReturns, executeReturn, loading: returnsLoading } = useReturnsStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Selected Order for Return Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnType, setReturnType] = useState('partial'); // 'partial' or 'full'
  const [returnQuantities, setReturnQuantities] = useState({}); // { itemId: qty }
  const [returnReason, setReturnReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const effectiveBranch = (user && user.role !== 'admin' && user.branch_id) ? user.branch_id : selectedBranchId;
  const targetBranch = effectiveBranch || 'all';

  useEffect(() => {
    fetchInvoices(100, targetBranch);
    fetchReturns(targetBranch);
  }, [targetBranch]);

  // Eligible Orders for Return (exclude already fully refunded/cancelled)
  const filteredOrders = useMemo(() => {
    return (invoices || []).filter((inv) => {
      const matchBranch = !targetBranch || targetBranch === 'all' || inv.branchId === targetBranch || inv.branch_id === targetBranch;
      if (!matchBranch) return false;

      // Filter out fully refunded or cancelled
      if (inv.status === 'refunded' || inv.status === 'cancelled') return false;

      if (!searchQuery) return true;
      const cleanSearch = searchQuery.toLowerCase().trim();
      return (
        inv.id?.toLowerCase().includes(cleanSearch) ||
        inv.orderNumber?.includes(cleanSearch) ||
        inv.customerName?.toLowerCase().includes(cleanSearch) ||
        inv.customerPhone?.includes(cleanSearch)
      );
    });
  }, [invoices, targetBranch, searchQuery]);

  // Filtered Returns History
  const filteredReturnsHistory = useMemo(() => {
    return (returns || []).filter((ret) => {
      const matchBranch = !targetBranch || targetBranch === 'all' || ret.branch_id === targetBranch;
      if (!matchBranch) return false;

      if (!historySearch) return true;
      const cleanSearch = historySearch.toLowerCase().trim();
      return (
        ret.order_number?.includes(cleanSearch) ||
        ret.cashier_name?.toLowerCase().includes(cleanSearch) ||
        ret.reason?.toLowerCase().includes(cleanSearch)
      );
    });
  }, [returns, targetBranch, historySearch]);

  // Today's total refunded cash calculation
  const todaysRefundedSum = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredReturnsHistory
      .filter((r) => r.created_at && r.created_at.startsWith(todayStr))
      .reduce((sum, r) => sum + (parseFloat(r.total_returned) || 0), 0);
  }, [filteredReturnsHistory]);

  const handleOpenReturnModal = (order) => {
    setSelectedOrder(order);
    setReturnType('partial');
    const initialQtyMap = {};
    (order.items || []).forEach((item) => {
      initialQtyMap[item.id || item.product_id || item.product_name] = 0;
    });
    setReturnQuantities(initialQtyMap);
    setReturnReason('');
    setReturnDialogOpen(true);
  };

  const handleQtyChange = (itemId, delta, maxQty) => {
    setReturnQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  // Calculate refund totals live
  const returnItemsSummary = useMemo(() => {
    if (!selectedOrder || !selectedOrder.items) return [];

    if (returnType === 'full') {
      return selectedOrder.items.map((item) => ({
        id: item.id || item.product_id,
        name: item.name || item.product_name,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        size: item.size || '',
      }));
    }

    return selectedOrder.items
      .filter((item) => {
        const key = item.id || item.product_id || item.product_name;
        return (returnQuantities[key] || 0) > 0;
      })
      .map((item) => {
        const key = item.id || item.product_id || item.product_name;
        return {
          id: item.id || item.product_id,
          name: item.name || item.product_name,
          price: parseFloat(item.price) || 0,
          quantity: returnQuantities[key] || 0,
          size: item.size || '',
        };
      });
  }, [selectedOrder, returnType, returnQuantities]);

  const liveRefundAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    if (returnType === 'full') return parseFloat(selectedOrder.total) || 0;
    return returnItemsSummary.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedOrder, returnType, returnItemsSummary]);

  const newOrderTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    if (returnType === 'full') return 0;
    return Math.max(0, (parseFloat(selectedOrder.total) || 0) - liveRefundAmount);
  }, [selectedOrder, returnType, liveRefundAmount]);

  const handleConfirmReturn = async (shouldPrintReturnReceipt = false, shouldPrintModifiedInvoice = false) => {
    if (!selectedOrder) return;

    if (returnType === 'partial' && returnItemsSummary.length === 0) {
      alert('⚠️ يرجى اختيار صنف واحد على الأقل وإضافة كميته للارتجاع.');
      return;
    }

    if (liveRefundAmount <= 0) {
      alert('⚠️ لم يتم اختيار أي مبالغ أو أصناف مرتجعة.');
      return;
    }

    const confirmMsg = `هل أنت تأكد من إتمام عملية المرتجع للطلب #${selectedOrder.orderNumber || selectedOrder.id}؟\n\n` +
      `💰 سيتم خصم مبلغ (${liveRefundAmount.toFixed(2)} ج.م) فوراً من النقدية والخزنة وتحديث الحسابات.`;

    if (!confirm(confirmMsg)) return;

    setProcessing(true);
    try {
      const returnPayload = {
        order_id: selectedOrder.id,
        return_type: returnType,
        returned_items: returnItemsSummary,
        total_returned: liveRefundAmount,
        reason: returnReason.trim() || 'مرتجع عميل',
        cashier_name: user?.name || selectedOrder.cashierName || 'administrator',
        branch_id: selectedOrder.branchId || selectedOrder.branch_id || 'b1',
      };

      const res = await executeReturn(returnPayload);

      if (res.success) {
        alert(`✅ تم تسجيل المرتجع وخصم ${liveRefundAmount.toFixed(2)} ج.م من النقدية والخزنة بنجاح.`);

        // Print Return Receipt if requested
        if (shouldPrintReturnReceipt) {
          printReturnReceipt({
            orderNumber: selectedOrder.orderNumber || selectedOrder.id,
            returnType: returnType,
            branchName: selectedOrder.branchName || 'الفرع الرئيسي',
            cashierName: user?.name || selectedOrder.cashierName || 'الكاشير',
            customerName: selectedOrder.customerName,
            customerPhone: selectedOrder.customerPhone,
            returnedItems: returnItemsSummary,
            totalReturned: liveRefundAmount,
            reason: returnReason.trim() || 'مرتجع عميل',
          });
        }

        // Print Modified Invoice if requested and not a full return
        if (shouldPrintModifiedInvoice && returnType === 'partial' && res.updatedOrder) {
          const updated = res.updatedOrder;
          printThermalReceipt({
            orderNumber: updated.order_number,
            branchName: selectedOrder.branchName || 'الفرع الرئيسي',
            cashierName: updated.cashier_name || user?.name || 'الكاشير',
            customerName: updated.customer_name,
            customerPhone: updated.customer_phone,
            customerAddress: updated.customer_address,
            items: res.updatedOrder.items || [],
            subtotal: parseFloat(updated.subtotal || 0),
            total: parseFloat(updated.total || 0),
            paidAmount: parseFloat(updated.paid_amount || 0),
            orderNotes: 'فاتورة معدلة - مرتجع جزئي',
          });
        }

        setReturnDialogOpen(false);
        fetchInvoices(100, targetBranch);
        fetchReturns(targetBranch);
      } else {
        alert(`❌ حدث خطأ أثناء تنفيذ المرتجع: ${res.error}`);
      }
    } catch (err) {
      alert(`❌ حدث خطأ غير متوقع: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReprintReturn = (ret) => {
    printReturnReceipt({
      orderNumber: ret.order_number,
      returnType: ret.return_type,
      cashierName: ret.cashier_name || 'الكاشير',
      returnedItems: ret.returned_items || [],
      totalReturned: ret.total_returned,
      reason: ret.reason,
      dateStr: new Date(ret.created_at).toLocaleString('ar-EG'),
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, minHeight: '100%', pb: { xs: 10, md: 4 } }}>
      {/* Top Header & Statistics */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssignmentReturnOutlined sx={{ fontSize: 32, color: '#DC2626' }} />
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
              إدارة المرتجعات واسترداد النقدية
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            إرجاع الفواتير الكاملة أو أصناف محددة وخصم قيمتها تلقائياً من نقدية الشيفت والخزنة وطباعة الإيصالات.
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

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchInvoices(100, targetBranch);
              fetchReturns(targetBranch);
            }}
            sx={{ borderRadius: '12px', fontWeight: 800 }}
          >
            تحديث البيانات
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Header */}
      <Grid container spacing={2}>
        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #FEE2E2', bgcolor: '#FEF2F2', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#FCA5A5', color: '#991B1B' }}>
              <MonetizationOn sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#991B1B', fontWeight: 800 }}>
                خصم مرتجعات اليوم من النقدية
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#7F1D1D' }}>
                {todaysRefundedSum.toFixed(2)} ج.م
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FFF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#EFF6FF', color: '#2563EB' }}>
              <History sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 800 }}>
                إجمالي عمليات الارتجاع
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E293B' }}>
                {filteredReturnsHistory.length} عملية
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FFF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#ECFDF5', color: '#059669' }}>
              <Receipt sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 800 }}>
                الفواتير المتاحة للارتجاع
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E293B' }}>
                {filteredOrders.length} فاتورة
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FFF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#F3E8FF', color: '#9333EA' }}>
              <Store sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 800 }}>
                الفرع الحالي
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E293B' }}>
                {targetBranch === 'all' ? 'جميع الفروع' : (branches.find(b => b.id === targetBranch)?.name || 'الفرع الرئيسي')}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs Navigation */}
      <Paper sx={{ borderRadius: '16px', p: 1, border: '1px solid #E5E7EB' }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.95rem',
              borderRadius: '12px',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<AssignmentReturnOutlined />} iconPosition="start" label="إجراء مرتجع جديد من فاتورة" />
          <Tab icon={<History />} iconPosition="start" label={`سجل ودفتر المرتجعات (${filteredReturnsHistory.length})`} />
        </Tabs>

        {/* TAB 1: Process Return */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              اختر الفاتورة المطلوبة لتحديد الأصناف والمرتجع:
            </Typography>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="ابحث برقم الفاتورة أو اسم العميل أو الموبايل..."
            />
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>رقم الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الكاشير</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>طريقة الدفع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>عدد الأصناف</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>إجمالي الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>حالة الفاتورة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="body1" sx={{ color: '#9CA3AF', fontWeight: 700 }}>
                        لا توجد فواتير مطابقة للبحث
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : 'الآن';
                    const isPartial = order.status === 'partially_refunded';

                    return (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ fontWeight: 900, color: '#4285F4' }}>
                          #{order.orderNumber || order.id?.slice(0, 8)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{formattedDate}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {order.customerName || 'عميل كاشير'}
                          {order.customerPhone ? ` (${order.customerPhone})` : ''}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{order.cashierName || 'administrator'}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.paymentMethod === 'visa' ? '💳 فيزا' : '💵 كاش'}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: '#F3F4F6' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{itemCount} أصناف</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#059669', fontSize: '1.05rem' }}>
                          {parseFloat(order.total || 0).toFixed(2)} ج.م
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isPartial ? 'مرتجع جزئي' : 'مكتملة'}
                            size="small"
                            color={isPartial ? 'warning' : 'success'}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<AssignmentReturnOutlined />}
                            onClick={() => handleOpenReturnModal(order)}
                            sx={{ borderRadius: '10px', fontWeight: 800, boxShadow: 'none' }}
                          >
                            عمل مرتجع
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* TAB 2: Returns History Log */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              سجل وعمليات المرتجعات السابقة:
            </Typography>
            <SearchBar
              value={historySearch}
              onChange={setHistorySearch}
              placeholder="ابحث برقم الفاتورة أو سبب المرتجع..."
            />
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>رقم الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>تاريخ ووقت المرتجع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>نوع المرتجع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الأصناف المرتجعة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المبلغ المخصوم من الخزنة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الكاشير المسؤول</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>سبب الإرجاع</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>طباعة الإيصال</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReturnsHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Typography variant="body1" sx={{ color: '#9CA3AF', fontWeight: 700 }}>
                        لا توجد سجلات مرتجعات سابقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturnsHistory.map((ret) => {
                    const isFull = ret.return_type === 'full';
                    const items = Array.isArray(ret.returned_items) ? ret.returned_items : [];

                    return (
                      <TableRow key={ret.id} hover>
                        <TableCell sx={{ fontWeight: 900, color: '#4285F4' }}>
                          #{ret.order_number}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {ret.created_at ? new Date(ret.created_at).toLocaleString('ar-EG') : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isFull ? 'إرجاع كامل الفاتورة' : 'مرتجع أصناف جزئي'}
                            size="small"
                            color={isFull ? 'error' : 'warning'}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {isFull ? (
                            'كل الأصناف'
                          ) : (
                            items.map((i) => `${i.name || i.product_name} (${i.quantity}x)`).join('، ')
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#DC2626', fontSize: '1.05rem' }}>
                          -{parseFloat(ret.total_returned || 0).toFixed(2)} ج.م
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{ret.cashier_name || 'administrator'}</TableCell>
                        <TableCell sx={{ fontStyle: 'italic', color: '#4B5563' }}>
                          {ret.reason || 'مرتجع عميل'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="إعادة طباعة إيصال المرتجع الحراري" arrow>
                            <IconButton
                              color="primary"
                              onClick={() => handleReprintReturn(ret)}
                            >
                              <Print />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* RETURN MODAL DIALOG */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '20px', p: 1 },
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssignmentReturnOutlined sx={{ fontSize: 30, color: '#DC2626' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                نافذة إرجاع فاتورة #{selectedOrder?.orderNumber || selectedOrder?.id}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                تحديد الأصناف المرتجعة للخصم من النقدية والخزنة
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setReturnDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedOrder && (
            <Stack spacing={3}>
              {/* Order Context Bar */}
              <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <Grid container spacing={2}>
                  <Grid xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">إجمالي الفاتورة الحالي</Typography>
                    <Typography variant="body1" fontWeight={900} color="#059669">
                      {parseFloat(selectedOrder.total || 0).toFixed(2)} ج.م
                    </Typography>
                  </Grid>
                  <Grid xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">اسم العميل</Typography>
                    <Typography variant="body1" fontWeight={800}>
                      {selectedOrder.customerName || 'كاشير'}
                    </Typography>
                  </Grid>
                  <Grid xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">طريقة الدفع</Typography>
                    <Typography variant="body1" fontWeight={800}>
                      {selectedOrder.paymentMethod === 'visa' ? '💳 فيزا' : '💵 كاش'}
                    </Typography>
                  </Grid>
                  <Grid xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">الكاشير المسجل</Typography>
                    <Typography variant="body1" fontWeight={800}>
                      {selectedOrder.cashierName || 'administrator'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Return Type Selector */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  اختر نوع عملية الارتجاع:
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <Card
                      variant="outlined"
                      onClick={() => setReturnType('partial')}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderRadius: '14px',
                        borderColor: returnType === 'partial' ? '#4285F4' : '#E5E7EB',
                        borderWidth: returnType === 'partial' ? 2 : 1,
                        bgcolor: returnType === 'partial' ? '#EFF6FF' : '#FFF',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="مرتجع جزئي" size="small" color="primary" sx={{ fontWeight: 800 }} />
                        <Typography variant="body1" fontWeight={800}>
                          إرجاع صنف / أصناف محددة
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        تحديد الكمية المرتجعة من كل منتج وتعديل إجمالي الفاتورة
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <Card
                      variant="outlined"
                      onClick={() => setReturnType('full')}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderRadius: '14px',
                        borderColor: returnType === 'full' ? '#DC2626' : '#E5E7EB',
                        borderWidth: returnType === 'full' ? 2 : 1,
                        bgcolor: returnType === 'full' ? '#FEF2F2' : '#FFF',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="مرتجع كلي" size="small" color="error" sx={{ fontWeight: 800 }} />
                        <Typography variant="body1" fontWeight={800}>
                          إرجاع الفاتورة بالكامل
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        تخصيم كامل الفاتورة وتصفير المبيعات الخاصة بها
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Item Selection Table (For Partial Return) */}
              {returnType === 'partial' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                    حدد الكميات المراد إرجاعها من الفاتورة:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '14px' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>اسم الصنف والحجم</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية المشتراة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>سعر الوحدة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية المرتجعة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>المبلغ المرتجع</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(selectedOrder.items || []).map((item) => {
                          const itemId = item.id || item.product_id || item.product_name;
                          const maxQty = parseInt(item.quantity) || 1;
                          const currentReturnQty = returnQuantities[itemId] || 0;
                          const itemPrice = parseFloat(item.price) || 0;
                          const returnedItemTotal = itemPrice * currentReturnQty;

                          return (
                            <TableRow key={itemId}>
                              <TableCell sx={{ fontWeight: 800 }}>
                                {item.name || item.product_name}
                                {item.size ? ` (${item.size})` : ''}
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>
                                {maxQty}
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700 }}>
                                {itemPrice.toFixed(2)} ج.م
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleQtyChange(itemId, -1, maxQty)}
                                    disabled={currentReturnQty <= 0}
                                  >
                                    <RemoveCircleOutlined />
                                  </IconButton>
                                  <Typography variant="body1" sx={{ fontWeight: 900, minWidth: 24, textAlign: 'center' }}>
                                    {currentReturnQty}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleQtyChange(itemId, 1, maxQty)}
                                    disabled={currentReturnQty >= maxQty}
                                  >
                                    <AddCircleOutlined />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell align="center" sx={{ fontWeight: 900, color: currentReturnQty > 0 ? '#DC2626' : '#9CA3AF' }}>
                                {returnedItemTotal.toFixed(2)} ج.م
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Return Reason Field */}
              <TextField
                label="سبب الإرجاع (اختياري)"
                placeholder="أدخل سبب المرتجع (مثل: تلف، خطأ بالطلب، تغيير رأي العميل...)"
                fullWidth
                variant="outlined"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                sx={{ borderRadius: '12px' }}
              />

              {/* Financial Refund Summary Box */}
              <Paper sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FEF2F2', border: '1.5px solid #FCA5A5' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#991B1B', fontWeight: 800 }}>
                      المبلغ الذي سيتم خصمه فوراً من النقدية والخزنة:
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#7F1D1D' }}>
                      -{liveRefundAmount.toFixed(2)} ج.م
                    </Typography>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#1E293B', fontWeight: 800 }}>
                      إجمالي الفاتورة الجديد بعد التعديل:
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#059669' }}>
                      {newOrderTotal.toFixed(2)} ج.م
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => setReturnDialogOpen(false)}
            disabled={processing}
            sx={{ borderRadius: '12px', fontWeight: 800 }}
          >
            إلغاء
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<MonetizationOn />}
            onClick={() => handleConfirmReturn(false, false)}
            disabled={processing || liveRefundAmount <= 0}
            sx={{ borderRadius: '12px', fontWeight: 800, boxShadow: 'none' }}
          >
            تأكيد الارتجاع وخصم النقدية
          </Button>

          <Button
            variant="contained"
            color="warning"
            startIcon={<Print />}
            onClick={() => handleConfirmReturn(true, false)}
            disabled={processing || liveRefundAmount <= 0}
            sx={{ borderRadius: '12px', fontWeight: 800, boxShadow: 'none' }}
          >
            تأكيد + طباعة إيصال المرتجع
          </Button>

          {returnType === 'partial' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Print />}
              onClick={() => handleConfirmReturn(true, true)}
              disabled={processing || liveRefundAmount <= 0}
              sx={{ borderRadius: '12px', fontWeight: 800, boxShadow: 'none' }}
            >
              تأكيد + طباعة الفاتورة المعدلة
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
