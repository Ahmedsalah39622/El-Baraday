'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Tabs, Tab, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
  AccountBalanceWallet, Add, CheckCircleOutlined, MoneyOutlined,
  PersonOutlined, CalendarMonth, Phone
} from '@mui/icons-material';
import { useEmployeeStore } from '@/store/useEmployeeStore';

export default function SalariesPage() {
  const { employees, fetchEmployees, addAdvance, markAsPaid, addEmployee } = useEmployeeStore();
  const [selectedMonth, setSelectedMonth] = useState('يوليو 2026');
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');

  const [addEmpDialog, setAddEmpDialog] = useState(false);
  const [newEmpData, setNewEmpData] = useState({ name: '', role: 'طيار دليفري', phone: '', baseSalary: 4500 });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const totalSalaries = (employees || []).reduce((sum, e) => {
    const net = (e.baseSalary || 0) + (e.bonus || 0) - (e.deductions || 0) - (e.advances || 0);
    return sum + Math.max(0, net);
  }, 0);

  const totalAdvances = (employees || []).reduce((sum, e) => sum + (e.advances || 0), 0);
  const paidCount = (employees || []).filter((e) => e.status === 'تم الصرف').length;

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
      baseSalary: parseFloat(newEmpData.baseSalary) || 4000
    });
    setAddEmpDialog(false);
    setNewEmpData({ name: '', role: 'طيار دليفري', phone: '', baseSalary: 4500 });
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
              المرتبات والسلف
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إدارة مرتبات الطيارين، الكاشيرات، والشيفات - {selectedMonth}
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
          { label: 'تم صرف الرواتب', value: `${paidCount} / ${employees?.length || 0}`, color: '#34D399', icon: <PersonOutlined /> },
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
            {(employees || []).map((row) => {
              const netSalary = Math.max(0, (row.baseSalary || 0) + (row.bonus || 0) - (row.deductions || 0) - (row.advances || 0));
              const isPaid = row.status === 'تم الصرف';

              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{row.name}</TableCell>
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
                        bgcolor: isPaid ? '#D1FAE5' : '#FEF3C7',
                        color: isPaid ? '#065F46' : '#92400E',
                        fontWeight: 800,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenAdvance(row)}
                        sx={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        + تسجيل سلفة
                      </Button>
                      {!isPaid && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => markAsPaid(row.id)}
                          sx={{ borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, bgcolor: '#10B981' }}
                        >
                          صرف المرتب
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
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
    </Box>
  );
}
