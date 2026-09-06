'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, Chip,
  TextField, InputAdornment, IconButton, Dialog, DialogContent,
  CircularProgress, Alert, Stack, Avatar, FormControl, Select, MenuItem,
  LinearProgress, Tooltip, Fade
} from '@mui/material';
import {
  Fingerprint, CheckCircle, Cancel, AccessTime, Schedule,
  DeliveryDining, Person, Search, Clear, Refresh, Store,
  TrendingUp, TrendingDown, Speed, BadgeOutlined, ArrowBack,
  Login, Logout, Star, Celebration, WarningAmber
} from '@mui/icons-material';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

// Friendly synthesized audio chime for instant touch feedback
function playChime(type = 'in') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'in') {
      // Cheerful rising 2-tone chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Warm departure chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.22); // C5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {}
}

export default function FingerprintKioskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { branches, selectedBranchId, setSelectedBranchId, fetchBranches } = useBranchStore();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [activeQueue, setActiveQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, present, absent, staff, drivers
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Quick auto-dismiss confirmation modal
  const [resultModal, setResultModal] = useState({
    open: false,
    type: 'check_in', // 'check_in' | 'check_out'
    employeeName: '',
    timeStr: '',
    lateMinutes: 0,
    workingHours: 0,
    overtimeHours: 0,
    earlyLeaveHours: 0,
    earlyLeaveMinutes: 0,
    message: '',
    countdown: 3
  });

  const countdownIntervalRef = useRef(null);

  // Keep Clock ticking live every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const branchParam = selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : '';
      const [empRes, attRes] = await Promise.all([
        fetch(`/api/employees${branchParam ? `?branch_id=${branchParam}` : ''}`),
        fetch(`/api/attendance${branchParam ? `?branch_id=${branchParam}` : ''}`)
      ]);

      if (empRes.ok) {
        const emps = await empRes.json();
        setEmployees(Array.isArray(emps) ? emps : []);
      }
      if (attRes.ok) {
        const attData = await attRes.json();
        setTodayAttendance(attData.todayAttendance || []);
        setActiveQueue(attData.activeQueue || []);
      }
    } catch (err) {
      console.error('Error fetching fingerprint data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    loadData(false);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedBranchId]);

  // Merge employees with their live attendance state
  const enrichedStaff = useMemo(() => {
    return employees.map((emp) => {
      // Find today's attendance record
      const todayRecord = todayAttendance.find((att) => att.employee_id === emp.id);
      const isClockedIn = Boolean(
        (emp.is_clocked_in && parseInt(emp.is_clocked_in) > 0) ||
        (todayRecord && !todayRecord.check_out_time)
      );

      const checkInTime = todayRecord?.check_in_time || emp.current_check_in_time;
      let durationHours = 0;
      let durationMinutes = 0;
      if (isClockedIn && checkInTime) {
        const diffMs = Math.max(0, currentTime.getTime() - new Date(checkInTime).getTime());
        durationHours = Math.floor(diffMs / (1000 * 60 * 60));
        durationMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      }

      const isDriver = Boolean(
        emp.role?.includes('طيار') ||
        emp.role?.includes('دليفري') ||
        emp.role?.toLowerCase()?.includes('driver')
      );

      return {
        ...emp,
        isClockedIn,
        attendanceId: todayRecord?.id || null,
        checkInTime,
        checkOutTime: todayRecord?.check_out_time,
        durationHours,
        durationMinutes,
        isDriver,
        shiftStartTime: emp.shift_start_time || '12:00',
        shiftHours: parseFloat(emp.shift_hours || 8.0)
      };
    });
  }, [employees, todayAttendance, currentTime]);

  // Filtered List
  const filteredStaff = useMemo(() => {
    let list = enrichedStaff;

    if (filterRole === 'present') {
      list = list.filter(e => e.isClockedIn);
    } else if (filterRole === 'absent') {
      list = list.filter(e => !e.isClockedIn);
    } else if (filterRole === 'drivers') {
      list = list.filter(e => e.isDriver);
    } else if (filterRole === 'staff') {
      list = list.filter(e => !e.isDriver);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
      );
    }

    // Sort: Clocked-in first, then alphabetical
    return list.sort((a, b) => {
      if (a.isClockedIn && !b.isClockedIn) return -1;
      if (!a.isClockedIn && b.isClockedIn) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [enrichedStaff, filterRole, searchQuery]);

  // Overall counters
  const totalCount = enrichedStaff.length;
  const presentCount = enrichedStaff.filter(e => e.isClockedIn).length;
  const absentCount = totalCount - presentCount;

  // Handle Check-In (تم الوصول / الحضور)
  const handleCheckIn = async (staff) => {
    setActionLoadingId(staff.id);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_in',
          staff_id: staff.id,
          employee_id: staff.id,
          employee_name: staff.name,
          driver_name: staff.name,
          is_driver: staff.isDriver,
          branch_id: staff.branch_id || selectedBranchId || 'b1'
        })
      });

      const data = await res.json();
      if (res.ok) {
        playChime('in');
        openResultModal({
          type: 'check_in',
          employeeName: staff.name,
          timeStr: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          lateMinutes: data.lateMinutes || 0,
          message: data.message || 'تم تسجيل تمام الحضور بنجاح 🟢'
        });
        await loadData(true);
      } else {
        alert(data.error || 'حدث خطأ أثناء تسجيل الحضور');
      }
    } catch (e) {
      console.error(e);
      alert('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Check-Out (تسجيل الانصراف وحساب الساعات)
  const handleCheckOut = async (staff) => {
    setActionLoadingId(staff.id);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_out',
          attendance_id: staff.attendanceId,
          staff_id: staff.id,
          employee_id: staff.id,
          employee_name: staff.name,
          driver_name: staff.name,
          is_driver: staff.isDriver
        })
      });

      const data = await res.json();
      if (res.ok) {
        playChime('out');
        openResultModal({
          type: 'check_out',
          employeeName: staff.name,
          timeStr: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          workingHours: data.actualWorkingHours || staff.durationHours || 0,
          overtimeHours: data.overtimeHours || 0,
          earlyLeaveHours: data.earlyLeaveHours || 0,
          earlyLeaveMinutes: data.earlyLeaveMinutes || 0,
          message: data.message || 'تم تسجيل الانصراف بنجاح 👋'
        });
        await loadData(true);
      } else {
        alert(data.error || 'حدث خطأ أثناء تسجيل الانصراف');
      }
    } catch (e) {
      console.error(e);
      alert('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Trigger Countdown and show modal
  const openResultModal = (details) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    let secondsLeft = 3;
    setResultModal({
      ...details,
      open: true,
      countdown: secondsLeft
    });

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
        setResultModal(prev => ({ ...prev, open: false }));
      } else {
        setResultModal(prev => ({ ...prev, countdown: secondsLeft }));
      }
    }, 1000);
  };

  const closeResultModal = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setResultModal(prev => ({ ...prev, open: false }));
  };

  // Formatted date and time strings
  const timeDisplay = currentTime.toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
  const dateDisplay = currentTime.toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      p: { xs: 1.5, sm: 2.5, md: 3 },
      direction: 'rtl'
    }}>
      {/* Top Bar: Digital Clock, Title & Stats Banner */}
      <Paper elevation={0} sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 2.5,
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff'
      }}>
        <Grid container spacing={2} alignItems="center">
          {/* Main Title & Kiosk Icon */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{
                width: 52,
                height: 52,
                bgcolor: '#3b82f6',
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.35)'
              }}>
                <Fingerprint sx={{ fontSize: 34, color: '#ffffff' }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: -0.5 }}>
                  شاشة البصمة السريعة
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  تسجيل الحضور والانصراف بلمسة واحدة وحساب الساعات والأوفر تايم تلقائياً
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Live Digital Clock */}
          <Grid item xs={12} sm={6} md={4} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
            <Box sx={{
              display: 'inline-block',
              px: 2.5,
              py: 1,
              bgcolor: 'rgba(255,255,255,0.08)',
              borderRadius: 2.5,
              border: '1px solid rgba(255,255,255,0.12)'
            }}>
              <Typography variant="h4" sx={{
                fontWeight: 900,
                fontFamily: 'monospace',
                color: '#38bdf8',
                letterSpacing: 2,
                lineHeight: 1.1
              }}>
                {timeDisplay}
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                {dateDisplay}
              </Typography>
            </Box>
          </Grid>

          {/* Branch & Quick Status Counters */}
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Box sx={{
                px: 2,
                py: 1,
                bgcolor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 2,
                textAlign: 'center',
                minWidth: 80
              }}>
                <Typography variant="h6" sx={{ color: '#34d399', fontWeight: 800, lineHeight: 1 }}>
                  {presentCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#a7f3d0', fontWeight: 600 }}>
                  حاضر الآن 🟢
                </Typography>
              </Box>

              <Box sx={{
                px: 2,
                py: 1,
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 2,
                textAlign: 'center',
                minWidth: 80
              }}>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 800, lineHeight: 1 }}>
                  {totalCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                  إجمالي الفريق
                </Typography>
              </Box>

              <Tooltip title="تحديث البيانات">
                <IconButton
                  onClick={() => loadData(false)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Control Strip: Search, Role Filters & Branch Switcher */}
      <Paper elevation={0} sx={{
        p: 1.5,
        mb: 2.5,
        borderRadius: 2.5,
        border: '1px solid #e2e8f0',
        bgcolor: '#ffffff'
      }}>
        <Grid container spacing={1.5} alignItems="center">
          {/* Live Search */}
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="ابحث بالاسم أو الوظيفة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: { borderRadius: 2, bgcolor: '#f8fafc' }
              }}
            />
          </Grid>

          {/* Quick Filter Chips */}
          <Grid item xs={12} sm={7} md={6}>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
              <Chip
                label={`الكل (${totalCount})`}
                onClick={() => setFilterRole('all')}
                color={filterRole === 'all' ? 'primary' : 'default'}
                variant={filterRole === 'all' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, borderRadius: 2, px: 1 }}
              />
              <Chip
                label={`الحاضرين الآن (${presentCount}) 🟢`}
                onClick={() => setFilterRole('present')}
                color={filterRole === 'present' ? 'success' : 'default'}
                variant={filterRole === 'present' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, borderRadius: 2, px: 1 }}
              />
              <Chip
                label={`لم يحضروا (${absentCount}) ⚪`}
                onClick={() => setFilterRole('absent')}
                color={filterRole === 'absent' ? 'warning' : 'default'}
                variant={filterRole === 'absent' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, borderRadius: 2, px: 1 }}
              />
              <Chip
                label="طاقم العمل 👤"
                onClick={() => setFilterRole('staff')}
                color={filterRole === 'staff' ? 'primary' : 'default'}
                variant={filterRole === 'staff' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
              <Chip
                label="الطيارين 🛵"
                onClick={() => setFilterRole('drivers')}
                color={filterRole === 'drivers' ? 'primary' : 'default'}
                variant={filterRole === 'drivers' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            </Stack>
          </Grid>

          {/* Branch Switcher (if available) */}
          <Grid item xs={12} md={2} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            {branches && branches.length > 1 && (
              <FormControl size="small" fullWidth>
                <Select
                  value={selectedBranchId || 'all'}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  sx={{ borderRadius: 2, bgcolor: '#f8fafc', fontSize: '0.85rem' }}
                >
                  <MenuItem value="all">🏢 جميع الفروع</MenuItem>
                  {branches.map(b => (
                    <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Loading state */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={45} thickness={4} sx={{ color: '#2563eb' }} />
          <Typography variant="body1" sx={{ mt: 2, color: '#64748b', fontWeight: 600 }}>
            جاري تحميل قائمة البصمة والفريق...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!loading && filteredStaff.length === 0 && (
        <Paper elevation={0} sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          border: '1px dashed #cbd5e1',
          bgcolor: '#ffffff'
        }}>
          <Person sx={{ fontSize: 60, color: '#94a3b8', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
            لا يوجد موظفين مطابقين للبحث
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            تأكد من كتابة الاسم بشكل صحيح أو اختر فلتر "الكل"
          </Typography>
          {searchQuery && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSearchQuery('')}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              مسح البحث
            </Button>
          )}
        </Paper>
      )}

      {/* Staff Grid: Big, Touch-Friendly Punch Cards */}
      {!loading && filteredStaff.length > 0 && (
        <Grid container spacing={2}>
          {filteredStaff.map((staff) => {
            const isPresent = staff.isClockedIn;
            const isSubmitting = actionLoadingId === staff.id;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={staff.id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: isPresent ? '#10b981' : '#e2e8f0',
                    bgcolor: isPresent ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isPresent
                      ? '0 10px 25px -5px rgba(16, 185, 129, 0.15)'
                      : '0 4px 12px rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: isPresent
                        ? '0 14px 28px -4px rgba(16, 185, 129, 0.25)'
                        : '0 8px 20px rgba(0, 0, 0, 0.08)'
                    }
                  }}
                >
                  {/* Status Indicator Top Bar */}
                  <Box sx={{
                    height: 6,
                    bgcolor: isPresent ? '#10b981' : '#cbd5e1',
                    width: '100%'
                  }} />

                  <CardContent sx={{ p: 2.5 }}>
                    {/* Header: Avatar, Name, Role */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.8 }}>
                      <Avatar sx={{
                        width: 48,
                        height: 48,
                        bgcolor: isPresent ? '#dcfce7' : '#f1f5f9',
                        color: isPresent ? '#16a34a' : '#475569',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        border: '2px solid',
                        borderColor: isPresent ? '#86efac' : '#e2e8f0'
                      }}>
                        {staff.isDriver ? '🛵' : (staff.name?.charAt(0) || '👤')}
                      </Avatar>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="h6"
                          noWrap
                          sx={{
                            fontWeight: 800,
                            color: '#0f172a',
                            fontSize: '1.1rem',
                            lineHeight: 1.2
                          }}
                        >
                          {staff.name}
                        </Typography>
                        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={staff.role || 'موظف'}
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              bgcolor: isPresent ? '#bbf7d0' : '#f1f5f9',
                              color: isPresent ? '#15803d' : '#475569'
                            }}
                          />
                          {staff.branch_name && (
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {staff.branch_name}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Box>

                    {/* Shift Info Box */}
                    <Box sx={{
                      p: 1.2,
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: isPresent ? 'rgba(255,255,255,0.7)' : '#f8fafc',
                      border: '1px solid',
                      borderColor: isPresent ? '#bbf7d0' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Schedule sx={{ fontSize: 18, color: '#64748b' }} />
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                          الشيفت: {staff.shiftStartTime || '12:00 م'} ({staff.shiftHours || 8} س)
                        </Typography>
                      </Box>

                      {isPresent ? (
                        <Chip
                          size="small"
                          icon={<CheckCircle sx={{ fontSize: '14px !important', color: '#16a34a' }} />}
                          label="حاضر الآن"
                          sx={{
                            height: 22,
                            fontWeight: 800,
                            bgcolor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac'
                          }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="غير متواجد"
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            bgcolor: '#f1f5f9',
                            color: '#64748b'
                          }}
                        />
                      )}
                    </Box>

                    {/* Attendance Details (If present) */}
                    {isPresent && staff.checkInTime && (
                      <Box sx={{
                        p: 1.2,
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: '#ffffff',
                        border: '1px solid #86efac',
                        textAlign: 'center'
                      }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          وقت الحضور: {new Date(staff.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 800, mt: 0.2 }}>
                          متواجد منذ {staff.durationHours} س و {staff.durationMinutes} د
                        </Typography>
                      </Box>
                    )}

                    {/* PUNCH ACTION BUTTON */}
                    {!isPresent ? (
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isSubmitting}
                        onClick={() => handleCheckIn(staff)}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Login />}
                        sx={{
                          py: 1.4,
                          borderRadius: 2.5,
                          fontWeight: 800,
                          fontSize: '1rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.45)'
                          }
                        }}
                      >
                        {isSubmitting ? 'جاري التسجيل...' : 'تسجيل حضور (تم الوصول) 🟢'}
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isSubmitting}
                        onClick={() => handleCheckOut(staff)}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Logout />}
                        sx={{
                          py: 1.4,
                          borderRadius: 2.5,
                          fontWeight: 800,
                          fontSize: '1rem',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#ffffff',
                          boxShadow: '0 6px 16px rgba(239, 68, 68, 0.35)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.45)'
                          }
                        }}
                      >
                        {isSubmitting ? 'جاري الحساب...' : 'تسجيل انصراف (مغادرة) 🔴'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* QUICK INSTANT CONFIRMATION MODAL (AUTO CLOSES IN 3 SECONDS) */}
      <Dialog
        open={resultModal.open}
        onClose={closeResultModal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            p: 1.5,
            textAlign: 'center',
            overflow: 'hidden',
            border: '2px solid',
            borderColor: resultModal.type === 'check_in' ? '#10b981' : '#3b82f6',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
      >
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {/* Avatar Icon */}
          <Avatar sx={{
            width: 72,
            height: 72,
            mx: 'auto',
            mb: 2,
            bgcolor: resultModal.type === 'check_in' ? '#dcfce7' : '#dbeafe',
            color: resultModal.type === 'check_in' ? '#16a34a' : '#2563eb',
            boxShadow: resultModal.type === 'check_in'
              ? '0 10px 20px rgba(16, 185, 129, 0.25)'
              : '0 10px 20px rgba(59, 130, 246, 0.25)'
          }}>
            {resultModal.type === 'check_in' ? (
              <CheckCircle sx={{ fontSize: 44 }} />
            ) : (
              <Logout sx={{ fontSize: 40 }} />
            )}
          </Avatar>

          {/* Greeting */}
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', mb: 0.5 }}>
            {resultModal.type === 'check_in' ? 'أهلاً بك يا بطل! 🌟' : 'يعطيك ألف عافية! 👋'}
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563eb', mb: 1.5 }}>
            {resultModal.employeeName}
          </Typography>

          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            {resultModal.type === 'check_in'
              ? `تم تسجيل تمام الحضور في تمام الساعة ${resultModal.timeStr}`
              : `تم تسجيل الانصراف في تمام الساعة ${resultModal.timeStr}`}
          </Typography>

          {/* Details Breakdown Card */}
          {resultModal.type === 'check_in' ? (
            <Box sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: resultModal.lateMinutes > 0 ? '#fef3c7' : '#f0fdf4',
              border: '1px solid',
              borderColor: resultModal.lateMinutes > 0 ? '#fde68a' : '#bbf7d0',
              mb: 2
            }}>
              {resultModal.lateMinutes > 0 ? (
                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                  <WarningAmber sx={{ color: '#d97706', fontSize: 22 }} />
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#b45309' }}>
                    تأخير {resultModal.lateMinutes} دقيقة عن موعد الشيفت المقبول
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803d' }}>
                  حضور منضبط وفي الميعاد المحدد تماماً 🟢
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              mb: 2
            }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>ساعات العمل الفعلية:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {resultModal.workingHours} ساعة
                  </Typography>
                </Box>

                {resultModal.overtimeHours > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>أوفر تايم إضافي 🚀:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      +{resultModal.overtimeHours} ساعة
                    </Typography>
                  </Box>
                )}

                {resultModal.earlyLeaveHours > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>انصراف مبكر ⚠️:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      عجز {resultModal.earlyLeaveHours} ساعة ({resultModal.earlyLeaveMinutes} دقيقة)
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, mt: 0.5, display: 'block' }}>
                  ✔️ تم تسجيل الساعات وربطها بمسير المرتبات والقبض
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Auto-Dismiss Countdown Bar */}
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              سيتم الإغلاق تلقائياً خلال {resultModal.countdown} ثوانٍ...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(resultModal.countdown / 3) * 100}
              sx={{
                height: 4,
                borderRadius: 2,
                mt: 0.8,
                bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: resultModal.type === 'check_in' ? '#10b981' : '#3b82f6'
                }
              }}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={closeResultModal}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b' }
            }}
          >
            تم (تسليم للشخص التالي)
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
