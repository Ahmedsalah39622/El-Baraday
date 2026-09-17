'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Stack, FormControl, Select, MenuItem,
  IconButton
} from '@mui/material';
import {
  AccessTime, Refresh, Add, ArrowBack, Print
} from '@mui/icons-material';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { printSalaryReceipt } from '@/lib/printReceipt';

export default function AttendanceAndTamamatPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { branches, selectedBranchId, setSelectedBranchId, fetchBranches } = useBranchStore();

  const [activeTab, setActiveTab] = useState(0); // 0: الحضور والتمامات, 1: الموظفين, 2: المرتبات
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Data State
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [allBonusDeductions, setAllBonusDeductions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'present', 'b1', 'b2', 'absent'

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal: Check-In / Transfer / Check-Out Movement Modal
  const [moveModal, setMoveModal] = useState({
    open: false,
    mode: 'in', // 'in' | 'transfer' | 'out'
    employee: null,
    branch: 'b1',
    day: 'السبت',
    time: '',
    notes: ''
  });

  // Modal: Add Employee Modal
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: '',
    role: 'دليفري',
    branch_id: 'b1',
    phone: '',
    weekly_hours: '70',
    weekly_wage: '1050',
    shift_hours: '8',
    shift_start_time: '12:00',
  });
  const [submittingEmp, setSubmittingEmp] = useState(false);

  // Modal: Deduction / Advance Modal
  const [dedModal, setDedModal] = useState({
    open: false,
    employee: null,
    reason: 'سلفة',
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submittingDed, setSubmittingDed] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Keep Clock ticking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all live data from backend
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      fetchBranches();
      const [empRes, attRes, dedRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/attendance'),
        fetch('/api/employees/bonus-deductions'),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(Array.isArray(empData) ? empData : []);
      }
      if (attRes.ok) {
        const attData = await attRes.json();
        setTodayAttendance(attData.todayAttendance || []);
        setRecentLogs(attData.recentAttendanceLogs || []);
      }
      if (dedRes.ok) {
        const dedData = await dedRes.json();
        setAllBonusDeductions(Array.isArray(dedData) ? dedData : []);
      }
    } catch (err) {
      console.error('Error loading attendance & payroll data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute live active state for each employee
  const employeeStateMap = useMemo(() => {
    const map = new Map();
    (employees || []).forEach(emp => {
      const openRecord = (todayAttendance || []).find(
        a => String(a.employee_id) === String(emp.id) && !a.check_out_time
      );

      const baseBranch = emp.branch_id || 'b1';
      if (openRecord) {
        map.set(emp.id, {
          isWorking: true,
          activeBranch: openRecord.branch_id || baseBranch,
          checkInTime: openRecord.check_in_time,
          attendanceId: openRecord.id,
          openRecord
        });
      } else {
        map.set(emp.id, {
          isWorking: false,
          activeBranch: baseBranch,
          checkInTime: null,
          attendanceId: null,
          openRecord: null
        });
      }
    });
    return map;
  }, [employees, todayAttendance]);

  // Compute total hours worked per branch (b1 / b2)
  const employeeHoursMap = useMemo(() => {
    const map = new Map();
    (employees || []).forEach(emp => {
      const empLogs = (recentLogs || []).filter(l => String(l.employee_id) === String(emp.id));
      let b1Hours = 0;
      let b2Hours = 0;

      empLogs.forEach(log => {
        const h = parseFloat(log.working_hours || 0);
        const b = log.branch_id || 'b1';
        if (b === 'b2') b2Hours += h;
        else b1Hours += h;
      });

      const currentState = employeeStateMap.get(emp.id);
      if (currentState?.isWorking && currentState.checkInTime) {
        const start = new Date(currentState.checkInTime).getTime();
        const now = currentTime.getTime();
        const elapsedH = Math.max(0, (now - start) / (1000 * 60 * 60));
        if (currentState.activeBranch === 'b2') {
          b2Hours += elapsedH;
        } else {
          b1Hours += elapsedH;
        }
      }

      const totalHours = b1Hours + b2Hours;
      map.set(emp.id, {
        b1Hours: parseFloat(b1Hours.toFixed(2)),
        b2Hours: parseFloat(b2Hours.toFixed(2)),
        totalHours: parseFloat(totalHours.toFixed(2))
      });
    });
    return map;
  }, [employees, recentLogs, employeeStateMap, currentTime]);

  // Open Movement Modal
  const handleOpenMove = (emp, mode) => {
    const currentState = employeeStateMap.get(emp.id);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const currentDay = dayNames[now.getDay()];

    let defaultBranch = emp.branch_id || 'b1';
    if (mode === 'transfer') {
      defaultBranch = (currentState?.activeBranch === 'b1' ? 'b2' : 'b1');
    } else if (mode === 'in') {
      defaultBranch = currentState?.activeBranch || emp.branch_id || 'b1';
    }

    setMoveModal({
      open: true,
      mode,
      employee: emp,
      branch: defaultBranch,
      day: currentDay,
      time: timeStr,
      notes: ''
    });
  };

  // Submit Movement (Check-In / Transfer / Check-Out)
  const handleSaveMovement = async () => {
    if (!moveModal.employee) return;
    const { mode, employee, branch, time, notes } = moveModal;
    const empId = employee.id;

    let actionDateObj = new Date();
    if (time) {
      const [h, m] = time.split(':');
      actionDateObj.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }

    setActionLoadingId(empId);
    try {
      let actionName = 'check_in';
      if (mode === 'out') actionName = 'check_out';
      if (mode === 'transfer') actionName = 'transfer';

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionName,
          staff_id: empId,
          employee_id: empId,
          employee_name: employee.name,
          branch_id: branch,
          check_in_time: actionDateObj.toISOString(),
          check_out_time: actionDateObj.toISOString(),
          notes: notes || (mode === 'transfer' ? `نقل إلى ${branch === 'b2' ? 'فرع المسلة' : 'فرع عزت'}` : '')
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ open: true, message: data.message || '✅ تم تسجيل الحركة بنجاح', severity: 'success' });
        setMoveModal(prev => ({ ...prev, open: false }));
        await loadData(true);
      } else {
        setToast({ open: true, message: data.error || 'فشل تسجيل الحركة', severity: 'error' });
      }
    } catch (err) {
      setToast({ open: true, message: 'حدث خطأ في الاتصال بالسيرفر', severity: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Add Employee Handler
  const handleSaveEmployee = async () => {
    if (!empForm.name.trim()) {
      setToast({ open: true, message: 'يرجى كتابة اسم الموظف', severity: 'warning' });
      return;
    }
    setSubmittingEmp(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empForm.name.trim(),
          role: empForm.role,
          branch_id: empForm.branch_id,
          phone: empForm.phone || '',
          hourly_rate: (parseFloat(empForm.weekly_wage || 0) / Math.max(1, parseFloat(empForm.weekly_hours || 70))).toFixed(2),
          salary: parseFloat(empForm.weekly_wage || 0),
          shift_hours: parseFloat(empForm.shift_hours || 8),
          shift_start_time: empForm.shift_start_time || '12:00',
          salary_type: 'weekly'
        })
      });

      if (res.ok) {
        setToast({ open: true, message: `✅ تم إضافة الموظف ${empForm.name} بنجاح`, severity: 'success' });
        setAddEmpOpen(false);
        setEmpForm({
          name: '',
          role: 'دليفري',
          branch_id: 'b1',
          phone: '',
          weekly_hours: '70',
          weekly_wage: '1050',
          shift_hours: '8',
          shift_start_time: '12:00',
        });
        // Trigger attendance sync so new drivers appear immediately in delivery page dropdown
        const isDeliveryRole = ['دليفري', 'طيار', 'driver'].some(r =>
          empForm.role.toLowerCase().includes(r)
        );
        if (isDeliveryRole) {
          fetch('/api/attendance').catch(() => {});
        }
        await loadData(true);
      } else {
        const err = await res.json();
        setToast({ open: true, message: err.error || 'فشل إضافة الموظف', severity: 'error' });
      }
    } catch (e) {
      setToast({ open: true, message: 'حدث خطأ أثناء الاتصال', severity: 'error' });
    } finally {
      setSubmittingEmp(false);
    }
  };

  // Open Deduction Modal
  const handleOpenDeduction = (emp) => {
    setDedModal({
      open: true,
      employee: emp,
      reason: 'سلفة',
      amount: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Save Deduction / Advance
  const handleSaveDeduction = async () => {
    const val = parseFloat(dedModal.amount);
    if (isNaN(val) || val <= 0) {
      setToast({ open: true, message: 'يرجى كتابة قيمة صالحة للخصم / السلفة', severity: 'warning' });
      return;
    }
    setSubmittingDed(true);
    try {
      const res = await fetch('/api/employees/bonus-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: dedModal.employee.id,
          employee_name: dedModal.employee.name,
          type: 'deduction',
          category: dedModal.reason,
          amount: val,
          notes: dedModal.notes || dedModal.reason,
          month: dedModal.date ? dedModal.date.substring(0, 7) : new Date().toISOString().substring(0, 7)
        })
      });

      if (res.ok) {
        setToast({ open: true, message: `✅ تم تسجيل ${dedModal.reason} بمبلغ ${val} ج.م لـ ${dedModal.employee.name}`, severity: 'success' });
        setDedModal(prev => ({ ...prev, open: false }));
        await loadData(true);
      } else {
        const err = await res.json();
        setToast({ open: true, message: err.error || 'فشل حفظ الخصم', severity: 'error' });
      }
    } catch (err) {
      setToast({ open: true, message: 'حدث خطأ في الاتصال', severity: 'error' });
    } finally {
      setSubmittingDed(false);
    }
  };

  // Print Salary Slip
  const handlePrintSalary = (emp) => {
    const h = employeeHoursMap.get(emp.id) || { b1Hours: 0, b2Hours: 0, totalHours: 0 };
    const reqHours = parseFloat(emp.shift_hours ? emp.shift_hours * 6 : 70);
    const weeklyWage = parseFloat(emp.salary || emp.hourly_rate * reqHours || 1050);
    const hourlyRate = reqHours > 0 ? (weeklyWage / reqHours) : (parseFloat(emp.hourly_rate) || 15);
    const earnedGross = h.totalHours * hourlyRate;

    const empDeds = (allBonusDeductions || []).filter(d => String(d.employee_id) === String(emp.id) && d.type === 'deduction');
    const totalDeds = empDeds.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const netPay = earnedGross - totalDeds;

    printSalaryReceipt({
      employee: emp,
      payment_type: 'weekly',
      total_working_hours: h.totalHours,
      b1_hours: h.b1Hours,
      b2_hours: h.b2Hours,
      total_amount: earnedGross,
      deductions_total: totalDeds,
      net_amount: netPay,
      deductions: empDeds,
      notes: `مسير حساب ساعات الفروع (عزت: ${h.b1Hours} س | المسلة: ${h.b2Hours} س)`
    });
  };

  // Filter Employees
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter(emp => {
      const matchSearch = !searchQuery || 
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone?.includes(searchQuery);

      if (!matchSearch) return false;

      const state = employeeStateMap.get(emp.id);
      if (statusFilter === 'present') return state?.isWorking;
      if (statusFilter === 'absent') return !state?.isWorking;
      if (statusFilter === 'b1') return state?.isWorking && state?.activeBranch === 'b1';
      if (statusFilter === 'b2') return state?.isWorking && state?.activeBranch === 'b2';
      return true;
    });
  }, [employees, searchQuery, statusFilter, employeeStateMap]);

  // Overall Statistics
  const totalEmployeesCount = employees.length;
  const workingCount = Array.from(employeeStateMap.values()).filter(s => s.isWorking).length;
  const b1WorkingCount = Array.from(employeeStateMap.values()).filter(s => s.isWorking && s.activeBranch === 'b1').length;
  const b2WorkingCount = Array.from(employeeStateMap.values()).filter(s => s.isWorking && s.activeBranch === 'b2').length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F4F5F7', color: '#171717', pb: 10 }}>
      {/* Top Header */}
      <Box sx={{ bgcolor: '#161616', color: '#FFF', px: 2.5, py: 2, borderBottom: '3px solid #E65100' }}>
        <Box sx={{ maxWidth: 880, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              onClick={() => router.push('/')}
              sx={{ color: '#FFF', bgcolor: 'rgba(255,255,255,0.1)', minWidth: 38, height: 38, borderRadius: '10px', p: 0 }}
            >
              <ArrowBack />
            </Button>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, fontSize: { xs: '1.1rem', sm: '1.3rem' } }}>
                🥙 حواوشي البرادعي
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.75rem' }}>
                المسلة • عزت • نظام التمامات والبصمة السريعة
              </Typography>
            </Box>
          </Box>

          {/* Live Clock Badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<AccessTime sx={{ color: '#FCD34D !important', fontSize: 16 }} />}
              label={currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              sx={{ bgcolor: '#262626', color: '#FFF', fontWeight: 800, fontSize: '0.82rem', border: '1px solid #404040' }}
            />
            <IconButton onClick={() => loadData(false)} sx={{ color: '#FFF', bgcolor: '#262626', '&:hover': { bgcolor: '#333' } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Main Container */}
      <Box sx={{ maxWidth: 880, mx: 'auto', p: { xs: 1.5, sm: 2 } }}>
        
        {/* Navigation Tabs (3 Main Sections) */}
        <Paper
          elevation={0}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            p: 0.8,
            mb: 2,
            borderRadius: '14px',
            bgcolor: '#FFF',
            border: '1px solid #E2E8F0'
          }}
        >
          <Button
            onClick={() => setActiveTab(0)}
            sx={{
              py: 1.3,
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: { xs: '0.85rem', sm: '1rem' },
              bgcolor: activeTab === 0 ? '#171717' : 'transparent',
              color: activeTab === 0 ? '#FFF' : '#4B5563',
              '&:hover': { bgcolor: activeTab === 0 ? '#262626' : '#F3F4F6' }
            }}
          >
            👷 الحضور ({workingCount})
          </Button>

          <Button
            onClick={() => setActiveTab(1)}
            sx={{
              py: 1.3,
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: { xs: '0.85rem', sm: '1rem' },
              bgcolor: activeTab === 1 ? '#171717' : 'transparent',
              color: activeTab === 1 ? '#FFF' : '#4B5563',
              '&:hover': { bgcolor: activeTab === 1 ? '#262626' : '#F3F4F6' }
            }}
          >
            👥 الموظفين ({totalEmployeesCount})
          </Button>

          <Button
            onClick={() => setActiveTab(2)}
            sx={{
              py: 1.3,
              borderRadius: '10px',
              fontWeight: 900,
              fontSize: { xs: '0.85rem', sm: '1rem' },
              bgcolor: activeTab === 2 ? '#171717' : 'transparent',
              color: activeTab === 2 ? '#FFF' : '#4B5563',
              '&:hover': { bgcolor: activeTab === 2 ? '#262626' : '#F3F4F6' }
            }}
          >
            💵 المرتبات
          </Button>
        </Paper>

        {/* TAB 0: الحضور والتمامات */}
        {activeTab === 0 && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.5 }}>
              <Box sx={{ bgcolor: '#FFF', p: 1.2, borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>فرع عزت</Typography>
                <Typography variant="h6" sx={{ color: '#047857', fontWeight: 900 }}>{b1WorkingCount} شغال</Typography>
              </Box>
              <Box sx={{ bgcolor: '#FFF', p: 1.2, borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>فرع المسلة</Typography>
                <Typography variant="h6" sx={{ color: '#1D4ED8', fontWeight: 900 }}>{b2WorkingCount} شغال</Typography>
              </Box>
              <Box sx={{ bgcolor: '#FFF', p: 1.2, borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>إجمالي الحاضرين</Typography>
                <Typography variant="h6" sx={{ color: '#161616', fontWeight: 900 }}>{workingCount} / {totalEmployeesCount}</Typography>
              </Box>
            </Box>

            <Paper elevation={0} sx={{ p: 1.2, mb: 2, borderRadius: '12px', border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="🔍 ابحث بالاسم أو الوظيفة (دليفري، صنايعي، كاشير)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': { borderRadius: '9px', bgcolor: '#F8FAFC' }
                }}
              />
              <Stack direction="row" spacing={0.8} sx={{ overflowX: 'auto', pb: 0.5 }}>
                <Chip
                  label="الكل"
                  clickable
                  onClick={() => setStatusFilter('all')}
                  color={statusFilter === 'all' ? 'primary' : 'default'}
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  label="● شغالين الآن"
                  clickable
                  onClick={() => setStatusFilter('present')}
                  color={statusFilter === 'present' ? 'success' : 'default'}
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  label="فرع عزت"
                  clickable
                  onClick={() => setStatusFilter('b1')}
                  color={statusFilter === 'b1' ? 'success' : 'default'}
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  label="فرع المسلة"
                  clickable
                  onClick={() => setStatusFilter('b2')}
                  color={statusFilter === 'b2' ? 'primary' : 'default'}
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  label="○ غير مسجلين"
                  clickable
                  onClick={() => setStatusFilter('absent')}
                  color={statusFilter === 'absent' ? 'warning' : 'default'}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
            </Paper>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={36} sx={{ color: '#E65100' }} />
                <Typography sx={{ mt: 1.5, fontWeight: 700, color: '#64748B' }}>جاري تحميل التمامات...</Typography>
              </Box>
            ) : filteredEmployees.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '14px', bgcolor: '#FFF' }}>
                <Typography sx={{ fontWeight: 800, color: '#64748B' }}>لا يوجد موظفين يطابقون البحث</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {filteredEmployees.map((emp) => {
                  const state = employeeStateMap.get(emp.id) || { isWorking: false, activeBranch: 'b1' };
                  const hoursInfo = employeeHoursMap.get(emp.id) || { b1Hours: 0, b2Hours: 0, totalHours: 0 };
                  const isActing = actionLoadingId === emp.id;

                  return (
                    <Paper
                      key={emp.id}
                      elevation={0}
                      sx={{
                        p: 1.8,
                        borderRadius: '14px',
                        bgcolor: '#FFF',
                        border: '1.5px solid',
                        borderColor: state.isWorking ? (state.activeBranch === 'b2' ? '#3B82F6' : '#10B981') : '#E2E8F0',
                        boxShadow: state.isWorking ? '0 3px 10px rgba(0,0,0,0.04)' : 'none'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.15rem', color: '#171717' }}>
                            {emp.name}
                          </Typography>
                          <Chip
                            label={emp.role || 'عامل'}
                            size="small"
                            sx={{ bgcolor: '#F1F5F9', fontWeight: 800, fontSize: '0.75rem' }}
                          />
                        </Box>

                        <Box sx={{ textAlign: 'left' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.3,
                              borderRadius: '8px',
                              fontWeight: 900,
                              fontSize: '0.75rem',
                              bgcolor: state.isWorking ? (state.activeBranch === 'b2' ? '#DBEAFE' : '#DCFCE7') : '#F1F5F9',
                              color: state.isWorking ? (state.activeBranch === 'b2' ? '#1E40AF' : '#166534') : '#64748B'
                            }}
                          >
                            {state.isWorking 
                              ? `● شغال (فرع ${state.activeBranch === 'b2' ? 'المسلة' : 'عزت'})` 
                              : '○ غير مسجل'}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: '#64748B', fontWeight: 700, fontSize: '0.7rem' }}>
                            {state.isWorking && state.checkInTime
                              ? `حضور: ${new Date(state.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                              : `الفرع الأساسي: ${emp.branch_id === 'b2' ? 'المسلة' : 'عزت'}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, fontSize: '0.75rem' }}>
                          ساعات الأسبوع: <strong>عزت ({hoursInfo.b1Hours}س)</strong> • <strong>المسلة ({hoursInfo.b2Hours}س)</strong>
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 1
                        }}
                      >
                        <Button
                          variant="contained"
                          disabled={isActing}
                          onClick={() => handleOpenMove(emp, 'in')}
                          sx={{
                            bgcolor: state.isWorking ? '#E2E8F0' : '#171717',
                            color: state.isWorking ? '#64748B' : '#FFF',
                            fontWeight: 900,
                            borderRadius: '10px',
                            py: 1,
                            fontSize: '0.9rem',
                            '&:hover': { bgcolor: state.isWorking ? '#CBD5E1' : '#262626' }
                          }}
                        >
                          {state.isWorking ? 'تعديل حضور' : 'حضور'}
                        </Button>

                        <Button
                          variant="contained"
                          disabled={isActing || !state.isWorking}
                          onClick={() => handleOpenMove(emp, 'transfer')}
                          sx={{
                            bgcolor: '#EA580C',
                            color: '#FFF',
                            fontWeight: 900,
                            borderRadius: '10px',
                            py: 1,
                            fontSize: '0.9rem',
                            '&:hover': { bgcolor: '#C2410C' },
                            '&.Mui-disabled': { bgcolor: '#FED7AA', color: '#9A3412' }
                          }}
                        >
                          🔄 نقل
                        </Button>

                        <Button
                          variant="contained"
                          disabled={isActing || !state.isWorking}
                          onClick={() => handleOpenMove(emp, 'out')}
                          sx={{
                            bgcolor: '#DC2626',
                            color: '#FFF',
                            fontWeight: 900,
                            borderRadius: '10px',
                            py: 1,
                            fontSize: '0.9rem',
                            '&:hover': { bgcolor: '#B91C1C' },
                            '&.Mui-disabled': { bgcolor: '#FECACA', color: '#991B1B' }
                          }}
                        >
                          انصراف
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {/* TAB 1: الموظفين */}
        {activeTab === 1 && (
          <Box>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Add />}
              onClick={() => setAddEmpOpen(prev => !prev)}
              sx={{
                bgcolor: '#171717',
                color: '#FFF',
                fontWeight: 900,
                py: 1.5,
                borderRadius: '12px',
                fontSize: '1rem',
                mb: 2,
                '&:hover': { bgcolor: '#262626' }
              }}
            >
              ➕ إضافة موظف جديد
            </Button>

            {addEmpOpen && (
              <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: '14px', bgcolor: '#FFF', border: '2px solid #171717' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, color: '#171717' }}>
                  إضافة موظف جديد للنظام
                </Typography>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الاسم</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="اسم الموظف"
                      value={empForm.name}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, name: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الوظيفة</Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={empForm.role}
                        onChange={(e) => setEmpForm(prev => ({ ...prev, role: e.target.value }))}
                        sx={{ borderRadius: '9px' }}
                      >
                        <MenuItem value="دليفري">دليفري (طيار)</MenuItem>
                        <MenuItem value="طيار">طيار توصيل</MenuItem>
                        <MenuItem value="صنايعي">صنايعي حواوشي</MenuItem>
                        <MenuItem value="كاشير">كاشير</MenuItem>
                        <MenuItem value="عامل">عامل صالة / نظافة</MenuItem>
                        <MenuItem value="شيف">شيف تجهيز</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الفرع الأساسي</Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={empForm.branch_id}
                        onChange={(e) => setEmpForm(prev => ({ ...prev, branch_id: e.target.value }))}
                        sx={{ borderRadius: '9px' }}
                      >
                        <MenuItem value="b1">فرع عزت</MenuItem>
                        <MenuItem value="b2">فرع المسلة</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>ساعات الأسبوع المطلوبة</Typography>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      value={empForm.weekly_hours}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, weekly_hours: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الأجر الأسبوعي (ج.م)</Typography>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      value={empForm.weekly_wage}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, weekly_wage: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>رقم الهاتف (اختياري)</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="01xxxxxxxxx"
                      value={empForm.phone}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, phone: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  fullWidth
                  disabled={submittingEmp}
                  onClick={handleSaveEmployee}
                  sx={{
                    mt: 2,
                    py: 1.2,
                    bgcolor: '#171717',
                    color: '#FFF',
                    fontWeight: 900,
                    borderRadius: '10px',
                    '&:hover': { bgcolor: '#262626' }
                  }}
                >
                  {submittingEmp ? 'جاري الحفظ...' : 'حفظ الموظف'}
                </Button>
              </Paper>
            )}

            <Stack spacing={1}>
              {employees.map((emp) => {
                const reqHours = parseFloat(emp.shift_hours ? emp.shift_hours * 6 : 70);
                const wage = parseFloat(emp.salary || emp.hourly_rate * reqHours || 1050);
                return (
                  <Paper
                    key={emp.id}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: '#FFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#171717' }}>
                        {emp.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                        {emp.role} • {emp.branch_id === 'b2' ? 'فرع المسلة' : 'فرع عزت'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 900, color: '#047857', fontSize: '0.95rem' }}>
                        {wage} ج
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                        {reqHours} ساعة / أسبوع
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* TAB 2: المرتبات */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5, color: '#171717' }}>
              💵 كشوفات المرتبات والمستحقات المباشرة
            </Typography>

            <Stack spacing={2}>
              {employees.map((emp) => {
                const h = employeeHoursMap.get(emp.id) || { b1Hours: 0, b2Hours: 0, totalHours: 0 };
                const reqHours = parseFloat(emp.shift_hours ? emp.shift_hours * 6 : 70);
                const weeklyWage = parseFloat(emp.salary || (emp.hourly_rate ? emp.hourly_rate * reqHours : 1050));
                const hourlyRate = reqHours > 0 ? (weeklyWage / reqHours) : (parseFloat(emp.hourly_rate) || 15);
                const earnedGross = h.totalHours * hourlyRate;

                const empDeds = (allBonusDeductions || []).filter(
                  d => String(d.employee_id) === String(emp.id) && d.type === 'deduction'
                );
                const totalDeds = empDeds.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
                const netPay = earnedGross - totalDeds;

                const isNegative = netPay < -0.01;
                const isPositive = netPay > 0.01;

                return (
                  <Paper
                    key={emp.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: '14px',
                      bgcolor: '#FFF',
                      border: '1.5px solid #E2E8F0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#171717' }}>
                          {emp.name}
                        </Typography>
                        <Chip
                          label={emp.role || 'عامل'}
                          size="small"
                          sx={{ bgcolor: '#F1F5F9', fontWeight: 800, fontSize: '0.72rem' }}
                        />
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeduction(emp)}
                        sx={{ fontWeight: 900, borderRadius: '8px', border: '1.5px solid' }}
                      >
                        ➖ خصم / سلفة
                      </Button>
                    </Box>

                    <Box sx={{ py: 0.5 }}>
                      <Typography sx={{ color: '#475569', fontSize: '0.9rem', mb: 0.4 }}>
                        عزت: <strong>{h.b1Hours.toFixed(2)} س</strong> • المسلة: <strong>{h.b2Hours.toFixed(2)} س</strong>
                      </Typography>

                      <Typography sx={{ color: '#475569', fontSize: '0.9rem', mb: 0.4 }}>
                        إجمالي الساعات: <strong>{h.totalHours.toFixed(2)} / {reqHours} ساعة</strong>
                      </Typography>

                      <Typography sx={{ color: '#1E40AF', fontSize: '0.9rem', mb: 0.4, fontWeight: 800 }}>
                        مستحق الساعات: <strong>{earnedGross.toFixed(2)} ج.م</strong>
                      </Typography>

                      <Typography sx={{ color: '#DC2626', fontSize: '0.9rem', mb: 1, fontWeight: 800 }}>
                        الخصومات والسلف: <strong>{totalDeds.toFixed(2)} ج.م</strong>
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: isNegative ? '#FFF0F0' : (isPositive ? '#F0FDF4' : '#F8FAFC'),
                        border: '2px solid',
                        borderColor: isNegative ? '#DC2626' : (isPositive ? '#16A34A' : '#CBD5E1'),
                        textAlign: 'center',
                        mb: 1
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, display: 'block' }}>
                        صافي المستحق النهائي
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 900,
                          color: isNegative ? '#DC2626' : (isPositive ? '#16A34A' : '#171717'),
                          mt: 0.3
                        }}
                      >
                        {netPay.toFixed(2)} ج.م {isNegative ? '🔴 (مديونية)' : ''}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<Print />}
                      onClick={() => handlePrintSalary(emp)}
                      sx={{ fontWeight: 800, borderRadius: '8px', color: '#475569', borderColor: '#CBD5E1' }}
                    >
                      طباعة مسير الحساب
                    </Button>

                    {empDeds.length > 0 && (
                      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #E2E8F0' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', display: 'block', mb: 0.5 }}>
                          سجل الخصومات والسلف:
                        </Typography>
                        <Stack spacing={0.5}>
                          {empDeds.slice(0, 5).map(d => (
                            <Typography key={d.id} variant="caption" sx={{ color: '#64748B' }}>
                              • {d.created_at ? d.created_at.substring(0, 10) : ''} | <strong>{d.category || d.notes}</strong>: {d.amount} ج.م
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

      </Box>

      {/* MODAL: حركة التمام */}
      <Dialog
        open={moveModal.open}
        onClose={() => setMoveModal(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.2rem', pb: 1, color: '#171717' }}>
          {moveModal.mode === 'in' ? '🟢 تسجيل حضور: ' : (moveModal.mode === 'transfer' ? '🔄 نقل موظف: ' : '🔴 تسجيل انصراف: ')}
          {moveModal.employee?.name}
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {moveModal.mode !== 'out' && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الفرع</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={moveModal.branch}
                  onChange={(e) => setMoveModal(prev => ({ ...prev, branch: e.target.value }))}
                  sx={{ borderRadius: '9px' }}
                >
                  <MenuItem value="b1">فرع عزت</MenuItem>
                  <MenuItem value="b2">فرع المسلة</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>اليوم</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={moveModal.day}
                onChange={(e) => setMoveModal(prev => ({ ...prev, day: e.target.value }))}
                sx={{ borderRadius: '9px' }}
              >
                <MenuItem value="السبت">السبت</MenuItem>
                <MenuItem value="الأحد">الأحد</MenuItem>
                <MenuItem value="الاثنين">الاثنين</MenuItem>
                <MenuItem value="الثلاثاء">الثلاثاء</MenuItem>
                <MenuItem value="الأربعاء">الأربعاء</MenuItem>
                <MenuItem value="الخميس">الخميس</MenuItem>
                <MenuItem value="الجمعة">الجمعة</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الوقت</Typography>
            <TextField
              fullWidth
              type="time"
              size="small"
              value={moveModal.time}
              onChange={(e) => setMoveModal(prev => ({ ...prev, time: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMoveModal(prev => ({ ...prev, open: false }))} sx={{ fontWeight: 800, color: '#64748B' }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMovement}
            sx={{
              bgcolor: moveModal.mode === 'out' ? '#DC2626' : (moveModal.mode === 'transfer' ? '#EA580C' : '#171717'),
              color: '#FFF',
              fontWeight: 900,
              borderRadius: '10px',
              px: 3,
              '&:hover': { bgcolor: '#000' }
            }}
          >
            حفظ الحركة
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: تسجيل خصم / سلفة */}
      <Dialog
        open={dedModal.open}
        onClose={() => setDedModal(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.2rem', pb: 1, color: '#DC2626' }}>
          ➖ تسجيل خصم أو سلفة
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>الموظف</Typography>
            <TextField
              fullWidth
              size="small"
              disabled
              value={dedModal.employee?.name || ''}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px', bgcolor: '#F1F5F9' } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>سبب الخصم / النوع</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={dedModal.reason}
                onChange={(e) => setDedModal(prev => ({ ...prev, reason: e.target.value }))}
                sx={{ borderRadius: '9px' }}
              >
                <MenuItem value="سلفة">سلفة نقدية</MenuItem>
                <MenuItem value="عقوبة">عقوبة / جزاء</MenuItem>
                <MenuItem value="تأخير">خصم تأخير</MenuItem>
                <MenuItem value="أكل">وجبات / أكل</MenuItem>
                <MenuItem value="تالف">توالف / إتلاف</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>القيمة (جنيه)</Typography>
            <TextField
              fullWidth
              type="number"
              size="small"
              placeholder="0.00"
              value={dedModal.amount}
              onChange={(e) => setDedModal(prev => ({ ...prev, amount: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>التاريخ</Typography>
            <TextField
              fullWidth
              type="date"
              size="small"
              value={dedModal.date}
              onChange={(e) => setDedModal(prev => ({ ...prev, date: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDedModal(prev => ({ ...prev, open: false }))} sx={{ fontWeight: 800, color: '#64748B' }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={submittingDed}
            onClick={handleSaveDeduction}
            sx={{ fontWeight: 900, borderRadius: '10px', px: 3 }}
          >
            {submittingDed ? 'جاري الحفظ...' : 'حفظ الخصم'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Alert */}
      {toast.open && (
        <Alert
          severity={toast.severity}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            right: 24,
            maxWidth: 400,
            mx: 'auto',
            zIndex: 9999,
            fontWeight: 800,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        >
          {toast.message}
        </Alert>
      )}
    </Box>
  );
}