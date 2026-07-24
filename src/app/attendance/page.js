'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress, Alert
} from '@mui/material';
import {
  HowToReg, DeliveryDining, AccessTime, CheckCircle, Warning,
  PersonAdd, Logout, Refresh, SwapVert, BadgeOutlined
} from '@mui/icons-material';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import DeliveryTimerBadge from '@/components/delivery/DeliveryTimerBadge';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const { branches, selectedBranchId } = useBranchStore();

  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deliveryTimerMinutes, setDeliveryTimerMinutes] = useState(30);

  // Checkin Modal
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedBranchForCheckIn, setSelectedBranchForCheckIn] = useState('b1');
  const [submitting, setSubmitting] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?branch_id=${selectedBranchId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveQueue(data.activeQueue || []);
        setAllDrivers(data.allDrivers || []);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000); // 5s realtime sync
    return () => clearInterval(interval);
  }, [selectedBranchId]);

  const handleCheckIn = async () => {
    if (!selectedDriverId) return;
    setSubmitting(true);
    try {
      const driverObj = allDrivers.find(d => d.id === selectedDriverId);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_in',
          driver_id: selectedDriverId,
          driver_name: driverObj?.name || 'طيار',
          branch_id: selectedBranchForCheckIn
        })
      });
      if (res.ok) {
        setCheckInOpen(false);
        setSelectedDriverId('');
        fetchAttendance();
      }
    } catch (err) {
      console.error('Checkin error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (attendanceId, driverId) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_out',
          attendance_id: attendanceId,
          driver_id: driverId
        })
      });
      if (res.ok) {
        fetchAttendance();
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const readyCount = activeQueue.filter(q => q.status === 'ready').length;
  const onDeliveryCount = activeQueue.filter(q => q.status === 'on_delivery').length;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HowToReg sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.2rem', md: '1.6rem' } }}>
              تمامات الموظفين وطابور دور الطيارين
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              متابعة حضور وانصراف الطيارين، ترتيب الدور بالدقيقة، وتايمر خروج الدليفري اللحظي
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAttendance}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCheckInOpen(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '12px', fontWeight: 800, px: 2.5 }}
          >
            تسجيل تمام طيار جديد (حضور)
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HowToReg />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>المتواجدون بالتمام</Typography>
              <Typography variant="h6" fontWeight={900}>{activeQueue.length} طيار</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>جاهزين للدور التالي</Typography>
              <Typography variant="h6" fontWeight={900} color="#2563EB">{readyCount} طيار</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeliveryDining />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>خارجين في أوردرات</Typography>
              <Typography variant="h6" fontWeight={900} color="#D97706">{onDeliveryCount} طيار</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#F3F4F6', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccessTime />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>وقت التوصيل المحدد</Typography>
              <Typography variant="h6" fontWeight={900}>{deliveryTimerMinutes} دقيقة</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Delivery Driver Queue Section */}
      <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1.5px solid #E5E7EB' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapVert sx={{ color: '#10B981' }} />
            <Typography variant="h6" fontWeight={800} color="#1A1A2E">
              📋 طابور دور الطيارين (مرتب بالدقيقة بالترتيب)
            </Typography>
          </Box>
          <Chip label="الترتيب تلقائي بالدقيقة" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
        </Box>

        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={32} /></Box>
        ) : activeQueue.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 700 }}>
            لا يوجد طيارين مسجلين بالسيستم حالياً. اضغط على زر "تسجيل تمام طيار جديد (حضور)" لبدء طابور التوصيل.
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
                            onClick={() => handleCheckOut(item.id, item.driver_id)}
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

      {/* Employee General Attendance Table */}
      <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E5E7EB' }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: '#1A1A2E' }}>
          👥 تمام وسجل حضور الموظفين العام
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الوظيفة / الدور</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>التليفون</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة بالسيستم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{emp.name}</TableCell>
                  <TableCell>{emp.role}</TableCell>
                  <TableCell>{emp.branch_name || 'الفرع الرئيسي'}</TableCell>
                  <TableCell>{emp.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={emp.status === 'active' ? 'حاضر / نشط' : 'غائب'}
                      size="small"
                      sx={{
                        bgcolor: emp.status === 'active' ? '#D1FAE5' : '#FEF2F2',
                        color: emp.status === 'active' ? '#065F46' : '#991B1B',
                        fontWeight: 700
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">لا يوجد موظفين مسجلين</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Driver Check-in Dialog */}
      <Dialog open={checkInOpen} onClose={() => setCheckInOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>تسجيل تمام طيار بالدور (حضور)</DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            اختر طيار الدليفري والفرع لإثبات حضوره والدخول في طابور الدور بالترتيب.
          </Typography>

          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>اختر الطيار</InputLabel>
            <Select
              value={selectedDriverId}
              label="اختر الطيار"
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              {allDrivers.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name} ({d.branch_name || 'الفرع الرئيسي'}) {d.active_attendance_id ? '✔️ متواجد بالدور' : ''}
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
            disabled={!selectedDriverId || submitting}
            onClick={handleCheckIn}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, fontWeight: 800 }}
          >
            {submitting ? 'جاري التسجيل...' : 'إثبات التمام والادراج بالدور'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
