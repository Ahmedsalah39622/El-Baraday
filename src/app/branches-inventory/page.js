'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, MenuItem, Select,
  FormControl, InputLabel, Grid, Alert, Snackbar, InputAdornment
} from '@mui/material';
import {
  WarningAmber, History, LocalShipping, AddBusiness, Store, Warehouse,
  Refresh, AttachMoney, DeleteSweep, RestartAlt, CheckCircle, Save
} from '@mui/icons-material';

// TabPanel Helper Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2.5 }}>{children}</Box>}
    </div>
  );
}

// Inline Stock Cell with Instant Confirm/Save Button
function InlineStockCell({ initialValue, itemId, branchId, onSave, color = '#4F46E5', bgColor = '#F5F3FF', isLow = false }) {
  const [val, setVal] = useState(initialValue);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const isDirty = parseFloat(val) !== parseFloat(initialValue);

  const handleConfirmSave = async () => {
    setLoading(true);
    await onSave(itemId, branchId, val);
    setLoading(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirmSave();
    }
  };

  return (
    <TableCell align="center" sx={{ bgcolor: bgColor, p: 0.8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <TextField
          type="number"
          size="small"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            width: 70,
            bgcolor: '#FFFFFF',
            borderRadius: '8px',
            '& input': {
              fontWeight: 900,
              textAlign: 'center',
              p: 0.6,
              color: isLow ? '#B91C1C' : color,
              fontSize: '0.95rem'
            }
          }}
        />
        <Tooltip title={isDirty ? "تأكيد وحفظ التعديل الآن" : "تأكيد الرصيد"}>
          <span>
            <IconButton
              size="small"
              onClick={handleConfirmSave}
              disabled={loading}
              sx={{
                bgcolor: isSaved ? '#10B981' : (isDirty ? '#2563EB' : '#F1F5F9'),
                color: (isSaved || isDirty) ? '#FFFFFF' : '#64748B',
                border: '1px solid',
                borderColor: (isSaved || isDirty) ? 'transparent' : '#CBD5E1',
                borderRadius: '8px',
                p: 0.6,
                '&:hover': {
                  bgcolor: isSaved ? '#059669' : (isDirty ? '#1D4ED8' : '#E2E8F0')
                },
                transition: 'all 0.2s ease'
              }}
            >
              {isSaved ? <CheckCircle sx={{ fontSize: 18 }} /> : <Save sx={{ fontSize: 18 }} />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {isLow && <Typography variant="caption" display="block" sx={{ color: '#EF4444', fontWeight: 700, mt: 0.3 }}>⚠️ منخفض</Typography>}
    </TableCell>
  );
}

export default function BranchesInventoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const branchId = user?.branch_id || user?.branchId || 'b1';

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSyncingSales, setIsSyncingSales] = useState(false);
  const [rawItems, setRawItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal States
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Reset Form State
  const [resetForm, setResetForm] = useState({
    branch_id: 'all', // 'all', 'b1', 'b2'
    mode: 'all', // 'all' (كل الخامات) or 'single' (خامة محددة)
    item_id: '',
    notes: 'تصفير رصيد خامات الفروع'
  });

  // Adjustment Form State
  const [adjustForm, setAdjustForm] = useState({
    item_id: '',
    type: 'adjustment', // 'supply', 'waste', 'adjustment' (override)
    quantity: '',
    cost_per_unit: '',
    branch_id: 'b1',
    supplier_name: '',
    notes: ''
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    item_id: '',
    from_branch_id: 'b_main',
    to_branch_id: 'b1',
    quantity: '',
    sender_name: 'مسؤول الجرد',
    notes: ''
  });

  // Notifications
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });

  const handleExecuteReset = async () => {
    if (resetForm.mode === 'single' && !resetForm.item_id) {
      setToast({ open: true, msg: '⚠️ برجاء اختيار الخامة المراد تصفير رصيدها بالفرع', type: 'warning' });
      return;
    }

    const branchName = resetForm.branch_id === 'all' ? 'كافة الفروع' : (resetForm.branch_id === 'b2' ? 'فرع المسلة' : 'فرع عزت');
    const itemObj = rawItems.find(i => i.id === resetForm.item_id);
    const itemName = resetForm.mode === 'single' ? (itemObj?.name || 'الخامة المحددة') : 'كافة الخامات';

    const confirmMsg = `هل أنت متأكد من تصفير رصيد (${itemName}) في (${branchName}) إلى 0؟\n\n(ملاحظة: هذا لن يؤثر على كميات المخزن الرئيسي)`;
    if (!window.confirm(confirmMsg)) return;

    setResetLoading(true);
    try {
      const res = await fetch('/api/inventory/reset-branch-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: resetForm.branch_id,
          item_id: resetForm.mode === 'all' ? 'all' : resetForm.item_id,
          notes: resetForm.notes,
          executor_name: user?.name || 'المسؤول'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ open: true, msg: data.message || '✅ تم تصفير الرصيد بنجاح', type: 'success' });
        setResetModalOpen(false);
        loadData();
      } else {
        setToast({ open: true, msg: `❌ خطأ: ${data.error || 'فشلت عملية التصفير'}`, type: 'error' });
      }
    } catch (e) {
      setToast({ open: true, msg: '❌ حدث خطأ أثناء تنفيذ عملية التصفير', type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  // Initial load and live auto-refresh polling
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, branchesRes, transfersRes, transactionsRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/branches'),
        fetch('/api/inventory/transfers?limit=50'),
        fetch('/api/inventory/transactions?limit=100')
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setRawItems(itemsData || []);
      }
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData || []);
      }
      if (transfersRes.ok) {
        const transfersData = await transfersRes.json();
        setTransfers(transfersData || []);
      }
      if (transactionsRes.ok) {
        const transData = await transactionsRes.json();
        setTransactions(transData || []);
      }
    } catch (e) {
      showToast('⚠️ حدث خطأ أثناء تحميل بيانات المخازن', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ open: true, msg, type });
  };

  const handleSyncSales = async () => {
    if (isSyncingSales) return;

    setIsSyncingSales(true);
    try {
      const response = await fetch('/api/inventory/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: isAdmin ? 'all' : branchId
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'فشل في مزامنة الرصيد مع المبيعات');
      }

      showToast(data?.message || '✅ تم تحديث أرصدة الفروع مع المبيعات بنجاح', 'success');
      await loadData();
    } catch (error) {
      showToast(`❌ ${error?.message || 'حدث خطأ أثناء المزامنة'}`, 'error');
    } finally {
      setIsSyncingSales(false);
    }
  };

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // Submit Adjustment
  const handleExecuteAdjustment = async () => {
    if (!adjustForm.item_id || !adjustForm.quantity || parseFloat(adjustForm.quantity) < 0) {
      showToast('⚠️ يرجى اختيار الخامة وتحديد كمية صحيحة', 'error');
      return;
    }

    try {
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustForm)
      });

      if (response.ok) {
        showToast('✅ تم تسجيل العملية وتحديث الأرصدة بنجاح');
        setAdjustModalOpen(false);
        // Reset form
        setAdjustForm({
          item_id: '',
          type: 'adjustment',
          quantity: '',
          cost_per_unit: '',
          branch_id: 'b1',
          supplier_name: '',
          notes: ''
        });
        loadData();
      } else {
        const errData = await response.json();
        showToast(`❌ خطأ: ${errData.error || 'فشلت العملية'}`, 'error');
      }
    } catch (err) {
      showToast('❌ حدث خطأ غير متوقع', 'error');
    }
  };

  // Submit Transfer
  const handleExecuteTransfer = async () => {
    if (!transferForm.item_id || !transferForm.quantity || parseFloat(transferForm.quantity) <= 0) {
      showToast('⚠️ يرجى تحديد الخامة والكمية بشكل صحيح', 'error');
      return;
    }

    if (transferForm.from_branch_id === transferForm.to_branch_id) {
      showToast('⚠️ لا يمكن التحويل لنفس الموقع', 'error');
      return;
    }

    try {
      const response = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferForm)
      });

      if (response.ok) {
        showToast('✅ تم نقل وتوزيع الخامات بنجاح');
        setTransferModalOpen(false);
        setTransferForm({
          item_id: '',
          from_branch_id: 'b_main',
          to_branch_id: 'b1',
          quantity: '',
          sender_name: 'مسؤول الجرد',
          notes: ''
        });
        loadData();
      } else {
        const errData = await response.json();
        showToast(`❌ خطأ: ${errData.error || 'فشلت العملية'}`, 'error');
      }
    } catch (err) {
      showToast('❌ حدث خطأ غير متوقع', 'error');
    }
  };

  // Direct Inline Stock Editor
  const handleInlineStockChange = async (itemId, branchId, val) => {
    const qty = parseFloat(val) || 0;
    setRawItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updatedStocks = { ...(item.branch_stocks || {}) };
      if (branchId === 'b_main') {
        item.current_stock = qty;
        updatedStocks.b_main = qty;
      } else {
        updatedStocks[branchId] = qty;
      }
      return { ...item, current_stock: branchId === 'b_main' ? qty : item.current_stock, branch_stocks: updatedStocks };
    }));

    try {
      await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stock: qty, currentStock: qty, branch_id: branchId })
      });
    } catch (e) {
      console.error('Error updating stock inline:', e);
    }
  };

  // Filter Items
  const filteredItems = (rawItems || []).filter(item => {
    const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = selectedCategory === 'all' || item.category === selectedCategory;
    return nameMatch && catMatch;
  });

  // Calculate low stock metrics
  const lowStockBranches = (rawItems || []).filter(i => {
    const mainStock = i.branch_stocks?.b_main ?? i.current_stock ?? 0;
    const b1Stock = i.branch_stocks?.b1 ?? 0;
    const b2Stock = i.branch_stocks?.b2 ?? 0;
    const minStock = i.min_stock ?? 0;
    return mainStock <= minStock || b1Stock <= minStock || b2Stock <= minStock;
  }).length;

  // Calculate estimated branches inventory value
  const totalBranchesStockValue = (rawItems || []).reduce((sum, item) => {
    const b1Stock = item.branch_stocks?.b1 ?? 0;
    const b2Stock = item.branch_stocks?.b2 ?? 0;
    const cost = item.cost_per_unit || 0;
    return sum + ((b1Stock + b2Stock) * cost);
  }, 0);

  // Trigger quick adjustment popup for an item/branch
  const openQuickAdjust = (itemId, branchId, type = 'adjustment') => {
    setAdjustForm(prev => ({
      ...prev,
      item_id: itemId,
      branch_id: branchId,
      type: type
    }));
    setAdjustModalOpen(true);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: 8 }}>
      
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1A1A2E' }}>
            🏛️ لوحة جرد ومتابعة خامات الفروع
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5, fontWeight: 600 }}>
            متابعة حية لأرصدة الخامات والمستودعات لفرع عزت، فرع المسلة، والمخزن الرئيسي وتوثيق الهوالك والتحويلات
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <IconButton onClick={loadData} disabled={loading} sx={{ bgcolor: '#F1F5F9', border: '1px solid #E2E8F0', p: 1.2 }}>
            <Refresh className={loading ? 'spin-animation' : ''} />
          </IconButton>

          <Button
            variant="contained"
            startIcon={<Refresh className={isSyncingSales ? 'spin-animation' : ''} />}
            onClick={handleSyncSales}
            disabled={isSyncingSales}
            sx={{ bgcolor: '#4F46E5', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#4338CA' } }}
          >
            مزامنة الرصيد مع المبيعات 🔄
          </Button>

          <Button
            variant="contained"
            startIcon={<LocalShipping />}
            onClick={() => setTransferModalOpen(true)}
            sx={{ bgcolor: '#D97706', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#B45309' } }}
          >
            نقل وصرف خامات 🚚
          </Button>

          <Button
            variant="contained"
            startIcon={<AddBusiness />}
            onClick={() => setAdjustModalOpen(true)}
            sx={{ bgcolor: '#059669', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#047857' } }}
          >
            تسوية جرد / هالك / توريد 📥
          </Button>

          <Button
            variant="contained"
            startIcon={<DeleteSweep />}
            onClick={() => {
              setResetForm({
                branch_id: 'all',
                mode: 'all',
                item_id: '',
                notes: 'تصفير رصيد خامات الفروع'
              });
              setResetModalOpen(true);
            }}
            sx={{ bgcolor: '#DC2626', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#B91C1C' } }}
          >
            تصفير أرصدة الفروع 🔄 0
          </Button>
        </Box>
      </Box>

      {/* KPI Highlight Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#EEF2FF', border: '1.5px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Warehouse sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>أصناف المواد الخام</Typography>
              <Typography variant="h5" fontWeight={900} color="#1E1B4B">{rawItems?.length || 0} صنف</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#FFFBEB', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#D97706', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>فرع عزت 🏛️</Typography>
              <Typography variant="h5" fontWeight={900} color="#78350F">
                {(rawItems || []).filter(i => (i.branch_stocks?.b1 || 0) > 0).length} خامة نشطة
              </Typography>
              <Typography
                variant="caption"
                onClick={() => router.push('/branches-inventory/b1')}
                sx={{
                  color: '#D97706',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5,
                  '&:hover': { textDecoration: 'underline', color: '#B45309' }
                }}
              >
                عرض تفاصيل وجرد الفرع 🏛️
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#ECFDF5', border: '1.5px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>فرع المسلة 🏢</Typography>
              <Typography variant="h5" fontWeight={900} color="#064E3B">
                {(rawItems || []).filter(i => (i.branch_stocks?.b2 || 0) > 0).length} خامة نشطة
              </Typography>
              <Typography
                variant="caption"
                onClick={() => router.push('/branches-inventory/b2')}
                sx={{
                  color: '#059669',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5,
                  '&:hover': { textDecoration: 'underline', color: '#047857' }
                }}
              >
                عرض تفاصيل وجرد الفرع 🏢
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#16A34A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AttachMoney sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>تكلفة بضاعة الفروع</Typography>
              <Typography variant="h5" fontWeight={900} color="#166534">{totalBranchesStockValue.toLocaleString()} ج.م</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Tabs Container */}
      <Paper sx={{ width: '100%', borderRadius: '16px', border: '1px solid #E5E7EB', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: '1px solid #E2E8F0', pb: 1 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" sx={{ '& .MuiTab-root': { fontWeight: 800 } }}>
            <Tab label="📊 أرصدة خامات الفروع والمستودع" />
            <Tab label={`⚠️ تنبيهات نقص الفروع (${lowStockBranches})`} />
            <Tab label="🚚 سجل حركة التحويلات بين الفروع" />
            <Tab label="📝 سجل التوريد والهالك والتسويات" />
          </Tabs>

          {/* Inline filters - only visible on stock matrices */}
          {(tabValue === 0 || tabValue === 1) && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="ابحث عن خامة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: 180, '& input': { fontWeight: 700 } }}
              />

              <FormControl size="small" sx={{ width: 130 }}>
                <InputLabel sx={{ fontWeight: 700 }}>الفئة</InputLabel>
                <Select
                  value={selectedCategory}
                  label="الفئة"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  sx={{ fontWeight: 700 }}
                >
                  <MenuItem value="all">كل الفئات</MenuItem>
                  <MenuItem value="لحوم">لحوم</MenuItem>
                  <MenuItem value="دواجن">دواجن</MenuItem>
                  <MenuItem value="أجبان">أجبان</MenuItem>
                  <MenuItem value="خضروات">خضروات</MenuItem>
                  <MenuItem value="عجائن">عجائن</MenuItem>
                  <MenuItem value="مخبوزات">مخبوزات</MenuItem>
                  <MenuItem value="زيوت">زيوت</MenuItem>
                  <MenuItem value="عام">عام</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        {/* Tab 0: Branch & Warehouse Stock Matrix */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الوحدة</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#4F46E5', bgcolor: '#EEF2FF', textAlign: 'center' }}>🏬 المخزن الرئيسي</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#D97706', bgcolor: '#FEF3C7', textAlign: 'center' }}>🏛️ فرع عزت</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#059669', bgcolor: '#ECFDF5', textAlign: 'center' }}>🏢 فرع المسلة</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>الحد الأدنى</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>تكلفة الوحدة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>تعديل أرصدة الفروع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((row) => {
                  const mainStock = row.branch_stocks?.b_main ?? row.current_stock ?? 0;
                  const b1Stock = row.branch_stocks?.b1 ?? 0;
                  const b2Stock = row.branch_stocks?.b2 ?? 0;
                  const minStock = row.min_stock ?? 0;
                  const isMainLow = mainStock <= minStock;
                  const isB1Low = b1Stock <= minStock;
                  const isB2Low = b2Stock <= minStock;

                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{row.name}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>
                        <Chip label={row.category || 'عام'} size="small" sx={{ fontWeight: 700, bgcolor: '#F1F5F9' }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>{row.unit}</TableCell>

                      {/* Main Warehouse stock status */}
                      <InlineStockCell
                        initialValue={mainStock}
                        itemId={row.id}
                        branchId="b_main"
                        onSave={handleInlineStockChange}
                        color="#4F46E5"
                        bgColor="#F5F3FF"
                        isLow={isMainLow}
                      />

                      {/* Branch 1 Stock */}
                      <InlineStockCell
                        initialValue={b1Stock}
                        itemId={row.id}
                        branchId="b1"
                        onSave={handleInlineStockChange}
                        color="#D97706"
                        bgColor="#FFFBEB"
                        isLow={isB1Low}
                      />

                      {/* Branch 2 Stock */}
                      <InlineStockCell
                        initialValue={b2Stock}
                        itemId={row.id}
                        branchId="b2"
                        onSave={handleInlineStockChange}
                        color="#059669"
                        bgColor="#F0FDF4"
                        isLow={isB2Low}
                      />

                      <TableCell align="center" sx={{ fontWeight: 700, color: '#64748B' }}>{minStock} {row.unit}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#2563EB' }}>{row.cost_per_unit || 0} ج.م</TableCell>

                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center' }}>
                          <Tooltip title="تعديل جرد فرع عزت">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openQuickAdjust(row.id, 'b1', 'adjustment')}
                              sx={{ py: 0.2, fontSize: '0.75rem', borderColor: '#FEF3C7', color: '#D97706', bgcolor: '#FFFDF5', '&:hover': { bgcolor: '#FEF3C7' } }}
                            >
                              جرد عزت
                            </Button>
                          </Tooltip>
                          <Tooltip title="تعديل جرد فرع المسلة">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openQuickAdjust(row.id, 'b2', 'adjustment')}
                              sx={{ py: 0.2, fontSize: '0.75rem', borderColor: '#ECFDF5', color: '#059669', bgcolor: '#F9FDFB', '&:hover': { bgcolor: '#ECFDF5' } }}
                            >
                              جرد المسلة
                            </Button>
                          </Tooltip>
                          <Tooltip title={`تصفير رصيد (${row.name}) في الفروع إلى 0`}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setResetForm({
                                  branch_id: 'all',
                                  mode: 'single',
                                  item_id: row.id,
                                  notes: `تصفير سريع لخامة ${row.name}`
                                });
                                setResetModalOpen(true);
                              }}
                              sx={{ color: '#DC2626', bgcolor: '#FEF2F2', border: '1px solid #FEE2E2', '&:hover': { bgcolor: '#FEE2E2' }, p: 0.5 }}
                            >
                              <RestartAlt sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748B', fontWeight: 700 }}>
                      لا توجد مواد خام تطابق شروط البحث الفلترة 🥩
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 1: Low stock alerts */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#FEF2F2' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الموقع المتأثر</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الرصيد الحالي</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>حد الأمان الأدنى</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>توصية التغذية</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>إجراء سريع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const alertsList = [];
                  rawItems.forEach(item => {
                    const minStock = item.min_stock || 0;
                    const mainStock = item.branch_stocks?.b_main ?? item.current_stock ?? 0;
                    const b1Stock = item.branch_stocks?.b1 ?? 0;
                    const b2Stock = item.branch_stocks?.b2 ?? 0;

                    if (mainStock <= minStock) {
                      alertsList.push({ item, locationId: 'b_main', locationName: '🏬 المخزن الرئيسي', currentStock: mainStock });
                    }
                    if (b1Stock <= minStock) {
                      alertsList.push({ item, locationId: 'b1', locationName: '🏛️ فرع عزت', currentStock: b1Stock });
                    }
                    if (b2Stock <= minStock) {
                      alertsList.push({ item, locationId: 'b2', locationName: '🏢 فرع المسلة', currentStock: b2Stock });
                    }
                  });

                  if (alertsList.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#065F46', fontWeight: 800, bgcolor: '#F0FDF4' }}>
                          👍 جميع أرصدة الخامات بالمخازن والفروع في مستويات أمان ممتازة ولا توجد نواقص!
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return alertsList.map((alert, idx) => {
                    const diff = Math.max(1, (alert.item.min_stock * 2) - alert.currentStock);
                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{alert.item.name}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#B91C1C' }}>{alert.locationName}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{alert.currentStock} {alert.item.unit}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#475569' }}>{alert.item.min_stock} {alert.item.unit}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#4F46E5' }}>
                          {alert.locationId === 'b_main'
                            ? `شراء أو توريد وارد لا يقل عن ${diff} ${alert.item.unit}`
                            : `تحويل وصرف ${diff} ${alert.item.unit} من المخزن الرئيسي للفرع`}
                        </TableCell>
                        <TableCell align="center">
                          {alert.locationId === 'b_main' ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => {
                                setAdjustForm({
                                  item_id: alert.item.id,
                                  type: 'supply',
                                  quantity: String(diff),
                                  cost_per_unit: String(alert.item.cost_per_unit || 0),
                                  branch_id: 'b_main',
                                  supplier_name: 'توريد سريع للأمن',
                                  notes: 'تغذية نقص رصيد تلقائي'
                                });
                                setAdjustModalOpen(true);
                              }}
                              sx={{ fontWeight: 700, borderRadius: '8px' }}
                            >
                              توريد وارد 📥
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              onClick={() => {
                                setTransferForm({
                                  item_id: alert.item.id,
                                  from_branch_id: 'b_main',
                                  to_branch_id: alert.locationId,
                                  quantity: String(diff),
                                  sender_name: 'مسؤول النواقص',
                                  notes: 'تغذية نقص رصيد تلقائي من المخزن'
                                });
                                setTransferModalOpen(true);
                              }}
                              sx={{ fontWeight: 700, borderRadius: '8px' }}
                            >
                              تحويل خامات 🚚
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 2: Branch Transfers Log */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>تاريخ العملية</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>من موقع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>إلى موقع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الكمية المنقولة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المسؤول / الحساب</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الملاحظات والسبب</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>
                      {new Date(t.created_at).toLocaleString('ar-EG')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{t.item_name}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      <Chip label={t.from_branch_name || t.from_branch_id} size="small" sx={{ bgcolor: '#F1F5F9', fontWeight: 800 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      <Chip label={t.to_branch_name || t.to_branch_id} size="small" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#10B981' }}>
                      {t.quantity} {t.item_unit || t.unit}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t.sender_name || '—'}</TableCell>
                    <TableCell sx={{ color: '#64748B', fontWeight: 600 }}>{t.notes || 'تحويل عادي بين المخازن'}</TableCell>
                  </TableRow>
                ))}
                {transfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#64748B', fontWeight: 700 }}>
                      لا توجد عمليات نقل أو توزيع مسجلة مؤخراً 🚚
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 3: Supplies/Losses/Adjustments Audit Log */}
        <TabPanel value={tabValue} index={3}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>نوع الحركة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الكمية</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>بيان وتفاصيل العملية</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tr) => {
                  let typeLabel = 'تسوية';
                  let chipColor = { bg: '#E2E8F0', text: '#334155' };
                  if (tr.type === 'in' || tr.type === 'supply') {
                    typeLabel = 'توريد وارد 📥';
                    chipColor = { bg: '#D1FAE5', text: '#065F46' };
                  } else if (tr.type === 'waste' || tr.type === 'loss') {
                    typeLabel = 'هالك / تالف 🔴';
                    chipColor = { bg: '#FEE2E2', text: '#991B1B' };
                  } else if (tr.type === 'adjustment') {
                    typeLabel = 'تسوية جردية 📝';
                    chipColor = { bg: '#FEF3C7', text: '#B45309' };
                  } else if (tr.type === 'transfer_out') {
                    typeLabel = 'صرف خارجي 📤';
                    chipColor = { bg: '#DBEAFE', text: '#1E40AF' };
                  } else if (tr.type === 'transfer_in') {
                    typeLabel = 'استلام وارد 📥';
                    chipColor = { bg: '#F3E8FF', text: '#6B21A8' };
                  }

                  return (
                    <TableRow key={tr.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#475569' }}>
                        {new Date(tr.created_at).toLocaleString('ar-EG')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{tr.item_name}</TableCell>
                      <TableCell>
                        <Chip label={typeLabel} size="small" sx={{ bgcolor: chipColor.bg, color: chipColor.text, fontWeight: 800 }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>
                        {tr.quantity} {tr.item_unit || 'وحدة'}
                      </TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 650 }}>{tr.notes || '—'}</TableCell>
                    </TableRow>
                  );
                })}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#64748B', fontWeight: 700 }}>
                      لا توجد حركات مخزنية مسجلة 📝
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Dialog 1: Stock Adjustment / Supply / Waste Dialog */}
      <Dialog open={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddBusiness sx={{ color: '#059669' }} /> تسجيل حركة مخزنية وتسويات الخامات
        </DialogTitle>
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontWeight: 700 }}>اختر الخامة / الصنف</InputLabel>
            <Select
              value={adjustForm.item_id}
              label="اختر الخامة / الصنف"
              onChange={(e) => setAdjustForm(p => ({ ...p, item_id: e.target.value }))}
              sx={{ fontWeight: 700 }}
            >
              {rawItems.map(item => (
                <MenuItem key={item.id} value={item.id}>
                  🥩 {item.name} ({item.unit})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 700 }}>موقع العملية (المستودع)</InputLabel>
                <Select
                  value={adjustForm.branch_id}
                  label="موقع العملية (المستودع)"
                  onChange={(e) => setAdjustForm(p => ({ ...p, branch_id: e.target.value }))}
                  sx={{ fontWeight: 700 }}
                >
                  <MenuItem value="b_main">🏬 المخزن الرئيسي (المركزي)</MenuItem>
                  <MenuItem value="b1">🏛️ فرع عزت (مباشر)</MenuItem>
                  <MenuItem value="b2">🏢 فرع المسلة (مباشر)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 700 }}>نوع الحركة المخزنية</InputLabel>
                <Select
                  value={adjustForm.type}
                  label="نوع الحركة المخزنية"
                  onChange={(e) => setAdjustForm(p => ({ ...p, type: e.target.value }))}
                  sx={{ fontWeight: 700 }}
                >
                  <MenuItem value="adjustment">📝 تسوية جردية (تعديل الرصيد لقيمة محددة)</MenuItem>
                  <MenuItem value="supply">📥 توريد بضاعة واردة (إضافة للرصيد)</MenuItem>
                  <MenuItem value="waste">🔴 هالك / تالف / فقد (خصم من الرصيد)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="الكمية الفعالة"
                type="number"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm(p => ({ ...p, quantity: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">⚖️</InputAdornment>,
                }}
                sx={{ '& input': { fontWeight: 900 } }}
              />
            </Grid>

            {adjustForm.type === 'supply' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="تكلفة الوحدة"
                  type="number"
                  value={adjustForm.cost_per_unit}
                  onChange={(e) => setAdjustForm(p => ({ ...p, cost_per_unit: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                  }}
                  sx={{ '& input': { fontWeight: 900 } }}
                />
              </Grid>
            )}
          </Grid>

          {adjustForm.type === 'supply' && (
            <TextField
              fullWidth
              size="small"
              label="اسم المورد (اختياري)"
              value={adjustForm.supplier_name}
              onChange={(e) => setAdjustForm(p => ({ ...p, supplier_name: e.target.value }))}
              sx={{ '& input': { fontWeight: 700 } }}
            />
          )}

          <TextField
            fullWidth
            size="small"
            label="ملاحظات وسبب التسوية"
            multiline
            rows={2}
            value={adjustForm.notes}
            onChange={(e) => setAdjustForm(p => ({ ...p, notes: e.target.value }))}
            sx={{ '& textarea': { fontWeight: 700 } }}
          />

          <Alert severity="info" sx={{ fontWeight: 750 }}>
            {adjustForm.type === 'adjustment' && '💡 ملاحظة: عملية "التسوية الجردية" ستقوم بضبط رصيد المستودع ليكون مساوياً تماماً للرصيد المكتوب أعلاه، وليس إضافة أو طرحاً.'}
            {adjustForm.type === 'supply' && '💡 توريد البضاعة سيقوم بجمع الكمية المدخلة فوق الرصيد الحالي وتحديث تكلفة الشراء.'}
            {adjustForm.type === 'waste' && '💡 تسجيل الهالك سيطرح الكمية المحددة من رصيد الموقع المختار مباشرة.'}
          </Alert>

        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
          <Button onClick={() => setAdjustModalOpen(false)} variant="outlined" sx={{ fontWeight: 800 }}>إلغاء ❌</Button>
          <Button onClick={handleExecuteAdjustment} variant="contained" color="success" sx={{ fontWeight: 800 }}>تأكيد العملية 📥</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Branch Transfer Dialog */}
      <Dialog open={transferModalOpen} onClose={() => setTransferModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShipping sx={{ color: '#D97706' }} /> تحويل وصرف خامات بين الفروع
        </DialogTitle>
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontWeight: 700 }}>اختر الخامة المراد نقلها</InputLabel>
            <Select
              value={transferForm.item_id}
              label="اختر الخامة المراد نقلها"
              onChange={(e) => setTransferForm(p => ({ ...p, item_id: e.target.value }))}
              sx={{ fontWeight: 700 }}
            >
              {rawItems.map(item => {
                const stockVal = item.branch_stocks?.b_main ?? item.current_stock ?? 0;
                return (
                  <MenuItem key={item.id} value={item.id}>
                    🥩 {item.name} — [متاح بالمخزن الرئيسي: {stockVal} {item.unit}]
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 700 }}>من موقع</InputLabel>
                <Select
                  value={transferForm.from_branch_id}
                  label="من موقع"
                  onChange={(e) => setTransferForm(p => ({ ...p, from_branch_id: e.target.value }))}
                  sx={{ fontWeight: 700 }}
                >
                  <MenuItem value="b_main">🏬 المخزن الرئيسي</MenuItem>
                  <MenuItem value="b1">🏛️ فرع عزت</MenuItem>
                  <MenuItem value="b2">🏢 فرع المسلة</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontWeight: 700 }}>إلى موقع</InputLabel>
                <Select
                  value={transferForm.to_branch_id}
                  label="إلى موقع"
                  onChange={(e) => setTransferForm(p => ({ ...p, to_branch_id: e.target.value }))}
                  sx={{ fontWeight: 700 }}
                >
                  <MenuItem value="b_main">🏬 المخزن الرئيسي</MenuItem>
                  <MenuItem value="b1">🏛️ فرع عزت</MenuItem>
                  <MenuItem value="b2">🏢 فرع المسلة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="الكمية المنقولة"
                type="number"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm(p => ({ ...p, quantity: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">⚖️</InputAdornment>,
                }}
                sx={{ '& input': { fontWeight: 900 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="المسؤول عن النقل"
                value={transferForm.sender_name}
                onChange={(e) => setTransferForm(p => ({ ...p, sender_name: e.target.value }))}
                sx={{ '& input': { fontWeight: 700 } }}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            size="small"
            label="ملاحظات التحويل والسبب"
            multiline
            rows={2}
            value={transferForm.notes}
            onChange={(e) => setTransferForm(p => ({ ...p, notes: e.target.value }))}
            sx={{ '& textarea': { fontWeight: 700 } }}
          />

        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
          <Button onClick={() => setTransferModalOpen(false)} variant="outlined" sx={{ fontWeight: 800 }}>إلغاء ❌</Button>
          <Button onClick={handleExecuteTransfer} variant="contained" color="warning" sx={{ fontWeight: 800 }}>تنفيذ التحويل 🚚</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 3: Zero-Out Branch Stock Modal */}
      <Dialog open={resetModalOpen} onClose={() => !resetLoading && setResetModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', gap: 1, color: '#B91C1C', bgcolor: '#FEF2F2' }}>
          <DeleteSweep sx={{ color: '#DC2626' }} /> تصفير أرصدة خامات الفروع (إلى 0)
        </DialogTitle>
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
          
          <Alert severity="warning" sx={{ fontWeight: 700, borderRadius: '10px' }}>
            ⚠️ <strong>تنبيه هام:</strong> هذا الإجراء يقوم بتصفير أرصدة خامات الفرع المختار أو كافة الفروع إلى (0) فقط، <strong>ولا يؤثر نهائياً على أرصدة المخزن الرئيسي</strong>.
          </Alert>

          {/* Branch Selector */}
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontWeight: 700 }}>الفرع المستهدف بالتصفير</InputLabel>
            <Select
              value={resetForm.branch_id}
              label="الفرع المستهدف بالتصفير"
              onChange={(e) => setResetForm(p => ({ ...p, branch_id: e.target.value }))}
              sx={{ fontWeight: 800 }}
            >
              <MenuItem value="all">🌐 كافة الفروع (فرع عزت + فرع المسلة)</MenuItem>
              <MenuItem value="b1">🏛️ فرع عزت فقط</MenuItem>
              <MenuItem value="b2">🏢 فرع المسلة فقط</MenuItem>
            </Select>
          </FormControl>

          {/* Reset Mode Selector */}
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontWeight: 700 }}>نوع عملية التصفير</InputLabel>
            <Select
              value={resetForm.mode}
              label="نوع عملية التصفير"
              onChange={(e) => setResetForm(p => ({ ...p, mode: e.target.value }))}
              sx={{ fontWeight: 800 }}
            >
              <MenuItem value="all">🧹 تصفير شامل (كل الخامات بالفرع تصبح 0)</MenuItem>
              <MenuItem value="single">🎯 تصفير خامة محددة فقط</MenuItem>
            </Select>
          </FormControl>

          {/* Specific Item Selector (Only when mode === 'single') */}
          {resetForm.mode === 'single' && (
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontWeight: 700 }}>اختر الخامة المراد تصفيرها *</InputLabel>
              <Select
                value={resetForm.item_id}
                label="اختر الخامة المراد تصفيرها *"
                onChange={(e) => setResetForm(p => ({ ...p, item_id: e.target.value }))}
                sx={{ fontWeight: 800 }}
              >
                {rawItems.map(item => {
                  const b1Val = item.branch_stocks?.b1 ?? 0;
                  const b2Val = item.branch_stocks?.b2 ?? 0;
                  return (
                    <MenuItem key={item.id} value={item.id}>
                      🥩 {item.name} — [عزت: {b1Val} {item.unit} | المسلة: {b2Val} {item.unit}]
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            size="small"
            label="ملاحظات وسبب التصفير"
            multiline
            rows={2}
            value={resetForm.notes}
            onChange={(e) => setResetForm(p => ({ ...p, notes: e.target.value }))}
            sx={{ '& textarea': { fontWeight: 700 } }}
          />

        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
          <Button onClick={() => setResetModalOpen(false)} disabled={resetLoading} variant="outlined" sx={{ fontWeight: 800 }}>
            إلغاء ❌
          </Button>
          <Button
            onClick={handleExecuteReset}
            disabled={resetLoading}
            variant="contained"
            sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, fontWeight: 900, px: 3 }}
          >
            {resetLoading ? 'جاري التصفير...' : 'تأكيد تصفير الرصيد إلى 0 🔄'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar alerts */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.type}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{ fontWeight: 800, width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>

    </Box>
  );
}
