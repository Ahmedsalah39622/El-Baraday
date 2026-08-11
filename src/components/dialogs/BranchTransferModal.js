'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, TextField, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Chip, Alert, Grid, Tabs, Tab
} from '@mui/material';
import { LocalShipping, SwapHoriz, CheckCircle, History, ArrowForward, Hub } from '@mui/icons-material';

export default function BranchTransferModal({ open, onClose }) {
  const [branches, setBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [pastTransfers, setPastTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Transfer Mode: 0 = Single Transfer, 1 = Batch Warehouse Distribution to both branches
  const [modeTab, setModeTab] = useState(0);

  // Single Transfer Form State
  const [fromBranchId, setFromBranchId] = useState('b_main');
  const [toBranchId, setToBranchId] = useState('b1');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('5');
  const [notes, setNotes] = useState('');
  const [senderName, setSenderName] = useState('مسؤول المخزن');

  // Batch Distribution State (From Central Warehouse to b1 and b2)
  const [batchB1Qty, setBatchB1Qty] = useState('5');
  const [batchB2Qty, setBatchB2Qty] = useState('5');

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
        if (bData.some(b => b.id === 'b_main')) {
          setFromBranchId('b_main');
          const other = bData.find(b => b.id !== 'b_main');
          if (other) setToBranchId(other.id);
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

  const handleExecuteSingleTransfer = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!fromBranchId || !toBranchId) {
      setErrorMsg('برجاء اختيار الفرع المحول منه والفرع المحول إليه');
      return;
    }

    if (fromBranchId === toBranchId) {
      setErrorMsg('لا يمكن التحويل لنفس الموقع! اختر موقعين مختلفين.');
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
        setSuccessMsg(`✅ تم تحويل (${numQty}) بنجاح من (${data.transfer.from_branch_name}) إلى (${data.transfer.to_branch_name})!`);
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

  const handleExecuteBatchDistribution = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedItemId) {
      setErrorMsg('برجاء اختيار الخامة المراد توزيعها');
      return;
    }

    const q1 = parseFloat(batchB1Qty) || 0;
    const q2 = parseFloat(batchB2Qty) || 0;

    if (q1 <= 0 && q2 <= 0) {
      setErrorMsg('برجاء إدخال كمية لفرع عزت أو فرع المسلة على الأقل');
      return;
    }

    const distributions = [];
    if (q1 > 0) distributions.push({ to_branch_id: 'b1', quantity: q1 });
    if (q2 > 0) distributions.push({ to_branch_id: 'b2', quantity: q2 });

    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_branch_id: 'b_main',
          item_id: selectedItemId,
          sender_name: senderName,
          notes: notes || 'توزيع جماعي من المخزن الرئيسي',
          distributions
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`✅ تم توزيع الخامات بنجاح من المخزن الرئيسي على الفرعين!`);
        setNotes('');
        loadPastTransfers();
        loadBranchesAndInventory();
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء تنفيذ التوزيع الجماعي');
      }
    } catch (err) {
      console.error('Error executing batch distribution:', err);
      setErrorMsg('تعذر الاتصال بالسيرفر لتنفيذ التوزيع الجماعي');
    }
  };

  const selectedItemObj = inventoryItems.find(i => i.id === selectedItemId);

  const getBranchIconLabel = (b) => {
    if (b.id === 'b_main') return `🏬 ${b.name} (المخزن الرئيسي)`;
    if (b.id === 'b1') return `🏛️ ${b.name}`;
    if (b.id === 'b2') return `🏢 ${b.name}`;
    return `🏪 ${b.name}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LocalShipping sx={{ fontSize: 30 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={900} color="#1A1A2E">
            🏬 نظام صرف وتوزيع الخامات بين المخزن الرئيسي والفرعين
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            تغذية فرع عزت وفرع المسلة بالخامات والمواد الخام مع التحويل المباشر وتحديث الرصيد
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {errorMsg && (
          <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ borderRadius: '12px', fontWeight: 700 }}>
            {errorMsg}
          </Alert>
        )}

        {successMsg && (
          <Alert severity="success" icon={<CheckCircle />} onClose={() => setSuccessMsg('')} sx={{ borderRadius: '12px', fontWeight: 700 }}>
            {successMsg}
          </Alert>
        )}

        {/* Mode Switcher Tabs */}
        <Paper sx={{ borderRadius: '14px', bgcolor: '#F1F5F9', p: 0.5 }}>
          <Tabs
            value={modeTab}
            onChange={(e, val) => setModeTab(val)}
            variant="fullWidth"
            sx={{ '& .MuiTab-root': { fontWeight: 800, borderRadius: '10px', py: 1 } }}
          >
            <Tab label="تحويل مباشر بين موقعين 🔄" />
            <Tab label="توزيع سريع من المخزن الرئيسي للفرعين 🚚" />
          </Tabs>
        </Paper>

        {/* Item Selection Header */}
        <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 700 }}>اختر الخامة المراد صرفها أو تحويلها *</InputLabel>
                <Select
                  value={selectedItemId}
                  label="اختر الخامة المراد صرفها أو تحويلها *"
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  sx={{ bgcolor: '#FFF', borderRadius: '10px', fontWeight: 800 }}
                >
                  {inventoryItems.map((inv) => {
                    const mainStock = inv.branchStocks?.b_main ?? inv.current_stock ?? inv.currentStock ?? 0;
                    const b1Stock = inv.branchStocks?.b1 ?? 0;
                    const b2Stock = inv.branchStocks?.b2 ?? 0;
                    return (
                      <MenuItem key={inv.id} value={inv.id}>
                        🥩 <b>{inv.name}</b> — [المخزن الرئيسي: {mainStock} {inv.unit}] | [فرع عزت: {b1Stock}] | [فرع المسلة: {b2Stock}]
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ p: 1, bgcolor: '#FFF', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>الرصيد بالمخزن الرئيسي:</Typography>
                <Typography variant="h6" fontWeight={900} color="#4F46E5">
                  {selectedItemObj ? (selectedItemObj.branchStocks?.b_main ?? selectedItemObj.currentStock ?? selectedItemObj.current_stock ?? 0) : 0} {selectedItemObj?.unit || 'كجم'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Tab 0: Single Transfer Mode */}
        {modeTab === 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: '#FAFCFF', border: '1.5px solid #E2E8F0' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#1E293B" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapHoriz sx={{ color: '#2563EB' }} /> تفاصيل التحويل الفردي:
            </Typography>

            <Grid container spacing={2} alignItems="center">
              {/* From Branch */}
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700 }}>المصدر (خصم الخامة) *</InputLabel>
                  <Select
                    value={fromBranchId}
                    label="المصدر (خصم الخامة) *"
                    onChange={(e) => setFromBranchId(e.target.value)}
                    sx={{ bgcolor: '#FFF', borderRadius: '10px' }}
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {getBranchIconLabel(b)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: '#EFF6FF', color: '#2563EB' }}>
                  <ArrowForward sx={{ transform: 'rotate(180deg)' }} />
                </Box>
              </Grid>

              {/* To Branch */}
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700 }}>الوجهة (إضافة الخامة) *</InputLabel>
                  <Select
                    value={toBranchId}
                    label="الوجهة (إضافة الخامة) *"
                    onChange={(e) => setToBranchId(e.target.value)}
                    sx={{ bgcolor: '#FFF', borderRadius: '10px' }}
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {getBranchIconLabel(b)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Quantity */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="الكمية المراد تحويلها *"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                  InputProps={{
                    endAdornment: <Typography variant="caption" color="text.secondary" fontWeight={700}>{selectedItemObj?.unit || 'كجم'}</Typography>
                  }}
                />
              </Grid>

              {/* Sender Name */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="اسم مسؤول التوزيع"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="ملاحظات الإذن"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سبب الصرف أو التحويل"
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleExecuteSingleTransfer}
                startIcon={<LocalShipping />}
                sx={{ bgcolor: '#2563EB', color: '#FFF', fontWeight: 800, px: 3.5, py: 1.2, borderRadius: '12px', '&:hover': { bgcolor: '#1D4ED8' } }}
              >
                تنفيذ إذن التحويل 🚚
              </Button>
            </Box>
          </Paper>
        )}

        {/* Tab 1: Batch Distribution Mode (From Central Warehouse to b1 and b2) */}
        {modeTab === 1 && (
          <Paper sx={{ p: 2.5, borderRadius: '18px', bgcolor: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#92400E" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Hub sx={{ color: '#D97706' }} /> التوزيع الجماعي المباشر من المخزن الرئيسي:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFF', border: '1px solid #CBD5E1' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1E293B" sx={{ mb: 1 }}>
                    🏛️ الكمية الموجهة لـ (فرع عزت)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="كمية فرع عزت"
                    value={batchB1Qty}
                    onChange={(e) => setBatchB1Qty(e.target.value)}
                    InputProps={{
                      endAdornment: <Typography variant="caption" color="text.secondary" fontWeight={700}>{selectedItemObj?.unit || 'كجم'}</Typography>
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    الرصيد الحالي بالفرع: {selectedItemObj?.branchStocks?.b1 || 0} {selectedItemObj?.unit || 'كجم'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFF', border: '1px solid #CBD5E1' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1E293B" sx={{ mb: 1 }}>
                    🏢 الكمية الموجهة لـ (فرع المسلة)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="كمية فرع المسلة"
                    value={batchB2Qty}
                    onChange={(e) => setBatchB2Qty(e.target.value)}
                    InputProps={{
                      endAdornment: <Typography variant="caption" color="text.secondary" fontWeight={700}>{selectedItemObj?.unit || 'كجم'}</Typography>
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    الرصيد الحالي بالفرع: {selectedItemObj?.branchStocks?.b2 || 0} {selectedItemObj?.unit || 'كجم'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="المسؤول عن التوزيع"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="ملاحظات التوزيع"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تغذية بداية الأسبوع للفرعين"
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleExecuteBatchDistribution}
                startIcon={<Hub />}
                sx={{ bgcolor: '#D97706', color: '#FFF', fontWeight: 800, px: 3.5, py: 1.2, borderRadius: '12px', '&:hover': { bgcolor: '#B45309' } }}
              >
                تأكيد وصرف التوزيع على الفرعين 🚚
              </Button>
            </Box>
          </Paper>
        )}

        {/* Past Transfers Log */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#1A1A2E" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ color: '#64748B' }} /> سجل حركة وتوزيع الخامات بين الفروع ({pastTransfers.length} إذن)
          </Typography>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', maxHeight: 220, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المصدر (خصم)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الوجهة (إضافة)</TableCell>
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
                    <TableCell sx={{ fontWeight: 800, color: '#DC2626' }}>{trf.from_branch_name || trf.from_branch_id}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#166534' }}>{trf.to_branch_name || trf.to_branch_id}</TableCell>
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
                      لا توجد تحويلات خامات مسجلة مسبقاً 📦
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
          إغلاق النافذة
        </Button>
      </DialogActions>
    </Dialog>
  );
}
