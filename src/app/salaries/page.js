'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Alert
} from '@mui/material';
import {
  AccountBalanceWallet, Add, MoneyOutlined,
  PersonOutlined, CalendarMonth, EditOutlined, DeleteOutlined,
  Store, CheckCircleOutlined
} from '@mui/icons-material';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { useBranchStore } from '@/store/useBranchStore';

export default function SalariesPage() {
  const { employees, fetchEmployees, addAdvance, markAsPaid, addEmployee, updateEmployee, deleteEmployee, settleEmployeeAccount } = useEmployeeStore();
  const { branches, fetchBranches } = useBranchStore();
  const [selectedMonth, setSelectedMonth] = useState('يوليو 2026');

  // Dialog states
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');

  const [addEmpDialog, setAddEmpDialog] = useState(false);
  const [newEmpData, setNewEmpData] = useState({ name: '', role: 'طيار دليفري', phone: '', baseSalary: 4500, branchId: 'b1' });

  // Edit Employee Dialog
  const [editEmpDialog, setEditEmpDialog] = useState(false);
  const [editEmpData, setEditEmpData] = useState(null);

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
    const net = (e.baseSalary || 0) + (e.bonus || 0) - (e.deductions || 0) - (e.advances || 0);
    return sum + Math.max(0, net);
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
      branchId: newEmpData.branchId || 'b1'
    });
    setAddEmpDialog(false);
    setNewEmpData({ name: '', role: 'طيار دليفري', phone: '', baseSalary: 4500, branchId: 'b1' });
  };

  const handleOpenEdit = (emp) => {
    setEditEmpData({
      id: emp.id,
      name: emp.name || '',
      role: emp.role || 'طيار دليفري',
      phone: emp.phone || '',
      baseSalary: emp.baseSalary || 4000,
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
              المرتبات والسلف وتصفية الموظفين
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إدارة مرتبات ونقل الموظفين والطيارين بين الفروع وتصفية حساباتهم نهائياً - {selectedMonth}
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
              <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الوظيفة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>رقم الهاتف</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>المرتب الأساسي</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السلف المسحوبة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الصافي المستحق</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(!employees || employees.length === 0) ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94A3B8', fontWeight: 700 }}>
                  لا يوجد موظفين مسجلين حالياً. اضغط على "إضافة موظف جديد" لبدء السجل.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((row) => {
                const netSalary = Math.max(0, (row.baseSalary || 0) + (row.bonus || 0) - (row.deductions || 0) - (row.advances || 0));
                const isPaid = row.status === 'تم الصرف';
                const isSettled = row.status === 'تمت التصفية';
                const branchObj = (branches || []).find(b => b.id === row.branchId) || { name: row.branchName || 'الفرع الأول' };

                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<Store sx={{ fontSize: '14px !important' }} />}
                        label={branchObj.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, borderColor: '#CBD5E1', bgcolor: '#F8FAFC' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#4B5563', fontWeight: 600 }}>{row.role}</TableCell>
                    <TableCell sx={{ color: '#6B7280' }}>{row.phone || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{(row.baseSalary || 0).toLocaleString()} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#EF4444' }}>{(row.advances || 0).toLocaleString()} ج.م</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#4285F4', fontSize: '1rem' }}>{netSalary.toLocaleString()} ج.م</TableCell>
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
                            صرف المرتب
                          </Button>
                        )}

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleOpenSettle(row)}
                          disabled={isSettled}
                          sx={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, bgcolor: isSettled ? '#94A3B8' : '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                        >
                          {isSettled ? 'مصفى' : 'تصفية الحساب'}
                        </Button>

                        <Tooltip title="تعديل الموظف / نقل الفرع">
                          <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#3B82F6' }}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="حذف / إلغاء الموظف">
                          <IconButton size="small" onClick={() => handleOpenDelete(row)} sx={{ color: '#EF4444' }}>
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Advance Dialog */}
      <Dialog open={advanceDialog} onClose={() => setAdvanceDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>تسجيل سلفة لـ {selectedEmployee?.name}</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <TextField
            fullWidth
            type="number"
            size="small"
            label="مبلغ السلفة (ج.م)"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdvanceDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmAdvance} variant="contained" sx={{ bgcolor: '#EF4444' }}>خصم السلفة</Button>
        </DialogActions>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={addEmpDialog} onClose={() => setAddEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>إضافة موظف جديد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="اسم الموظف *"
            value={newEmpData.name}
            onChange={(e) => setNewEmpData({ ...newEmpData, name: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>الفرع التابع له الموظف *</InputLabel>
            <Select
              value={newEmpData.branchId || 'b1'}
              label="الفرع التابع له الموظف *"
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
          {empToSettle && (
            <>
              <Typography variant="body2" fontWeight={700}>
                الموظف: <strong>{empToSettle.name}</strong> ({empToSettle.role})
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">المرتب الأساسي:</Typography>
                  <Typography variant="caption" fontWeight={700}>{(empToSettle.baseSalary || 0).toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="#EF4444">(-) السلف المسحوبة:</Typography>
                  <Typography variant="caption" fontWeight={700} color="#EF4444">-{(empToSettle.advances || 0).toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ borderTop: '1px dashed #CBD5E1', pt: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1E293B">صافي التسوية والتصفية النهائي:</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#8B5CF6">
                    {Math.max(0, (empToSettle.baseSalary || 0) - (empToSettle.advances || 0)).toLocaleString()} ج.م
                  </Typography>
                </Box>
              </Paper>
              <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.8rem' }}>
                عند التصفية، سيتم اعتماد صرف المستحق المتبقي وتسجيل الموظف كـ "تمت التصفية".
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSettleDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmSettle} variant="contained" sx={{ bgcolor: '#8B5CF6' }}>تأكيد التصفية النهائية</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
