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
  IconButton,
  Tooltip,
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
  AttachMoney,
  Search,
  LocalShipping,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import { useFinancesStore } from '@/store/useFinancesStore';
import { useBranchStore } from '@/store/useBranchStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
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

  // Synchronize default form branch if branches load dynamically
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

    // Estimated revenue simulation per branch or total
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
      return <Chip icon={<CheckCircle sx={{ fontSize: '16px !important' }} />} label="مسدد بالكامل" size="small" sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 800 }} />;
    }
    if (status === 'credit') {
      return <Chip icon={<Warning sx={{ fontSize: '16px !important' }} />} label="آجل بالكامل" size="small" sx={{ bgcolor: '#FEE2E2', color: '#991B1B', fontWeight: 800 }} />;
    }
    return <Chip icon={<HourglassTop sx={{ fontSize: '16px !important' }} />} label="مدفوع جزئياً" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 800 }} />;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Top Header & Branch Filter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            دفتر الإيرادات والمصروفات وخواتيم الحسابات
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            تتبع مبيعات الفروع، أسعار خامات التوريد (كاش وآجل)، ومستحقات الموردين ("علينا كام ولنا كام")
          </Typography>
        </Box>

        {/* Branch Filter Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Store sx={{ color: '#4285F4' }} />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <Select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#FFF' }}
            >
              {branchFilterOptions.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontWeight: 700 }}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* KPI Financial Overview Cards */}
      <Grid container spacing={2}>
        {/* Total Revenues */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#F0F9FF' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 800, fontSize: '0.8rem' }}>
                  إجمالي إيرادات المبيعات
                </Typography>

                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0C4A6E', mt: 0.5 }}>
                  {metrics.estimatedRevenue.toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                <TrendingUp />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Raw Material & Purchases Cost */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#FFF7ED' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 800, fontSize: '0.8rem' }}>
                  إجمالي المشتريات والمصروفات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#7C2D12', mt: 0.5 }}>
                  {(metrics.totalPurchasesCost + metrics.totalOpExpenses).toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C' }}>
                <TrendingDown />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Outstanding Debts Owed to Suppliers ("علينا كام") */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1.5px solid #FCA5A5', bgcolor: '#FEF2F2' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 900, fontSize: '0.82rem' }}>
                  مستحقات الموردين ("علينا كام")
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#991B1B', mt: 0.5 }}>
                  {metrics.totalPurchasesOwed.toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <Warning />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Profit & Cash Flow */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: '#ECFDF5' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#047857', fontWeight: 800, fontSize: '0.8rem' }}>
                  صافي التدفق المالي كاش
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#064E3B', mt: 0.5 }}>
                  {metrics.netProfit.toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <AccountBalanceWallet />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs Header */}
      <Paper sx={{ borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="فواتير مشتريات الخامات والآجل" icon={<LocalShipping />} iconPosition="start" sx={{ fontWeight: 800, py: 1.5 }} />
          <Tab label="المصروفات التشغيلية والنثريات" icon={<ReceiptLong />} iconPosition="start" sx={{ fontWeight: 800, py: 1.5 }} />
          <Tab label='كشف مديونيات الموردين ("علينا كام ولنا كام")' icon={<AssignmentTurnedIn />} iconPosition="start" sx={{ fontWeight: 800, py: 1.5 }} />
        </Tabs>
      </Paper>

      {/* Tab 1: Raw Material Purchases & Payment Status */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Controls Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              size="small"
              placeholder="بحث باسم المورد أو الخامة أو الفرع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#9CA3AF' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 300 }, bg: '#FFF' }}
            />

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenPurchaseDialog(true)}
              sx={{ bgcolor: '#4285F4', borderRadius: '12px', fontWeight: 800, px: 3, py: 1 }}
            >
              تسجيل فاتورة توريد خامات جديدة
            </Button>
          </Box>

          {/* Raw Material Purchases Table */}
          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>اسم المورد / الشركة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>اسم الخامة والتوريد</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الكمية والوحدة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>إجمالي الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المدفوع كاش</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المتبقي ("علينا")</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>حالة السداد</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="center">الإجراءات والسداد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchases.map((row) => {
                  const remaining = parseFloat(row.remaining_amount) || 0;
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#4B5563' }}>{row.branch_name}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{row.supplier_name}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1E40AF' }}>{row.item_name}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.quantity} {row.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#1A1A2E' }}>{(parseFloat(row.total_amount) || 0).toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#10B981' }}>{(parseFloat(row.paid_amount) || 0).toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: remaining > 0 ? '#EF4444' : '#6B7280' }}>
                        {remaining > 0 ? `${remaining.toLocaleString()} ج.م` : '0 ج.م'}
                      </TableCell>
                      <TableCell>{getStatusChip(row.payment_status, remaining)}</TableCell>
                      <TableCell align="center">
                        {remaining > 0 ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Payment />}
                            onClick={() => handleOpenPayDialog(row)}
                            sx={{ borderRadius: '8px', color: '#EF4444', borderColor: '#FCA5A5', fontWeight: 800, '&:hover': { bgcolor: '#FEE2E2' } }}
                          >
                            سداد دفعة للمورد
                          </Button>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 800 }}>
                            مكتملة السداد ✓
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredPurchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#9CA3AF', fontWeight: 700 }}>
                      لا توجد فواتير توريد خامات مسجلة لهذا الفرع حالياً
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
              سجل المصروفات والنثريات التشغيلية
            </Typography>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenExpenseDialog(true)}
              sx={{ bgcolor: '#4285F4', borderRadius: '12px', fontWeight: 800, px: 3, py: 1 }}
            >
              تسجيل مصروف جديد
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>عنوان / بيان المصروف</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>المبلغ</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>طريقة الدفع</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>ملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#4B5563' }}>{exp.branch_name}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{exp.title}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#4285F4' }}>{exp.category}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#DC2626' }}>{(parseFloat(exp.amount) || 0).toLocaleString()} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{exp.payment_method}</TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.85rem' }}>{exp.expense_date}</TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.85rem' }}>{exp.notes || '—'}</TableCell>
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
        <Grid container spacing={2}>
          {supplierBalances.map((sup) => (
            <Grid item xs={12} sm={6} md={4} key={sup.name}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E5E7EB', bgcolor: sup.totalOwed > 0 ? '#FEF2F2' : '#F0FDF4' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                    {sup.name}
                  </Typography>
                  <Chip
                    label={`${sup.invoicesCount} فواتير`}
                    size="small"
                    sx={{ fontWeight: 800, bgcolor: '#FFF', border: '1px solid #E5E7EB' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>إجمالي التوريدات:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{sup.totalBought.toLocaleString()} ج.م</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 700 }}>إجمالي المسدد كاش:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981' }}>{sup.totalPaid.toLocaleString()} ج.م</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #CBD5E1' }}>
                    <Typography variant="body1" sx={{ color: '#991B1B', fontWeight: 900 }}>الرصيد المتبقي ("علينا للمورد"):</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: '#DC2626' }}>
                      {sup.totalOwed.toLocaleString()} ج.م
                    </Typography>
                  </Box>
                </Box>

                {sup.totalOwed === 0 && (
                  <Chip label="الحساب خالص ومسدد بالكامل 👍" color="success" size="small" sx={{ width: '100%', fontWeight: 800 }} />
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
