'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress, Alert,
  Tabs, Tab, Tooltip, Stack, Divider
} from '@mui/material';
import {
  HowToReg, DeliveryDining, AccessTime, CheckCircle, Warning,
  PersonAdd, Logout, Refresh, SwapVert, BadgeOutlined, Check, Clear,
  EditCalendar, AccountBalanceWallet, Timer, Schedule, History, PlayArrow
} from '@mui/icons-material';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import DeliveryTimerBadge from '@/components/delivery/DeliveryTimerBadge';

export default function AttendancePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const isAdmin = user?.role === 'admin' || !user?.role;

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [activeQueue, setActiveQueue] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [unpaidSummary, setUnpaidSummary] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [deliveryTimerMinutes, setDeliveryTimerMinutes] = useState(30);

  // Quick Check-in Modal
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedBranchForCheckIn, setSelectedBranchForCheckIn] = useState('b1');
  const [checkInTimeInput, setCheckInTimeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Manual / Edit Attendance Modal for HR
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    attendanceId: null,
    employeeId: '',
    employeeName: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    shiftStartTime: '12:00',
    scheduledHours: '8',
    workingHours: '8',
    lateMinutes: '0',
    lateHours: '0',
    notes: 'تسجيل تمام وحضور من الإدارة'
  });

  const fetchAttendance = async (isSilent = false) => {
    if (!isSilent && activeQueue.length === 0 && employees.length === 0) setLoading(true);
    try {
      const res = await fetch(`/api/attendance?branch_id=${selectedBranchId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveQueue(data.activeQueue || []);
        setAllDrivers(data.allDrivers || []);
        setTodayAttendance(data.todayAttendance || []);
        setUnpaidSummary(data.unpaidSummary || []);
        setRecentLogs(data.recentAttendanceLogs || []);
      }

      const empRes = await fetch(`/api/employees?branch_id=${selectedBranchId}`);
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData || []);
      }

      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setObj = await setRes.json();
        if (setObj.delivery_timer_minutes) {
          setDeliveryTimerMinutes(parseInt(setObj.delivery_timer_minutes) || 30);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(false);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchAttendance(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedBranchId]);

  // Combine Drivers and Employees into unified Staff Options list for Check-In Modal
  const allStaffOptions = [];
  employees.forEach(emp => {
    const isDriver = emp.role === 'طيار' || emp.role === 'driver' || emp.role?.includes('طيار') || emp.role?.includes('دليفري') || emp.role?.toLowerCase()?.includes('driver');
    const driverObj = isDriver ? allDrivers.find(d => d.name === emp.name) : null;
    const isClockedIn = emp.isClockedIn || emp.status === 'active' || activeQueue.some(q => q.driver_name === emp.name);

    allStaffOptions.push({
      id: emp.id,
      name: emp.name,
      role: emp.role || 'موظف',
      isDriver: isDriver,
      driverId: driverObj ? driverObj.id : emp.id,
      branchName: emp.branch_name || 'الفرع الرئيسي',
      isClockedIn,
      label: `${isDriver ? '🛵' : '👤'} ${emp.name} (${emp.role || 'موظف'} - ${emp.branch_name || 'الرئيسي'}) ${isClockedIn ? '✔️ حاضر بالسيستم' : ''}`
    });
  });

  // Also include any standalone drivers not in employees table
  allDrivers.forEach(d => {
    if (!allStaffOptions.some(opt => opt.name === d.name)) {
      const isCheckedIn = activeQueue.some(q => q.driver_id === d.id || q.driver_name === d.name);
      allStaffOptions.push({
        id: d.id,
        name: d.name,
        role: 'طيار دليفري',
        isDriver: true,
        driverId: d.id,
        branchName: d.branch_name || 'الفرع الرئيسي',
        isClockedIn: isCheckedIn,
        label: `🛵 ${d.name} (طيار دليفري - ${d.branch_name || 'الرئيسي'}) ${isCheckedIn ? '✔️ متواجد بالدور' : ''}`
      });
    }
  });

  const handleQuickCheckIn = async (staffId, staffName, isDriver = false) => {
    try {
      const targetEmp = employees.find(e => e.id === staffId);
      const isActuallyDriver = Boolean(
        isDriver || 
        targetEmp?.role?.includes('طيار') || 
        targetEmp?.role?.includes('دليفري') || 
        targetEmp?.role?.toLowerCase()?.includes('driver')
      );
      const targetBranch = targetEmp?.branchId || targetEmp?.branch_id || (selectedBranchId !== 'all' ? selectedBranchId : 'b1');

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_in',
          staff_id: staffId,
          employee_id: staffId,
          driver_name: staffName,
          employee_name: staffName,
          is_driver: isActuallyDriver,
          branch_id: targetBranch
        })
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (e) {
      console.error('Quick checkin error:', e);
    }
  };

  const handleModalCheckIn = async () => {
    if (!selectedStaffId) return;
    setSubmitting(true);
    try {
      const staffObj = allStaffOptions.find(s => s.id === selectedStaffId);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_in',
          staff_id: staffObj?.id,
          employee_id: staffObj?.id,
          driver_id: staffObj?.driverId || staffObj?.id,
          driver_name: staffObj?.name,
          employee_name: staffObj?.name,
          is_driver: staffObj?.isDriver,
          branch_id: selectedBranchForCheckIn
        })
      });
      if (res.ok) {
        setCheckInOpen(false);
        setSelectedStaffId('');
        fetchAttendance();
      }
    } catch (err) {
      console.error('Checkin error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (attendanceId, staffId, staffName) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_out',
          attendance_id: attendanceId,
          staff_id: staffId,
          employee_id: staffId,
          driver_name: staffName,
          employee_name: staffName
        })
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  // Open HR Manual Attendance Dialog
  const handleOpenManualModal = (emp = null, existingAtt = null) => {
    const defaultEmp = emp || (employees && employees.length > 0 ? employees[0] : null);
    const nowStr = new Date().toTimeString().slice(0, 5);

    if (existingAtt) {
      const cIn = existingAtt.check_in_time ? new Date(existingAtt.check_in_time).toTimeString().slice(0, 5) : (existingAtt.shift_start_time || '12:00');
      const cOut = existingAtt.check_out_time ? new Date(existingAtt.check_out_time).toTimeString().slice(0, 5) : '';

      setManualForm({
        attendanceId: existingAtt.id,
        employeeId: existingAtt.employee_id,
        employeeName: existingAtt.employee_name,
        date: existingAtt.attendance_date ? String(existingAtt.attendance_date).split('T')[0] : new Date().toISOString().split('T')[0],
        checkInTime: cIn,
        checkOutTime: cOut,
        shiftStartTime: existingAtt.shift_start_time || '12:00',
        scheduledHours: String(existingAtt.scheduled_hours || 8),
        workingHours: String(existingAtt.working_hours || 8),
        lateMinutes: String(existingAtt.late_minutes || 0),
        lateHours: String(existingAtt.late_hours || 0),
        notes: existingAtt.notes || 'تعديل تمام وحضور من الإدارة'
      });
    } else {
      setManualForm({
        attendanceId: null,
        employeeId: defaultEmp?.id || '',
        employeeName: defaultEmp?.name || '',
        date: new Date().toISOString().split('T')[0],
        checkInTime: defaultEmp?.shift_start_time || '12:00',
        checkOutTime: '',
        shiftStartTime: defaultEmp?.shift_start_time || '12:00',
        scheduledHours: String(defaultEmp?.shift_hours || 8),
        workingHours: String(defaultEmp?.shift_hours || 8),
        lateMinutes: '0',
        lateHours: '0',
        notes: 'تسجيل تمام وحضور يدوي من الإدارة'
      });
    }
    setManualModalOpen(true);
  };

  const handleSaveManualAttendance = async () => {
    if (!manualForm.employeeId) return;
    setSubmitting(true);
    try {
      const emp = employees.find(e => e.id === manualForm.employeeId);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_attendance',
          attendance_id: manualForm.attendanceId,
          staff_id: manualForm.employeeId,
          employee_id: manualForm.employeeId,
          employee_name: manualForm.employeeName || emp?.name,
          attendance_date: manualForm.date,
          check_in_time: `${manualForm.date}T${manualForm.checkInTime || '12:00'}:00`,
          check_out_time: manualForm.checkOutTime ? `${manualForm.date}T${manualForm.checkOutTime}:00` : null,
          shift_start_time: manualForm.shiftStartTime || '12:00',
          scheduled_hours: parseFloat(manualForm.scheduledHours || 8),
          working_hours: parseFloat(manualForm.workingHours || 8),
          late_minutes: parseInt(manualForm.lateMinutes || 0),
          late_hours: parseFloat(manualForm.lateHours || 0),
          notes: manualForm.notes || 'تسجيل يدوي من الإدارة',
          branch_id: emp?.branch_id || selectedBranchId !== 'all' ? selectedBranchId : 'b1'
        })
      });
      if (res.ok) {
        setManualModalOpen(false);
        fetchAttendance();
      }
    } catch (e) {
      console.error('Error saving manual attendance:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async (attId) => {
    if (!confirm('هل أنت متأكد من حذف سجل التمام هذا؟')) return;
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_attendance', attendance_id: attId })
      });
      fetchAttendance();
    } catch (e) {}
  };

  const readyCount = activeQueue.filter(q => q.status === 'ready').length;
  const onDeliveryCount = activeQueue.filter(q => q.status === 'on_delivery').length;
  const clockedInEmployeesCount = employees.filter(e => e.isClockedIn || e.status === 'active').length;
  const totalLateTodayCount = todayAttendance.filter(a => parseInt(a.late_minutes || 0) > 0).length;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, pb: { xs: 10, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '16px', bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HowToReg sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1A1A2E', fontSize: { xs: '1.3rem', md: '1.8rem' } }}>
              تمامات الموظفين والطيارين وحساب الساعات والتأخير
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 600 }}>
              تسجيل التمامات، رصد ساعات الحضور والتأخير تلقائياً، والربط المباشر مع حساب الرواتب الأسبوعية
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                sx={{ borderRadius: '12px', bgcolor: '#FFF', fontWeight: 800 }}
              >
                <MenuItem value="all">🏢 كافـة الفـروع</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => fetchAttendance()}
            sx={{ borderRadius: '12px', fontWeight: 800 }}
          >
            تحديث
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<EditCalendar />}
            onClick={() => handleOpenManualModal()}
            sx={{ borderRadius: '12px', fontWeight: 800, px: 2, bgcolor: '#2563EB' }}
          >
            + تسجيل تمام يدوي لـ HR
          </Button>

          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCheckInOpen(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '12px', fontWeight: 900, px: 2.5 }}
          >
            إثبات تمام موظف / طيار (حضور)
          </Button>

          <Button
            variant="contained"
            color="warning"
            startIcon={<AccountBalanceWallet />}
            onClick={() => router.push('/salaries')}
            sx={{ borderRadius: '12px', fontWeight: 900, px: 2, bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
          >
            💰 شاشة القبض والمرتبات
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFFFFF' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HowToReg />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>الموظفين الحاضرين بالسيستم</Typography>
              <Typography variant="h6" fontWeight={900} color="#059669">{clockedInEmployeesCount} / {employees.length} موظف</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFFFFF' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeliveryDining />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>الطيارين المتواجدين بالدور</Typography>
              <Typography variant="h6" fontWeight={900} color="#2563EB">{activeQueue.length} طيار</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFFFFF' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Warning />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>تأخيرات مسجلة اليوم</Typography>
              <Typography variant="h6" fontWeight={900} color="#DC2626">{totalLateTodayCount} موظف متأخر</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFFFFF' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccessTime />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>نظام المرتب السائد</Typography>
              <Typography variant="h6" fontWeight={900} color="#D97706">🗓️ أسبوعي (Weekly)</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Tabs Navigation */}
      <Paper elevation={1} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', bgcolor: '#FFF' }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: 2,
            minHeight: 52,
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.95rem',
              minHeight: 52
            }
          }}
        >
          <Tab icon={<HowToReg sx={{ fontSize: 20 }} />} iconPosition="start" label="👥 تمام وسجل حضور الموظفين العام والتأخيرات" />
          <Tab icon={<SwapVert sx={{ fontSize: 20 }} />} iconPosition="start" label={`🛵 طابور دور الطيارين (${activeQueue.length})`} />
          <Tab icon={<History sx={{ fontSize: 20 }} />} iconPosition="start" label="📜 سجل التمامات السابقة وتعديلات HR" />
        </Tabs>
      </Paper>

      {/* TAB 0: ALL EMPLOYEES ATTENDANCE & REAL-TIME TRACKING */}
      {tabValue === 0 && (
        <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E5E7EB', bgcolor: '#FFF' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={900} color="#1A1A2E">
                👥 تمام الحضور والانصراف اليومي وسجل أيام الأسبوع الحالية
              </Typography>
              <Typography variant="caption" color="text.secondary">
                يوضح ميعاد الشيفت المقرَّر، وقت إثبات التمام الفعلي، التأخيرات المحتسبة بالدقيقة، وإجمالي الأيام والساعات المحضورة بالدورة الأسبوعية الجارية
              </Typography>
            </Box>
            <Chip label="حساب التأخير والساعات تلقائي" color="primary" size="small" variant="outlined" sx={{ fontWeight: 800 }} />
          </Box>

          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={32} /></Box>
          ) : employees.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 700 }}>
              لا يوجد موظفين مسجلين حالياً. يمكنك إضافة الموظفين من شاشة المرتبات.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>الموظف والفرع</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>الوظيفة ونظام الراتب</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>ميعاد الشيفت الرسمي</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>تمام اليوم والتأخير</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>أيام وساعات الدورة الحالية</TableCell>
                    <TableCell sx={{ fontWeight: 900 }} align="center">إجراءات التمام السريعة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((emp) => {
                    const todayRecord = todayAttendance.find(a => a.employee_id === emp.id);
                    const isClockedIn = emp.isClockedIn || emp.status === 'active';
                    const isDriver = emp.role?.includes('طيار') || emp.role?.includes('دليفري') || emp.role?.toLowerCase()?.includes('driver');

                    // Lateness display
                    let lateDisplay = null;
                    if (todayRecord) {
                      const lateM = parseInt(todayRecord.late_minutes || 0);
                      const lateH = parseFloat(todayRecord.late_hours || 0);
                      if (lateM > 0) {
                        lateDisplay = (
                          <Chip
                            icon={<Warning sx={{ fontSize: '14px !important' }} />}
                            label={`تأخير ${lateM} دقيقة (-${lateH} س)`}
                            size="small"
                            sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 900, height: 22, fontSize: '0.75rem' }}
                          />
                        );
                      } else {
                        lateDisplay = (
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                            label="في الميعاد 🟢"
                            size="small"
                            sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 900, height: 22, fontSize: '0.75rem' }}
                          />
                        );
                      }
                    }

                    const checkInFormatted = todayRecord?.check_in_time
                      ? new Date(todayRecord.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                      : (emp.currentCheckInTime ? new Date(emp.currentCheckInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-');

                    return (
                      <TableRow key={emp.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: isClockedIn ? '#D1FAE5' : '#F1F5F9', color: isClockedIn ? '#059669' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                              {isDriver ? '🛵' : '👤'}
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={800} color="#1E293B">
                                {emp.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                🏢 {emp.branch_name || 'الفرع الرئيسي'} {emp.phone ? `| 📞 ${emp.phone}` : ''}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {emp.role}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                            <Chip
                              label={emp.salaryType === 'weekly' ? '🗓️ أسبوعي' : (emp.salaryType === 'hourly' ? '⏱️ بالساعة' : '📅 شهري')}
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800, bgcolor: emp.salaryType === 'weekly' ? '#FEF3C7' : '#EFF6FF', color: emp.salaryType === 'weekly' ? '#92400E' : '#1E40AF' }}
                            />
                            {emp.salaryType === 'weekly' && emp.weeklyRate > 0 && (
                              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                {emp.weeklyRate} ج.م/أسبوع
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Schedule sx={{ fontSize: 16, color: '#3B82F6' }} />
                            <Typography variant="body2" fontWeight={800}>
                              {emp.shiftStartTime || '12:00'} (شيفت {emp.shiftHours || 8} ساعات)
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            سماح: {emp.gracePeriodMinutes || 15} دقيقة
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {isClockedIn ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Chip label="🟢 حاضر بالشيفت" size="small" color="success" sx={{ fontWeight: 800, height: 22 }} />
                                <Typography variant="caption" fontWeight={800}>
                                  تمام: {checkInFormatted}
                                </Typography>
                              </Box>
                              {lateDisplay}
                            </Box>
                          ) : todayRecord ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Chip label="انتهى الشيفت / منصرف" size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
                              {lateDisplay}
                            </Box>
                          ) : (
                            <Chip label="⚪ لم يحضر اليوم بعد" size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 700 }} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                            <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                              <Chip
                                label={`🗓️ ${emp.unpaidDaysCount || 0} يوم`}
                                size="small"
                                sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 900, height: 22 }}
                              />
                              <Chip
                                label={`⏱️ ${parseFloat(emp.unpaidWorkingHours || 0).toFixed(1)} ساعة`}
                                size="small"
                                sx={{ bgcolor: '#F0FDF4', color: '#15803D', fontWeight: 900, height: 22 }}
                              />
                            </Box>
                            {parseFloat(emp.unpaidLateHours || 0) > 0 && (
                              <Typography variant="caption" color="error.main" fontWeight="bold">
                                ⚠️ إجمالي التأخير: {emp.unpaidLateHours} ساعة ({emp.unpaidLateMinutes} دقيقة)
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {isClockedIn ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Logout />}
                                onClick={() => handleCheckOut(todayRecord?.id, emp.id, emp.name)}
                                sx={{ borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem' }}
                              >
                                تسجيل انصراف
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<PlayArrow />}
                                onClick={() => handleQuickCheckIn(emp.id, emp.name, isDriver)}
                                sx={{ borderRadius: '8px', fontWeight: 900, fontSize: '0.75rem', bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                              >
                                إثبات تمام (حضور)
                              </Button>
                            )}

                            <Tooltip title="تعديل تمام / إضافة عذر أو إجازة">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenManualModal(emp, todayRecord)}
                                sx={{ border: '1px solid #CBD5E1', borderRadius: '8px' }}
                              >
                                <EditCalendar fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* TAB 1: DRIVER QUEUE SECTION */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1.5px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapVert sx={{ color: '#10B981' }} />
              <Typography variant="h6" fontWeight={800} color="#1A1A2E">
                📋 طابور دور الطيارين (مرتب تلقائياً بالدقيقة)
              </Typography>
            </Box>
            <Chip label="الترتيب تلقائي بالدقيقة" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
          </Box>

          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={32} /></Box>
          ) : activeQueue.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 700 }}>
              لا يوجد طيارين مسجلين بالسيستم حالياً. اضغط على زر "إثبات تمام موظف / طيار (حضور)" لبدء طابور التوصيل.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {(() => {
                const readyQueue = (activeQueue || []).filter(q => q.status === 'ready');

                return activeQueue.map((item) => {
                  const isOnDelivery = item.status === 'on_delivery';
                  const readyIndex = readyQueue.findIndex(q => q.id === item.id);
                  const isTopReady = !isOnDelivery && readyIndex === 0;

                  let badgeLabel = `🟢 الدور ${readyIndex + 1}`;
                  let badgeStyle = { bgcolor: '#E5E7EB', color: '#374151' };
                  let cardStyle = { borderColor: '#E5E7EB', bgcolor: '#FFFFFF' };

                  if (isOnDelivery) {
                    badgeLabel = '🛵 في مشوار توصيل (خارج بالطلب)';
                    badgeStyle = { bgcolor: '#3B82F6', color: '#FFFFFF' };
                    cardStyle = { borderColor: '#3B82F6', bgcolor: '#EFF6FF' };
                  } else if (isTopReady) {
                    badgeLabel = '👑 الدور 1 (التالي للخروج)';
                    badgeStyle = { bgcolor: '#10B981', color: '#FFFFFF' };
                    cardStyle = { borderColor: '#10B981', bgcolor: '#F0FDF4' };
                  }

                  const formattedTime = item.check_in_time
                    ? new Date(item.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                    : '-';

                  return (
                    <Grid xs={12} sm={6} md={4} key={item.id}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: '16px',
                          border: '2px solid',
                          ...cardStyle,
                          boxShadow: isTopReady ? '0 4px 14px rgba(16, 185, 129, 0.2)' : (isOnDelivery ? '0 4px 14px rgba(59, 130, 246, 0.15)' : 'none'),
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Chip
                              label={badgeLabel}
                              size="small"
                              sx={{
                                ...badgeStyle,
                                fontWeight: 900,
                                fontSize: '0.8rem'
                              }}
                            />
                            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700 }}>
                              الفرع: {item.branch_name || 'الرئيسي'}
                            </Typography>
                          </Box>

                          <Typography variant="h6" fontWeight={800} sx={{ color: '#1A1A2E', mb: 0.5 }}>
                            {item.driver_name}
                          </Typography>

                          <Typography variant="body2" sx={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                            <AccessTime sx={{ fontSize: 16 }} />
                            <span>وقت التمام: {formattedTime}</span>
                          </Typography>

                          {/* Delivery Timer status if out on order */}
                          <Box sx={{ mb: 2 }}>
                            {item.status === 'on_delivery' ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                <Chip
                                  icon={<DeliveryDining />}
                                  label="🛵 خارج في أوردر توصيل"
                                  color="warning"
                                  size="small"
                                  sx={{ fontWeight: 800 }}
                                />
                                {item.check_in_time && (
                                  <DeliveryTimerBadge
                                    dispatchedAt={item.check_in_time}
                                    targetMinutes={deliveryTimerMinutes}
                                  />
                                )}
                              </Box>
                            ) : (
                              <Chip
                                icon={<CheckCircle />}
                                label="🟢 جاهز للخروج بالطلب"
                                color="success"
                                variant="outlined"
                                size="small"
                                sx={{ fontWeight: 800 }}
                              />
                            )}
                          </Box>

                          {/* Actions */}
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, borderTop: '1px solid #F3F4F6' }}>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Logout />}
                              onClick={() => handleCheckOut(item.id, item.driver_id, item.driver_name)}
                              sx={{ fontWeight: 700 }}
                            >
                              تسجيل انصراف
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                });
              })()}
            </Grid>
          )}
        </Paper>
      )}

      {/* TAB 2: ATTENDANCE HISTORY LOGS FOR HR */}
      {tabValue === 2 && (
        <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E5E7EB', bgcolor: '#FFF' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={900} color="#1A1A2E">
              📜 سجل التمامات السابقة والعمليات المسجلة
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<EditCalendar />}
              onClick={() => handleOpenManualModal()}
              sx={{ borderRadius: '10px', fontWeight: 800 }}
            >
              + إضافة تمام يدوي جديد
            </Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>اسم الموظف</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>الوظيفة والفرع</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>وقت الحضور</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>وقت الانصراف</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>ساعات العمل</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>التأخير</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>حالة الصرف</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>ملاحظات</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900 }}>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {log.attendance_date ? String(log.attendance_date).split('T')[0] : '-'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{log.employee_name}</TableCell>
                    <TableCell>{log.employee_role} ({log.branch_name || 'الرئيسي'})</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#059669' }}>
                      {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#DC2626' }}>
                      {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'قيد العمل 🟢'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{parseFloat(log.working_hours || 0).toFixed(1)} س</TableCell>
                    <TableCell>
                      {parseInt(log.late_minutes || 0) > 0 ? (
                        <Chip label={`⚠️ تأخير ${log.late_minutes} د (${log.late_hours} س)`} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                      ) : (
                        <Chip label="في الميعاد 🟢" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.is_paid ? '✔️ تم الصرف والقبض' : '⏳ جاري / مستحق'}
                        size="small"
                        sx={{
                          bgcolor: log.is_paid ? '#D1FAE5' : '#FEF3C7',
                          color: log.is_paid ? '#065F46' : '#92400E',
                          fontWeight: 800,
                          height: 20,
                          fontSize: '0.7rem'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{log.notes || '-'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenManualModal(null, log)}>
                          <EditCalendar fontSize="small" />
                        </IconButton>
                        {!log.is_paid && (
                          <IconButton size="small" color="error" onClick={() => handleDeleteAttendance(log.id)}>
                            <Clear fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {recentLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                      لا توجد سجلات تمامات سابقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* QUICK CHECK-IN MODAL */}
      <Dialog open={checkInOpen} onClose={() => setCheckInOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>إثبات تمام حضور الموظفين والطيارين</DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            اختر الموظف أو طيار الدليفري لإثبات التمام الفعلي اليوم وسيتم احتساب التأخير ومقارنته بموعد الشيفت تلقائياً.
          </Typography>

          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>اختر الموظف / الطيار</InputLabel>
            <Select
              value={selectedStaffId}
              label="اختر الموظف / الطيار"
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              {allStaffOptions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>الفرع المتواجد فيه</InputLabel>
            <Select
              value={selectedBranchForCheckIn}
              label="الفرع المتواجد فيه"
              onChange={(e) => setSelectedBranchForCheckIn(e.target.value)}
            >
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCheckInOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!selectedStaffId || submitting}
            onClick={handleModalCheckIn}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, fontWeight: 900 }}
          >
            {submitting ? 'جاري التسجيل...' : 'إثبات التمام (حضور)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MANUAL / EDIT ATTENDANCE DIALOG FOR HR */}
      <Dialog open={manualModalOpen} onClose={() => setManualModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {manualForm.attendanceId ? '✏️ تعديل سجل التمام وساعات الحضور' : '➕ تسجيل تمام وحضور يدوي لـ HR'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            يمكن لـ HR تسجيل أو تعديل ساعات العمل أو تسجيل عذر أو تعديل التأخير المحتسب لأي يوم.
          </Typography>

          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>الموظف</InputLabel>
            <Select
              value={manualForm.employeeId}
              label="الموظف"
              disabled={Boolean(manualForm.attendanceId)}
              onChange={(e) => {
                const empId = e.target.value;
                const emp = employees.find(x => x.id === empId);
                setManualForm(prev => ({
                  ...prev,
                  employeeId: empId,
                  employeeName: emp?.name || '',
                  shiftStartTime: emp?.shiftStartTime || '12:00',
                  scheduledHours: String(emp?.shiftHours || 8),
                  workingHours: String(emp?.shiftHours || 8)
                }));
              }}
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  👤 {emp.name} ({emp.role} - {emp.branch_name || 'الرئيسي'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid xs={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ اليوم"
                value={manualForm.date}
                onChange={(e) => setManualForm(prev => ({ ...prev, date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="موعد بداية الشيفت المقرر"
                value={manualForm.shiftStartTime}
                onChange={(e) => setManualForm(prev => ({ ...prev, shiftStartTime: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="وقت إثبات الحضور الفعلي"
                value={manualForm.checkInTime}
                onChange={(e) => setManualForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="وقت الانصراف (اختياري)"
                value={manualForm.checkOutTime}
                onChange={(e) => setManualForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="ساعات العمل المحتسبة"
                value={manualForm.workingHours}
                onChange={(e) => setManualForm(prev => ({ ...prev, workingHours: e.target.value }))}
                inputProps={{ step: '0.5', min: '0' }}
              />
            </Grid>
            <Grid xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="ساعات التأخير المخصومة"
                value={manualForm.lateHours}
                onChange={(e) => {
                  const lH = parseFloat(e.target.value) || 0;
                  setManualForm(prev => ({ ...prev, lateHours: e.target.value, lateMinutes: String(Math.round(lH * 60)) }));
                }}
                inputProps={{ step: '0.25', min: '0' }}
                helperText={`${manualForm.lateMinutes || 0} دقيقة تأخير`}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            size="small"
            label="ملاحظات وبيان التمام / العذر"
            multiline
            rows={2}
            value={manualForm.notes}
            onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setManualModalOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!manualForm.employeeId || submitting}
            onClick={handleSaveManualAttendance}
            sx={{ bgcolor: '#2563EB', fontWeight: 900 }}
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ التمام'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
