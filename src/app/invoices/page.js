'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Card, CardContent, Chip, IconButton, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Alert, CircularProgress, Divider, Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  WhatsApp as WhatsAppIcon,
  FilterAlt as FilterIcon,
  AttachMoney as MoneyIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  Replay as ReturnIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  PictureAsPdf
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { printCustomInvoice } from '@/lib/printReceipt';
import { generateReportPDF } from '@/lib/reportPdfExport';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function InvoicesPage() {
  const [tabValue, setTabValue] = useState(0);
  const { 
    invoices, 
    customInvoices, 
    loading, 
    fetchCustomInvoices, 
    addCustomInvoice, 
    updateCustomInvoice, 
    deleteCustomInvoice,
    fetchInvoices 
  } = useInvoiceStore();
  const { settings } = useSettingsStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const effectiveBranch = (user && user.role !== 'admin' && user.branch_id) ? user.branch_id : selectedBranchId;

  // Filters & State for Custom Invoices
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // New Invoice Modal Form State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [formData, setFormData] = useState({
    title: 'فاتورة تحصيل',
    customer_name: '',
    customer_phone: '',
    amount: '',
    paid_amount: '',
    remaining_amount: '0',
    payment_status: 'paid',
    payment_method: 'cash',
    invoice_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  });
  const [newItem, setNewItem] = useState({ description: '', qty: 1, price: '' });
  const [formError, setFormError] = useState('');

  // Printable View Dialog State
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Return dialog state for POS tab
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedPosItem, setSelectedPosItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [posSearchQuery, setPosSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomInvoices();
    fetchInvoices(100, effectiveBranch || 'all');
  }, [effectiveBranch, selectedBranchId, user]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // Auto calculate remaining when amount or paid_amount changes
  const handleAmountChange = (val, field) => {
    const updated = { ...formData, [field]: val };
    const amount = parseFloat(field === 'amount' ? val : updated.amount) || 0;
    const paid = parseFloat(field === 'paid_amount' ? val : updated.paid_amount) || 0;
    
    if (field === 'amount' && formData.paid_amount === '') {
      updated.paid_amount = val;
      updated.remaining_amount = '0';
      updated.payment_status = 'paid';
    } else {
      const rem = Math.max(0, amount - paid);
      updated.remaining_amount = rem.toString();
      if (rem === 0 && amount > 0) updated.payment_status = 'paid';
      else if (paid > 0 && rem > 0) updated.payment_status = 'partial';
      else if (paid === 0 && amount > 0) updated.payment_status = 'unpaid';
    }

    setFormData(updated);
  };

  const handleAddItemToInvoice = () => {
    if (!newItem.description || !newItem.price) return;
    const itemPrice = parseFloat(newItem.price) || 0;
    const itemQty = parseInt(newItem.qty) || 1;
    const itemTotal = itemPrice * itemQty;

    const items = [...formData.items, {
      description: newItem.description,
      qty: itemQty,
      price: itemPrice,
      total: itemTotal
    }];

    // Sum items total if user hasn't typed an overall amount manually or to sync
    const sum = items.reduce((acc, curr) => acc + curr.total, 0);
    setFormData({
      ...formData,
      items,
      amount: sum.toString(),
      paid_amount: sum.toString(),
      remaining_amount: '0',
      payment_status: 'paid'
    });
    setNewItem({ description: '', qty: 1, price: '' });
  };

  const handleRemoveItemFromInvoice = (index) => {
    const items = formData.items.filter((_, i) => i !== index);
    const sum = items.reduce((acc, curr) => acc + curr.total, 0);
    setFormData({
      ...formData,
      items,
      amount: sum > 0 ? sum.toString() : formData.amount,
      paid_amount: sum > 0 ? sum.toString() : formData.paid_amount,
    });
  };

  const handleOpenCreateModal = (inv = null) => {
    setFormError('');
    if (inv) {
      setEditingInvoiceId(inv.id);
      setFormData({
        title: inv.title || 'فاتورة تحصيل',
        customer_name: inv.customer_name || '',
        customer_phone: inv.customer_phone || '',
        amount: inv.amount ? inv.amount.toString() : '',
        paid_amount: inv.paid_amount ? inv.paid_amount.toString() : '',
        remaining_amount: inv.remaining_amount ? inv.remaining_amount.toString() : '0',
        payment_status: inv.payment_status || 'paid',
        payment_method: inv.payment_method || 'cash',
        invoice_date: inv.invoice_date ? inv.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: inv.notes || '',
        items: Array.isArray(inv.items) ? inv.items : []
      });
    } else {
      setEditingInvoiceId(null);
      setFormData({
        title: 'فاتورة تحصيل',
        customer_name: '',
        customer_phone: '',
        amount: '',
        paid_amount: '',
        remaining_amount: '0',
        payment_status: 'paid',
        payment_method: 'cash',
        invoice_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
      });
    }
    setCreateDialogOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!formData.customer_name.trim()) {
      setFormError('الرجاء إدخال اسم العميل أو الجهة (باسم كذا)');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('الرجاء إدخال مبلغ التحصيل (التحصيل كذا)');
      return;
    }
    if (!formData.invoice_date) {
      setFormError('الرجاء اختيار تاريخ الفاتورة (يوم كذا)');
      return;
    }

    if (editingInvoiceId) {
      const res = await updateCustomInvoice(editingInvoiceId, formData);
      if (res.success) {
        setCreateDialogOpen(false);
      } else {
        setFormError(res.error || 'حدث خطأ أثناء تعديل الفاتورة');
      }
    } else {
      const res = await addCustomInvoice(formData);
      if (res.success) {
        setCreateDialogOpen(false);
      } else {
        setFormError(res.error || 'حدث خطأ أثناء إضافة الفاتورة');
      }
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذه الفاتورة؟')) {
      await deleteCustomInvoice(id);
    }
  };

  const handleViewInvoiceDetails = (inv) => {
    setViewInvoice(inv);
    setViewDialogOpen(true);
  };

  const handlePrint = (invToPrint = null) => {
    const target = invToPrint || viewInvoice;
    if (target) {
      printCustomInvoice(target, settings);
    }
  };

  const getWhatsAppShareUrl = (inv) => {
    const text = `🧾 *مطعم البرادعي للحواوشي*
📌 *فاتورة رقم:* ${inv.invoice_number}
👤 *الاسم:* ${inv.customer_name}
📅 *التاريخ:* ${inv.invoice_date?.split('T')[0]}
💰 *مبلغ التحصيل:* ${inv.amount} ج.م
✅ *المدفوع:* ${inv.paid_amount} ج.م
🔻 *المتبقي:* ${inv.remaining_amount} ج.م
📝 *البيان:* ${inv.title} ${inv.notes ? `\n💬 *ملاحظات:* ${inv.notes}` : ''}`;
    return `https://wa.me/${inv.customer_phone ? '2' + inv.customer_phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;
  };

  // Filtered Custom Invoices
  const filteredCustomInvoices = customInvoices.filter((inv) => {
    const matchesSearch = 
      !searchQuery ||
      inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_phone?.includes(searchQuery);

    const matchesDate = !filterDate || inv.invoice_date?.startsWith(filterDate);
    const matchesStatus = filterStatus === 'all' || inv.payment_status === filterStatus;

    return matchesSearch && matchesDate && matchesStatus;
  });

  // Calculate Statistics
  const totalInvoicesCount = customInvoices.length;
  const totalAmountSum = customInvoices.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const totalPaidSum = customInvoices.reduce((acc, curr) => acc + (parseFloat(curr.paid_amount) || 0), 0);
  const totalRemainingSum = customInvoices.reduce((acc, curr) => acc + (parseFloat(curr.remaining_amount) || 0), 0);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCollectedSum = customInvoices
    .filter(inv => inv.invoice_date && inv.invoice_date.startsWith(todayStr))
    .reduce((acc, curr) => acc + (parseFloat(curr.paid_amount) || 0), 0);

  const getStatusChip = (status) => {
    switch (status) {
      case 'paid':
        return <Chip label="محصل بالكامل" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
      case 'partial':
        return <Chip label="تحصيل جزئي" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
      case 'unpaid':
        return <Chip label="غير محصل" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
      default:
        return <Chip label="مكتمل" color="default" size="small" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return '💵 كاش';
      case 'instapay': return '⚡ إنستا باي';
      case 'vodafone_cash': return '📱 فودافون كاش';
      case 'card':
      case 'visa': return '💳 شبكة / فيزا';
      case 'transfer': return '🏦 تحويل بنكي';
      default: return method || 'كاش';
    }
  };

  const handlePrintInvoicesReport = () => {
    const dataToPrint = filteredCustomInvoices;
    
    const stats = [
      { title: 'إجمالي الفواتير', value: `${totalAmountSum.toLocaleString()} ج.م (${totalInvoicesCount})` },
      { title: 'تحصيل اليوم', value: `${todayCollectedSum.toLocaleString()} ج.م` },
      { title: 'إجمالي المحصل', value: `${totalPaidSum.toLocaleString()} ج.م` },
      { title: 'المتبقي / الآجل', value: `${totalRemainingSum.toLocaleString()} ج.م` },
    ];

    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'رقم الفاتورة', accessor: 'invoice_number' },
      { label: 'العميل / الجهة (باسم كذا)', accessor: 'customer_name' },
      { label: 'البيان', accessor: 'title' },
      { label: 'التاريخ (يوم كذا)', accessor: (r) => r.invoice_date?.split('T')[0] || '' },
      { label: 'التحصيل الإجمالي', accessor: (r) => `${parseFloat(r.amount || 0).toLocaleString()} ج.م` },
      { label: 'المحصل', accessor: (r) => `${parseFloat(r.paid_amount || 0).toLocaleString()} ج.م` },
      { label: 'المتبقي', accessor: (r) => `${parseFloat(r.remaining_amount || 0).toLocaleString()} ج.م` },
      { label: 'طريقة الدفع', accessor: (r) => getPaymentMethodLabel(r.payment_method) },
      { label: 'الحالة', accessor: (r) => (r.payment_status === 'paid' ? 'محصل بالكامل' : r.payment_status === 'partial' ? 'تحصيل جزئي' : 'غير محصل') },
    ];

    const totals = {
      0: '',
      1: 'الإجمالي الكلي',
      2: '',
      3: '',
      4: '',
      5: `${totalAmountSum.toLocaleString()} ج.م`,
      6: `${totalPaidSum.toLocaleString()} ج.م`,
      7: `${totalRemainingSum.toLocaleString()} ج.م`,
      8: '',
      9: ''
    };

    generateReportPDF({
      title: 'تقرير الفواتير والتحصيل المالي',
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: 'الفرع الرئيسي',
      dateRangeStr: filterDate ? `يوم ${filterDate}` : 'كافة الفترات',
      stats,
      columns,
      data: dataToPrint,
      totals
    });
  };

  // Listen for Ctrl+P / Cmd+P shortcut to trigger clean isolated iframe printing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (viewInvoice) {
          printCustomInvoice(viewInvoice, settings);
        } else {
          handlePrintInvoicesReport();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewInvoice, filteredCustomInvoices, settings]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100%', overflowY: 'auto', pb: 8 }}>

      {/* Main Page Header */}
      <Box className="no-print" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ fontSize: 36 }} />
            الفواتير والتحصيل المالي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إنشاء وإدارة فواتير التحصيل لأي جهة أو عميل، مع إمكانية عرض الفواتير وطباعتها وتصفيتها.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Switch Control (كل الفروع / فرع عزت / فرع المسلة) */}
          <Paper elevation={0} sx={{ borderRadius: '14px', p: 0.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <Tabs
              value={selectedBranchId || 'all'}
              onChange={(e, val) => setSelectedBranchId(val)}
              sx={{
                minHeight: 38,
                '& .MuiTab-root': {
                  minHeight: 38,
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  borderRadius: '10px',
                  mx: 0.2,
                  px: 2,
                  color: '#64748B',
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: '#FFFFFF',
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
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

          <Button
            variant="outlined"
            size="large"
            startIcon={<PictureAsPdf />}
            onClick={handlePrintInvoicesReport}
            sx={{
              borderRadius: '12px',
              px: 2.5,
              py: 1.2,
              fontWeight: 'bold',
              borderColor: '#0F172A',
              color: '#0F172A',
              '&:hover': { bgcolor: '#F1F5F9', borderColor: '#0F172A' }
            }}
          >
            طباعة تقرير الفواتير (ERP A4)
          </Button>

          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateModal()}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              fontWeight: 'bold',
              boxShadow: '0 8px 20px rgba(66, 133, 244, 0.3)',
              background: 'linear-gradient(135deg, #4285F4 0%, #1967D2 100%)'
            }}
          >
            عمل فاتورة جديدة
          </Button>
        </Stack>
      </Box>

      {/* Stats KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }} className="no-print">
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', borderRight: '4px solid #4285F4' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    إجمالي الفواتير
                  </Typography>
                  <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5 }}>
                    {totalAmountSum.toLocaleString()} ج.م
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight="bold">
                    {totalInvoicesCount} فاتورة مسجلة
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(66,133,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReceiptIcon color="primary" sx={{ fontSize: 28 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', borderRight: '4px solid #2E7D32' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    تحصيل اليوم
                  </Typography>
                  <Typography variant="h5" fontWeight="900" color="success.main" sx={{ mt: 0.5 }}>
                    {todayCollectedSum.toLocaleString()} ج.م
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ اليوم: {todayStr}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(46,125,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MoneyIcon color="success" sx={{ fontSize: 28 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', borderRight: '4px solid #1565C0' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    إجمالي المحصّل
                  </Typography>
                  <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5, color: '#1565C0' }}>
                    {totalPaidSum.toLocaleString()} ج.م
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    المبالغ المستلمة بالخزنة
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(21,101,192,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon sx={{ color: '#1565C0', fontSize: 28 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', borderRight: '4px solid #D32F2F' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">
                    المتبقي / الآجل
                  </Typography>
                  <Typography variant="h5" fontWeight="900" color="error.main" sx={{ mt: 0.5 }}>
                    {totalRemainingSum.toLocaleString()} ج.م
                  </Typography>
                  <Typography variant="caption" color="error.main" fontWeight="bold">
                    مبالغ متبقية للتحصيل
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'rgba(211,47,47,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PendingIcon color="error" sx={{ fontSize: 28 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%', mb: 2, borderRadius: '12px' }} className="no-print">
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary" 
          textColor="primary" 
          variant="fullWidth"
          sx={{ '& .MuiTab-root': { fontWeight: 'bold', fontSize: '1rem' } }}
        >
          <Tab label="سجل الفواتير والتحصيل" />
          <Tab label="فواتير طلبات المطعم (POS)" />
          <Tab label="مرتجعات المنتجات" />
        </Tabs>
      </Paper>

      {/* TAB 0: Custom Invoices & Collections */}
      <TabPanel value={tabValue} index={0} className="no-print">
        {/* Filters bar */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: '16px', bgcolor: 'background.paper' }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="بحث باسم العميل (باسم كذا)، رقم الفاتورة، أو البيان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الفاتورة (يوم كذا)"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>حالة التحصيل</InputLabel>
                <Select
                  value={filterStatus}
                  label="حالة التحصيل"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">كل الحالات</MenuItem>
                  <MenuItem value="paid">محصل بالكامل</MenuItem>
                  <MenuItem value="partial">تحصيل جزئي</MenuItem>
                  <MenuItem value="unpaid">غير محصل</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setSearchQuery('');
                  setFilterDate('');
                  setFilterStatus('all');
                  fetchCustomInvoices();
                }}
                sx={{ borderRadius: '10px', py: 1.5 }}
              >
                إعادة ضبط
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Table of Custom Invoices */}
        <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: '900' }}>رقم الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>اسم العميل / الجهة (باسم كذا)</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>البيان / الوصف</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>التاريخ (يوم كذا)</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>التحصيل (المبلغ)</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>المحصل والـمتبقي</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>طريقة الدفع</TableCell>
                <TableCell sx={{ fontWeight: '900' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: '900' }} align="center">إجراءات وطباعة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>جاري تحميل الفواتير...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredCustomInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">لا توجد فواتير مطابقة للبحث</Typography>
                    <Typography variant="caption" color="text.secondary">اضغط على "عمل فاتورة جديدة" لإضافة فاتورة تحصيل جديدة</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomInvoices.map((inv) => (
                  <TableRow key={inv.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {inv.customer_name}
                      {inv.customer_phone && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          📞 {inv.customer_phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{inv.title || 'فاتورة تحصيل'}</TableCell>
                    <TableCell>{inv.invoice_date?.split('T')[0]}</TableCell>
                    <TableCell sx={{ fontWeight: '900', fontSize: '1.05rem', color: '#1A1A2E' }}>
                      {parseFloat(inv.amount).toLocaleString()} ج.م
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        محصل: {parseFloat(inv.paid_amount).toLocaleString()} ج.م
                      </Typography>
                      {parseFloat(inv.remaining_amount) > 0 && (
                        <Typography variant="caption" color="error.main" fontWeight="bold" display="block">
                          متبقي: {parseFloat(inv.remaining_amount).toLocaleString()} ج.م
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={getPaymentMethodLabel(inv.payment_method)} variant="outlined" size="small" />
                    </TableCell>
                    <TableCell>{getStatusChip(inv.payment_status)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                        <Tooltip title="معاينة وطباعة الفاتورة">
                          <IconButton color="primary" size="small" onClick={() => handleViewInvoiceDetails(inv)}>
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>

                        {inv.customer_phone && (
                          <Tooltip title="إرسال عبر واتساب">
                            <IconButton 
                              color="success" 
                              size="small" 
                              component="a" 
                              href={getWhatsAppShareUrl(inv)} 
                              target="_blank"
                            >
                              <WhatsAppIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="تعديل الفاتورة">
                          <IconButton color="info" size="small" onClick={() => handleOpenCreateModal(inv)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="حذف الفاتورة">
                          <IconButton color="error" size="small" onClick={() => handleDeleteInvoice(inv.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TAB 1: POS Orders Invoices */}
      <TabPanel value={tabValue} index={1} className="no-print">
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          سجل فواتير طلبات المبيعات بالـ POS ({invoices.length} فاتورة)
        </Typography>
        <TableContainer component={Paper} sx={{ borderRadius: '16px' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>رقم الطلب / الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>نوع الطلب</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>اسم العميل</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ والوقت</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الإجمالي</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>طريقة الدفع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">عرض الفاتورة والطباعة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>لا توجد طلبات سابقة</TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {inv.invoiceNumber || `INV-${inv.orderNumber}`}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={inv.orderType === 'dine_in' ? 'صالة' : inv.orderType === 'takeaway' ? 'تيك أواي' : 'دليفري'} 
                        color={inv.orderType === 'delivery' ? 'warning' : inv.orderType === 'dine_in' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{inv.customerName || 'عميل نقدي'}</TableCell>
                    <TableCell>{inv.createdAt ? new Date(inv.createdAt).toLocaleString('ar-EG') : '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{inv.total} ج.م</TableCell>
                    <TableCell>{getPaymentMethodLabel(inv.paymentMethod)}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={() => handleViewInvoiceDetails({
                          invoice_number: inv.invoiceNumber,
                          customer_name: inv.customerName || 'عميل نقدي',
                          customer_phone: inv.customerPhone,
                          amount: inv.total,
                          paid_amount: inv.paidAmount || inv.total,
                          remaining_amount: inv.remainingAmount || 0,
                          payment_status: 'paid',
                          payment_method: inv.paymentMethod || 'cash',
                          invoice_date: inv.createdAt ? inv.createdAt.split('T')[0] : todayStr,
                          title: `طلب مطعم (${inv.orderType === 'dine_in' ? 'صالة' : inv.orderType === 'takeaway' ? 'تيك أواي' : 'دليفري'})`,
                          items: inv.items?.map(i => ({ description: i.name || i.product_name, qty: i.quantity, price: i.price, total: i.price * i.quantity })) || []
                        })}
                      >
                        معاينة وطباعة
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TAB 2: Returns */}
      <TabPanel value={tabValue} index={2} className="no-print">
        <Box sx={{ mb: 3 }}>
          <TextField
            placeholder="بحث برقم الفاتورة لإرجاع عنصر..."
            variant="outlined"
            value={posSearchQuery}
            onChange={(e) => setPosSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }
            }}
            sx={{ width: '400px' }}
          />
        </Box>
        <Typography color="text.secondary" align="center" sx={{ my: 4 }}>
          أدخل رقم الفاتورة أو اختر طلب لعرض عناصره وإجراء المرتجع
        </Typography>
      </TabPanel>

      {/* CREATE / EDIT INVOICE DIALOG */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: '900', fontSize: '1.3rem', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          {editingInvoiceId ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة (تحصيل / بيع / خدمة)'}
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="اسم العميل أو الجهة (باسم كذا)"
                placeholder="مثال: شركة الأمل / أحمد محمود / مطعم..."
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                required
                label="تاريخ الفاتورة (يوم كذا)"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="عنوان / بيان الفاتورة"
                placeholder="مثال: توريد مواد / صيانة / تحصيل خدمات..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهاتف (اختياري للإرسال واتساب)"
                placeholder="01012345678"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="مبلغ التحصيل (التحصيل كذا)"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value, 'amount')}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">ج.م</InputAdornment>,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ المحصل فعلياً (المدفوع)"
                value={formData.paid_amount}
                onChange={(e) => handleAmountChange(e.target.value, 'paid_amount')}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">ج.م</InputAdornment>,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                disabled
                type="number"
                label="المبلغ المتبقي (الآجل)"
                value={formData.remaining_amount}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">ج.م</InputAdornment>,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>طريقة الدفع</InputLabel>
                <Select
                  value={formData.payment_method}
                  label="طريقة الدفع"
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                >
                  <MenuItem value="cash">💵 نقداً (كاش)</MenuItem>
                  <MenuItem value="instapay">⚡ إنستا باي (InstaPay)</MenuItem>
                  <MenuItem value="vodafone_cash">📱 فودافون كاش (Vodafone Cash)</MenuItem>
                  <MenuItem value="card">💳 شبكة / فيزا (Card)</MenuItem>
                  <MenuItem value="transfer">🏦 تحويل بنكي</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>حالة التحصيل</InputLabel>
                <Select
                  value={formData.payment_status}
                  label="حالة التحصيل"
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                >
                  <MenuItem value="paid">محصل بالكامل</MenuItem>
                  <MenuItem value="partial">تحصيل جزئي</MenuItem>
                  <MenuItem value="unpaid">غير محصل (آجل)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات وتفاصيل الفاتورة"
                placeholder="أدخل أي ملاحظات تفصيلية هنا..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>

            {/* Optional detailed items section */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
                إضافة بنود تفصيلية للفاتورة (اختياري)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  label="وصف البند / الصنف"
                  sx={{ flex: 2 }}
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
                <TextField
                  size="small"
                  type="number"
                  label="الكمية"
                  sx={{ flex: 1 }}
                  value={newItem.qty}
                  onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                />
                <TextField
                  size="small"
                  type="number"
                  label="سعر الوحـدة"
                  sx={{ flex: 1 }}
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleAddItemToInvoice}
                  sx={{ borderRadius: '8px' }}
                >
                  إضافة
                </Button>
              </Box>

              {formData.items.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1, borderRadius: '12px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>البند</TableCell>
                        <TableCell>الكمية</TableCell>
                        <TableCell>سعر الوحدة</TableCell>
                        <TableCell>الإجمالي</TableCell>
                        <TableCell align="center">حذف</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{item.price} ج.م</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{item.total} ج.م</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveItemFromInvoice(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} variant="outlined">
            إلغاء
          </Button>
          <Button 
            onClick={handleSaveInvoice} 
            variant="contained" 
            size="large"
            disabled={loading}
            sx={{ px: 4, borderRadius: '10px', fontWeight: 'bold' }}
          >
            {loading ? 'جاري الحفظ...' : editingInvoiceId ? 'حفظ التعديلات' : 'حفظ وإصدار الفاتورة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PRINTABLE INVOICE VIEW DIALOG */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 2 } } }}
      >
        <DialogTitle className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">معاينة وطباعة الفاتورة</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => printCustomInvoice(viewInvoice, settings, true)}
              sx={{ borderRadius: '10px' }}
            >
              طابعة ريسيت (80mm)
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={() => printCustomInvoice(viewInvoice, settings, false)}
              sx={{ borderRadius: '10px' }}
            >
              طباعة فاتورة (A4)
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {viewInvoice && (
            <Box id="printable-invoice" sx={{ bgcolor: '#fff', color: '#1A1A2E', p: 2 }}>
              {/* Receipt Header */}
              <Box sx={{ textAlign: 'center', pb: 2, mb: 2, borderBottom: '2px dashed #CBD5E1' }}>
                <Typography variant="h5" fontWeight="900" sx={{ color: '#1E293B', mb: 0.5 }}>
                  {settings?.company_name || 'مطعم البرادعي للحواوشي'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {settings?.company_address || 'المحل الرئيسي'} | هاتف: {settings?.company_phone || '01012345678'}
                </Typography>
                <Typography variant="h6" fontWeight="800" sx={{ mt: 1.5, color: '#4285F4' }}>
                  فاتورة تحصيل مالي
                </Typography>
              </Box>

              {/* Invoice Meta Grid */}
              <Grid container spacing={1.5} sx={{ mb: 2, bgcolor: '#F8FAFC', p: 1.5, borderRadius: '12px' }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">رقم الفاتورة:</Typography>
                  <Typography variant="body2" fontWeight="bold">{viewInvoice.invoice_number}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">التاريخ (يوم كذا):</Typography>
                  <Typography variant="body2" fontWeight="bold">{viewInvoice.invoice_date?.split('T')[0]}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">اسم العميل / الجهة (باسم كذا):</Typography>
                  <Typography variant="body2" fontWeight="bold">{viewInvoice.customer_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">الهاتف:</Typography>
                  <Typography variant="body2" fontWeight="bold">{viewInvoice.customer_phone || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">البيان / الوصف:</Typography>
                  <Typography variant="body2" fontWeight="bold">{viewInvoice.title || 'فاتورة تحصيل'}</Typography>
                </Grid>
              </Grid>

              {/* Items List if any */}
              {Array.isArray(viewInvoice.items) && viewInvoice.items.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>تفاصيل البنود:</Typography>
                  <Table size="small" sx={{ border: '1px solid #E2E8F0' }}>
                    <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>البند</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>الكمية</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>السعر</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewInvoice.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{item.price} ج.م</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{item.total} ج.م</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* Financial Totals Block */}
              <Box sx={{ bgcolor: '#F1F5F9', p: 2, borderRadius: '12px', mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1" fontWeight="bold">مبلغ التحصيل الإجمالي:</Typography>
                  <Typography variant="h6" fontWeight="900">{parseFloat(viewInvoice.amount).toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                  <Typography variant="body2" fontWeight="bold">المبلغ المستلم (المحصل):</Typography>
                  <Typography variant="body1" fontWeight="bold">{parseFloat(viewInvoice.paid_amount).toLocaleString()} ج.م</Typography>
                </Box>
                {parseFloat(viewInvoice.remaining_amount) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                    <Typography variant="body2" fontWeight="bold">المبلغ المتبقي (الآجل):</Typography>
                    <Typography variant="body1" fontWeight="bold">{parseFloat(viewInvoice.remaining_amount).toLocaleString()} ج.م</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">طريقة الدفع: {getPaymentMethodLabel(viewInvoice.payment_method)}</Typography>
                  {getStatusChip(viewInvoice.payment_status)}
                </Box>
              </Box>

              {viewInvoice.notes && (
                <Box sx={{ mb: 2, p: 1.5, borderLeft: '3px solid #4285F4', bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary">ملاحظات:</Typography>
                  <Typography variant="body2">{viewInvoice.notes}</Typography>
                </Box>
              )}

              {/* Receipt Footer & Signatures */}
              <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                <Box>
                  <Typography variant="caption" display="block">توقيع الموظف / المسؤول</Typography>
                  <Box sx={{ mt: 3, width: 100, borderBottom: '1px solid #94A3B8' }} />
                </Box>
                <Box>
                  <Typography variant="caption" display="block">توقيع المستلم / العميل</Typography>
                  <Box sx={{ mt: 3, width: 100, borderBottom: '1px solid #94A3B8' }} />
                </Box>
              </Box>

              <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 3 }}>
                شكراً لتعاملكم معنا!
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions className="no-print" sx={{ p: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} variant="outlined">إغلاق</Button>
          <Button onClick={() => printCustomInvoice(viewInvoice, settings, true)} variant="outlined" startIcon={<PrintIcon />}>
            طابعة حرارية (80mm)
          </Button>
          <Button onClick={() => printCustomInvoice(viewInvoice, settings, false)} variant="contained" startIcon={<PrintIcon />}>
            طباعة فاتورة (A4)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
