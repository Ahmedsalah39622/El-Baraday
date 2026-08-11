'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, TextField, Paper, Grid, Alert
} from '@mui/material';
import { AddBusiness, DeleteForever, CheckCircle } from '@mui/icons-material';

export default function StockAdjustmentModal({ open, onClose, onRefresh }) {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [adjType, setAdjType] = useState('supply'); // 'supply' = توريد وارد, 'waste' = هالك/تالف
  const [quantity, setQuantity] = useState('10');
  const [costPerUnit, setCostPerUnit] = useState('100');
  const [supplierName, setSupplierName] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('b_main');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadInventory();
    }
  }, [open]);

  const loadInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data || []);
        if (data.length > 0 && !selectedItemId) {
          setSelectedItemId(data[0].id);
          setCostPerUnit(data[0].cost_per_unit || data[0].costPerUnit || '100');
        }
      }
    } catch (e) {}
  };

  const handleItemChange = (itemId) => {
    setSelectedItemId(itemId);
    const found = inventoryItems.find(i => i.id === itemId);
    if (found) {
      setCostPerUnit(found.cost_per_unit || found.costPerUnit || '100');
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedItemId) {
      setErrorMsg('برجاء اختيار الخامة');
      return;
    }

    const q = parseFloat(quantity) || 0;
    if (q <= 0) {
      setErrorMsg('برجاء تحديد كمية صحيحة أكبر من الصفر');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItemId,
          type: adjType,
          quantity: q,
          cost_per_unit: parseFloat(costPerUnit) || 0,
          supplier_name: supplierName,
          branch_id: targetBranchId,
          notes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('✅ تم تسجيل الحركة وتحديث المخزون بنجاح!');
        setQuantity('10');
        setSupplierName('');
        setNotes('');
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء حفظ التوريد/التسوية');
      }
    } catch (err) {
      setErrorMsg('تعذر الاتصال بالسيرفر لتنفيذ التوريد');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItemObj = inventoryItems.find(i => i.id === selectedItemId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: adjType === 'supply' ? '#DCFCE7' : '#FEE2E2', color: adjType === 'supply' ? '#166534' : '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {adjType === 'supply' ? <AddBusiness /> : <DeleteForever />}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={900} color="#1A1A2E">
            {adjType === 'supply' ? '📥 إذن توريد جديد للمخزن' : '⚠️ تسوية وتخفيض هالك / تالف'}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            إضافة خامات واردة من الموردين أو خصم تالف وهالك من الرصيد
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontWeight: 700 }}>نوع الحركة *</InputLabel>
              <Select
                value={adjType}
                label="نوع الحركة *"
                onChange={(e) => setAdjType(e.target.value)}
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                <MenuItem value="supply">📥 توريد وارد جديد من مورد</MenuItem>
                <MenuItem value="waste">⚠️ تسوية هالك / تالف</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontWeight: 700 }}>الموقع المستهدف *</InputLabel>
              <Select
                value={targetBranchId}
                label="الموقع المستهدف *"
                onChange={(e) => setTargetBranchId(e.target.value)}
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                <MenuItem value="b_main">🏬 المخزن الرئيسي</MenuItem>
                <MenuItem value="b1">🏛️ فرع عزت</MenuItem>
                <MenuItem value="b2">🏢 فرع المسلة</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontWeight: 700 }}>اختر الخامة *</InputLabel>
              <Select
                value={selectedItemId}
                label="اختر الخامة *"
                onChange={(e) => handleItemChange(e.target.value)}
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                {inventoryItems.map((inv) => (
                  <MenuItem key={inv.id} value={inv.id}>
                    {inv.name} ({inv.category || 'عام'}) - التكلفة الحالية: {inv.cost_per_unit || inv.costPerUnit || 0} ج.م/{inv.unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="الكمية *"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              InputProps={{
                endAdornment: <Typography variant="caption" color="text.secondary" fontWeight={700}>{selectedItemObj?.unit || 'كجم'}</Typography>
              }}
            />
          </Grid>

          {adjType === 'supply' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="تكلفة الوحدة الواردة (ج.م)"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
              />
            </Grid>
          )}

          {adjType === 'supply' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المورّد / المصدر"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثال: شركة اللحوم الوطنية"
              />
            </Grid>
          )}

          <Grid item xs={12} sm={adjType === 'supply' ? 6 : 6}>
            <TextField
              fullWidth
              size="small"
              label="ملاحظات الحركة"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: فاتورة توريد رقم 104"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, bg: '#FAFCFF' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px' }}>إلغاء</Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant="contained"
          sx={{
            borderRadius: '8px',
            bgcolor: adjType === 'supply' ? '#166534' : '#DC2626',
            fontWeight: 800,
            '&:hover': { bgcolor: adjType === 'supply' ? '#14532D' : '#B91C1C' }
          }}
        >
          {submitting ? 'جاري التسجيل...' : 'تأكيد التسجيل بالحسابات والمخزن'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
