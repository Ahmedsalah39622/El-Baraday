'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Chip, TextField, Select, MenuItem, InputLabel,
  FormControl, Grid, Card, Tab, Tabs, Alert, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment
} from '@mui/material';
import {
  ArrowBack, Store, Search, FilterAlt, History, ListAlt, Warning,
  TrendingDown, AccountBalanceWallet, Close, CheckCircle, Save
} from '@mui/icons-material';

export default function BranchStockPage({ params }) {
  const unwrappedParams = React.use(params);
  const { branchId } = unwrappedParams;
  const router = useRouter();

  // State Management
  const [branch, setBranch] = useState(null);
  const [rawItems, setRawItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentTab, setCurrentTab] = useState(0);

  // Quick Action Dialog (Local Stock Adjustments/Waste)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    type: 'adjustment', // 'adjustment' (override) or 'waste' (deduct)
    quantity: '',
    notes: '',
    executor: 'مسؤول الفرع'
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Fetch branch information, inventory items, and transfer history
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [branchesRes, itemsRes, transfersRes] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/inventory'),
        fetch('/api/inventory/transfers?limit=150')
      ]);

      if (!branchesRes.ok || !itemsRes.ok || !transfersRes.ok) {
        throw new Error('فشل جلب البيانات من الخادم، يرجى إعادة المحاولة');
      }

      const branchesData = await branchesRes.json();
      const itemsData = await itemsRes.json();
      const transfersData = await transfersRes.json();

      // Find current branch
      const currentBranch = branchesData.find(b => b.id === branchId);
      if (!currentBranch) {
        throw new Error('الفرع المطلوب غير موجود بالنظام');
      }
      setBranch(currentBranch);

      // Save raw items
      setRawItems(itemsData || []);

      // Filter transfers destined for this branch
      const branchTransfers = (transfersData || []).filter(t => t.to_branch_id === branchId);
      setTransfers(branchTransfers);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [branchId]);

  // Categories list
  const categories = ['all', ...new Set(rawItems.map(i => i.category || 'عام'))];

  // Filtered raw materials
  const filteredItems = rawItems.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (item.category || 'عام') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate Statistics for this branch
  const totalItemsCount = rawItems.length;
  const activeItems = rawItems.filter(item => {
    const bStocks = item.branch_stocks || item.branchStocks || {};
    return parseFloat(bStocks[branchId] || 0) > 0;
  });
  
  const lowStockItems = rawItems.filter(item => {
    const bStocks = item.branch_stocks || item.branchStocks || {};
    const stock = parseFloat(bStocks[branchId] || 0);
    const minStock = parseFloat(item.min_stock || item.minStock || 0);
    return stock <= minStock;
  });

  const totalValue = rawItems.reduce((sum, item) => {
    const bStocks = item.branch_stocks || item.branchStocks || {};
    const stock = parseFloat(bStocks[branchId] || 0);
    const cost = parseFloat(item.cost_per_unit || item.costPerUnit || 0);
    return sum + (stock * cost);
  }, 0);

  // Handle Adjustment Submit
  const handleAdjustSubmit = async () => {
    if (!selectedItem) return;
    const numQty = parseFloat(adjustForm.quantity);
    if (isNaN(numQty) || numQty < 0) {
      setActionError('الرجاء إدخال كمية صحيحة أكبر من أو تساوي الصفر');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const endpoint = '/api/inventory/adjustments';
      const body = {
        item_id: selectedItem.id,
        branch_id: branchId,
        quantity: numQty,
        type: adjustForm.type === 'adjustment' ? 'override' : 'waste',
        notes: adjustForm.notes || (adjustForm.type === 'adjustment' ? 'تسوية مخزنية دورية للفرع' : 'تسجيل هالك وتالف'),
        executor: adjustForm.executor
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء حفظ التعديل');

      setActionSuccess('✅ تم تحديث المخزون بنجاح!');
      setTimeout(() => {
        setAdjustDialogOpen(false);
        setSelectedItem(null);
        setAdjustForm({ type: 'adjustment', quantity: '', notes: '', executor: 'مسؤول الفرع' });
        loadData();
      }, 1000);

    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 2 }}>
        <CircularProgress size={50} thickness={4.5} />
        <Typography variant="body1" fontWeight={700} color="text.secondary">جاري تحميل بيانات الفرع والمخزون...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" variant="filled" sx={{ borderRadius: '16px', fontWeight: 700 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.push('/branches-inventory')} sx={{ mt: 2 }} variant="outlined">
          العودة لوحة التحكم العامة
        </Button>
      </Box>
    );
  }

  return (
    <Box dir="rtl" sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, direction: 'rtl' }}>
      
      {/* Top Navigation & Title Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyItems: 'center', justifyContent: 'space-between', gap: 2, alignItems: { sm: 'center' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '14px',
            background: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',
            color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
          }}>
            <Store sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={900} color="#1E293B">
              جرد ومتابعة: {branch?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              الموقع الجغرافي: {branch?.address || 'غير محدد'} | الهاتف: {branch?.phone || 'غير مسجل'}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          onClick={() => router.push('/branches-inventory')}
          startIcon={<ArrowBack />}
          sx={{ borderRadius: '12px', fontWeight: 800, color: '#475569', borderColor: '#CBD5E1', alignSelf: 'flex-start' }}
        >
          العودة للمقارنة العامة
        </Button>
      </Box>

      {/* KPI Overview Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#EEF2FF', border: '1.5px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListAlt sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>إجمالي الأصناف</Typography>
              <Typography variant="h5" fontWeight={900} color="#1E1B4B">{totalItemsCount} صنف</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#ECFDF5', border: '1.5px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>خامات متوفرة بالفرع</Typography>
              <Typography variant="h5" fontWeight={900} color="#064E3B">{activeItems.length} صنف نشط</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#FEF2F2', border: '1.5px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#EF4444', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Warning sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>أصناف تحت حد الأمان</Typography>
              <Typography variant="h5" fontWeight={900} color="#7F1D1D">{lowStockItems.length} خامة حرجة</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#FFFBEB', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#D97706', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>القيمة المالية الكلية للمخزون</Typography>
              <Typography variant="h5" fontWeight={900} color="#78350F">{totalValue.toFixed(1)} ج.م</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs Menu */}
      <Paper sx={{ borderRadius: '16px', bgcolor: '#FFF', border: '1px solid #E2E8F0', p: 0.5 }}>
        <Tabs
          value={currentTab}
          onChange={(e, val) => setCurrentTab(val)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { fontWeight: 900, fontSize: '0.95rem', py: 1.5 },
            '& .Mui-selected': { color: '#2563EB !important' }
          }}
        >
          <Tab label="📋 جرد الخامات وأرصدة الفرع" />
          <Tab label={`📦 سجل الواردات والتحويلات المستلمة (${transfers.length})`} />
        </Tabs>
      </Paper>

      {/* SEARCH & FILTERS BAR */}
      <Paper sx={{ p: 2, borderRadius: '16px', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', bgcolor: '#FFF', border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B' }}>
          <FilterAlt />
          <Typography variant="body2" fontWeight={800}>فلترة وعرض:</Typography>
        </Box>

        <TextField
          size="small"
          placeholder="ابحث عن خامة معينة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#94A3B8' }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>تصنيف الخامة</InputLabel>
          <Select
            value={selectedCategory}
            label="تصنيف الخامة"
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ borderRadius: '12px', fontWeight: 800 }}
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat} sx={{ fontWeight: 700 }}>
                {cat === 'all' ? 'جميع التصنيفات' : cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* TAB CONTENTS */}
      {currentTab === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الخامة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الوحدة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EFF6FF', color: '#1E3A8A' }}>📦 الرصيد الحالي بالفرع</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>حد الأمان</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>تكلفة الوحدة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>قيمة المخزون بالفرع</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>حالة الرصيد</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>إجراءات تعديل الرصيد</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((row) => {
                const bStocks = row.branch_stocks || row.branchStocks || {};
                const stock = parseFloat(bStocks[branchId] || 0);
                const minStock = parseFloat(row.min_stock || row.minStock || 0);
                const cost = parseFloat(row.cost_per_unit || row.costPerUnit || 0);
                const itemValue = stock * cost;
                const isLow = stock <= minStock;

                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{row.name}</TableCell>
                    <TableCell sx={{ color: '#475569', fontWeight: 600 }}>{row.category || 'عام'}</TableCell>
                    <TableCell sx={{ color: '#64748B', fontWeight: 700 }}>{row.unit || 'كجم'}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900, fontSize: '1rem', bgcolor: '#F8FAFC', color: isLow ? '#EF4444' : '#1E3A8A' }}>
                      {stock} {row.unit || 'رغيف'}
                    </TableCell>
                    <TableCell sx={{ color: '#475569' }}>{minStock} {row.unit || 'رغيف'}</TableCell>
                    <TableCell sx={{ color: '#475569', fontWeight: 600 }}>{cost.toFixed(2)} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{itemValue.toFixed(1)} ج.م</TableCell>
                    <TableCell>
                      <Chip
                        label={isLow ? 'الرصيد منخفض!' : 'رصيد آمن'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: isLow ? '#FEE2E2' : '#D1FAE5',
                          color: isLow ? '#EF4444' : '#065F46'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedItem(row);
                          setAdjustForm(f => ({ ...f, quantity: stock.toString() }));
                          setAdjustDialogOpen(true);
                        }}
                        sx={{ borderRadius: '8px', fontWeight: 800, textTransform: 'none' }}
                      >
                        تسوية / هالك ✏️
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94A3B8', fontWeight: 800 }}>
                    لا توجد خامات متطابقة مع معايير البحث 🔎
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {currentTab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>مرسل من موقع</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الكمية المستلمة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>المسؤول</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>السبب والملاحظات</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.map((trf) => (
                <TableRow key={trf.id} hover>
                  <TableCell sx={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                    {new Date(trf.created_at || Date.now()).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#4F46E5' }}>{trf.from_branch_name || trf.from_branch_id}</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{trf.item_name || 'خامة'}</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#10B981', fontSize: '0.95rem' }}>
                    {trf.quantity} {trf.unit || 'رغيف'}
                  </TableCell>
                  <TableCell sx={{ color: '#475569', fontWeight: 600 }}>{trf.sender_name || 'مسؤول الجرد'}</TableCell>
                  <TableCell sx={{ color: '#475569', fontSize: '0.85rem' }}>{trf.notes || 'تغذية رصيد للفرع'}</TableCell>
                  <TableCell>
                    <Chip label="تم الاستلام والوصول ✅" size="small" sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 800 }} />
                  </TableCell>
                </TableRow>
              ))}

              {transfers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94A3B8', fontWeight: 800 }}>
                    لا توجد تحويلات أو بضائع واردة مسجلة لهذا الفرع مسبقاً 🚚
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* LOCAL ACTION DIALOG (ADJUSTMENT/WASTE) */}
      <Dialog
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={950} color="#1E293B">
              إجراء تسوية أو تسجيل هالك للخامة
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              الخامة: 🥩 {selectedItem?.name} | الفرع: 🏛️ {branch?.name}
            </Typography>
          </Box>
          <IconButton onClick={() => setAdjustDialogOpen(false)} sx={{ mr: 'auto', color: '#64748B' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {actionError && (
            <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 700 }}>{actionError}</Alert>
          )}
          {actionSuccess && (
            <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '12px', fontWeight: 700 }}>{actionSuccess}</Alert>
          )}

          {/* Action Type */}
          <FormControl fullWidth size="small">
            <InputLabel>نوع العملية الجردية</InputLabel>
            <Select
              value={adjustForm.type}
              label="نوع العملية الجردية"
              onChange={(e) => setAdjustForm(f => ({ ...f, type: e.target.value }))}
              sx={{ borderRadius: '10px', fontWeight: 800 }}
            >
              <MenuItem value="adjustment" sx={{ fontWeight: 700 }}>📝 تسوية جردية (تعديل الرصيد لقيمة محددة)</MenuItem>
              <MenuItem value="waste" sx={{ fontWeight: 700 }}>🔴 تسجيل هالك وتالف (خصم من الرصيد الحالي)</MenuItem>
            </Select>
          </FormControl>

          {/* Helper Tips */}
          <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
            <Typography variant="caption" color="#475569" fontWeight={700}>
              {adjustForm.type === 'adjustment'
                ? '💡 ملاحظة: عملية "التسوية الجردية" ستقوم بضبط رصيد المستودع لهذا الفرع ليكون مساوياً تماماً للقيمة المكتوبة أدناه (وليس إضافة أو طرحاً).'
                : '💡 تسجيل الهالك سيطرح الكمية المحددة بالأسفل من رصيد الفرع الحالي مباشرة.'}
            </Typography>
          </Paper>

          <Grid container spacing={2}>
            {/* Quantity */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={adjustForm.type === 'adjustment' ? 'الرصيد الفعلي الجديد *' : 'الكمية الهالكة / التالفة *'}
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{selectedItem?.unit || 'رغيف'}</InputAdornment>
                }}
              />
            </Grid>

            {/* Executor Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="المسؤول عن الجرد/التعديل *"
                value={adjustForm.executor}
                onChange={(e) => setAdjustForm(f => ({ ...f, executor: e.target.value }))}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="ملاحظات وسبب الجرد/الهالك"
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="أدخل سبباً للتسوية أو وصف الهالك..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#F8FAFC', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setAdjustDialogOpen(false)}
            sx={{ borderRadius: '10px', fontWeight: 800, color: '#64748B', borderColor: '#CBD5E1' }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleAdjustSubmit}
            disabled={actionLoading}
            startIcon={<Save />}
            sx={{ bgcolor: '#2563EB', color: '#FFF', fontWeight: 800, borderRadius: '10px', px: 3, '&:hover': { bgcolor: '#1D4ED8' } }}
          >
            {actionLoading ? 'جاري الحفظ...' : 'حفظ وتحديث الرصيد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
