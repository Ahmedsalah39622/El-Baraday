'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, TextField, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip, Alert, Grid, Divider
} from '@mui/material';
import { LocalShipping, SwapHoriz, CheckCircle, History, ArrowForward } from '@mui/icons-material';

export default function BranchTransferModal({ open, onClose }) {
  const [branches, setBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [pastTransfers, setPastTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('5');
  const [notes, setNotes] = useState('');
  const [senderName, setSenderName] = useState('مسؤول المخزن');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      loadBranchesAndInventory();
      loadPastTransfers();
    }
  }, [open]);

  const loadBranchesAndInventory = async () => {
    setLoading(true);
    try {
      const [bRes, invRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/inventory')
      ]);

      if (bRes.ok) {
        const bData = await bRes.json();
        setBranches(bData || []);
        if (bData.length >= 2) {
          setFromBranchId(bData[0].id);
          setToBranchId(bData[1].id);
        } else if (bData.length === 1) {
          setFromBranchId(bData[0].id);
        }
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventoryItems(invData || []);
        if (invData.length > 0 && !selectedItemId) {
          setSelectedItemId(invData[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading branch transfer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPastTransfers = async () => {
    try {
      const res = await fetch('/api/inventory/transfers?limit=50');
      if (res.ok) {
        const data = await res.json();
        setPastTransfers(data || []);
      }
    } catch (err) {
      console.error('Error loading past transfers:', err);
    }
  };

  const handleExecuteTransfer = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!fromBranchId || !toBranchId) {
      setErrorMsg('برجاء اختيار الفرع المحول منه والفرع المحول إليه');
      return;
    }

    if (fromBranchId === toBranchId) {
      setErrorMsg('لا يمكن التحويل لنفس الفرع! اختر فرعين مختلفين.');
      return;
    }

    if (!selectedItemId) {
      setErrorMsg('برجاء اختيار الخامة المراد تحويلها');
      return;
    }

    const numQty = parseFloat(quantity) || 0;
    if (numQty <= 0) {
      setErrorMsg('برجاء تحديد كمية صحيحة أكبر من الصفر');
      return;
    }

    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_branch_id: fromBranchId,
          to_branch_id: toBranchId,
          item_id: selectedItemId,
          quantity: numQty,
          sender_name: senderName,
          notes
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`✅ تم تحويل (${numQty}) من الخامة بنجاح من فرع (${data.transfer.from_branch_name}) إلى فرع (${data.transfer.to_branch_name})!`);
        setNotes('');
        setQuantity('5');
        loadPastTransfers();
        loadBranchesAndInventory();
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء تنفيذ التحويل');
      }
    } catch (err) {
      console.error('Error executing transfer:', err);
      setErrorMsg('تعذر الاتصال بالسيرفر لتنفيذ التحويل');
    }
  };

  const selectedItemObj = inventoryItems.find(i => i.id === selectedItemId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LocalShipping sx={{ fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={900} color="#1A1A2E">
            🚚 تحويل الخامات والمواد الخام بين الفروع
          </Typography>
          <Typography variant="caption" color="text.secondary">
            خصم الخامات من مخزن فرع وإضافتها فوراً لرصيد مخزن فرع آخر مع تسجيل السجل كاملاً
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {errorMsg && (
          <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ borderRadius: '10px', fontWeight: 700 }}>
            {errorMsg}
          </Alert>
        )}

        {successMsg && (
          <Alert severity="success" icon={<CheckCircle />} onClose={() => setSuccessMsg('')} sx={{ borderRadius: '10px', fontWeight: 700 }}>
            {successMsg}
          </Alert>
        )}

        {/* Transfer Form Box */}
        <Paper sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
          <Typography variant="subtitle2" fontWeight={800} color="#1E293B" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapHoriz sx={{ color: '#2563EB' }} /> بيانات تحويل الخامات:
          </Typography>

          <Grid container spacing={2}>
            {/* From Branch */}
            <Grid xs={12} sm={5}>
              <FormControl fullWidth size="small">
                <InputLabel>الفرع المحوِّل منه (الخصم) *</InputLabel>
                <Select
                  value={fromBranchId}
                  label="الفرع المحوِّل منه (الخصم) *"
                  onChange={(e) => setFromBranchId(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      🏛️ {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: '#EFF6FF', color: '#2563EB' }}>
                <ArrowForward sx={{ transform: 'rotate(180deg)' }} />
              </Box>
            </Grid>

            {/* To Branch */}
            <Grid xs={12} sm={5}>
              <FormControl fullWidth size="small">
                <InputLabel>الفرع المحوَّل إليه (الإضافة) *</InputLabel>
                <Select
                  value={toBranchId}
                  label="الفرع المحوَّل إليه (الإضافة) *"
                  onChange={(e) => setToBranchId(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      🏢 {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Item Selector */}
            <Grid xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>اختر الخامة المراد تحويلها *</InputLabel>
                <Select
                  value={selectedItemId}
                  label="اختر الخامة المراد تحويلها *"
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                >
                  {inventoryItems.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.name} ({inv.category || 'عام'}) - المتاح: {inv.currentStock || inv.current_stock || 0} {inv.unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Quantity */}
            <Grid xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="الكمية المحولة *"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                sx={{ bgcolor: '#FFF' }}
                InputProps={{
                  endAdornment: <Typography variant="caption" color="text.secondary">{selectedItemObj?.unit || 'كجم'}</Typography>
                }}
              />
            </Grid>

            {/* Sender Name */}
            <Grid xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="المسؤول عن التحويل"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                sx={{ bgcolor: '#FFF' }}
              />
            </Grid>

            {/* Notes */}
            <Grid xs={12}>
              <TextField
                fullWidth
                size="small"
                label="ملاحظات التحويل (اختياري)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تحويل عاجل لسد العجز في قسم المطبخ"
                sx={{ bgcolor: '#FFF' }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleExecuteTransfer}
              startIcon={<LocalShipping />}
              sx={{ bgcolor: '#D97706', color: '#FFF', fontWeight: 800, px: 3, py: 1.2, borderRadius: '10px', '&:hover': { bgcolor: '#B45309' } }}
            >
              تأكيد وإرسال التحويل بين الفروع 🚚
            </Button>
          </Box>
        </Paper>

        {/* Past Transfers Log */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#1A1A2E" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ color: '#64748B' }} /> سجل تحويلات الخامات الأخيرة بين الفروع ({pastTransfers.length} تحويل)
          </Typography>

          <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid #E2E8F0', maxHeight: 220, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>من فرع (خصم)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>إلى فرع (إضافة)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الخامة والكمية</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المسؤول</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pastTransfers.map((trf) => (
                  <TableRow key={trf.id} hover>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {new Date(trf.created_at || Date.now()).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#DC2626' }}>🏛️ {trf.from_branch_name || trf.from_branch_id}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#166534' }}>🏢 {trf.to_branch_name || trf.to_branch_id}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>
                      {trf.item_name || 'خامة'} ({trf.quantity} {trf.unit || 'كجم'})
                    </TableCell>
                    <TableCell sx={{ color: '#475569' }}>{trf.sender_name || 'المسؤول'}</TableCell>
                    <TableCell>
                      <Chip label="تم التحويل ✅" size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 800 }} />
                    </TableCell>
                  </TableRow>
                ))}

                {pastTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#94A3B8', fontWeight: 700 }}>
                      لا توجد تحويلات خامات مسجلة مسبقاً بين الفروع 📦
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: '#FAFCFF' }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#64748B', borderRadius: '10px', px: 4, fontWeight: 800 }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
