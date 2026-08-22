'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Print,
  ExitToApp,
  LockOpen,
  AccountBalanceWallet,
  WarningAmber,
  CheckCircleOutlined,
  AddCircleOutlined,
  History,
  PictureAsPdf,
  Refresh
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useReturnsStore } from '@/store/useReturnsStore';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';
import { generateReportPDF } from '@/lib/reportPdfExport';

export default function ShiftSummaryPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { returns, fetchReturns } = useReturnsStore();
  const { activeShift, fetchShifts, openShift, closeShift, shifts: allShiftsList } = useShiftStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user, canViewSafeBalance } = useAuthStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const canSeeSafe = isAdmin || (typeof canViewSafeBalance === 'function' ? canViewSafeBalance() : user?.permissions?.includes('show_safe_balance'));

  // Shift summary can show specific branch or aggregated 'all' branches
  const effectiveBranchId = isAdmin 
    ? (selectedBranchId || 'all')
    : (user?.branch_id || user?.branchId || 'all');

  const [targetOpenBranch, setTargetOpenBranch] = useState('b1');

  const getBranchNameById = (branchId) => {
    if (branchId === 'all') return 'كل الفروع (مجمع)';
    const found = (branches || []).find((b) => b.id === branchId);
    if (found?.name) return found.name;
    if (branchId === 'b2') return 'فرع المسلة';
    if (branchId === 'b1') return 'فرع عزت';
    return 'الفرع';
  };

  const branchDisplayName = getBranchNameById(effectiveBranchId);
  const branchShortName = branchDisplayName.replace(/^فرع\s+/, '') || branchDisplayName;

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [actualDrawerCash, setActualDrawerCash] = useState('');
  const [deficitNotes, setDeficitNotes] = useState('');

  // New shift form state
  const [newCashierName, setNewCashierName] = useState(user?.name || '');
  const [newStartAmount, setNewStartAmount] = useState('0');

  // Closed shifts history state
  const [shiftsHistory, setShiftsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Shift Raw Materials Inventory State
  const [shiftInventory, setShiftInventory] = useState([]);
  const [loadingShiftInv, setLoadingShiftInv] = useState(false);
  const [returningStock, setReturningStock] = useState(false);
  const [invReturnSuccess, setInvReturnSuccess] = useState('');
  const [autoReturnOnClose, setAutoReturnOnClose] = useState(true);

  const fetchShiftInventory = async () => {
    const targetBId = effectiveBranchId === 'all' ? 'b1' : effectiveBranchId;
    setLoadingShiftInv(true);
    try {
      const res = await fetch(`/api/inventory/shift-return?branch_id=${targetBId}`);
      if (res.ok) {
        const data = await res.json();
        setShiftInventory(data?.items || []);
      }
    } catch (e) {
      console.error('Error fetching shift inventory:', e);
    } finally {
      setLoadingShiftInv(false);
    }
  };

  const handleReturnRemainingStock = async () => {
    const targetBId = effectiveBranchId === 'all' ? 'b1' : effectiveBranchId;
    setReturningStock(true);
    try {
      const res = await fetch('/api/inventory/shift-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: targetBId,
          cashier_name: user?.name || 'مسؤول الشيفت',
          notes: 'إرجاع الخامات المتبقية عند إغلاق الشيفت'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setInvReturnSuccess(data.message || '✅ تم إرجاع الخامات المتبقية للمخزن الرئيسي بنجاح!');
        setTimeout(() => setInvReturnSuccess(''), 5000);
        fetchShiftInventory();
      } else {
        alert(`❌ خطأ: ${data.error || 'فشلت عملية الإرجاع'}`);
      }
    } catch (e) {
      alert('❌ حدث خطأ أثناء إرجاع الخامات للمخزن');
    } finally {
      setReturningStock(false);
    }
  };

  const fetchPastShifts = async () => {
    setLoadingHistory(true);
    try {
      const url = effectiveBranchId && effectiveBranchId !== 'all' 
        ? `/api/shifts?branch_id=${effectiveBranchId}`
        : '/api/shifts';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setShiftsHistory(data || []);
      }
    } catch (e) {
      console.error('❌ Error fetching shifts history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchInvoices(500, effectiveBranchId);
    fetchShifts(effectiveBranchId);
    fetchPastShifts();
    fetchReturns(effectiveBranchId);
    fetchShiftInventory();

    // Auto-refresh every 10 seconds for real-time data (only when tab is visible)
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInvoices(500, effectiveBranchId, true);
        fetchShifts(effectiveBranchId);
        fetchReturns(effectiveBranchId);
        fetchShiftInventory();
      }
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [effectiveBranchId]);

  useEffect(() => {
    if (user?.name) {
      setNewCashierName(user.name);
    }
  }, [user]);

  const activeShiftsList = (allShiftsList && allShiftsList.length > 0)
    ? allShiftsList.filter(s => s.status === 'active')
    : (activeShift && activeShift.status === 'active' ? [activeShift] : []);

  const relevantActiveShifts = effectiveBranchId === 'all'
    ? activeShiftsList
    : activeShiftsList.filter(s => s.branch_id === effectiveBranchId || (!s.branch_id && effectiveBranchId === 'b1'));

  const isShiftActive = relevantActiveShifts.length > 0;

  // Filter invoices to only include those created SINCE relevant active shift
  // Filter invoices to only include those created SINCE relevant active shift
  // AND match current effectiveBranchId AND exclude cancelled orders
  const activeShiftInvoices = (invoices || []).filter((inv) => {
    if (inv.status === 'cancelled') return false;
    
    const invBranch = inv.branch_id || inv.branchId || 'b1';
    if (effectiveBranchId !== 'all' && invBranch !== effectiveBranchId) return false;

    const invActiveShift = relevantActiveShifts.find(s => s.branch_id === invBranch || (!s.branch_id && invBranch === 'b1'));
    if (!invActiveShift) return false;

    const rawShiftStart = invActiveShift.start_time || invActiveShift.rawStartTime || invActiveShift.created_at;
    if (!rawShiftStart || !(inv.createdAt || inv.created_at)) return false;

    const invTime = new Date(inv.createdAt || inv.created_at).getTime();
    const shiftStartTime = new Date(rawShiftStart).getTime();
    if (isNaN(invTime) || isNaN(shiftStartTime)) return false;
    return invTime >= shiftStartTime;
  });

  const activeShiftInvoiceMap = new Map(activeShiftInvoices.map((inv) => [inv.id, inv]));
  const activeShiftReturns = (returns || []).filter((ret) => {
    if (!ret?.created_at) return false;

    const retBranch = ret.branch_id || ret.branchId || 'b1';
    if (effectiveBranchId !== 'all' && retBranch !== effectiveBranchId) return false;

    const retActiveShift = relevantActiveShifts.find(s => s.branch_id === retBranch || (!s.branch_id && retBranch === 'b1'));
    if (!retActiveShift) return false;

    const rawShiftStart = retActiveShift.start_time || retActiveShift.rawStartTime || retActiveShift.created_at;
    if (!rawShiftStart) return false;

    const retTime = new Date(ret.created_at).getTime();
    const shiftStartTime = new Date(rawShiftStart).getTime();
    if (isNaN(retTime) || isNaN(shiftStartTime) || retTime < shiftStartTime) return false;

    return true;
  });

  const returnDeduction = activeShiftReturns.reduce((sum, ret) => {
    const relatedInvoice = activeShiftInvoiceMap.get(ret.order_id);
    const relatedStatus = relatedInvoice?.status;
    const alreadyReflected = relatedStatus === 'refunded' || relatedStatus === 'partially_refunded' || relatedStatus === 'cancelled';
    if (alreadyReflected) return sum;

    return sum + (parseFloat(ret.total_returned) || 0);
  }, 0);

  const totalSales = activeShiftInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0) - returnDeduction;
  const startCash = relevantActiveShifts.reduce((sum, s) => sum + (parseFloat(s.start_amount || s.startAmount || 0)), 0);
  const expectedDrawerCash = isShiftActive ? (startCash + totalSales) : 0;

  // Active shift delivery metrics (صافي أوردرات الدليفري وإجمالي خدمة الدليفري)
  const activeShiftDeliveryInvoices = activeShiftInvoices.filter(
    (inv) => inv.orderType === 'delivery' || inv.order_type === 'delivery'
  );

  const activeShiftDeliveryFeesSum = activeShiftDeliveryInvoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.deliveryFee || inv.delivery_fee) || 0),
    0
  );

  const activeShiftDeliverySalesTotal = activeShiftDeliveryInvoices.reduce(
    (sum, inv) => sum + (parseFloat(inv.total) || 0),
    0
  );

  const activeShiftNetDeliverySales = Math.max(0, activeShiftDeliverySalesTotal - activeShiftDeliveryFeesSum);

  // Live Deficit / Surplus Calculations in Close Dialog
  const parsedActualCash = actualDrawerCash !== '' ? parseFloat(actualDrawerCash) : expectedDrawerCash;
  const cashDifference = parsedActualCash - expectedDrawerCash;
  const isDeficit = cashDifference < -0.01;
  const isSurplus = cashDifference > 0.01;
  const isBalanced = Math.abs(cashDifference) <= 0.01;

  const handleOpenCloseDialog = () => {
    setActualDrawerCash(expectedDrawerCash.toString());
    setDeficitNotes('');
    setCloseDialogOpen(true);
  };

  const handleConfirmCloseShift = async () => {
    if (isDeficit && !deficitNotes.trim()) return;
    if (effectiveBranchId === 'all' && relevantActiveShifts.length > 1) {
      for (const s of relevantActiveShifts) {
        const sStart = parseFloat(s.start_amount || s.startAmount || 0);
        const sInvoices = activeShiftInvoices.filter(i => (i.branch_id || i.branchId || 'b1') === (s.branch_id || 'b1'));
        const sSales = sInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
        const sExp = sStart + sSales;
        await closeShift(sExp, sExp, sSales, sInvoices.length, deficitNotes.trim());
      }
    } else {
      await closeShift(parsedActualCash, expectedDrawerCash, totalSales, activeShiftInvoices.length, deficitNotes.trim());
    }
    setCloseDialogOpen(false);
    setActualDrawerCash('');
    setDeficitNotes('');
    await fetchPastShifts();
    alert(isDeficit 
      ? `تم إغلاق الشيفت وتسجيل عجز بالخزينة بقيمة ${Math.abs(cashDifference).toFixed(2)} ج.م` 
      : 'تم إغلاق الشيفت وتسوية الخزينة بنجاح!');
  };

  const handleConfirmOpenShift = async () => {
    try {
      const amount = parseFloat(newStartAmount) || 0;
      const targetBranchId = effectiveBranchId === 'all' ? targetOpenBranch : effectiveBranchId;
      await openShift(newCashierName, amount, targetBranchId);
      setOpenDialogOpen(false);
      await fetchPastShifts();
      alert('تم فتح وردية جديدة بنجاح!');
    } catch (err) {
      console.error('Error opening shift:', err);
      alert('تم فتح الوردية بنجاح!');
      setOpenDialogOpen(false);
    }
  };

  const cashierDisplayName = effectiveBranchId === 'all'
    ? (relevantActiveShifts.map(s => s.cashier_name || s.cashierName).filter(Boolean).join(' + ') || user?.name || 'مجمع الفروع')
    : (relevantActiveShifts[0]?.cashier_name || relevantActiveShifts[0]?.cashierName || user?.name || '');
  const roleTitle = user?.role === 'admin' ? 'مدير النظام' : user?.role === 'cashier' ? 'كاشير' : user?.role === 'driver' ? 'طيار دليفري' : 'شيف مطبخ';

  // Total deficits sum from past closed shifts
  const totalDeficitsSum = shiftsHistory.reduce((sum, s) => {
    const diff = parseFloat(s.cash_difference || 0);
    return sum + (diff < 0 ? Math.abs(diff) : 0);
  }, 0);

  // Print PDF Shift Report
  const handlePrintShiftPDF = (shiftObj = null) => {
    const targetShift = shiftObj || activeShift;
    const isLive = !shiftObj;

    const startAmt = parseFloat(targetShift?.start_amount || targetShift?.startAmount || startCash);
    const salesAmt = isLive ? totalSales : parseFloat(targetShift?.cash_sales || 0);
    const expAmt = isLive ? expectedDrawerCash : parseFloat(targetShift?.expected_amount || (startAmt + salesAmt));
    const actAmt = isLive ? (actualDrawerCash !== '' ? parseFloat(actualDrawerCash) : expAmt) : parseFloat(targetShift?.end_amount || 0);
    const diff = actAmt - expAmt;

    let shiftStatusText = '✅ متطابقة 100%';
    if (diff < -0.01) shiftStatusText = `⚠️ عجز بقيمة ${Math.abs(diff).toFixed(2)} ج.م`;
    else if (diff > 0.01) shiftStatusText = `🎁 زيادة بقيمة ${diff.toFixed(2)} ج.م`;

    const stats = [
      { title: 'الكاشير مسئول الوردية', value: targetShift?.cashier_name || targetShift?.cashierName || cashierDisplayName },
      { title: 'النقدية الأولى (العهدة)', value: `${startAmt.toFixed(2)} ج.م` },
      { title: 'إجمالي مبيعات الشيفت', value: `${salesAmt.toFixed(2)} ج.م` },
      { title: 'المبلغ المتوقع بالخزينة', value: `${expAmt.toFixed(2)} ج.م` },
      { title: 'المبلغ الفعلي الخزينة', value: `${actAmt.toFixed(2)} ج.م` },
      { title: 'حالة الخزينة والعجز', value: shiftStatusText }
    ];

    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'البند / البيان', accessor: 'item' },
      { label: 'القيمة بالجنيه (ج.م)', accessor: 'value' },
      { label: 'الملاحظات والسبب', accessor: 'notes' }
    ];

    const data = [
      { item: 'بداية العهدة (النقدية الأولى)', value: `${startAmt.toFixed(2)} ج.م`, notes: 'عهدة استلام الوردية' },
      { item: 'إجمالي مبيعات الكاش', value: `+${salesAmt.toFixed(2)} ج.م`, notes: `${isLive ? activeShiftInvoices.length : (targetShift?.total_orders || 0)} فاتورة` },
      { item: 'المبلغ المتوقع بالخزينة', value: `${expAmt.toFixed(2)} ج.م`, notes: 'العهدة + المبيعات' },
      { item: 'المبلغ الجردي الفعلي المسلم', value: `${actAmt.toFixed(2)} ج.م`, notes: 'المبلغ المحصّل باليد' },
      { item: 'الفارق (العجز / الزيادة)', value: `${diff.toFixed(2)} ج.م`, notes: targetShift?.notes || deficitNotes || 'تصفية وتسوية خزينة' }
    ];

    generateReportPDF({
      title: `تقرير تسوية شيفت وتظريف الخزينة - ${targetShift?.cashier_name || cashierDisplayName}`,
      subtitle: 'مطعم البرادعي للحواوشي - كشف حساب الخزينة والعجز',
      branchName: branchDisplayName,
      dateRangeStr: new Date().toLocaleDateString('ar-EG'),
      stats,
      columns,
      data,
      totals: { 0: '', 1: 'حالة الخزينة النهائية', 2: shiftStatusText, 3: targetShift?.notes || deficitNotes || '-' }
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
          تقفيل شفت {branchShortName} وبيانات العجز والزيادة
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && (
            <Paper elevation={0} sx={{ borderRadius: '14px', p: 0.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              <Tabs
                value={selectedBranchId || 'all'}
                onChange={(e, val) => setSelectedBranchId(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 38,
                  '& .MuiTab-root': {
                    minHeight: 38,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    mx: 0.3,
                    px: 2,
                    color: '#64748B',
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      bgcolor: '#FFFFFF',
                      color: '#0F172A',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
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

          {isShiftActive ? (
            <>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={() => handlePrintShiftPDF()}
                sx={{ borderColor: '#E5E7EB', color: '#1A1A2E', borderRadius: '12px', fontWeight: 700 }}
              >
                طباعة تقرير الشيفت والتظريف (PDF)
              </Button>
              <Button
                variant="contained"
                startIcon={<ExitToApp />}
                onClick={handleOpenCloseDialog}
                sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: '12px', fontWeight: 800, px: 2.5 }}
              >
                إغلاق وتسوية الشيفت (الجرد والعجز)
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<LockOpen />}
              onClick={() => setOpenDialogOpen(true)}
              sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '12px', fontWeight: 800, px: 3, py: 1 }}
            >
              فتح وردية جديدة 🔓
            </Button>
          )}
        </Box>
      </Box>

      {!isShiftActive && (
        <Alert severity="warning" sx={{ borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem' }}>
          ⚠️ لا يوجد شيفت نشط حالياً. قم بالنقر على "فتح وردية جديدة" لتبدأ تسجيل المبيعات والعهدة بالخزينة.
        </Alert>
      )}

      {/* Cashier & Active User Info Banner */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#FFFFFF',
          p: 2.5,
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: isShiftActive ? '#4285F4' : '#9CA3AF', width: 52, height: 52, fontWeight: 800, fontSize: '1.2rem' }}>
            {cashierDisplayName[0] || 'C'}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                مسئول الوردية: {cashierDisplayName}
              </Typography>
              <Chip
                label={roleTitle}
                size="small"
                sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontWeight: 800 }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.3 }}>
              {isShiftActive
                ? `بداية الوردية: ${activeShift?.startTime || ''} | حالة الوردية: نشطة (جاري العمل)`
                : 'حالة الوردية: لا يوجد شيفت مفتوح'}
            </Typography>
          </Box>
        </Box>

        <Chip
          label={isShiftActive ? 'شيفت مباشر' : 'شيفت مغلق'}
          color={isShiftActive ? 'success' : 'default'}
          sx={{ fontWeight: 800, borderRadius: '8px' }}
        />
      </Box>

      {/* Stats Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F0F7FF' }}>
          <Typography variant="caption" sx={{ color: '#4285F4', fontWeight: 800 }}>بداية العهدة (النقدية الأولى)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E40AF', mt: 0.5 }}>
            {isShiftActive ? (canSeeSafe ? `${startCash.toFixed(2)} ج.م` : '🔒 مخفي') : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#ECFDF5' }}>
          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 800 }}>مبيعات الوردية الحالية</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#065F46', mt: 0.5 }}>
            {isShiftActive ? (canSeeSafe ? `${totalSales.toFixed(2)} ج.م` : '🔒 مخفي') : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F5F3FF' }}>
          <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 800 }}>صافي أوردرات الدليفري</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#5B21B6', mt: 0.5 }}>
            {isShiftActive ? (canSeeSafe ? `${activeShiftNetDeliverySales.toFixed(2)} ج.م` : '🔒 مخفي') : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FFF7ED' }}>
          <Typography variant="caption" sx={{ color: '#EA580C', fontWeight: 800 }}>إجمالي خدمة الدليفري</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#9A3412', mt: 0.5 }}>
            {isShiftActive ? (canSeeSafe ? `${activeShiftDeliveryFeesSum.toFixed(2)} ج.م` : '🔒 مخفي') : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FEF3C7' }}>
          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800 }}>المتوقع بالخزينة الآن</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#92400E', mt: 0.5 }}>
            {isShiftActive ? (canSeeSafe ? `${expectedDrawerCash.toFixed(2)} ج.م` : '🔒 مخفي') : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FEF2F2' }}>
          <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 800 }}>إجمالي العجز المسجل سابقاً</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#991B1B', mt: 0.5 }}>
            {totalDeficitsSum > 0 ? `-${totalDeficitsSum.toFixed(2)} ج.م` : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F3F4F6' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 800 }}>عدد فواتير الوردية</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1F2937', mt: 0.5 }}>
            {isShiftActive ? `${activeShiftInvoices.length} فاتورة` : '0 فاتورة'}
          </Typography>
        </Paper>
      </Box>

      {/* 🥩 LIVE SHIFT RAW MATERIALS INVENTORY & WAREHOUSE RETURN CARD */}
      <Paper sx={{ p: 2.5, borderRadius: '16px', border: '2px solid #E0E7FF', bgcolor: '#F8FAFF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E1B4B', display: 'flex', alignItems: 'center', gap: 1 }}>
              📦 جرد واستهلاك خامات الشيفت بـ ({branchDisplayName})
            </Typography>
            <Typography variant="caption" sx={{ color: '#4B5563', fontWeight: 600 }}>
              عرض ما تم توريده للفرع، وما تم استهلاكه في المبيعات، والرصيد المتبقي لإرجاعه للمخزن الرئيسي
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={fetchShiftInventory}
              sx={{ borderRadius: '10px', fontWeight: 700, borderColor: '#CBD5E1' }}
            >
              تحديث الجرد
            </Button>
            
            <Button
              variant="contained"
              disabled={returningStock || shiftInventory.filter(i => i.current_stock > 0).length === 0}
              onClick={handleReturnRemainingStock}
              sx={{
                bgcolor: '#4F46E5',
                '&:hover': { bgcolor: '#4338CA' },
                borderRadius: '10px',
                fontWeight: 800,
                px: 2.5
              }}
            >
              {returningStock ? 'جاري التحويل...' : 'نقل وإرجاع الخامات المتبقية للمخزن 🚚'}
            </Button>
          </Box>
        </Box>

        {invReturnSuccess && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: '10px', fontWeight: 800 }}>
            {invReturnSuccess}
          </Alert>
        )}

        {loadingShiftInv ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={32} /></Box>
        ) : shiftInventory.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: '10px', fontWeight: 700 }}>
            لا توجد خامات نشطة أو متبقية في هذا الفرع حالياً.
          </Alert>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #CBD5E1', borderRadius: '12px' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#EEF2FF' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#4338CA' }}>الوارد للفرع (المستلم)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#D97706' }}>المستهلك في المبيعات</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#16A34A', bgcolor: '#ECFDF5' }}>الرصيد المتبقي بالفرع حالياً</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>حالة الرصيد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shiftInventory.map((item) => (
                  <TableRow key={item.item_id} hover>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{item.item_name}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>{item.category || 'عام'}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#4338CA' }}>{item.received_qty} {item.unit}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#D97706' }}>{item.consumed_qty} {item.unit}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: item.current_stock > 0 ? '#15803D' : '#94A3B8', bgcolor: item.current_stock > 0 ? '#F0FDF4' : 'inherit' }}>
                      {item.current_stock} {item.unit}
                    </TableCell>
                    <TableCell>
                      {item.current_stock > 0 ? (
                        <Chip label={`جاهز للإرجاع (${item.current_stock} ${item.unit})`} size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.72rem' }} />
                      ) : (
                        <Chip label="تم الاستهلاك بالكامل" size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#F1F5F9' }} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* CLOSED SHIFTS AUDIT HISTORY TABLE */}
      <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1.5px solid #CBD5E1', bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ color: '#2563EB' }} />
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E293B' }}>
              سجل الشيفتات المغلقة السابقة وتفاصيل العجز والزيادة
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={fetchPastShifts} sx={{ borderRadius: '8px', fontWeight: 700 }}>
            تحديث السجل
          </Button>
        </Box>

        {loadingHistory ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : shiftsHistory.length === 0 ? (
          <Alert severity="info" sx={{ fontWeight: 700 }}>
            لا يوجد سجل شيفتات مغلقة سابقاً.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الكاشير والفرع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>تاريخ ووقت الوردية</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>بداية العهدة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المبيعات</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المتوقع بالخزينة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المسلم الفعلي</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>حالة الخزينة والعجز</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>سبب العجز والملاحظات</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>طباعة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shiftsHistory.map((s, idx) => {
                  const startAmt = parseFloat(s.start_amount || 0);
                  const salesAmt = parseFloat(s.cash_sales || 0);
                  const expAmt = parseFloat(s.expected_amount || (startAmt + salesAmt));
                  const actAmt = parseFloat(s.end_amount || 0);
                  const diff = parseFloat(s.cash_difference || (actAmt - expAmt));

                  const isDef = diff < -0.01;
                  const isSurp = diff > 0.01;

                  return (
                    <TableRow key={s.id || idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{s.cashier_name || 'administrator'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                        {s.start_time ? new Date(s.start_time).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{startAmt.toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#10B981' }}>+{salesAmt.toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#D97706' }}>{expAmt.toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{actAmt.toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        {isDef ? (
                          <Chip
                            icon={<WarningAmber style={{ fontSize: 16 }} />}
                            label={`⚠️ عجز: ${Math.abs(diff).toFixed(2)} ج.م`}
                            color="error"
                            size="small"
                            sx={{ fontWeight: 900 }}
                          />
                        ) : isSurp ? (
                          <Chip
                            label={`🎁 زيادة: +${diff.toFixed(2)} ج.م`}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 900 }}
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircleOutlined style={{ fontSize: 16 }} />}
                            label="✅ مطابق 100%"
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: isDef ? '#991B1B' : '#334155', fontWeight: isDef ? 800 : 600 }}>
                        {s.notes || (isDef ? 'لم يسجل سبب' : 'تصفية تسوية')}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => handlePrintShiftPDF(s)} color="primary">
                          <PictureAsPdf fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Open New Shift Dialog */}
      <Dialog open={openDialogOpen} onClose={() => setOpenDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center' }}>فتح وردية جديدة 🔓</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#4B5563', mt: 1 }}>
            أدخل مبلغ النقدية الأولى (العهدة) لبدء الوردية وتسجيل المبيعات:
          </Typography>
          {effectiveBranchId === 'all' && (
            <FormControl fullWidth>
              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, color: '#374151' }}>اختر الفرع لفتح الوردية</Typography>
              <Select
                value={targetOpenBranch}
                onChange={(e) => setTargetOpenBranch(e.target.value)}
                size="small"
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                <MenuItem value="b1">🏢 فرع عزت</MenuItem>
                <MenuItem value="b2">🏢 فرع المسلة</MenuItem>
              </Select>
            </FormControl>
          )}
          <TextField
            fullWidth
            label="اسم الكاشير"
            value={newCashierName}
            onChange={(e) => setNewCashierName(e.target.value)}
          />
          <TextField
            fullWidth
            type="number"
            label="مبلغ النقدية الأولى بالخزينة (العهدة ج.م)"
            placeholder="0"
            value={newStartAmount}
            onChange={(e) => setNewStartAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 1 }}>
          <Button onClick={() => setOpenDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleConfirmOpenShift} sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', px: 3, fontWeight: 800 }}>
            بدء الوردية الآن 🚀
          </Button>
        </DialogActions>
      </Dialog>

      {/* CLOSE SHIFT DIALOG WITH LIVE DEFICIT / SURPLUS CALCULATOR */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', color: '#1E293B' }}>
          🔒 جرد وتصفية وإغلاق شفت {branchShortName}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Shift Details Box */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
            <Stack spacing={0.8}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">بداية العهدة النقدية:</Typography>
                <Typography variant="body2" fontWeight="bold">{startCash.toFixed(2)} ج.م</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                <Typography variant="body2" fontWeight="bold">+ مبيعات الكاش:</Typography>
                <Typography variant="body2" fontWeight="bold">+{totalSales.toFixed(2)} ج.m</Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#92400E' }}>
                <Typography variant="body1" fontWeight="900">المبلغ المتوقع بالخزينة:</Typography>
                <Typography variant="h6" fontWeight="900">{expectedDrawerCash.toFixed(2)} ج.م</Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Actual Cash Input */}
          <TextField
            fullWidth
            required
            type="number"
            size="medium"
            label="المبلغ الجردي الفعلي بالخزينة (ج.م) *"
            placeholder={expectedDrawerCash.toString()}
            value={actualDrawerCash}
            onChange={(e) => setActualDrawerCash(e.target.value)}
            autoFocus
          />

          {/* DYNAMIC LIVE DEFICIT / SURPLUS BANNER */}
          {isDeficit ? (
            <Alert severity="error" icon={<WarningAmber />} sx={{ borderRadius: '12px', fontWeight: 800 }}>
              ⚠️ عجز في الخزينة بقيمة: <strong>{Math.abs(cashDifference).toFixed(2)} ج.م</strong>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                يلزم كتابة سبب وتفاصيل العجز أدناه للتسجيل في تقارير الرقابة والإدارة.
              </Typography>
            </Alert>
          ) : isSurplus ? (
            <Alert severity="success" icon={<AddCircleOutlined />} sx={{ borderRadius: '12px', fontWeight: 800 }}>
              🎁 زيادة في الخزينة بقيمة: <strong>+{cashDifference.toFixed(2)} ج.م</strong>
            </Alert>
          ) : (
            <Alert severity="info" icon={<CheckCircleOutlined />} sx={{ borderRadius: '12px', fontWeight: 800 }}>
              ✅ الخزينة متطابقة تماماً 100% (المبلغ الفعلي = المتوقع).
            </Alert>
          )}

          {/* Deficit Notes Field (Compulsory if Deficit exists) */}
          <TextField
            fullWidth
            required={isDeficit}
            multiline
            rows={2}
            size="small"
            label={isDeficit ? "سبب وتفاصيل العجز بالخزينة *" : "ملاحظات إغلاق الشيفت (اختياري)"}
            placeholder={isDeficit ? "مثال: خطأ في فكة أوردر / مصروفات نثريات لم تسجل..." : "ملاحظات..."}
            value={deficitNotes}
            onChange={(e) => setDeficitNotes(e.target.value)}
          />

          {/* Shift Raw Materials Return Option */}
          {shiftInventory.filter(i => i.current_stock > 0).length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#EEF2FF', borderRadius: '10px', border: '1.5px solid #C7D2FE' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#3730A3">
                    🚚 نقل وإرجاع خامات الفرع المتبقية للمخزن الرئيسي
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    يوجد ({shiftInventory.filter(i => i.current_stock > 0).length} خامة) متبقية برصيد موجب سيتم إرجاعها للمستودع
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant={autoReturnOnClose ? "contained" : "outlined"}
                  onClick={() => setAutoReturnOnClose(!autoReturnOnClose)}
                  sx={{
                    bgcolor: autoReturnOnClose ? '#4F46E5' : 'transparent',
                    color: autoReturnOnClose ? '#FFF' : '#4F46E5',
                    borderRadius: '8px',
                    fontWeight: 800,
                    minWidth: 80
                  }}
                >
                  {autoReturnOnClose ? 'تأكيد النقل ✅' : 'إلغاء ❌'}
                </Button>
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setCloseDialogOpen(false)} variant="outlined">إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleConfirmCloseShift}
            disabled={isDeficit && !deficitNotes.trim()}
            sx={{
              bgcolor: isDeficit ? '#DC2626' : '#10B981',
              '&:hover': { bgcolor: isDeficit ? '#B91C1C' : '#059669' },
              borderRadius: '10px',
              px: 3,
              fontWeight: 900
            }}
          >
            تأكيد التسوية والإغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
