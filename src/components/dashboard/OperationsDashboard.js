'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  Divider,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  AttachMoney,
  DeliveryDining,
  Storefront,
  AccessTime,
  Refresh,
  People,
  Inventory2Outlined,
  ReceiptLong,
  AccountBalanceWallet,
  CheckCircle,
  LocalShipping,
  Restaurant,
  Speed,
  ArrowForward,
  NotificationsActive,
  ListAlt,
  HowToReg,
  AssessmentOutlined,
  SettingsOutlined,
  QueryStats,
  PieChart,
  BarChart,
  ShoppingBag,
  TrendingDown,
  LocalFireDepartment,
  Circle,
} from '@mui/icons-material';
import { useAuthStore, ALL_SYSTEM_SCREENS } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useShiftStore } from '@/store/useShiftStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';

export default function OperationsDashboard({ onSwitchToPos }) {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const { branches, selectedBranchId } = useBranchStore();
  const { activeShift, fetchShifts } = useShiftStore();
  const { invoices, fetchInvoices } = useInvoiceStore();

  const isAdmin = user?.role === 'admin';
  const effectiveBranchId = isAdmin ? selectedBranchId : (user?.branch_id || user?.branchId || 'b1');

  // Filter State
  const [timeFilter, setTimeFilter] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month'
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Additional live data from endpoints
  const [attendanceData, setAttendanceData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

  // Load all dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInvoices(500, effectiveBranchId, true),
        fetchShifts(effectiveBranchId),
      ]);

      const [attRes, expRes, invRes] = await Promise.all([
        fetch('/api/attendance').catch(() => null),
        fetch('/api/finances/expenses').catch(() => null),
        fetch('/api/inventory').catch(() => null),
      ]);

      if (attRes && attRes.ok) {
        const attJson = await attRes.json();
        setAttendanceData(Array.isArray(attJson) ? attJson : []);
      }
      if (expRes && expRes.ok) {
        const expJson = await expRes.json();
        setExpensesData(Array.isArray(expJson) ? expJson : []);
      }
      if (invRes && invRes.ok) {
        const invJson = await invRes.json();
        setInventoryData(Array.isArray(invJson) ? invJson : []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading dashboard operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => {
      loadDashboardData();
    }, 30000);
    return () => clearInterval(timer);
  }, [effectiveBranchId]);

  // Compute Filter Dates
  const filteredInvoices = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return (invoices || []).filter((inv) => {
      const matchBranch = !effectiveBranchId || effectiveBranchId === 'all' || inv.branchId === effectiveBranchId || inv.branch_id === effectiveBranchId;
      if (!matchBranch) return false;

      if (!inv.createdAt) return true;
      const invDate = inv.createdAt.split('T')[0];

      if (timeFilter === 'today') {
        return invDate === todayStr;
      } else if (timeFilter === 'yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        return invDate === yest.toISOString().split('T')[0];
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return invDate >= weekAgo.toISOString().split('T')[0];
      } else if (timeFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return invDate >= monthAgo.toISOString().split('T')[0];
      }
      return true;
    });
  }, [invoices, effectiveBranchId, timeFilter]);

  // Financial Metrics
  const totalSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  }, [filteredInvoices]);

  const totalOrdersCount = filteredInvoices.length;
  const avgOrderValue = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;

  // Filtered Expenses
  const totalExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (expensesData || [])
      .filter((exp) => {
        const matchBranch = !effectiveBranchId || effectiveBranchId === 'all' || exp.branch_id === effectiveBranchId;
        if (!matchBranch) return false;
        if (timeFilter === 'today') return (exp.created_at || '').startsWith(todayStr);
        return true;
      })
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  }, [expensesData, effectiveBranchId, timeFilter]);

  const netCashFlow = totalSales - totalExpenses;

  // Order Breakdown by Type
  const deliveryOrders = useMemo(() => filteredInvoices.filter((i) => i.orderType === 'delivery'), [filteredInvoices]);
  const dineInOrders = useMemo(() => filteredInvoices.filter((i) => i.orderType === 'dine_in' || i.orderType === 'table'), [filteredInvoices]);
  const takeawayOrders = useMemo(() => filteredInvoices.filter((i) => i.orderType === 'takeaway' || (!i.orderType && !i.driverName)), [filteredInvoices]);

  const deliveryRevenue = deliveryOrders.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const dineInRevenue = dineInOrders.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const takeawayRevenue = takeawayOrders.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

  // Top Selling Items Leaderboard
  const topProducts = useMemo(() => {
    const map = {};
    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const pName = item.name || item.product_name || 'صنف';
        if (!map[pName]) {
          map[pName] = { name: pName, qty: 0, revenue: 0 };
        }
        const q = parseInt(item.quantity) || 1;
        map[pName].qty += q;
        map[pName].revenue += (parseFloat(item.price) || 0) * q;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredInvoices]);

  const maxProductQty = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.qty), 1) : 1;

  // Hourly Sales Distribution
  const hourlyData = useMemo(() => {
    const hoursOrder = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
    const dataMap = {};
    hoursOrder.forEach((h) => {
      dataMap[h] = {
        hour: h,
        label: `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 && h < 24 ? 'م' : 'ص'}`,
        sales: 0,
        orders: 0,
      };
    });

    filteredInvoices.forEach((inv) => {
      if (inv.createdAt) {
        try {
          const d = new Date(inv.createdAt);
          const h = d.getHours();
          if (dataMap[h]) {
            dataMap[h].sales += parseFloat(inv.total) || 0;
            dataMap[h].orders += 1;
          }
        } catch (e) {}
      }
    });

    return hoursOrder.map((h) => dataMap[h]);
  }, [filteredInvoices]);

  const maxHourlySales = hourlyData.length > 0 ? Math.max(...hourlyData.map((h) => h.sales), 1) : 1;
  const peakHour = hourlyData.reduce((prev, curr) => (curr.sales > prev.sales ? curr : prev), hourlyData[0] || {});

  // Live Driver Attendance
  const activeDrivers = useMemo(() => {
    return (attendanceData || []).filter((a) => a.role === 'driver' || a.driver_name || a.type === 'driver');
  }, [attendanceData]);

  const driversOnDelivery = activeDrivers.filter((d) => d.status === 'on_delivery' || d.status === 'busy');
  const driversReady = activeDrivers.filter((d) => d.status === 'ready' || d.status === 'available');

  // Low stock inventory count
  const lowStockItems = useMemo(() => {
    return (inventoryData || []).filter((item) => {
      const q = parseFloat(item.quantity) || 0;
      const min = parseFloat(item.min_quantity || item.minQuantity) || 5;
      return q <= min;
    });
  }, [inventoryData]);

  // Allowed Navigation Cards for this specific user
  const allowedScreens = useMemo(() => {
    return ALL_SYSTEM_SCREENS.filter((s) => s.path !== '/' && hasPermission(s.path));
  }, [hasPermission]);

  const currentBranchObj = branches.find((b) => b.id === effectiveBranchId);
  const branchName = currentBranchObj ? currentBranchObj.name : 'فرع عزت';

  // Quick Action screen icons mapping
  const screenIconMap = {
    '/orders': <ListAlt sx={{ fontSize: 22, color: '#3B82F6' }} />,
    '/invoices': <Receipt sx={{ fontSize: 22, color: '#10B981' }} />,
    '/returns': <ReceiptLong sx={{ fontSize: 22, color: '#EF4444' }} />,
    '/delivery': <DeliveryDining sx={{ fontSize: 22, color: '#6366F1' }} />,
    '/attendance': <HowToReg sx={{ fontSize: 22, color: '#8B5CF6' }} />,
    '/shift-summary': <AccessTime sx={{ fontSize: 22, color: '#F59E0B' }} />,
    '/finances': <AccountBalanceWallet sx={{ fontSize: 22, color: '#EC4899' }} />,
    '/inventory': <Inventory2Outlined sx={{ fontSize: 22, color: '#14B8A6' }} />,
    '/tables': <Storefront sx={{ fontSize: 22, color: '#06B6D4' }} />,
    '/reports': <AssessmentOutlined sx={{ fontSize: 22, color: '#3B82F6' }} />,
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        minHeight: '100vh',
        bgcolor: '#F8FAFC',
        p: { xs: 1.5, sm: 2, md: 3 },
        pb: { xs: 12, md: 4 },
        direction: 'rtl',
        boxSizing: 'border-box',
        color: '#1E293B',
      }}
    >
      {/* 1. TOP HEADER & FILTER BAR (White Mode Luxury) */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          borderRadius: { xs: '18px', md: '24px' },
          bgcolor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', lg: 'center' },
          gap: 2,
          boxSizing: 'border-box',
        }}
      >
        {/* Left: User Profile & Shift Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, width: { xs: '100%', lg: 'auto' }, minWidth: 0 }}>
          <Avatar
            sx={{
              width: { xs: 48, md: 56 },
              height: { xs: 48, md: 56 },
              bgcolor: '#FEF3C7',
              color: '#D97706',
              fontWeight: 900,
              fontSize: { xs: '1.3rem', md: '1.5rem' },
              border: '2px solid #FDE68A',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
              flexShrink: 0,
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'ف'}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '1.15rem', md: '1.3rem' } }}>
                مرحباً، {user?.name || 'فارس'} 👋
              </Typography>
              <Chip
                label={`🏢 ${branchName}`}
                size="small"
                sx={{
                  bgcolor: '#FEF3C7',
                  color: '#B45309',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  height: 26,
                }}
              />
              <Chip
                icon={<Circle sx={{ fontSize: '9px !important', color: activeShift ? '#16A34A' : '#DC2626' }} />}
                label={activeShift ? `الشيفت المفتوح (${activeShift.cashierName || 'كاشير'})` : 'الشيفت مغلق'}
                size="small"
                sx={{
                  bgcolor: activeShift ? '#ECFDF5' : '#FEF2F2',
                  color: activeShift ? '#065F46' : '#991B1B',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  border: '1px solid',
                  borderColor: activeShift ? '#A7F3D0' : '#FECACA',
                  borderRadius: '8px',
                  height: 26,
                }}
              />
              {isAdmin && onSwitchToPos && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={onSwitchToPos}
                  sx={{
                    bgcolor: '#3B82F6',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    borderRadius: '8px',
                    px: 1.8,
                    py: 0.4,
                    fontSize: '0.78rem',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    '&:hover': { bgcolor: '#2563EB' },
                  }}
                >
                  🖥️ شاشة الكاشير
                </Button>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', fontSize: '0.78rem' }}>
              لوحة التحكم الشاملة، متابعة العمليات اللحظية، ومؤشرات الأداء المباشرة
            </Typography>
          </Box>
        </Box>

        {/* Right: Date Filter Pills & Refresh */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: { xs: '100%', lg: 'auto' }, justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex',
              bgcolor: '#F1F5F9',
              p: 0.5,
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              flex: 1,
              justifyContent: 'space-around',
              minWidth: 0,
            }}
          >
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'week', label: '7 أيام' },
              { id: 'month', label: '30 يوم' },
            ].map((btn) => (
              <Button
                key={btn.id}
                size="small"
                onClick={() => setTimeFilter(btn.id)}
                sx={{
                  px: { xs: 1.4, sm: 2 },
                  py: 0.6,
                  minWidth: 0,
                  borderRadius: '10px',
                  fontSize: { xs: '0.78rem', sm: '0.84rem' },
                  fontWeight: timeFilter === btn.id ? 900 : 700,
                  bgcolor: timeFilter === btn.id ? '#FFFFFF' : 'transparent',
                  color: timeFilter === btn.id ? '#0F172A' : '#64748B',
                  boxShadow: timeFilter === btn.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: timeFilter === btn.id ? '#FFFFFF' : 'rgba(0,0,0,0.03)',
                  },
                }}
              >
                {btn.label}
              </Button>
            ))}
          </Box>

          <Tooltip title="تحديث البيانات لحظياً">
            <IconButton
              onClick={loadDashboardData}
              disabled={loading}
              sx={{
                bgcolor: '#F8FAFC',
                color: '#3B82F6',
                borderRadius: '12px',
                p: 1.1,
                border: '1px solid #E2E8F0',
                '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' },
                flexShrink: 0,
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: '#3B82F6' }} /> : <Refresh sx={{ fontSize: 22 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* 2. QUICK SHORTCUTS TO ALLOWED SCREENS */}
      <Box sx={{ mb: 2.5, width: '100%', minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#64748B', mb: 1.2, display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.88rem' }}>
          <Speed sx={{ fontSize: 19, color: '#3B82F6' }} />
          الوصول السريع لخدمات الفرع المصرح بها:
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: `repeat(${Math.min(allowedScreens.length || 1, 6)}, 1fr)`,
            },
            gap: 1.5,
            width: '100%',
            minWidth: 0,
          }}
        >
          {allowedScreens.map((sc) => (
            <Paper
              key={sc.path}
              elevation={0}
              onClick={() => router.push(sc.path)}
              sx={{
                p: 1.6,
                borderRadius: '16px',
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                minWidth: 0,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: '#3B82F6',
                  boxShadow: '0 6px 18px rgba(59, 130, 246, 0.12)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {screenIconMap[sc.path] || <ListAlt sx={{ fontSize: 20, color: '#3B82F6' }} />}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sc.name.split('(')[0]}
                </Typography>
              </Box>
              <ArrowForward sx={{ fontSize: 15, color: '#94A3B8', transform: 'rotate(180deg)', flexShrink: 0 }} />
            </Paper>
          ))}
        </Box>
      </Box>

      {/* 3. PRIMARY 4 KPI METRIC CARDS */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: { xs: 1.5, md: 2 },
          mb: 2.5,
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* KPI 1: Total Sales */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.8, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #F59E0B',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            minWidth: 0,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, fontSize: { xs: '0.78rem', md: '0.85rem' }, display: 'block', noWrap: true }}>
                💰 إجمالي المبيعات المحققة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.5, fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.7rem' }, letterSpacing: -0.5 }}>
                {totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: '#64748B', mr: 0.6, fontSize: '0.8rem' }}>
                  ج.م
                </Typography>
              </Typography>
            </Box>
            <Box
              sx={{
                width: { xs: 36, md: 46 },
                height: { xs: 36, md: 46 },
                borderRadius: '12px',
                bgcolor: '#FEF3C7',
                color: '#D97706',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AttachMoney sx={{ fontSize: { xs: 22, md: 28 } }} />
            </Box>
          </Box>
          <Divider sx={{ my: 1.2, borderColor: '#F1F5F9' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.78rem' }}>
              فواتير: <b style={{ color: '#0F172A' }}>{totalOrdersCount}</b>
            </Typography>
            <Chip
              label={`متوسط: ${avgOrderValue.toFixed(0)} ج.م`}
              size="small"
              sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 800, borderRadius: '6px', height: 22, fontSize: '0.72rem' }}
            />
          </Box>
        </Paper>

        {/* KPI 2: Delivery Performance */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.8, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #3B82F6',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            minWidth: 0,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 800, fontSize: { xs: '0.78rem', md: '0.85rem' }, display: 'block', noWrap: true }}>
                🛵 طلبات الدليفري
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.5, fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.7rem' }, letterSpacing: -0.5 }}>
                {deliveryOrders.length}
                <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: '#64748B', mr: 0.6, fontSize: '0.8rem' }}>
                  طلب
                </Typography>
              </Typography>
            </Box>
            <Box
              sx={{
                width: { xs: 36, md: 46 },
                height: { xs: 36, md: 46 },
                borderRadius: '12px',
                bgcolor: '#DBEAFE',
                color: '#2563EB',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DeliveryDining sx={{ fontSize: { xs: 22, md: 28 } }} />
            </Box>
          </Box>
          <Divider sx={{ my: 1.2, borderColor: '#F1F5F9' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.78rem' }}>
              الإيراد: <b style={{ color: '#2563EB' }}>{deliveryRevenue.toFixed(0)} ج.م</b>
            </Typography>
            <Chip
              label={`${driversOnDelivery.length} بالطريق`}
              size="small"
              sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 800, borderRadius: '6px', height: 22, fontSize: '0.72rem' }}
            />
          </Box>
        </Paper>

        {/* KPI 3: Dine-in & Takeaway */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.8, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: '4px solid #10B981',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            minWidth: 0,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 800, fontSize: { xs: '0.78rem', md: '0.85rem' }, display: 'block', noWrap: true }}>
                🍽️ صالة وتيك أواي
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', mt: 0.5, fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.7rem' }, letterSpacing: -0.5 }}>
                {dineInOrders.length + takeawayOrders.length}
                <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: '#64748B', mr: 0.6, fontSize: '0.8rem' }}>
                  طلب
                </Typography>
              </Typography>
            </Box>
            <Box
              sx={{
                width: { xs: 36, md: 46 },
                height: { xs: 36, md: 46 },
                borderRadius: '12px',
                bgcolor: '#D1FAE5',
                color: '#059669',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Storefront sx={{ fontSize: { xs: 22, md: 28 } }} />
            </Box>
          </Box>
          <Divider sx={{ my: 1.2, borderColor: '#F1F5F9' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.78rem' }}>
              ص: <b>{dineInOrders.length}</b> | ت: <b>{takeawayOrders.length}</b>
            </Typography>
            <Chip
              label={`${(dineInRevenue + takeawayRevenue).toFixed(0)} ج.م`}
              size="small"
              sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 800, borderRadius: '6px', height: 22, fontSize: '0.72rem' }}
            />
          </Box>
        </Paper>

        {/* KPI 4: Till Balance & Cash Flow */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.8, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderTop: `4px solid ${netCashFlow >= 0 ? '#10B981' : '#EF4444'}`,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            minWidth: 0,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: netCashFlow >= 0 ? '#059669' : '#DC2626', fontWeight: 800, fontSize: { xs: '0.78rem', md: '0.85rem' }, display: 'block', noWrap: true }}>
                💵 صافي التدفق
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: netCashFlow >= 0 ? '#059669' : '#DC2626', mt: 0.5, fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.7rem' }, letterSpacing: -0.5 }}>
                {netCashFlow.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: '#64748B', mr: 0.6, fontSize: '0.8rem' }}>
                  ج.م
                </Typography>
              </Typography>
            </Box>
            <Box
              sx={{
                width: { xs: 36, md: 46 },
                height: { xs: 36, md: 46 },
                borderRadius: '12px',
                bgcolor: netCashFlow >= 0 ? '#ECFDF5' : '#FEF2F2',
                color: netCashFlow >= 0 ? '#059669' : '#DC2626',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: { xs: 22, md: 28 } }} />
            </Box>
          </Box>
          <Divider sx={{ my: 1.2, borderColor: '#F1F5F9' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, fontSize: '0.78rem' }}>
              مصروف: {totalExpenses.toFixed(0)} ج.م
            </Typography>
            <Chip
              label={activeShift ? `عهدة: ${activeShift.startAmount} ج.م` : 'شيفت مغلق'}
              size="small"
              sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, borderRadius: '6px', height: 22, fontSize: '0.72rem' }}
            />
          </Box>
        </Paper>
      </Box>

      {/* 4. CHARTS ROW */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.8fr 1fr' },
          gap: 2,
          mb: 2.5,
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Chart 1: Hourly Sales & Peak Rush Traffic */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BarChart sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                  حركة المبيعات وساعات الذروة 📈
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>
                  توزيع الإيراد وحجم الطلبات على ساعات العمل
                </Typography>
              </Box>
            </Box>

            {peakHour?.sales > 0 && (
              <Chip
                icon={<LocalFireDepartment sx={{ color: '#D97706 !important', fontSize: '16px !important' }} />}
                label={`الذروة: ${peakHour.label} (${peakHour.sales.toFixed(0)} ج.م)`}
                size="small"
                sx={{
                  bgcolor: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 800,
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  height: 24,
                  fontSize: '0.72rem',
                }}
              />
            )}
          </Box>

          {/* Bar Chart Bars Container */}
          <Box
            sx={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              pt: 2,
              pb: 1,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 3 },
            }}
          >
            <Box sx={{ minWidth: 540, height: 180, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              {hourlyData.map((h) => {
                const barHeightPct = maxHourlySales > 0 ? Math.max((h.sales / maxHourlySales) * 100, 6) : 6;
                const isPeak = h.sales === maxHourlySales && h.sales > 0;

                return (
                  <Box
                    key={h.hour}
                    sx={{
                      flex: 1,
                      minWidth: 26,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.6,
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, display: 'block' }}>الساعة {h.label}</Typography>
                          <Typography variant="caption" sx={{ color: '#FDE047', fontWeight: 900 }}>{h.sales.toFixed(2)} ج.م</Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: '#E2E8F0' }}>{h.orders} طلب مسجل</Typography>
                        </Box>
                      }
                      arrow
                    >
                      <Box
                        sx={{
                          width: '100%',
                          maxWidth: 32,
                          height: `${barHeightPct}%`,
                          borderRadius: '8px 8px 3px 3px',
                          background: isPeak
                            ? 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)'
                            : h.sales > 0
                            ? 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)'
                            : '#F1F5F9',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'scaleY(1.08)',
                            filter: 'brightness(1.1)',
                          },
                        }}
                      />
                    </Tooltip>
                    <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800, color: isPeak ? '#D97706' : '#64748B' }}>
                      {h.hour}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px solid #F1F5F9' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#3B82F6' }} />
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.72rem' }}>مبيعات الساعات</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#F59E0B' }} />
                <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 800, fontSize: '0.72rem' }}>ساعة الذروة</Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.7rem' }}>
              اسحب أفقياً ⟵
            </Typography>
          </Box>
        </Paper>

        {/* Chart 2: Order Channel Distribution */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#FDF2F8', color: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PieChart sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                  توزيع قنوات البيع 🍩
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>
                  تيك أواي vs صالة وطاولات vs دليفري
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, my: 1, width: '100%', minWidth: 0 }}>
              {/* Delivery Row */}
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 0.6, fontSize: '0.82rem' }}>
                    <DeliveryDining sx={{ fontSize: 18 }} /> دليفري وتوصيل
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.82rem', direction: 'ltr' }}>
                    {totalOrdersCount > 0 ? ((deliveryOrders.length / totalOrdersCount) * 100).toFixed(0) : 0}% ({deliveryOrders.length})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={totalOrdersCount > 0 ? (deliveryOrders.length / totalOrdersCount) * 100 : 0}
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#EFF6FF', '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6', borderRadius: 5 } }}
                />
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.4, display: 'block', fontWeight: 700, fontSize: '0.72rem' }}>
                  إجمالي الإيراد: {deliveryRevenue.toFixed(2)} ج.م
                </Typography>
              </Box>

              {/* Dine In Row */}
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 0.6, fontSize: '0.82rem' }}>
                    <Restaurant sx={{ fontSize: 18 }} /> صالة وطاولات
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.82rem', direction: 'ltr' }}>
                    {totalOrdersCount > 0 ? ((dineInOrders.length / totalOrdersCount) * 100).toFixed(0) : 0}% ({dineInOrders.length})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={totalOrdersCount > 0 ? (dineInOrders.length / totalOrdersCount) * 100 : 0}
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#ECFDF5', '& .MuiLinearProgress-bar': { bgcolor: '#10B981', borderRadius: 5 } }}
                />
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.4, display: 'block', fontWeight: 700, fontSize: '0.72rem' }}>
                  إجمالي الإيراد: {dineInRevenue.toFixed(2)} ج.م
                </Typography>
              </Box>

              {/* Takeaway Row */}
              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: 0.6, fontSize: '0.82rem' }}>
                    <ShoppingBag sx={{ fontSize: 18 }} /> تيك أواي واستلام
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.82rem', direction: 'ltr' }}>
                    {totalOrdersCount > 0 ? ((takeawayOrders.length / totalOrdersCount) * 100).toFixed(0) : 0}% ({takeawayOrders.length})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={totalOrdersCount > 0 ? (takeawayOrders.length / totalOrdersCount) * 100 : 0}
                  sx={{ height: 10, borderRadius: 5, bgcolor: '#FEF3C7', '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B', borderRadius: 5 } }}
                />
                <Typography variant="caption" sx={{ color: '#64748B', mt: 0.4, display: 'block', fontWeight: 700, fontSize: '0.72rem' }}>
                  إجمالي الإيراد: {takeawayRevenue.toFixed(2)} ج.م
                </Typography>
              </Box>
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mt: 1.5,
              borderRadius: '12px',
              bgcolor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
              القناة الأكثر نشاطاً:
            </Typography>
            <Chip
              label={deliveryRevenue >= dineInRevenue && deliveryRevenue >= takeawayRevenue ? '🛵 دليفري وتوصيل' : dineInRevenue >= takeawayRevenue ? '🍽️ صالة وطاولات' : '🛍️ تيك أواي'}
              size="small"
              sx={{ bgcolor: '#3B82F6', color: '#FFFFFF', fontWeight: 900, borderRadius: '8px', height: 24, fontSize: '0.72rem' }}
            />
          </Paper>
        </Paper>
      </Box>

      {/* 5. LEADERBOARD & LIVE OPERATIONS ROW */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1.6fr' },
          gap: 2,
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Top-Selling Products Leaderboard */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                الأصناف الأكثر طلباً ومبيعاً 🏆
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>
                أعلى الوجبات والحواوشي تحقيقاً للمبيعات بالفرع
              </Typography>
            </Box>
          </Box>

          {topProducts.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                لا توجد مبيعات مسجلة في هذه الفترة
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', minWidth: 0 }}>
              {topProducts.map((p, idx) => (
                <Box key={p.name} sx={{ width: '100%', minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: '6px',
                          bgcolor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : '#F1F5F9',
                          color: idx < 3 ? '#FFFFFF' : '#64748B',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'left', flexShrink: 0, pl: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.85rem' }}>
                        {p.qty} قطعة
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#059669', fontWeight: 800, display: 'block', fontSize: '0.72rem' }}>
                        {p.revenue.toFixed(0)} ج.م
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(p.qty / maxProductQty) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#F1F5F9',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: idx === 0 ? '#F59E0B' : idx === 1 ? '#3B82F6' : '#10B981',
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Live Operations Activity Center */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QueryStats sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                  الدنيا ماشية إزاي (متابعة العمليات الحية) ⚡
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>
                  أحدث الفواتير، نشاط الطيارين، وحالة الفرع
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.72rem' }}>
              {lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>

          {/* Quick Status Cards Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2, width: '100%', minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: '14px',
                bgcolor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
              }}
            >
              <DeliveryDining sx={{ color: '#16A34A', fontSize: 24, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 800, fontSize: '0.7rem', display: 'block', noWrap: true }}>
                  طيارين بالخدمة
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 900, color: '#166534', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeDrivers.length} طيار ({driversReady.length} جاهز)
                </Typography>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: '14px',
                bgcolor: lowStockItems.length > 0 ? '#FEF2F2' : '#F8FAFC',
                border: '1px solid',
                borderColor: lowStockItems.length > 0 ? '#FECACA' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
              }}
            >
              <Inventory2Outlined sx={{ color: lowStockItems.length > 0 ? '#DC2626' : '#64748B', fontSize: 24, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: lowStockItems.length > 0 ? '#B91C1C' : '#64748B', fontWeight: 800, fontSize: '0.7rem', display: 'block', noWrap: true }}>
                  نواقص المخزن
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 900, color: lowStockItems.length > 0 ? '#991B1B' : '#1E293B', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lowStockItems.length > 0 ? `${lowStockItems.length} خامة تحتاج توريد` : 'المخزون مكتمل 👍'}
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Live Invoices Stream Feed */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1, display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.85rem' }}>
            <Receipt sx={{ fontSize: 18, color: '#6366F1' }} />
            أحدث الفواتير والعمليات بالفرع:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'auto', maxHeight: 300, pr: 0.5, width: '100%', minWidth: 0 }}>
            {filteredInvoices.slice(0, 6).length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                  لا توجد فواتير مسجلة اليوم حتى الآن
                </Typography>
              </Box>
            ) : (
              filteredInvoices.slice(0, 6).map((inv) => (
                <Paper
                  key={inv.id}
                  elevation={0}
                  sx={{
                    p: 1.2,
                    borderRadius: '12px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    minWidth: 0,
                    '&:hover': {
                      bgcolor: '#F1F5F9',
                      borderColor: '#CBD5E1',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, flex: 1 }}>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '10px',
                        bgcolor: inv.orderType === 'delivery' ? '#DBEAFE' : inv.orderType === 'dine_in' ? '#D1FAE5' : '#FEF3C7',
                        color: inv.orderType === 'delivery' ? '#2563EB' : inv.orderType === 'dine_in' ? '#059669' : '#D97706',
                        flexShrink: 0,
                      }}
                    >
                      {inv.orderType === 'delivery' ? <DeliveryDining sx={{ fontSize: 20 }} /> : inv.orderType === 'dine_in' ? <Restaurant sx={{ fontSize: 20 }} /> : <ShoppingBag sx={{ fontSize: 20 }} />}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '0.82rem' }}>
                          طلب #{inv.orderNumber || inv.id?.slice(0, 4)}
                        </Typography>
                        <Chip
                          label={inv.orderType === 'delivery' ? 'دليفري' : inv.orderType === 'dine_in' ? 'صالة' : 'تيك أواي'}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0' }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.72rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.customerName ? `العميل: ${inv.customerName}` : `الكاشير: ${inv.cashierName || 'كاشير'}`}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'left', flexShrink: 0, pl: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#059669', fontSize: '0.85rem' }}>
                      {(parseFloat(inv.total) || 0).toFixed(2)} ج.م
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.68rem', display: 'block' }}>
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                    </Typography>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
