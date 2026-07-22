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

export default function ShiftSummaryPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { activeShift, fetchShifts, closeShift } = useShiftStore();

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

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
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

      {/* Cashier Info Banner */}
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
          <Avatar sx={{ bgcolor: '#4285F4', width: 52, height: 52, fontWeight: 800, fontSize: '1.2rem' }}>
            {(activeShift?.cashierName || 'A')[0].toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
              الكاشير: {activeShift?.cashierName || 'administrator'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.3 }}>
              بداية الوردية: {activeShift?.startTime || '08:00 AM'} | حالة الوردية: {activeShift?.status === 'active' ? 'نشطة (جاري العمل)' : 'مغلقة'}
            </Typography>
          </Box>
        </Box>

        <Chip
          label={activeShift?.status === 'active' ? 'الوردية نشطة الان' : 'مغلقة'}
          color={activeShift?.status === 'active' ? 'success' : 'default'}
          sx={{ fontWeight: 800, px: 1 }}
        />
      </Box>

      {/* 4 Stat Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 2,
        }}
      >
        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F8FAFC' }}>
          <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 700 }}>عهدة الدرج عند بداية الشيفت</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1A1A2E', mt: 0.5 }}>{startCash.toFixed(2)} ج.م</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#EFF6FF' }}>
          <Typography variant="body2" sx={{ color: '#1D4ED8', fontWeight: 700 }}>إجمالي مبيعات الشيفت (كاش)</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1D4ED8', mt: 0.5 }}>{totalSales.toFixed(2)} ج.م</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#ECFDF5' }}>
          <Typography variant="body2" sx={{ color: '#047857', fontWeight: 700 }}>المفروض تواجده في الدرج حالياً</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#047857', mt: 0.5 }}>{expectedDrawerCash.toFixed(2)} ج.م</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FFF7ED' }}>
          <Typography variant="body2" sx={{ color: '#C2410C', fontWeight: 700 }}>عدد فواتير الشيفت</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#C2410C', mt: 0.5 }}>{invoices?.length || 0} فاتورة</Typography>
        </Paper>
      </Box>

      {/* Orders Table */}
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E', mt: 1 }}>
        فواتير الوردية الحالية
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الوقت</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(invoices || []).map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 800 }}>#{row.id}</TableCell>
                <TableCell>
                  <Chip
                    label={row.orderType === 'delivery' ? 'دليفري' : row.orderType === 'takeaway' ? 'تيك أوي' : 'صالة'}
                    size="small"
                    sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800 }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.customerName || 'عميل محلي'}</TableCell>
                <TableCell sx={{ color: '#6B7280' }}>{row.date}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#4285F4' }}>{(row.total || 0).toFixed(2)} ج.م</TableCell>
              </TableRow>
            ))}

            {(invoices || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9CA3AF' }}>
                  لا توجد فواتير صادرة في الشيفت الحالي بعد
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Close Shift Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>إغلاق وتسوية الشيفت</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            المبلغ المتوقع بالدرج: <b>{expectedDrawerCash.toFixed(2)} ج.م</b> (عهدة {startCash} + مبيعات {totalSales.toFixed(0)})
          </Typography>
          <TextField
            fullWidth
            type="number"
            size="small"
            label="المبلغ المالي المتبقي الفعلي بالدرج (ج.م)"
            value={actualDrawerCash}
            placeholder={expectedDrawerCash.toFixed(0)}
            onChange={(e) => setActualDrawerCash(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCloseDialogOpen(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmCloseShift} variant="contained" sx={{ bgcolor: '#4285F4' }}>تأكيد وتسوية الشيفت</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
