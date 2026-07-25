'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from '@mui/material';
import {
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  ReceiptLong,
  Payment,
  Store,
  Add,
  CheckCircle,
  HourglassTop,
  Warning,
  Search,
  LocalShipping,
  AssignmentTurnedIn,
  PictureAsPdf,
  FileDownload,
} from '@mui/icons-material';
import { useFinancesStore } from '@/store/useFinancesStore';
import { useBranchStore } from '@/store/useBranchStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function FinancesPage() {
  const { purchases, expenses, selectedBranchId, setSelectedBranchId, addPurchase, recordPayment, addExpense } =
    useFinancesStore();
  const { branches, fetchBranches } = useBranchStore();

  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [openPurchaseDialog, setOpenPurchaseDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  // System Registered Branches Dynamic Options
  const availableBranches = useMemo(() => {
    return Array.isArray(branches) && branches.length > 0
      ? branches
      : [
          { id: 'b1', name: 'الفرع الأول - الرئيسي' },
          { id: 'b2', name: 'الفرع الثاني' },
        ];
  }, [branches]);

  const branchFilterOptions = useMemo(() => {
    return [{ id: 'all', name: 'جميع الفروع' }, ...availableBranches];
  }, [availableBranches]);

  // Form State: New Purchase
  const [purchaseForm, setPurchaseForm] = useState({
    branch_id: availableBranches[0]?.id || 'b1',
    supplier_name: '',
    item_name: '',
    quantity: 1,
    unit: 'كجم',
    cost_per_unit: 0,
    total_amount: 0,
    paid_amount: 0,
    payment_status: 'paid',
    notes: '',
  });

  // Form State: New Expense
  const [expenseForm, setExpenseForm] = useState({
    branch_id: availableBranches[0]?.id || 'b1',
    title: '',
    category: 'مرافق وخدمات',
    amount: '',
    payment_method: 'كاش الخزنة',
    notes: '',
  });

  useEffect(() => {
    if (availableBranches.length > 0) {
      setPurchaseForm((prev) => ({ ...prev, branch_id: prev.branch_id || availableBranches[0].id }));
      setExpenseForm((prev) => ({ ...prev, branch_id: prev.branch_id || availableBranches[0].id }));
    }
  }, [availableBranches]);

  // Filtered lists by selected branch
  const filteredPurchases = useMemo(() => {
    return purchases.filter((item) => {
      const matchBranch = selectedBranchId === 'all' || item.branch_id === selectedBranchId;
      const matchSearch =
        !searchTerm ||
        item.supplier_name.includes(searchTerm) ||
        item.item_name.includes(searchTerm) ||
        (item.branch_name && item.branch_name.includes(searchTerm));
      return matchBranch && matchSearch;
    });
  }, [purchases, selectedBranchId, searchTerm]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchBranch = selectedBranchId === 'all' || item.branch_id === selectedBranchId;
      const matchSearch =
        !searchTerm ||
        item.title.includes(searchTerm) ||
        item.category.includes(searchTerm);
      return matchBranch && matchSearch;
    });
  }, [expenses, selectedBranchId, searchTerm]);

  // Financial Metrics Calculations
  const metrics = useMemo(() => {
    const totalPurchasesCost = filteredPurchases.reduce((acc, i) => acc + (parseFloat(i.total_amount) || 0), 0);
    const totalPurchasesPaid = filteredPurchases.reduce((acc, i) => acc + (parseFloat(i.paid_amount) || 0), 0);
    const totalPurchasesOwed = filteredPurchases.reduce((acc, i) => acc + (parseFloat(i.remaining_amount) || 0), 0);
    const totalOpExpenses = filteredExpenses.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);

    const estimatedRevenue = selectedBranchId === 'b2' ? 78500 : selectedBranchId === 'b1' ? 142000 : 220500;
    const totalOutflowPaid = totalPurchasesPaid + totalOpExpenses;
    const netProfit = estimatedRevenue - totalOutflowPaid;

    return {
      totalPurchasesCost,
      totalPurchasesPaid,
      totalPurchasesOwed,
      totalOpExpenses,
      estimatedRevenue,
      netProfit,
    };
  }, [filteredPurchases, filteredExpenses, selectedBranchId]);

  // Supplier balances summary
  const supplierBalances = useMemo(() => {
    const map = {};
    filteredPurchases.forEach((p) => {
      if (!map[p.supplier_name]) {
        map[p.supplier_name] = {
          name: p.supplier_name,
          totalBought: 0,
          totalPaid: 0,
          totalOwed: 0,
          invoicesCount: 0,
        };
      }
      map[p.supplier_name].totalBought += parseFloat(p.total_amount) || 0;
      map[p.supplier_name].totalPaid += parseFloat(p.paid_amount) || 0;
      map[p.supplier_name].totalOwed += parseFloat(p.remaining_amount) || 0;
      map[p.supplier_name].invoicesCount += 1;
    });
    return Object.values(map);
  }, [filteredPurchases]);

  // Handle Export Excel (CSV UTF-8 with BOM for Excel Arabic support)
  const handleExportExcel = () => {
    let exportData = [];
    let fileName = 'تقرير_مالي';

    if (tabValue === 0) {
      fileName = 'فواتير_المشتريات';
      exportData = filteredPurchases.map((p) => ({
        'الفرع': p.branch_name || '',
        'المورد': p.supplier_name || '',
        'الخامة': p.item_name || '',
        'الكمية': p.quantity || 0,
        'الوحدة': p.unit || '',
        'سعر الوحدة': p.cost_per_unit || 0,
        'إجمالي الفاتورة': p.total_amount || 0,
        'المدفوع كاش': p.paid_amount || 0,
        'المتبقي علينا': p.remaining_amount || 0,
        'حالة السداد': p.payment_status === 'paid' ? 'مسدد' : p.payment_status === 'credit' ? 'آجل' : 'جزئي',
        'ملاحظات': p.notes || '',
      }));
    } else if (tabValue === 1) {
      fileName = 'المصروفات_التشغيلية';
      exportData = filteredExpenses.map((e) => ({
        'الفرع': e.branch_name || '',
        'بيان المصروف': e.title || '',
        'الفئة': e.category || '',
        'المبلغ': e.amount || 0,
        'طريقة الدفع': e.payment_method || '',
        'التاريخ': e.expense_date || '',
        'ملاحظات': e.notes || '',
      }));
    } else {
      fileName = 'كشف_مديونيات_الموردين';
      exportData = supplierBalances.map((s) => ({
        'اسم المورد': s.name,
        'عدد الفواتير': s.invoicesCount,
        'إجمالي التوريدات': s.totalBought,
        'المسدد كاش': s.totalPaid,
        'الرصيد المتبقي علينا': s.totalOwed,
      }));
    }

    if (exportData.length === 0) return;

    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData
      .map((row) =>
        Object.values(row)
          .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const csvContent = '\uFEFF' + headers + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Export / Print PDF Report
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const branchName = branchFilterOptions.find((b) => b.id === selectedBranchId)?.name || 'جميع الفروع';

    const content = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير دفتر الإيرادات والمصروفات - مطعم البرادعي</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 25px; color: #1A1A2E; direction: rtl; background: #FFF; }
          h1 { text-align: center; color: #1E40AF; margin-bottom: 5px; font-size: 24px; font-weight: 900; }
          .subtitle { text-align: center; color: #64748B; font-size: 13px; margin-bottom: 20px; }
          
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .summary-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; text-align: center; }
          .summary-title { font-size: 11px; color: #64748B; font-weight: 700; }
          .summary-val { font-size: 17px; font-weight: 900; color: #1E293B; margin-top: 4px; }

          h2 { color: #1E293B; font-size: 16px; border-right: 4px solid #3B82F6; padding-right: 10px; margin-top: 25px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: right; font-size: 12px; }
          th { background-color: #F1F5F9; color: #1E293B; font-weight: 800; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .owed { color: #DC2626; font-weight: 800; }
          .paid { color: #059669; font-weight: 800; }

          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>📊 تقرير دفتر الإيرادات والمصروفات والديون</h1>
        <div class="subtitle">مطعم البرادعي POS | ${branchName} | تاريخ: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-title">إجمالي إيرادات المبيعات</div>
            <div class="summary-val">${metrics.estimatedRevenue.toLocaleString()} ج.م</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">المشتريات والمصروفات</div>
            <div class="summary-val">${(metrics.totalPurchasesCost + metrics.totalOpExpenses).toLocaleString()} ج.م</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">مستحقات الموردين ("علينا")</div>
            <div class="summary-val" style="color:#DC2626;">${metrics.totalPurchasesOwed.toLocaleString()} ج.م</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">صافي التدفق كاش</div>
            <div class="summary-val" style="color:#059669;">${metrics.netProfit.toLocaleString()} ج.م</div>
          </div>
        </div>

        <h2>📦 فواتير مشتريات الخامات</h2>
        <table>
          <thead>
            <tr>
              <th>الفرع</th>
              <th>المورد</th>
              <th>الخامة</th>
              <th>الكمية</th>
              <th>إجمالي الفاتورة</th>
              <th>المدفوع كاش</th>
              <th>المتبقي ("علينا")</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPurchases
              .map(
                (p) => `
              <tr>
                <td>${p.branch_name || ''}</td>
                <td>${p.supplier_name || ''}</td>
                <td>${p.item_name || ''}</td>
                <td>${p.quantity} ${p.unit}</td>
                <td>${(parseFloat(p.total_amount) || 0).toLocaleString()} ج.م</td>
                <td>${(parseFloat(p.paid_amount) || 0).toLocaleString()} ج.م</td>
                <td class="${parseFloat(p.remaining_amount) > 0 ? 'owed' : 'paid'}">${(parseFloat(p.remaining_amount) || 0).toLocaleString()} ج.م</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <h2>💸 المصروفات التشغيلية والنثريات</h2>
        <table>
          <thead>
            <tr>
              <th>الفرع</th>
              <th>بيان المصروف</th>
              <th>الفئة</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses
              .map(
                (e) => `
              <tr>
                <td>${e.branch_name || ''}</td>
                <td>${e.title || ''}</td>
                <td>${e.category || ''}</td>
                <td>${(parseFloat(e.amount) || 0).toLocaleString()} ج.م</td>
                <td>${e.payment_method || ''}</td>
                <td>${e.expense_date || ''}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">تم استخراج هذا التقرير تلقائياً بواسطة نظام البرادعي إدارة POS</div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Handle Form Change for New Purchase
  const handlePurchaseCalc = (field, val) => {
    const updated = { ...purchaseForm, [field]: val };
    const q = parseFloat(updated.quantity) || 0;
    const c = parseFloat(updated.cost_per_unit) || 0;

    if (field === 'quantity' || field === 'cost_per_unit') {
      updated.total_amount = q * c;
      if (updated.payment_status === 'paid') {
        updated.paid_amount = updated.total_amount;
      }
    }

    if (field === 'payment_status') {
      if (val === 'paid') updated.paid_amount = updated.total_amount;
      if (val === 'credit') updated.paid_amount = 0;
    }

    setPurchaseForm(updated);
  };

  const handleSavePurchase = async () => {
    if (!purchaseForm.supplier_name.trim() || !purchaseForm.item_name.trim()) return;

    const bName = availableBranches.find((b) => b.id === purchaseForm.branch_id)?.name || availableBranches[0]?.name || 'الفرع الرئيسي';

    await addPurchase({
      ...purchaseForm,
      branch_name: bName,
    });

    setOpenPurchaseDialog(false);
    setPurchaseForm({
      branch_id: availableBranches[0]?.id || 'b1',
      supplier_name: '',
      item_name: '',
      quantity: 1,
      unit: 'كجم',
      cost_per_unit: 0,
      total_amount: 0,
      paid_amount: 0,
      payment_status: 'paid',
      notes: '',
    });
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.title.trim() || !expenseForm.amount) return;

    const bName = availableBranches.find((b) => b.id === expenseForm.branch_id)?.name || availableBranches[0]?.name || 'الفرع الرئيسي';

    await addExpense({
      ...expenseForm,
      branch_name: bName,
    });

    setOpenExpenseDialog(false);
    setExpenseForm({
      branch_id: availableBranches[0]?.id || 'b1',
      title: '',
      category: 'مرافق وخدمات',
      amount: '',
      payment_method: 'كاش الخزنة',
      notes: '',
    });
  };

  const handleOpenPayDialog = (item) => {
    setSelectedPurchase(item);
    setPaymentAmount(item.remaining_amount);
    setOpenPayDialog(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPurchase || !paymentAmount) return;
    await recordPayment(selectedPurchase.id, paymentAmount);
    setOpenPayDialog(false);
    setSelectedPurchase(null);
    setPaymentAmount('');
  };

  const getStatusChip = (status, remaining) => {
    if (status === 'paid' || remaining <= 0) {
      return <Chip icon={<CheckCircle sx={{ fontSize: '15px !important' }} />} label="مسدد بالكامل" size="small" sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 800, fontSize: '0.72rem' }} />;
    }
    if (status === 'credit') {
      return <Chip icon={<Warning sx={{ fontSize: '15px !important' }} />} label="آجل بالكامل" size="small" sx={{ bgcolor: '#FEE2E2', color: '#991B1B', fontWeight: 800, fontSize: '0.72rem' }} />;
    }
    return <Chip icon={<HourglassTop sx={{ fontSize: '15px !important' }} />} label="مدفوع جزئياً" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 800, fontSize: '0.72rem' }} />;
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflowY: 'auto' }}>
      {/* Top Header, Branch Filter & Print/Export Bar */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1A1A2E', fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
            دفتر الإيرادات والمصروفات وخواتيم الحسابات
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mt: 0.3 }}>
            تتبع مبيعات الفروع، أسعار خامات التوريد (كاش وآجل)، ومستحقات الموردين ("علينا كام ولنا كام")
          </Typography>
        </Box>

        {/* Action Controls & Export Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Branch Selector */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 }, flex: { xs: 1, sm: 'none' } }}>
            <Select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              startAdornment={<Store sx={{ color: '#4285F4', ml: 1, fontSize: 20 }} />}
              sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#FFF', fontSize: '0.85rem' }}
            >
              {branchFilterOptions.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Export PDF Button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdf sx={{ color: '#EF4444' }} />}
            onClick={handleExportPDF}
            sx={{
              borderRadius: '10px',
              fontWeight: 800,
              bgcolor: '#FFF',
              borderColor: '#FECACA',
              color: '#B91C1C',
              fontSize: '0.8rem',
              py: 0.8,
              px: 1.5,
              '&:hover': { bgcolor: '#FEF2F2', borderColor: '#EF4444' },
            }}
          >
            طباعة PDF
          </Button>

          {/* Export Excel Button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownload sx={{ color: '#10B981' }} />}
            onClick={handleExportExcel}
            sx={{
              borderRadius: '10px',
              fontWeight: 800,
              bgcolor: '#FFF',
              borderColor: '#A7F3D0',
              color: '#047857',
              fontSize: '0.8rem',
              py: 0.8,
              px: 1.5,
              '&:hover': { bgcolor: '#ECFDF5', borderColor: '#10B981' },
            }}
          >
            تصدير Excel
          </Button>
        </Box>
      </Box>

      {/* KPI Financial Overview Cards - Responsive 2 Columns on Mobile, 4 Columns on Desktop */}
      <Grid container spacing={1.5}>
        {/* Total Revenues */}
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #BAE6FD', bgcolor: '#F0F9FF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 800, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                  إجمالي المبيعات
                </Typography>
                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                  <TrendingUp sx={{ fontSize: 18 }} />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0C4A6E', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {metrics.estimatedRevenue.toLocaleString()} <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>ج.م</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Raw Material & Purchases Cost */}
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #FFEDD5', bgcolor: '#FFF7ED', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 800, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                  المشتريات والمصروفات
                </Typography>
                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C' }}>
                  <TrendingDown sx={{ fontSize: 18 }} />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#7C2D12', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {(metrics.totalPurchasesCost + metrics.totalOpExpenses).toLocaleString()} <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>ج.م</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Outstanding Debts Owed to Suppliers ("علينا كام") */}
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1.5px solid #FCA5A5', bgcolor: '#FEF2F2', boxShadow: '0 2px 8px rgba(239,68,68,0.08)' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 900, fontSize: { xs: '0.72rem', sm: '0.82rem' } }}>
                  مستحقات الموردين ("علينا")
                </Typography>
                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                  <Warning sx={{ fontSize: 18 }} />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#991B1B', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {metrics.totalPurchasesOwed.toLocaleString()} <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>ج.م</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Profit & Cash Flow */}
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #A7F3D0', bgcolor: '#ECFDF5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
                  صافي التدفق كاش
                </Typography>
                <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <AccountBalanceWallet sx={{ fontSize: 18 }} />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#064E3B', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {metrics.netProfit.toLocaleString()} <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>ج.م</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs Header - Ultra-Smooth Scrollable for Mobile */}
      <Paper sx={{ borderRadius: '14px', border: '1px solid #E5E7EB', p: 0.5, bgcolor: '#FFFFFF' }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: { xs: '0.82rem', sm: '0.92rem' },
              borderRadius: '10px',
              minHeight: 44,
              py: 1,
              px: { xs: 1.5, sm: 2.5 },
              whiteSpace: 'nowrap',
            },
            '& .Mui-selected': {
              color: '#4285F4 !important',
              bgcolor: '#EFF6FF',
            },
          }}
        >
          <Tab label="فواتير خامات التوريد والآجل" icon={<LocalShipping sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="المصروفات التشغيلية والنثريات" icon={<ReceiptLong sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label='كشف مديونيات الموردين ("علينا كام ولنا كام")' icon={<AssignmentTurnedIn sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 1: Raw Material Purchases & Payment Status */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Controls Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="بحث باسم المورد أو الخامة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#9CA3AF', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 280 }, bgcolor: '#FFF', '& input': { fontSize: '0.85rem' } }}
            />

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenPurchaseDialog(true)}
              sx={{ bgcolor: '#4285F4', borderRadius: '12px', fontWeight: 800, px: 2.5, py: 0.9, fontSize: '0.85rem', width: { xs: '100%', sm: 'auto' } }}
            >
              تسجيل فاتورة توريد خامات
            </Button>
          </Box>

          {/* Raw Material Purchases Table */}
          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>الفرع</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>اسم المورد / الشركة</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>اسم الخامة والتوريد</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>الكمية والوحدة</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>إجمالي الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>المدفوع كاش</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>المتبقي ("علينا")</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>حالة السداد</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }} align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchases.map((row) => {
                  const remaining = parseFloat(row.remaining_amount) || 0;
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#4B5563', whiteSpace: 'nowrap' }}>{row.branch_name}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{row.supplier_name}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E40AF', whiteSpace: 'nowrap' }}>{row.item_name}</TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.quantity} {row.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{(parseFloat(row.total_amount) || 0).toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#10B981', whiteSpace: 'nowrap' }}>{(parseFloat(row.paid_amount) || 0).toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: remaining > 0 ? '#EF4444' : '#6B7280', whiteSpace: 'nowrap' }}>
                        {remaining > 0 ? `${remaining.toLocaleString()} ج.م` : '0 ج.م'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{getStatusChip(row.payment_status, remaining)}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        {remaining > 0 ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Payment sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenPayDialog(row)}
                            sx={{ borderRadius: '8px', color: '#EF4444', borderColor: '#FCA5A5', fontWeight: 800, fontSize: '0.75rem', py: 0.4, '&:hover': { bgcolor: '#FEE2E2' } }}
                          >
                            سداد دفعة
                          </Button>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 800 }}>
                            مكتملة ✓
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredPurchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#9CA3AF', fontWeight: 700 }}>
                      لا توجد فواتير توريد خامات مسجلة حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Tab 2: Operational Expenses */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '1rem' }}>
              سجل المصروفات والنثريات التشغيلية
            </Typography>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenExpenseDialog(true)}
              sx={{ bgcolor: '#4285F4', borderRadius: '12px', fontWeight: 800, px: 2.5, py: 0.9, fontSize: '0.85rem', width: { xs: '100%', sm: 'auto' } }}
            >
              تسجيل مصروف جديد
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>الفرع</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>عنوان / بيان المصروف</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>المبلغ</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>طريقة الدفع</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>ملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#4B5563', whiteSpace: 'nowrap' }}>{exp.branch_name}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{exp.title}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#4285F4', whiteSpace: 'nowrap' }}>{exp.category}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#DC2626', whiteSpace: 'nowrap' }}>{(parseFloat(exp.amount) || 0).toLocaleString()} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{exp.payment_method}</TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{exp.expense_date}</TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{exp.notes || '—'}</TableCell>
                  </TableRow>
                ))}

                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#9CA3AF', fontWeight: 700 }}>
                      لا توجد مصروفات نثريات مسجلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Tab 3: Supplier Accounts & Debt Balance Summary ("علينا كام ولنا كام") */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={1.5}>
          {supplierBalances.map((sup) => (
            <Grid item xs={12} sm={6} md={4} key={sup.name}>
              <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: sup.totalOwed > 0 ? '#FEF2F2' : '#F0FDF4' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                    {sup.name}
                  </Typography>
                  <Chip
                    label={`${sup.invoicesCount} فواتير`}
                    size="small"
                    sx={{ fontWeight: 800, bgcolor: '#FFF', border: '1px solid #E5E7EB', fontSize: '0.72rem' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, my: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.8rem' }}>إجمالي التوريدات:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{sup.totalBought.toLocaleString()} ج.م</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 700, fontSize: '0.8rem' }}>إجمالي المسدد كاش:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981', fontSize: '0.85rem' }}>{sup.totalPaid.toLocaleString()} ج.م</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.8, borderTop: '1px dashed #CBD5E1' }}>
                    <Typography variant="body2" sx={{ color: '#991B1B', fontWeight: 900, fontSize: '0.85rem' }}>الرصيد المتبقي ("علينا للمورد"):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#DC2626', fontSize: '0.95rem' }}>
                      {sup.totalOwed.toLocaleString()} ج.م
                    </Typography>
                  </Box>
                </Box>

                {sup.totalOwed === 0 && (
                  <Chip label="الحساب خالص ومسدد بالكامل 👍" color="success" size="small" sx={{ width: '100%', fontWeight: 800, fontSize: '0.75rem' }} />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Dialog: Add New Raw Material Purchase */}
      <Dialog open={openPurchaseDialog} onClose={() => setOpenPurchaseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>تسجيل فاتورة توريد خامات جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الفرع</InputLabel>
                <Select
                  value={purchaseForm.branch_id}
                  label="الفرع"
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, branch_id: e.target.value })}
                >
                  {availableBranches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المورد / الشركة (مثال: شركة الأمل)"
                value={purchaseForm.supplier_name}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم الخامة (لحم مفروم / فراخ / عيش...)"
                value={purchaseForm.item_name}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label="الكمية"
                value={purchaseForm.quantity}
                onChange={(e) => handlePurchaseCalc('quantity', e.target.value)}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="الوحدة (كجم / رغيف)"
                value={purchaseForm.unit}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, unit: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label="سعر الوحدة (ج.م)"
                value={purchaseForm.cost_per_unit}
                onChange={(e) => handlePurchaseCalc('cost_per_unit', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label="إجمالي سعر الفاتورة"
                value={purchaseForm.total_amount}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, total_amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>حالة الدفع</InputLabel>
                <Select
                  value={purchaseForm.payment_status}
                  label="حالة الدفع"
                  onChange={(e) => handlePurchaseCalc('payment_status', e.target.value)}
                >
                  <MenuItem value="paid">مسدد بالكامل كاش</MenuItem>
                  <MenuItem value="credit">آجل بالكامل (غير مدفوع)</MenuItem>
                  <MenuItem value="partial">دفعة مقدمة / مدفوع جزئياً</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label="المبلغ المدفوع حالياً (ج.م)"
                value={purchaseForm.paid_amount}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, paid_amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="ملاحظات وشروط السداد"
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPurchaseDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleSavePurchase} variant="contained" sx={{ bgcolor: '#4285F4' }}>حفظ الفاتورة</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Operational Expense */}
      <Dialog open={openExpenseDialog} onClose={() => setOpenExpenseDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>تسجيل مصروف تشغيلي</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>الفرع</InputLabel>
            <Select
              value={expenseForm.branch_id}
              label="الفرع"
              onChange={(e) => setExpenseForm({ ...expenseForm, branch_id: e.target.value })}
            >
              {availableBranches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="بيان / عنوان المصروف (كهرباء / غاز / صيانة)"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
          />

          <FormControl fullWidth size="small">
            <InputLabel>فئة المصروف</InputLabel>
            <Select
              value={expenseForm.category}
              label="فئة المصروف"
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              <MenuItem value="مرافق وخدمات">مرافق وخدمات (كهرباء/غاز/مياه)</MenuItem>
              <MenuItem value="مستلزمات تشغيل">مستلزمات تشغيل ونظافة</MenuItem>
              <MenuItem value="صيانة معدات">صيانة أدوات ومعدات</MenuItem>
              <MenuItem value="إيجار ورسوم">إيجار ورسوم حكومية</MenuItem>
              <MenuItem value="نثريات">نثريات متنوعة</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="number"
            size="small"
            label="المبلغ (ج.م)"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
          />

          <TextField
            fullWidth
            size="small"
            label="طريقة الدفع (كاش الخزنة / تحويل / فودافون كاش)"
            value={expenseForm.payment_method}
            onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenExpenseDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleSaveExpense} variant="contained" sx={{ bgcolor: '#4285F4' }}>إضافة المصروف</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Record Payment Installment */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>سداد دفعة فاتورة آجل للمورد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {selectedPurchase && (
            <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: '12px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                المورد: {selectedPurchase.supplier_name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                الخامة: {selectedPurchase.item_name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 800, mt: 1 }}>
                المبلغ المتبقي حالياً: {selectedPurchase.remaining_amount} ج.م
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            type="number"
            size="small"
            label="مبلغ الدفعة المسددة الآن (ج.م)"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPayDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmPayment} variant="contained" sx={{ bgcolor: '#10B981' }}>
            تأكيد السداد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
