'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Print, ExitToApp, CheckCircleOutlined } from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useShiftStore } from '@/store/useShiftStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ShiftSummaryPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { activeShift, fetchShifts, closeShift } = useShiftStore();
  const { user } = useAuthStore();

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [actualDrawerCash, setActualDrawerCash] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchShifts();
  }, []);

  const totalSales = (invoices || []).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const startCash = activeShift?.startAmount || 500;
  const expectedDrawerCash = startCash + totalSales;

  const handleConfirmCloseShift = async () => {
    const endCash = parseFloat(actualDrawerCash) || expectedDrawerCash;
    await closeShift(endCash, totalSales, invoices?.length || 0);
    setCloseDialogOpen(false);
    alert('تم إغلاق الشيفت وتسوية الخزينة بنجاح!');
  };

  const cashierDisplayName = user?.name || activeShift?.cashierName || 'أحمد محمود (المدير العام)';
  const roleTitle = user?.role === 'admin' ? 'مدير النظام' : user?.role === 'cashier' ? 'كاشير' : user?.role === 'driver' ? 'طيار دليفري' : 'شيف مطبخ';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
          ملخص الوردية والشيفت الحالي
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
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
            sx={{ bgcolor: '#4285F4', borderRadius: '12px', fontWeight: 700 }}
          >
            إغلاق وتسوية الشيفت
          </Button>
        </Box>
      </Box>

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
          <Avatar sx={{ bgcolor: '#4285F4', width: 52, height: 52, fontWeight: 800, fontSize: '1.2rem' }}>
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
              بداية الوردية: {activeShift?.startTime || '07:47 م'} | حالة الوردية: {activeShift?.status === 'active' ? 'نشطة (جاري العمل)' : 'مغلقة'}
            </Typography>
          </Box>
        </Box>

        <Chip
          label="شيفت مباشر"
          color="success"
          sx={{ fontWeight: 800, borderRadius: '8px' }}
        />
      </Box>

      {/* Stats Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F0F7FF' }}>
          <Typography variant="caption" sx={{ color: '#4285F4', fontWeight: 800 }}>بداية العهدة (النقدية الأولى)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E40AF', mt: 0.5 }}>{startCash.toFixed(2)} ج.م</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#ECFDF5' }}>
          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 800 }}>مبيعات الوردية الحالية</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#065F46', mt: 0.5 }}>{totalSales.toFixed(2)} ج.م</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FEF3C7' }}>
          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800 }}>المتوقع في الخزينة الآن</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#92400E', mt: 0.5 }}>{expectedDrawerCash.toFixed(2)} ج.م</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F3F4F6' }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 800 }}>عدد فواتير الوردية</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1F2937', mt: 0.5 }}>{invoices?.length || 0} فاتورة</Typography>
        </Paper>
      </Box>

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
          <Button variant="contained" onClick={handleConfirmCloseShift} sx={{ bgcolor: '#4285F4', borderRadius: '10px' }}>
            تأكيد التسوية والإغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
