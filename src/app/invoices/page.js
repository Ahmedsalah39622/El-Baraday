'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Card, CardContent, Chip, IconButton, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Alert, CircularProgress, Divider, Stack, Autocomplete, Tabs, Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
  StickyNote2,
  Scale,
  CheckCircle as CheckIcon,
  PictureAsPdf,
  CalendarToday as CalendarIcon,
  Layers as LayersIcon,
  AttachMoney as MoneyIcon,
  ShoppingBag as BagIcon
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProductStore } from '@/store/useProductStore';
import { printCustomInvoice } from '@/lib/printReceipt';
import { generateReportPDF } from '@/lib/reportPdfExport';

export default function InvoicesPage() {
  const { 
    customInvoices, 
    loading, 
    fetchCustomInvoices, 
    addCustomInvoice, 
    updateCustomInvoice, 
    deleteCustomInvoice 
  } = useInvoiceStore();
  const { settings } = useSettingsStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const effectiveBranch = (user && user.role !== 'admin' && user.branch_id) ? user.branch_id : selectedBranchId;

  const { products, fetchProducts } = useProductStore();

  // Search and date filters for drafts list
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [draftDateFilter, setDraftDateFilter] = useState('');

  // Filters specifically for Aggregated Items Table
  const [aggDatePreset, setAggDatePreset] = useState('all');
  const [aggCustomDate, setAggCustomDate] = useState('');
  const [aggSearchItem, setAggSearchItem] = useState('');

  // Create / Edit Draft Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [formError, setFormError] = useState('');

  const initialForm = {
    title: 'نوتة طلب',
    customer_name: '',
    customer_phone: '',
    invoice_date: new Date().toISOString().split('T')[0],
    amount: '0',
    paid_amount: '0',
    remaining_amount: '0',
    payment_status: 'draft',
    payment_method: 'cash',
    notes: '',
    items: []
  };

  const [formData, setFormData] = useState(initialForm);

  // New item input state inside modal
  const [newItem, setNewItem] = useState({
    product_name: '',
    quantity: '1',
    price: '',
    total: ''
  });

  // Printable View Dialog State
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomInvoices();
    fetchProducts();
  }, [effectiveBranch, selectedBranchId, user]);

  // Notes and Drafts
  const allDrafts = useMemo(() => {
    return customInvoices.filter(inv => {
      const isDraft = inv.payment_status === 'draft';
      if (!isDraft) return false;
      const matchBranch = !effectiveBranch || effectiveBranch === 'all' || inv.branch_id === effectiveBranch || inv.branchId === effectiveBranch;
      return matchBranch;
    });
  }, [customInvoices, effectiveBranch]);

  // Filtered Drafts for the cards grid
  const filteredDrafts = useMemo(() => {
    return allDrafts.filter(draft => {
      if (draftDateFilter) {
        const invDate = draft.invoice_date ? draft.invoice_date.split('T')[0] : '';
        if (invDate !== draftDateFilter) return false;
      }
      if (draftSearchQuery.trim()) {
        const q = draftSearchQuery.toLowerCase().trim();
        const matchCustomer = draft.customer_name?.toLowerCase().includes(q);
        const matchPhone = draft.customer_phone?.includes(q);
        const matchNotes = draft.notes?.toLowerCase().includes(q);
        const matchItems = Array.isArray(draft.items) && draft.items.some(it => 
          (it.product_name && it.product_name.toLowerCase().includes(q)) ||
          (it.description && it.description.toLowerCase().includes(q))
        );
        if (!matchCustomer && !matchPhone && !matchNotes && !matchItems) return false;
      }
      return true;
    });
  }, [allDrafts, draftDateFilter, draftSearchQuery]);

  // ========================================================
  // AGGREGATED ITEMS TABLE DATA & FILTERING
  // ========================================================
  const aggregatedItemsData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Filter drafts according to agg table filters
    const eligibleDrafts = allDrafts.filter(draft => {
      const invDate = draft.invoice_date ? draft.invoice_date.split('T')[0] : '';
      if (!invDate) return aggDatePreset === 'all';

      if (aggDatePreset === 'today') {
        return invDate === todayStr;
      } else if (aggDatePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return invDate === y.toISOString().split('T')[0];
      } else if (aggDatePreset === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return invDate >= d.toISOString().split('T')[0];
      } else if (aggDatePreset === 'month') {
        const d = new Date();
        d.setDate(1);
        return invDate >= d.toISOString().split('T')[0];
      } else if (aggDatePreset === 'custom' && aggCustomDate) {
        return invDate === aggCustomDate;
      }
      return true;
    });

    // 2. Aggregate items across all eligible drafts
    const map = {};
    eligibleDrafts.forEach(draft => {
      const items = Array.isArray(draft.items) ? draft.items : [];
      items.forEach(it => {
        const rawName = (it.product_name || it.description || '').trim();
        if (!rawName) return;

        if (aggSearchItem.trim() && !rawName.toLowerCase().includes(aggSearchItem.toLowerCase().trim())) {
          return;
        }

        const qty = parseFloat(it.kilos || it.quantity || it.qty || 1);
        const price = parseFloat(it.price || 0);
        const total = parseFloat(it.total || (qty * price));
        const unit = it.kilos ? 'كجم' : 'عدد';

        if (!map[rawName]) {
          map[rawName] = {
            name: rawName,
            totalQty: 0,
            unit: unit,
            totalAmount: 0,
            notesCount: 0,
            draftIds: new Set()
          };
        }

        map[rawName].totalQty += qty;
        map[rawName].totalAmount += total;
        map[rawName].draftIds.add(draft.id);
      });
    });

    return Object.values(map).map(row => ({
      ...row,
      notesCount: row.draftIds.size,
      avgPrice: row.totalQty > 0 ? (row.totalAmount / row.totalQty) : 0
    })).sort((a, b) => b.totalQty - a.totalQty);

  }, [allDrafts, aggDatePreset, aggCustomDate, aggSearchItem]);

  // Aggregated Table Totals
  const aggGrandTotalQty = aggregatedItemsData.reduce((s, r) => s + r.totalQty, 0);
  const aggGrandTotalAmount = aggregatedItemsData.reduce((s, r) => s + r.totalAmount, 0);

  // Stats KPI cards for Drafts
  const totalDraftsCount = allDrafts.length;
  const totalDraftsAmount = allDrafts.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDraftsCount = allDrafts.filter(d => d.invoice_date && d.invoice_date.startsWith(todayStr)).length;
  const todayDraftsAmount = allDrafts
    .filter(d => d.invoice_date && d.invoice_date.startsWith(todayStr))
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  // ========================================================
  // MODAL HANDLERS (ADD / EDIT DRAFT)
  // ========================================================
  const handleOpenCreateModal = (draftToEdit = null) => {
    setFormError('');
    setNewItem({ product_name: '', quantity: '1', price: '', total: '' });

    if (draftToEdit) {
      setEditingDraftId(draftToEdit.id);
      setFormData({
        title: draftToEdit.title || 'مسودة / نوتة',
        customer_name: draftToEdit.customer_name || '',
        customer_phone: draftToEdit.customer_phone || '',
        invoice_date: draftToEdit.invoice_date ? draftToEdit.invoice_date.split('T')[0] : todayStr,
        amount: draftToEdit.amount ? draftToEdit.amount.toString() : '0',
        paid_amount: '0',
        remaining_amount: draftToEdit.amount ? draftToEdit.amount.toString() : '0',
        payment_status: 'draft',
        payment_method: draftToEdit.payment_method || 'cash',
        notes: draftToEdit.notes || '',
        items: Array.isArray(draftToEdit.items) ? draftToEdit.items : []
      });
    } else {
      setEditingDraftId(null);
      setFormData({
        ...initialForm,
        invoice_date: todayStr
      });
    }
    setDialogOpen(true);
  };

  // Product selection / typing
  const handleProductSelect = (val) => {
    const prodName = typeof val === 'string' ? val : (val?.name || '');
    const found = (products || []).find(p => p.name === prodName);
    const unitPrice = (found && found.price) ? found.price.toString() : newItem.price;
    const qNum = parseFloat(newItem.quantity) || 1;
    const pNum = parseFloat(unitPrice) || 0;
    const tot = (qNum > 0 && pNum > 0) ? (qNum * pNum).toFixed(2) : '';

    setNewItem(prev => ({
      ...prev,
      product_name: prodName,
      price: unitPrice,
      total: tot
    }));
  };

  const handleItemQuantityChange = (val) => {
    const qNum = parseFloat(val) || 0;
    const pNum = parseFloat(newItem.price) || 0;
    const tot = (qNum > 0 && pNum > 0) ? (qNum * pNum).toFixed(2) : '';
    setNewItem(prev => ({ ...prev, quantity: val, total: tot }));
  };

  const handleItemPriceChange = (val) => {
    const pNum = parseFloat(val) || 0;
    const qNum = parseFloat(newItem.quantity) || 0;
    const tot = (qNum > 0 && pNum > 0) ? (qNum * pNum).toFixed(2) : '';
    setNewItem(prev => ({ ...prev, price: val, total: tot }));
  };

  // Add Item to Draft (DOES NOT touch products or inventory!)
  const handleAddItemToDraft = () => {
    const prodName = (newItem.product_name || '').trim();
    if (!prodName) return;

    const qtyVal = parseFloat(newItem.quantity) || 1;
    const priceVal = parseFloat(newItem.price) || 0;
    const totalVal = parseFloat(newItem.total) || (qtyVal * priceVal);

    const updatedItems = [
      ...formData.items,
      {
        product_name: prodName,
        description: prodName,
        quantity: qtyVal,
        kilos: qtyVal,
        qty: qtyVal,
        price: priceVal,
        total: totalVal
      }
    ];

    const sum = updatedItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);

    setFormData({
      ...formData,
      items: updatedItems,
      amount: sum.toString(),
      remaining_amount: sum.toString()
    });

    setNewItem({ product_name: '', quantity: '1', price: '', total: '' });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const sum = updatedItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    setFormData({
      ...formData,
      items: updatedItems,
      amount: sum.toString(),
      remaining_amount: sum.toString()
    });
  };

  // Save draft directly to DB (via /api/invoices with payment_status: 'draft')
  const handleSaveDraft = async () => {
    if (!formData.customer_name.trim()) {
      setFormError('الرجاء إدخال اسم العميل أو عنوان المسودة');
      return;
    }

    const finalAmount = parseFloat(formData.amount) || 0;
    const payload = {
      ...formData,
      amount: finalAmount.toString(),
      paid_amount: '0',
      remaining_amount: finalAmount.toString(),
      payment_status: 'draft',
      branch_id: effectiveBranch && effectiveBranch !== 'all' ? effectiveBranch : 'b1'
    };

    if (editingDraftId) {
      const res = await updateCustomInvoice(editingDraftId, payload);
      if (res.success) {
        setDialogOpen(false);
      } else {
        setFormError(res.error || 'حدث خطأ أثناء تعديل المسودة');
      }
    } else {
      const res = await addCustomInvoice(payload);
      if (res.success) {
        setDialogOpen(false);
      } else {
        setFormError(res.error || 'حدث خطأ أثناء إضافة المسودة');
      }
    }
  };

  const handleDeleteDraft = async (id) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه المسودة من قاعدة البيانات؟')) {
      await deleteCustomInvoice(id);
    }
  };

  const handlePrint = (draft) => {
    printCustomInvoice(draft, settings, true);
  };

  const getWhatsAppShareUrl = (inv) => {
    let itemsText = '';
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      itemsText = '\n📦 *الأصناف والكميات:*\n' + inv.items.map(it => `• ${it.product_name || it.description} - ${it.kilos || it.quantity || it.qty} (${it.total || ((it.price || 0) * (it.kilos || it.qty || 1))} ج.م)`).join('\n');
    }
    const text = `📝 *مسودة طلب / نوتة - مطعم البرادعي*\n👤 *الاسم:* ${inv.customer_name}\n📅 *التاريخ:* ${inv.invoice_date?.split('T')[0]}${itemsText}\n💰 *المبلغ التقديري:* ${inv.amount} ج.م${inv.notes ? `\n💬 *ملاحظات:* ${inv.notes}` : ''}`;
    return `https://wa.me/${inv.customer_phone ? '2' + inv.customer_phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;
  };

  // Export Aggregated Items Table as PDF
  const handlePrintAggregatedReport = () => {
    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'اسم الصنف', accessor: 'name' },
      { label: 'إجمالي الكمية / العدد', accessor: (r) => `${r.totalQty} ${r.unit}` },
      { label: 'عدد المسودات المسجل بها', accessor: (r) => `${r.notesCount} مسودة` },
      { label: 'متوسط السعر', accessor: (r) => `${r.avgPrice.toFixed(2)} ج.م` },
      { label: 'إجمالي المبلغ التقديري', accessor: (r) => `${r.totalAmount.toLocaleString()} ج.م` }
    ];

    const stats = [
      { title: 'إجمالي الأصناف المختلفة', value: `${aggregatedItemsData.length} صنف` },
      { title: 'إجمالي الكميات المطلوبة', value: `${aggGrandTotalQty} كجم/قطعة` },
      { title: 'إجمالي المبالغ التقديرية', value: `${aggGrandTotalAmount.toLocaleString()} ج.م` },
      { title: 'الفترة الزمنية', value: aggDatePreset === 'today' ? 'اليوم' : aggDatePreset === 'yesterday' ? 'أمس' : aggDatePreset === 'all' ? 'كافة الفترات' : aggCustomDate || 'مخصصة' }
    ];

    const totals = {
      0: '',
      1: 'الإجمالي الكلي',
      2: `${aggGrandTotalQty}`,
      3: '',
      4: '',
      5: `${aggGrandTotalAmount.toLocaleString()} ج.م`
    };

    generateReportPDF({
      title: 'تقرير إجمالي الأصناف والكميات المطلوبة في المسودات',
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: effectiveBranch === 'b2' ? 'فرع المسلة' : 'فرع عزت',
      dateRangeStr: aggDatePreset === 'today' ? `يوم ${todayStr}` : 'كافة الفترات',
      stats,
      columns,
      data: aggregatedItemsData,
      totals
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100%', overflowY: 'auto', pb: 10 }}>

      {/* Main Page Header */}
      <Box className="no-print" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 1 }}>
            <StickyNote2 sx={{ fontSize: 38, color: '#d97706' }} />
            مسودات ونوتات الطلبات (Notes)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            تسجيل وإدارة طلبات العملاء وحساب الكيلوهات والأسعار بحرية وسهولة، مع حصر إجمالي للأصناف المطلوبة.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Switch Control (Admin Only) */}
          {isAdmin && (
            <Paper elevation={0} sx={{ borderRadius: '12px', p: 0.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              <Tabs
                value={selectedBranchId || 'all'}
                onChange={(e, val) => setSelectedBranchId(val)}
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    mx: 0.2,
                    px: 1.8,
                    color: '#64748B',
                    '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#0F172A', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }
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

          {/* Primary Action Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateModal()}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              fontWeight: 900,
              fontSize: '1rem',
              bgcolor: '#d97706',
              '&:hover': { bgcolor: '#b45309' },
              boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)'
            }}
          >
            + إضافة نوتة جديدة 📝
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards for Drafts */}
      <Grid container spacing={2} sx={{ mb: 3 }} className="no-print">
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #d97706', bgcolor: '#fffdf8' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    إجمالي المسودات المسجلة
                  </Typography>
                  <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5, color: '#92400e' }}>
                    {totalDraftsCount} مسودة
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    محفوظة بالداتابيز للرجوع إليها
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <StickyNote2 sx={{ color: '#d97706', fontSize: 26 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #16a34a', bgcolor: '#f8fdf9' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    إجمالي المبالغ التقديرية
                  </Typography>
                  <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5, color: '#15803d' }}>
                    {totalDraftsAmount.toLocaleString()} ج.م
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    قيمة كافة الطلبات بالمسودات
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MoneyIcon sx={{ color: '#16a34a', fontSize: 26 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #2563eb', bgcolor: '#f8faff' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    أصناف النوتات المطلوبة
                  </Typography>
                  <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5, color: '#1d4ed8' }}>
                    {aggregatedItemsData.length} صنف مختلف
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    إجمالي كميات: {aggGrandTotalQty} كجم/قطعة
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BagIcon sx={{ color: '#2563eb', fontSize: 26 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #7c3aed', bgcolor: '#faf5ff' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    مسودات اليوم ({todayStr})
                  </Typography>
                  <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5, color: '#6d28d9' }}>
                    {todayDraftsCount} مسودة
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    بقيمة: {todayDraftsAmount.toLocaleString()} ج.م
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarIcon sx={{ color: '#7c3aed', fontSize: 26 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ========================================================
          SECTION: AGGREGATED ITEMS TABLE (جدول الأصناف في كل النوتات)
          ======================================================== */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 2.5, 
          mb: 4, 
          borderRadius: '16px', 
          border: '1.5px solid #E2E8F0', 
          bgcolor: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}
        className="no-print"
      >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="h6" fontWeight="900" sx={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LayersIcon sx={{ color: '#d97706' }} />
                جدول إجمالي الأصناف والكميات في كافة المسودات والنوتات 📊
              </Typography>
              <Typography variant="caption" color="text.secondary">
                حصر مجمع لكافة الأصناف والكيلوهات المطلوبة في النوتات مع إمكانية التصفية بحسب التاريخ والبحث.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={handlePrintAggregatedReport}
              disabled={aggregatedItemsData.length === 0}
              sx={{
                borderRadius: '10px',
                fontWeight: 800,
                color: '#0F172A',
                borderColor: '#CBD5E1',
                '&:hover': { bgcolor: '#F8FAFC' }
              }}
            >
              طباعة كشف الأصناف المجمعة (PDF)
            </Button>
          </Box>

          {/* Filter Toolbar for the Aggregated Table */}
          <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
            <Grid xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث باسم الصنف..."
                value={aggSearchItem}
                onChange={(e) => setAggSearchItem(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                    endAdornment: aggSearchItem ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setAggSearchItem('')}><ClearIcon fontSize="small" /></IconButton>
                      </InputAdornment>
                    ) : null
                  }
                }}
                sx={{ bgcolor: '#FFFFFF', borderRadius: '8px' }}
              />
            </Grid>

            <Grid xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small" sx={{ bgcolor: '#FFFFFF', borderRadius: '8px' }}>
                <InputLabel>فترة التقرير والتاريخ</InputLabel>
                <Select
                  value={aggDatePreset}
                  label="فترة التقرير والتاريخ"
                  onChange={(e) => setAggDatePreset(e.target.value)}
                >
                  <MenuItem value="all">📅 كل الفترات (كافة المسودات)</MenuItem>
                  <MenuItem value="today">⭐ اليوم ({todayStr})</MenuItem>
                  <MenuItem value="yesterday">🕒 أمس</MenuItem>
                  <MenuItem value="week">📊 آخر 7 أيام</MenuItem>
                  <MenuItem value="month">🗓️ هذا الشهر</MenuItem>
                  <MenuItem value="custom">🔍 يوم مخصص...</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {aggDatePreset === 'custom' && (
              <Grid xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="اختر التاريخ"
                  value={aggCustomDate}
                  onChange={(e) => setAggCustomDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ bgcolor: '#FFFFFF', borderRadius: '8px' }}
                />
              </Grid>
            )}

            <Grid xs={12} sm={aggDatePreset === 'custom' ? 12 : 4} md={aggDatePreset === 'custom' ? 3 : 6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Chip
                label={`عدد الأصناف المحصورة: ${aggregatedItemsData.length} صنف | إجمالي: ${aggGrandTotalQty} كجم/قطعة`}
                sx={{ fontWeight: 800, bgcolor: '#FEF3C7', color: '#92400E' }}
              />
            </Grid>
          </Grid>

          {/* Table Container */}
          {aggregatedItemsData.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: '12px' }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                لا توجد أصناف مطابقة للفترة المحددة في المسودات المسجلة.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 60 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 200 }}>اسم الصنف</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>إجمالي العدد / الكمية</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>عدد النوتات المسجل بها</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>متوسط السعر</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 800 }}>إجمالي المبلغ التقديري</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregatedItemsData.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#F8FAFC' } }}>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                        {row.name}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${row.totalQty} ${row.unit}`}
                          size="small"
                          sx={{ fontWeight: 900, bgcolor: '#DBEAFE', color: '#1D4ED8', fontSize: '0.85rem' }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#64748B' }}>
                        {row.notesCount} مسودة
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>
                        {row.avgPrice > 0 ? `${row.avgPrice.toFixed(2)} ج.م` : '-'}
                      </TableCell>
                      <TableCell align="left" sx={{ fontWeight: 900, color: '#15803D', fontSize: '0.95rem' }}>
                        {row.totalAmount.toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Grand Totals Row */}
                  <TableRow sx={{ bgcolor: '#FEF3C7' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 900, color: '#92400E', fontSize: '0.95rem' }}>
                      الإجمالي الكلي لجميع الأصناف:
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900, color: '#92400E', fontSize: '1rem' }}>
                      {aggGrandTotalQty} (كجم / قطع)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#92400E' }}>
                      {allDrafts.length} مسودة
                    </TableCell>
                    <TableCell align="center">-</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 900, color: '#92400E', fontSize: '1.05rem' }}>
                      {aggGrandTotalAmount.toLocaleString()} ج.م
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

      {/* ========================================================
          SECTION: DRAFTS CARDS LIST (كروت المسودات)
          ======================================================== */}
      <Box>
          {/* Drafts Search and Filter Bar */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '16px', border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="ابحث في المسودات (باسم العميل، اسم الصنف، رقم الهاتف، الملاحظات)..."
                  value={draftSearchQuery}
                  onChange={(e) => setDraftSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                      endAdornment: draftSearchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setDraftSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                        </InputAdornment>
                      ) : null
                    }
                  }}
                  sx={{ borderRadius: '10px' }}
                />
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="تصفية بتاريخ المسودة"
                  value={draftDateFilter}
                  onChange={(e) => setDraftDateFilter(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              {draftDateFilter && (
                <Grid xs={12} sm={6} md={3}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={() => setDraftDateFilter('')}
                    sx={{ fontWeight: 'bold', color: 'error.main' }}
                  >
                    إلغاء فلتر التاريخ
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Cards Grid */}
          {filteredDrafts.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '2px dashed #FDE68A', bgcolor: '#FFFDF5' }}>
              <StickyNote2 sx={{ fontSize: 64, color: '#D97706', mb: 1.5 }} />
              <Typography variant="h6" fontWeight="bold" color="#92400E">
                لا توجد مسودات مطابقة للبحث أو الفلتر
              </Typography>
              <Typography variant="body2" color="#B45309" sx={{ mt: 0.5, mb: 2.5 }}>
                يمكنك كتابة وتسجيل أي طلبات أو أصناف بالكيلو والعدد في مسودة سريعة والرجوع إليها أو تحويلها لفاتورة في أي وقت.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCreateModal()}
                sx={{ borderRadius: '10px', fontWeight: 'bold', bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' } }}
              >
                إنشاء مسودة جديدة الآن 📝
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {filteredDrafts.map((draft) => (
                <Grid xs={12} sm={6} md={4} key={draft.id}>
                  <Card sx={{
                    borderRadius: '16px',
                    border: '1.5px solid #FDE68A',
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 24px rgba(217, 119, 6, 0.16)',
                      borderColor: '#F59E0B'
                    }
                  }}>
                    <CardContent sx={{ p: 2.5, pb: 1.5 }}>
                      {/* Card Header: Customer name & Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="900" color="#78350F" sx={{ lineHeight: 1.2 }}>
                            {draft.customer_name}
                          </Typography>
                          <Typography variant="caption" color="#92400E" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4, fontWeight: 700 }}>
                            <CalendarIcon sx={{ fontSize: 14 }} />
                            {draft.invoice_date?.split('T')[0] || todayStr}
                          </Typography>
                        </Box>
                        <Chip
                          icon={<StickyNote2 sx={{ fontSize: '14px !important' }} />}
                          label="مسودة 📝"
                          size="small"
                          sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 900 }}
                        />
                      </Box>

                      {draft.customer_phone && (
                        <Typography variant="caption" color="#78350F" sx={{ display: 'block', mb: 1.5, fontWeight: 700 }}>
                          📞 {draft.customer_phone}
                        </Typography>
                      )}

                      {/* Items List (الصنف، العدد، السعر، المبلغ) */}
                      {Array.isArray(draft.items) && draft.items.length > 0 ? (
                        <Box sx={{ p: 1.2, mb: 1.5, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" fontWeight="900" color="#475569" sx={{ display: 'block', mb: 0.8 }}>
                            الأصناف والكميات والأسعار:
                          </Typography>
                          <Stack spacing={0.8}>
                            {draft.items.map((it, i) => {
                              const itemQty = it.kilos || it.quantity || it.qty || 1;
                              const itemPrice = parseFloat(it.price || 0);
                              const itemTotal = parseFloat(it.total || (itemQty * itemPrice));
                              const unitLabel = it.kilos ? 'كجم' : 'عدد';

                              return (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, overflow: 'hidden' }}>
                                    <Typography variant="body2" fontWeight="800" color="#0F172A" noWrap>
                                      {it.product_name || it.description}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={`${itemQty} ${unitLabel}`}
                                      sx={{ height: 20, fontSize: '0.72rem', fontWeight: 800, bgcolor: '#FEF3C7', color: '#92400E' }}
                                    />
                                  </Box>
                                  <Box sx={{ textAlign: 'left', pl: 1 }}>
                                    <Typography variant="body2" fontWeight="900" color="#15803D">
                                      {itemTotal.toLocaleString()} ج.م
                                    </Typography>
                                    {itemPrice > 0 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                        ({itemPrice} ج.م / {unitLabel})
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.2, mb: 1.5, borderRadius: '8px', bgcolor: '#FFFDF5', border: '1px dashed #FDE68A' }}>
                          <Typography variant="caption" color="#B45309">
                            مسودة بدون تفاصيل أصناف محددة
                          </Typography>
                        </Box>
                      )}

                      {/* Notes Text */}
                      {draft.notes && (
                        <Box sx={{ p: 1.2, mb: 1.5, borderRadius: '8px', bgcolor: 'rgba(254, 243, 199, 0.4)', borderRight: '3px solid #F59E0B' }}>
                          <Typography variant="body2" color="#78350F" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                            💬 {draft.notes}
                          </Typography>
                        </Box>
                      )}

                      {/* Total Estimated Amount */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.2, borderTop: '1px dashed #E2E8F0' }}>
                        <Typography variant="body2" color="#78350F" fontWeight="bold">المبلغ المقدر:</Typography>
                        <Typography variant="h6" fontWeight="900" color="#15803D">
                          {parseFloat(draft.amount || 0).toLocaleString()} ج.م
                        </Typography>
                      </Box>
                    </CardContent>

                    {/* Actions Bar */}
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenCreateModal(draft)}
                          sx={{
                            borderRadius: '8px',
                            fontWeight: 800,
                            bgcolor: '#d97706',
                            '&:hover': { bgcolor: '#b45309' }
                          }}
                        >
                          تعديل النوتة ✏️
                        </Button>

                        <Tooltip title="مشاركة عبر واتساب">
                          <IconButton
                            size="small"
                            component="a"
                            href={getWhatsAppShareUrl(draft)}
                            target="_blank"
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#16A34A' }}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="طباعة النوتة">
                          <IconButton
                            size="small"
                            onClick={() => handlePrint(draft)}
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569' }}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="حذف النوتة من قاعدة البيانات">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteDraft(draft.id)}
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#DC2626' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

      {/* ========================================================
          DIALOG: ADD / EDIT DRAFT NOTE (نافذة إضافة مسودة سهلة وسريعة)
          ======================================================== */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.25rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StickyNote2 sx={{ color: '#D97706' }} />
          {editingDraftId ? 'تعديل المسودة / النوتة 📝' : 'إضافة مسودة / نوتة جديدة 📝'}
        </DialogTitle>

        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Customer name / Note title */}
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="اسم العميل أو عنوان النوتة (باسم مين؟)"
                placeholder="مثال: أمر الله، الحاج إبراهيم، طلب الحفلة..."
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                autoFocus
              />
            </Grid>

            {/* Note Date */}
            <Grid xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ المسودة"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Phone */}
            <Grid xs={12} sm={3}>
              <TextField
                fullWidth
                label="رقم الهاتف (اختياري)"
                placeholder="010..."
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
            </Grid>

            {/* ADD ITEM SECTION (Free text or autocomplete without touching inventory/products) */}
            <Grid xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFDF8', border: '1.5px solid #FDE68A' }}>
                <Typography variant="subtitle2" fontWeight="900" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#92400E', mb: 1.5 }}>
                  <Scale sx={{ fontSize: 20, color: '#D97706' }} />
                  إضافة أصناف النوتة (اكتب أي صنف بحرية أو اختر من القائمة):
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'center' }}>
                  <Autocomplete
                    freeSolo
                    sx={{ flex: { xs: '1 1 100%', md: 2.5 } }}
                    options={(products || []).map(p => p.name)}
                    value={newItem.product_name}
                    onInputChange={(e, val) => handleProductSelect(val)}
                    onChange={(e, val) => handleProductSelect(val || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="اسم الصنف (حر أو من القائمة)"
                        placeholder="اكتب أي صنف مثلاً: بصل، عجين، حواوشي..."
                      />
                    )}
                  />

                  <TextField
                    size="small"
                    type="number"
                    label="العدد / الوزن ⚖️"
                    placeholder="1"
                    sx={{ flex: { xs: '1 1 45%', md: 1.2 } }}
                    value={newItem.quantity}
                    onChange={(e) => handleItemQuantityChange(e.target.value)}
                    slotProps={{
                      htmlInput: { step: 'any', min: '0' },
                      input: {
                        endAdornment: <InputAdornment position="end">كجم/عدد</InputAdornment>
                      }
                    }}
                  />

                  <TextField
                    size="small"
                    type="number"
                    label="سعر الوحدة (ج.م)"
                    placeholder="0.00"
                    sx={{ flex: { xs: '1 1 45%', md: 1.2 } }}
                    value={newItem.price}
                    onChange={(e) => handleItemPriceChange(e.target.value)}
                    slotProps={{
                      htmlInput: { step: 'any', min: '0' },
                      input: {
                        endAdornment: <InputAdornment position="end">ج.م</InputAdornment>
                      }
                    }}
                  />

                  <Button
                    variant="contained"
                    onClick={handleAddItemToDraft}
                    disabled={!newItem.product_name.trim()}
                    startIcon={<AddIcon />}
                    sx={{
                      borderRadius: '8px',
                      px: 2.5,
                      py: 1,
                      whiteSpace: 'nowrap',
                      fontWeight: 'bold',
                      bgcolor: '#D97706',
                      '&:hover': { bgcolor: '#B45309' }
                    }}
                  >
                    + إضافة الصنف
                  </Button>
                </Box>

                {/* Table of added items */}
                {formData.items.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#FEF3C7' }}>
                          <TableCell sx={{ fontWeight: 800 }}>اسم الصنف</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>العدد / الوزن</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>سعر الوحدة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>حذف</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.items.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{item.product_name || item.description}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{item.kilos || item.quantity || item.qty}</TableCell>
                            <TableCell align="center">{parseFloat(item.price || 0).toLocaleString()} ج.م</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, color: '#15803D' }}>{parseFloat(item.total || 0).toLocaleString()} ج.م</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Notes */}
            <Grid xs={12} sm={8}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات المسودة"
                placeholder="أدخل أي تفاصيل خاصة بالطلب أو العنوان أو العميل..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>

            {/* Total Estimated Amount */}
            <Grid xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ المقدر الإجمالي (ج.م)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">ج.م</InputAdornment>,
                  }
                }}
                helperText="يُحسب تلقائياً من مجموع الأصناف"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
            إلغاء
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveDraft}
            startIcon={<CheckIcon />}
            disabled={loading}
            sx={{
              borderRadius: '10px',
              fontWeight: 900,
              px: 3,
              py: 1,
              bgcolor: '#D97706',
              '&:hover': { bgcolor: '#B45309' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'حفظ المسودة بالداتابيز 💾'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
