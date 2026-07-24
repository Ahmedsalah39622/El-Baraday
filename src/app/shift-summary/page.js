'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import { Print, ExitToApp, LockOpen, AccountBalanceWallet } from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ShiftSummaryPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { activeShift, fetchShifts, openShift, closeShift } = useShiftStore();
  const { user } = useAuthStore();

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [actualDrawerCash, setActualDrawerCash] = useState('');

  // New shift form state
  const [newCashierName, setNewCashierName] = useState(user?.name || '');
  const [newStartAmount, setNewStartAmount] = useState('500');

  useEffect(() => {
    fetchInvoices();
    fetchShifts();
  }, []);

  useEffect(() => {
    if (user?.name) {
      setNewCashierName(user.name);
    }
  }, [user]);

  // Filter invoices to only include those created SINCE activeShift.rawStartTime
  const activeShiftInvoices = (invoices || []).filter((inv) => {
    if (!activeShift?.rawStartTime || !inv.createdAt) return true;
    const invTime = new Date(inv.createdAt).getTime();
    const shiftStartTime = new Date(activeShift.rawStartTime).getTime();
    if (isNaN(invTime) || isNaN(shiftStartTime)) return true;
    return invTime >= shiftStartTime;
  });

  const totalSales = activeShiftInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const startCash = activeShift?.startAmount || 0;
  const expectedDrawerCash = activeShift ? (startCash + totalSales) : 0;

  const handleConfirmCloseShift = async () => {
    const endCash = parseFloat(actualDrawerCash) || expectedDrawerCash;
    await closeShift(endCash, totalSales, activeShiftInvoices.length);
    setCloseDialogOpen(false);
    alert('تم إغلاق الشيفت وتسوية الخزينة بنجاح!');
  };

  const handleConfirmOpenShift = async () => {
    const amount = parseFloat(newStartAmount) || 0;
    await openShift(newCashierName, amount);
    setOpenDialogOpen(false);
    alert('تم فتح وردية جديدة بنجاح!');
  };

  const cashierDisplayName = user?.name || activeShift?.cashierName || '';
  const roleTitle = user?.role === 'admin' ? 'مدير النظام' : user?.role === 'cashier' ? 'كاشير' : user?.role === 'driver' ? 'طيار دليفري' : 'شيف مطبخ';

  const isShiftActive = activeShift && activeShift.status === 'active';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
          ملخص الوردية والشيفت الحالي
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isShiftActive ? (
            <>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => window.print()}
                sx={{ borderColor: '#E5E7EB', color: '#1A1A2E', borderRadius: '12px', fontWeight: 600 }}
              >
                طباعة تظريف الخزينة
              </Button>
              <Button
                variant="contained"
                startIcon={<ExitToApp />}
                onClick={() => setCloseDialogOpen(true)}
                sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: '12px', fontWeight: 700 }}
              >
                إغلاق وتسوية الشيفت
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
          justify: 'space-between',
          bgcolor: '#FFFFFF',
          p: 2.5,
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: isShiftActive ? '#4285F4' : '#9CA3AF', width: 52, height: 52, fontWeight: 800, fontSize: '1.2rem' }}>
            {cashierDisplayName[0]}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                المستخدم الحالي: {cashierDisplayName}
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F0F7FF' }}>
          <Typography variant="caption" sx={{ color: '#4285F4', fontWeight: 800 }}>بداية العهدة (النقدية الأولى)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E40AF', mt: 0.5 }}>
            {isShiftActive ? `${startCash.toFixed(2)} ج.م` : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#ECFDF5' }}>
          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 800 }}>مبيعات الوردية الحالية</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#065F46', mt: 0.5 }}>
            {isShiftActive ? `${totalSales.toFixed(2)} ج.م` : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FEF3C7' }}>
          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800 }}>المتوقع في الخزينة الآن</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#92400E', mt: 0.5 }}>
            {isShiftActive ? `${expectedDrawerCash.toFixed(2)} ج.م` : '0.00 ج.م'}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F3F4F6' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 800 }}>عدد فواتير الوردية</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1F2937', mt: 0.5 }}>
            {isShiftActive ? `${activeShiftInvoices.length} فاتورة` : '0 فاتورة'}
          </Typography>
        </Paper>
      </Box>

      {/* Open New Shift Dialog */}
      <Dialog open={openDialogOpen} onClose={() => setOpenDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center' }}>فتح وردية جديدة 🔓</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#4B5563', mt: 1 }}>
            أدخل مبلغ النقدية الأولى (العهدة) الموجودة في الخزينة لبدء الوردية وتسجيل المبيعات:
          </Typography>
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
            placeholder="500"
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

      {/* Close Shift Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center' }}>تسوية وإغلاق الوردية</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#4B5563' }}>
            المبلغ المتوقع بالخزينة: <strong>{expectedDrawerCash.toFixed(2)} ج.م</strong>
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="المبلغ الجردي الفعلي بالخزينة"
            placeholder={expectedDrawerCash.toString()}
            value={actualDrawerCash}
            onChange={(e) => setActualDrawerCash(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={() => setCloseDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleConfirmCloseShift} sx={{ bgcolor: '#EF4444', borderRadius: '10px' }}>
            تأكيد التسوية والإغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
