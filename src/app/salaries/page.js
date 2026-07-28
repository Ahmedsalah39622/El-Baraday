'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Alert, Grid, Stack, Card, CardContent
} from '@mui/material';
import {
  AccountBalanceWallet, Add, MoneyOutlined,
  PersonOutlined, CalendarMonth, EditOutlined, DeleteOutlined,
  Store, CheckCircleOutlined, AccessTime as TimeIcon,
  TrendingUp, TrendingDown, Calculate as CalcIcon
} from '@mui/icons-material';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { useBranchStore } from '@/store/useBranchStore';

// Helper for exact hourly & net salary calculations
export function calculateEmployeeSalary(emp) {
  const base = parseFloat(emp.baseSalary || 0);
  // Default hourly rate = base / 240 (30 days * 8 hrs/day) if not explicitly set
  const hourlyRate = (emp.hourlyRate && parseFloat(emp.hourlyRate) > 0) 
    ? parseFloat(emp.hourlyRate) 
    : (base > 0 ? base / 240 : 0);

  const overtimeHours = parseFloat(emp.overtimeHours || 0);
  const deductionHours = parseFloat(emp.deductionHours || 0);

  const overtimeAmount = overtimeHours * hourlyRate;
  const deductionAmount = deductionHours * hourlyRate;

  const directBonus = parseFloat(emp.bonus || 0);
  const directDeductions = parseFloat(emp.deductions || 0);
  const advances = parseFloat(emp.advances || 0);

  const totalBonus = overtimeAmount + directBonus;
  const totalDeductions = deductionAmount + directDeductions;
  
  const net = Math.max(0, base + totalBonus - totalDeductions - advances);

  return {
    base,
    hourlyRate,
    overtimeHours,
    overtimeAmount,
    deductionHours,
    deductionAmount,
    directBonus,
    directDeductions,
    advances,
    totalBonus,
    totalDeductions,
    net
  };
}

export default function SalariesPage() {
  const { employees, fetchEmployees, addAdvance, markAsPaid, addEmployee, updateEmployee, deleteEmployee, settleEmployeeAccount } = useEmployeeStore();
  const { branches, fetchBranches } = useBranchStore();
  const [selectedMonth, setSelectedMonth] = useState('يوليو 2026');

  // Dialog states
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');

  const [addEmpDialog, setAddEmpDialog] = useState(false);
  const [newEmpData, setNewEmpData] = useState({
    name: '',
    role: 'طيار دليفري',
    phone: '',
    baseSalary: 4500,
    hourlyRate: 0,
    overtimeHours: 0,
    deductionHours: 0,
    branchId: 'b1'
  });

  // Edit Employee Dialog
  const [editEmpDialog, setEditEmpDialog] = useState(false);
  const [editEmpData, setEditEmpData] = useState(null);

  // Hourly Adjustments Dialog (خصم وزيادة بالساعات)
  const [hoursDialog, setHoursDialog] = useState(false);
  const [hoursEmpData, setHoursEmpData] = useState(null);

  // Delete Employee Dialog
  const [deleteEmpDialog, setDeleteEmpDialog] = useState(false);
  const [empToDelete, setEmpToDelete] = useState(null);

  // Settle Account Dialog
  const [settleDialog, setSettleDialog] = useState(false);
  const [empToSettle, setEmpToSettle] = useState(null);

  useEffect(() => {
    fetchEmployees();
    if (fetchBranches) fetchBranches();
  }, []);

  const totalSalaries = (employees || []).reduce((sum, e) => {
    const calc = calculateEmployeeSalary(e);
    return sum + calc.net;
  }, 0);

  const totalAdvances = (employees || []).reduce((sum, e) => sum + (e.advances || 0), 0);
  const paidCount = (employees || []).filter((e) => e.status === 'تم الصرف' || e.status === 'تمت التصفية').length;

  const handleOpenAdvance = (emp) => {
    setSelectedEmployee(emp);
    setAdvanceAmount('');
    setAdvanceDialog(true);
  };

  const handleConfirmAdvance = async () => {
    if (!selectedEmployee || !advanceAmount) return;
    await addAdvance(selectedEmployee.id, advanceAmount);
    setAdvanceDialog(false);
    setAdvanceAmount('');
  };

  const handleAddEmployeeSubmit = async () => {
    if (!newEmpData.name.trim()) return;
    await addEmployee({
      name: newEmpData.name.trim(),
      role: newEmpData.role,
      phone: newEmpData.phone.trim(),
      baseSalary: parseFloat(newEmpData.baseSalary) || 4000,
      hourlyRate: parseFloat(newEmpData.hourlyRate) || 0,
      overtimeHours: parseFloat(newEmpData.overtimeHours) || 0,
      deductionHours: parseFloat(newEmpData.deductionHours) || 0,
      branchId: newEmpData.branchId || 'b1'
    });
    setAddEmpDialog(false);
    setNewEmpData({
      name: '',
      role: 'طيار دليفري',
      phone: '',
      baseSalary: 4500,
      hourlyRate: 0,
      overtimeHours: 0,
      deductionHours: 0,
      branchId: 'b1'
    });
  };

  const handleOpenEdit = (emp) => {
    setEditEmpData({
      id: emp.id,
      name: emp.name || '',
      role: emp.role || 'طيار دليفري',
      phone: emp.phone || '',
      baseSalary: emp.baseSalary || 4000,
      hourlyRate: emp.hourlyRate || 0,
      overtimeHours: emp.overtimeHours || 0,
      deductionHours: emp.deductionHours || 0,
      bonus: emp.bonus || 0,
      deductions: emp.deductions || 0,
      branchId: emp.branchId || 'b1'
    });
    setEditEmpDialog(true);
  };

  const handleConfirmEdit = async () => {
    if (!editEmpData || !editEmpData.name.trim()) return;
    await updateEmployee(editEmpData.id, editEmpData);
    setEditEmpDialog(false);
    setEditEmpData(null);
  };

  const handleOpenHoursModal = (emp) => {
    setHoursEmpData({
      id: emp.id,
      name: emp.name || '',
      baseSalary: emp.baseSalary || 4000,
      hourlyRate: emp.hourlyRate || 0,
      overtimeHours: emp.overtimeHours || 0,
      deductionHours: emp.deductionHours || 0,
      bonus: emp.bonus || 0,
      deductions: emp.deductions || 0,
      advances: emp.advances || 0
    });
    setHoursDialog(true);
  };

  const handleSaveHours = async () => {
    if (!hoursEmpData) return;
    await updateEmployee(hoursEmpData.id, {
      hourlyRate: parseFloat(hoursEmpData.hourlyRate) || 0,
      overtimeHours: parseFloat(hoursEmpData.overtimeHours) || 0,
      deductionHours: parseFloat(hoursEmpData.deductionHours) || 0,
      bonus: parseFloat(hoursEmpData.bonus) || 0,
      deductions: parseFloat(hoursEmpData.deductions) || 0
    });
    setHoursDialog(false);
    setHoursEmpData(null);
  };

  const handleOpenDelete = (emp) => {
    setEmpToDelete(emp);
    setDeleteEmpDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    await deleteEmployee(empToDelete.id);
    setDeleteEmpDialog(false);
    setEmpToDelete(null);
  };

  const handleOpenSettle = (emp) => {
    setEmpToSettle(emp);
    setSettleDialog(true);
  };

  const handleConfirmSettle = async () => {
    if (!empToSettle) return;
    await settleEmployeeAccount(empToSettle.id);
    setSettleDialog(false);
    setEmpToSettle(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalanceWallet sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.3rem', md: '1.8rem' } }}>
              المرتبات وساعات الخصم والزيادة
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              حساب الرواتب الدقيق مع دعم خصم وزيادة الساعات (أوفر تايم / تأخير) وتصفية الحسابات - {selectedMonth}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddEmpDialog(true)}
          sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700 }}
        >
          إضافة موظف جديد
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[
          { label: 'إجمالي المرتبات المستحقة', value: `${totalSalaries.toLocaleString()} ج.م`, color: '#4285F4', icon: <MoneyOutlined /> },
          { label: 'إجمالي السلف المسحوبة', value: `${totalAdvances.toLocaleString()} ج.م`, color: '#EF4444', icon: <AccountBalanceWallet /> },
          { label: 'تم صرف / تصفية الرواتب', value: `${paidCount} / ${employees?.length || 0}`, color: '#34D399', icon: <PersonOutlined /> },
          { label: 'الشهر الحالي', value: selectedMonth, color: '#FF8C42', icon: <CalendarMonth /> },
        ].map((stat, i) => (
          <Paper key={i} sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>{stat.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '1.1rem' }}>{stat.value}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Employees Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الفرع والوظيفة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>المرتب الأساسي</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>أجر الساعة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>ساعات الزيادة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>ساعات الخصم</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السلف</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الصافي المستحق</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>إجراءات والساعات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(!employees || employees.length === 0) ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4, color: '#94A3B8', fontWeight: 700 }}>
                  لا يوجد موظفين مسجلين حالياً. اضغط على "إضافة موظف جديد" لبدء السجل.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((row) => {
                const calc = calculateEmployeeSalary(row);
                const isPaid = row.status === 'تم الصرف';
                const isSettled = row.status === 'تمت التصفية';
                const branchObj = (branches || []).find(b => b.id === row.branchId) || { name: row.branchName || 'الفرع الأول' };

                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                      {row.name}
                      {row.phone && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          📞 {row.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Store sx={{ fontSize: '14px !important' }} />}
                        label={branchObj.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, borderColor: '#CBD5E1', bgcolor: '#F8FAFC', mb: 0.5 }}
                      />
                      <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold">
                        {row.role}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{calc.base.toLocaleString()} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0284C7' }}>
                      {calc.hourlyRate.toFixed(1)} ج.م/س
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534' }}>
                        +{calc.overtimeHours} ساعة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        (+{calc.overtimeAmount.toFixed(0)} ج.م) {calc.directBonus > 0 && `+${calc.directBonus} مكافأة`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#991B1B' }}>
                        -{calc.deductionHours} ساعة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        (-{calc.deductionAmount.toFixed(0)} ج.م) {calc.directDeductions > 0 && `-${calc.directDeductions} خصم`}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#EF4444' }}>{calc.advances.toLocaleString()} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#4285F4', fontSize: '1.05rem' }}>{calc.net.toLocaleString()} ج.م</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status || 'مستحق'}
                        size="small"
                        sx={{
                          bgcolor: isSettled ? '#E0E7FF' : (isPaid ? '#D1FAE5' : '#FEF3C7'),
                          color: isSettled ? '#3730A3' : (isPaid ? '#065F46' : '#92400E'),
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          startIcon={<TimeIcon fontSize="small" />}
                          onClick={() => handleOpenHoursModal(row)}
                          disabled={isSettled}
                          sx={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          ضبط الساعات
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenAdvance(row)}
                          disabled={isSettled}
                          sx={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          + سلفة
                        </Button>

                        {!isPaid && !isSettled && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => markAsPaid(row.id)}
                            sx={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, bgcolor: '#10B981' }}
                          >
                            صرف
                          </Button>
                        )}

                        <IconButton size="small" onClick={() => handleOpenEdit(row)} color="primary">
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenSettle(row)} color="secondary">
                          <CheckCircleOutlined fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenDelete(row)} color="error">
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* HOURLY ADJUSTMENTS DIALOG (تعديل الساعات والخصومات والزيادات) */}
      <Dialog open={hoursDialog} onClose={() => setHoursDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0284C7', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon />
          تعديل ساعات الخصم والزيادة - {hoursEmpData?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {hoursEmpData && (() => {
            const calc = calculateEmployeeSalary(hoursEmpData);
            return (
              <>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="المرتب الأساسي (ج.م)"
                      value={hoursEmpData.baseSalary}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, baseSalary: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="أجر الساعة (ج.م/ساعة)"
                      helperText={parseFloat(hoursEmpData.hourlyRate) === 0 ? `محسوب تلقائياً: ${(parseFloat(hoursEmpData.baseSalary || 0) / 240).toFixed(1)} ج.م/س` : ''}
                      value={hoursEmpData.hourlyRate}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, hourlyRate: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="ساعات الزيادة / الإضافي (ساعة)"
                      value={hoursEmpData.overtimeHours}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, overtimeHours: e.target.value })}
                      slotProps={{
                        input: {
                          endAdornment: <Typography variant="caption" color="success.main" fontWeight="bold">+{calc.overtimeAmount.toFixed(0)} ج.م</Typography>
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="مكافأة مباشرة إضافية (ج.م)"
                      value={hoursEmpData.bonus}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, bonus: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="ساعات الخصم / التأخير (ساعة)"
                      value={hoursEmpData.deductionHours}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, deductionHours: e.target.value })}
                      slotProps={{
                        input: {
                          endAdornment: <Typography variant="caption" color="error.main" fontWeight="bold">-{calc.deductionAmount.toFixed(0)} ج.م</Typography>
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="خصم مباشر إضافي (ج.م)"
                      value={hoursEmpData.deductions}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, deductions: e.target.value })}
                    />
                  </Grid>
                </Grid>

                {/* Calculation Summary Preview Box */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1.5px solid #CBD5E1' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#0F172A' }}>
                    🧮 المعاينة المباشرة للراتب الصافي:
                  </Typography>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">المرتب الأساسي:</Typography>
                      <Typography variant="body2" fontWeight="bold">{calc.base.toLocaleString()} ج.م</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                      <Typography variant="body2" fontWeight="bold">إجمالي الزيادات (+إضافي +مكافأة):</Typography>
                      <Typography variant="body2" fontWeight="bold">+{calc.totalBonus.toLocaleString()} ج.م</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                      <Typography variant="body2" fontWeight="bold">إجمالي الخصومات (-ساعات -خصم -سلف):</Typography>
                      <Typography variant="body2" fontWeight="bold">-(calc.totalDeductions + calc.advances).toLocaleString() ج.م</Typography>
                    </Box>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'primary.main' }}>
                      <Typography variant="body1" fontWeight="900">الصافي النهـائي المستحق:</Typography>
                      <Typography variant="h6" fontWeight="900">{calc.net.toLocaleString()} ج.م</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHoursDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleSaveHours} variant="contained" color="primary" sx={{ px: 3, fontWeight: 'bold' }}>
            حفظ تعديلات الساعات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={advanceDialog} onClose={() => setAdvanceDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>💸 تسجيل سلفة جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            الموظف: <strong>{selectedEmployee?.name}</strong> | المرتب الأساسي: <strong>{selectedEmployee?.baseSalary} ج.م</strong>
          </Typography>
          <TextField
            fullWidth
            type="number"
            size="small"
            label="مبلغ السلفة (ج.م) *"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdvanceDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmAdvance} variant="contained" sx={{ bgcolor: '#4285F4' }}>تأكيد السلفة</Button>
        </DialogActions>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={addEmpDialog} onClose={() => setAddEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>👤 إضافة موظف جديد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="اسم الموظف *"
            value={newEmpData.name}
            onChange={(e) => setNewEmpData({ ...newEmpData, name: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>الفرع التابع له *</InputLabel>
            <Select
              value={newEmpData.branchId}
              label="الفرع التابع له *"
              onChange={(e) => setNewEmpData({ ...newEmpData, branchId: e.target.value })}
            >
              {(branches && branches.length > 0 ? branches : [
                { id: 'b1', name: 'الفرع الأول - الرئيسي' },
                { id: 'b2', name: 'الفرع الثاني' }
              ]).map((b) => (
                <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>الوظيفة</InputLabel>
            <Select
              value={newEmpData.role}
              label="الوظيفة"
              onChange={(e) => setNewEmpData({ ...newEmpData, role: e.target.value })}
            >
              <MenuItem value="طيار دليفري">طيار دليفري</MenuItem>
              <MenuItem value="كاشير">كاشير</MenuItem>
              <MenuItem value="شيف مطبخ">شيف مطبخ</MenuItem>
              <MenuItem value="عمال نظافة وترتيب">عمال نظافة وترتيب</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="رقم الهاتف"
            value={newEmpData.phone}
            onChange={(e) => setNewEmpData({ ...newEmpData, phone: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="المرتب الأساسي (ج.م)"
            value={newEmpData.baseSalary}
            onChange={(e) => setNewEmpData({ ...newEmpData, baseSalary: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="أجر الساعة (اختياري - 0 للتحسب التلقائي)"
            value={newEmpData.hourlyRate}
            onChange={(e) => setNewEmpData({ ...newEmpData, hourlyRate: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddEmpDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleAddEmployeeSubmit} variant="contained" sx={{ bgcolor: '#4285F4' }}>إضافة الموظف</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Employee & Branch Transfer Dialog */}
      <Dialog open={editEmpDialog} onClose={() => setEditEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>✏️ تعديل بيانات ونقل فرع الموظف</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {editEmpData && (
            <>
              <TextField
                fullWidth
                size="small"
                label="اسم الموظف *"
                value={editEmpData.name}
                onChange={(e) => setEditEmpData({ ...editEmpData, name: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>الفرع (نقل الموظف لفرع آخر) *</InputLabel>
                <Select
                  value={editEmpData.branchId || 'b1'}
                  label="الفرع (نقل الموظف لفرع آخر) *"
                  onChange={(e) => setEditEmpData({ ...editEmpData, branchId: e.target.value })}
                >
                  {(branches && branches.length > 0 ? branches : [
                    { id: 'b1', name: 'الفرع الأول - الرئيسي' },
                    { id: 'b2', name: 'الفرع الثاني' }
                  ]).map((b) => (
                    <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>الوظيفة</InputLabel>
                <Select
                  value={editEmpData.role}
                  label="الوظيفة"
                  onChange={(e) => setEditEmpData({ ...editEmpData, role: e.target.value })}
                >
                  <MenuItem value="طيار دليفري">طيار دليفري</MenuItem>
                  <MenuItem value="كاشير">كاشير</MenuItem>
                  <MenuItem value="شيف مطبخ">شيف مطبخ</MenuItem>
                  <MenuItem value="عمال نظافة وترتيب">عمال نظافة وترتيب</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="رقم الهاتف"
                value={editEmpData.phone}
                onChange={(e) => setEditEmpData({ ...editEmpData, phone: e.target.value })}
              />
              <TextField
                fullWidth
                type="number"
                size="small"
                label="المرتب الأساسي (ج.م)"
                value={editEmpData.baseSalary}
                onChange={(e) => setEditEmpData({ ...editEmpData, baseSalary: e.target.value })}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditEmpDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmEdit} variant="contained" sx={{ bgcolor: '#3B82F6' }}>حفظ التعديلات والنقل</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Employee Confirmation Dialog */}
      <Dialog open={deleteEmpDialog} onClose={() => setDeleteEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#EF4444' }}>⚠️ إغلاق وحذف الموظف</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            هل أنت تأكد من إلغاء وحذف الموظف <strong>{empToDelete?.name}</strong> من النظام بالكامل؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteEmpDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmDelete} variant="contained" sx={{ bgcolor: '#EF4444' }}>حذف الموظف</Button>
        </DialogActions>
      </Dialog>

      {/* Settle Employee Account Dialog */}
      <Dialog open={settleDialog} onClose={() => setSettleDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#8B5CF6' }}>💼 تصفية حساب الموظف النهائي</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            سيتم تصفية حساب الموظف <strong>{empToSettle?.name}</strong> نهائياً وتغيير حالته إلى "تمت التصفية".
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSettleDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmSettle} variant="contained" sx={{ bgcolor: '#8B5CF6' }}>تأكيد تصفية الحساب</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
