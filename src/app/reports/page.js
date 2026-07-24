'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, TextField,
  Button, Chip, FormControl, Select, MenuItem, CircularProgress, Tooltip
} from '@mui/material';
import {
  AttachMoney, Receipt, Assessment, TrendingUp, LocalDining,
  DeliveryDining, AccessTime, Store, Refresh, PictureAsPdf, Explicit,
  People, Inventory, AccountBalanceWallet, Scale, BadgeOutlined, FormatListNumbered, Group
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { generateReportPDF } from '@/lib/reportPdfExport';
import { exportToExcel } from '@/lib/exportToExcel';

export default function ReportsPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Dynamic Datasets fetched from API endpoints
  const [attendanceData, setAttendanceData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [employeesData, setEmployeesData] = useState([]);
  const [shiftsData, setShiftsData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [dailyReportSummary, setDailyReportSummary] = useState(null);

  const targetBranch = selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || 'all');

  // Set preset date ranges
  const setPresetDateRange = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      setDateFrom(yestStr);
      setDateTo(yestStr);
    } else if (preset === 'week') {
      const first = today.getDate() - today.getDay();
      const firstDay = new Date(today.setDate(first)).toISOString().split('T')[0];
      setDateFrom(firstDay);
      setDateTo(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setDateFrom(firstDay);
      setDateTo(todayStr);
    } else if (preset === 'all') {
      setDateFrom('2024-01-01');
      setDateTo(todayStr);
    }
  };

  const loadAllReportData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Invoices
      fetchInvoices(500, targetBranch);

      // 2. Fetch Daily Summary API
      const summaryUrl = `/api/reports/daily?date=${dateFrom}${targetBranch && targetBranch !== 'all' ? `&branch_id=${targetBranch}` : ''}`;
      const summaryRes = await fetch(summaryUrl);
      if (summaryRes.ok) setDailyReportSummary(await summaryRes.json());

      // 3. Fetch Attendance API
      const attRes = await fetch('/api/attendance');
      if (attRes.ok) setAttendanceData(await attRes.json());

      // 4. Fetch Inventory API
      const invRes = await fetch('/api/inventory');
      if (invRes.ok) setInventoryData(await invRes.json());

      // 5. Fetch Employees & Advances API
      const empRes = await fetch('/api/employees');
      if (empRes.ok) setEmployeesData(await empRes.json());

      // 6. Fetch Shifts API
      const shiftRes = await fetch('/api/shifts');
      if (shiftRes.ok) setShiftsData(await shiftRes.json());

      // 7. Fetch Customers API
      const custRes = await fetch('/api/customers');
      if (custRes.ok) setCustomersData(await custRes.json());

    } catch (e) {
      console.error('Failed fetching report datasets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReportData();
  }, [selectedBranchId, dateFrom, dateTo]);

  // Date & Branch Filtering for Invoices
  const filteredInvoices = (invoices || []).filter((inv) => {
    const matchBranch = !selectedBranchId || selectedBranchId === 'all' || inv.branchId === selectedBranchId || inv.branch_id === selectedBranchId;
    if (!matchBranch) return false;

    if (inv.createdAt) {
      const invDate = inv.createdAt.split('T')[0];
      if (dateFrom && invDate < dateFrom) return false;
      if (dateTo && invDate > dateTo) return false;
    }
    return true;
  });

  // Calculate Aggregated Metrics
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const totalOrdersCount = filteredInvoices.length;
  const avgOrderValue = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;
  const deliveryOrders = filteredInvoices.filter((i) => i.orderType === 'delivery');
  const deliveryCount = deliveryOrders.length;
  const deliveryFeesTotal = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.deliveryFee) || 0), 0);

  // Driver Performance & Commissions Aggregation
  const driverPerformanceMap = {};
  deliveryOrders.forEach((inv) => {
    const dName = inv.driverName || inv.driver_name || 'طيار غير محدد';
    if (!driverPerformanceMap[dName]) {
      driverPerformanceMap[dName] = { driverName: dName, orderCount: 0, totalDeliveryFees: 0, totalOrderAmount: 0 };
    }
    driverPerformanceMap[dName].orderCount += 1;
    driverPerformanceMap[dName].totalDeliveryFees += parseFloat(inv.deliveryFee || 15);
    driverPerformanceMap[dName].totalOrderAmount += parseFloat(inv.total || 0);
  });
  const driverPerformanceList = Object.values(driverPerformanceMap);

  // Top Products Sold
  const productSalesMap = {};
  filteredInvoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const pName = item.name || item.product_name || 'صنف';
      if (!productSalesMap[pName]) {
        productSalesMap[pName] = { name: pName, totalQty: 0, totalRevenue: 0 };
      }
      productSalesMap[pName].totalQty += item.quantity || 1;
      productSalesMap[pName].totalRevenue += parseFloat(item.price || 0) * (item.quantity || 1);
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.totalQty - a.totalQty);

  // Get active branch display name
  const activeBranchName = selectedBranchId === 'all' || !selectedBranchId ? 'كافة الفروع' : (branches.find((b) => b.id === selectedBranchId)?.name || 'الفرع المحدد');

  // ========================================================
  // EXPORT FUNCTIONS (PDF & EXCEL)
  // ========================================================
  const handleExportPDF = () => {
    let reportTitle = 'تقرير الشامل';
    let columns = [];
    let reportData = [];
    let reportStats = [];

    let totals = null;

    if (activeTab === 'overview') {
      reportTitle = 'تقرير الإيرادات والمبيعات والأصناف الأكثر مبيعاً';
      columns = [
        { label: '#', accessor: (r, idx) => idx + 1 },
        { label: 'الصنف', accessor: 'name' },
        { label: 'الكمية المباعة', key: 'totalQty', accessor: 'totalQty' },
        { label: 'إجمالي الإيراد (ج.م)', key: 'totalRevenue', accessor: (r) => r.totalRevenue.toFixed(2) },
      ];
      reportData = topProducts;
      totals = {
        name: 'الإجمالي',
        totalQty: `${topProducts.reduce((s, p) => s + p.totalQty, 0)} قطعة`,
        totalRevenue: `${totalSales.toFixed(2)} ج.م`,
      };
      reportStats = [
        { title: 'إجمالي الإيرادات', value: `${totalSales.toFixed(2)} ج.م` },
        { title: 'عدد الفواتير', value: `${totalOrdersCount}` },
        { title: 'طلبات الدليفري', value: `${deliveryCount}` },
      ];
    } else if (activeTab === 'daily_attendance') {
      reportTitle = 'تقرير التمام اليومي وحضور الموظفين';
      columns = [
        { label: '#', accessor: (r, idx) => idx + 1 },
        { label: 'الموظف / الطيار', key: 'name', accessor: (r) => r.driver_name || r.name || 'موظف' },
        { label: 'الفرع', accessor: (r) => r.branch_name || activeBranchName },
        { label: 'وقت الحضور', accessor: (r) => r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('ar-EG') : 'حاضر' },
        { label: 'وقت الانصراف', accessor: (r) => r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('ar-EG') : 'في الشيفت' },
        { label: 'الحالة الحالية', key: 'status', accessor: (r) => r.status === 'ready' ? 'جاهز بالدور' : r.status === 'on_delivery' ? 'في مشوار توصيل' : 'حاضر' },
      ];
      reportData = attendanceData;
      totals = {
        name: 'الإجمالي',
        status: `إجمالي الحضور: ${attendanceData.length}`,
      };
    } else if (activeTab === 'delivery') {
      reportTitle = 'تقرير طلبات وأداء الدليفري';
      columns = [
        { label: 'رقم الطلب', accessor: (r) => `#${r.orderNumber || r.id?.slice(0,6)}` },
        { label: 'العميل', accessor: (r) => r.customerName || 'عميل' },
        { label: 'الهاتف', accessor: (r) => r.customerPhone || '-' },
        { label: 'الطيار', key: 'driverName', accessor: (r) => r.driverName || 'غير محدد' },
        { label: 'رسوم التوصيل', key: 'deliveryFee', accessor: (r) => `${(r.deliveryFee || 0).toFixed(2)} ج.م` },
        { label: 'الإجمالي', key: 'total', accessor: (r) => `${(r.total || 0).toFixed(2)} ج.م` },
      ];
      reportData = deliveryOrders;
      totals = {
        driverName: 'الإجمالي',
        deliveryFee: `${deliveryFeesTotal.toFixed(2)} ج.م`,
        total: `${totalSales.toFixed(2)} ج.م`,
      };
    } else if (activeTab === 'driver_commissions') {
      reportTitle = 'تقرير نسب وحسابات طياري الدليفري';
      columns = [
        { label: 'اسم الطيار', key: 'driverName', accessor: 'driverName' },
        { label: 'عدد الطلبات المنفذة', key: 'orderCount', accessor: 'orderCount' },
        { label: 'إجمالي رسوم التوصيل (ج.م)', key: 'totalDeliveryFees', accessor: (r) => r.totalDeliveryFees.toFixed(2) },
        { label: 'مجموع قيمة الطلبات (ج.م)', key: 'totalOrderAmount', accessor: (r) => r.totalOrderAmount.toFixed(2) },
      ];
      reportData = driverPerformanceList;
      totals = {
        driverName: 'الإجمالي',
        orderCount: `${driverPerformanceList.reduce((s, d) => s + d.orderCount, 0)}`,
        totalDeliveryFees: `${driverPerformanceList.reduce((s, d) => s + d.totalDeliveryFees, 0).toFixed(2)}`,
        totalOrderAmount: `${driverPerformanceList.reduce((s, d) => s + d.totalOrderAmount, 0).toFixed(2)}`,
      };
    } else if (activeTab === 'inventory') {
      reportTitle = 'تقرير استهلاك المخزون والخامات';
      columns = [
        { label: 'اسم الخامة / المنتج', key: 'name', accessor: 'name' },
        { label: 'الفئة', accessor: (r) => r.category || 'خامات' },
        { label: 'الكمية المتوفرة', key: 'quantity', accessor: (r) => `${r.quantity || 0} ${r.unit || ''}` },
        { label: 'الحد الأدنى', accessor: (r) => `${r.minQuantity || 5} ${r.unit || ''}` },
        { label: 'الحالة', accessor: (r) => (r.quantity <= (r.minQuantity || 5)) ? 'نواقص' : 'متوفر' },
      ];
      reportData = inventoryData;
      totals = {
        name: 'الإجمالي',
        quantity: `${inventoryData.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0)} أصناف`,
      };
    } else if (activeTab === 'salaries') {
      reportTitle = 'تقرير المرتبات والمسحوبات والسُلف';
      columns = [
        { label: 'الموظف', key: 'name', accessor: 'name' },
        { label: 'الوظيفة', accessor: 'role' },
        { label: 'الراتب الأساسي', key: 'salary', accessor: (r) => `${parseFloat(r.salary || 0).toFixed(2)} ج.م` },
        { label: 'إجمالي السُلف والمسحوبات', key: 'total_advances', accessor: (r) => `${parseFloat(r.total_advances || 0).toFixed(2)} ج.م` },
        { label: 'الصافي المستحق', key: 'net_salary', accessor: (r) => `${(parseFloat(r.salary || 0) - parseFloat(r.total_advances || 0)).toFixed(2)} ج.م` },
      ];
      reportData = employeesData;
      const totalSalary = employeesData.reduce((s, e) => s + (parseFloat(e.salary) || 0), 0);
      const totalAdvances = employeesData.reduce((s, e) => s + (parseFloat(e.total_advances) || 0), 0);
      totals = {
        name: 'الإجمالي',
        salary: `${totalSalary.toFixed(2)} ج.م`,
        total_advances: `${totalAdvances.toFixed(2)} ج.م`,
        net_salary: `${(totalSalary - totalAdvances).toFixed(2)} ج.م`,
      };
    } else if (activeTab === 'shifts') {
      reportTitle = 'تقرير سجل الشيفتات وإغلاق الخزنة';
      columns = [
        { label: 'الكاشير', key: 'cashier_name', accessor: (r) => r.cashier_name || 'كاشير' },
        { label: 'وقت الفتح', accessor: (r) => r.start_time ? new Date(r.start_time).toLocaleString('ar-EG') : '-' },
        { label: 'وقت الإغلاق', accessor: (r) => r.end_time ? new Date(r.end_time).toLocaleString('ar-EG') : 'مفتوح الآن' },
        { label: 'المتوقع بالخزنة', key: 'expected_cash', accessor: (r) => `${(r.expected_cash || 0).toFixed(2)} ج.م` },
        { label: 'الفعلي بالخزنة', key: 'actual_cash', accessor: (r) => `${(r.actual_cash || 0).toFixed(2)} ج.م` },
        { label: 'الفارق / العجز', key: 'diff', accessor: (r) => `${((r.actual_cash || 0) - (r.expected_cash || 0)).toFixed(2)} ج.م` },
      ];
      reportData = shiftsData;
      const totalExp = shiftsData.reduce((s, r) => s + (parseFloat(r.expected_cash) || 0), 0);
      const totalAct = shiftsData.reduce((s, r) => s + (parseFloat(r.actual_cash) || 0), 0);
      totals = {
        cashier_name: 'الإجمالي',
        expected_cash: `${totalExp.toFixed(2)} ج.م`,
        actual_cash: `${totalAct.toFixed(2)} ج.م`,
        diff: `${(totalAct - totalExp).toFixed(2)} ج.م`,
      };
    } else if (activeTab === 'orders') {
      reportTitle = 'تقرير كشف الطلبات التفصيلي';
      columns = [
        { label: 'رقم الطلب', accessor: (r) => `#${r.orderNumber || r.id?.slice(0,6)}` },
        { label: 'نوع الطلب', accessor: (r) => r.orderType === 'delivery' ? 'دليفري' : 'تيك أوي' },
        { label: 'العميل', key: 'customerName', accessor: (r) => r.customerName || 'كاشير' },
        { label: 'التاريخ والوقت', accessor: (r) => new Date(r.createdAt || Date.now()).toLocaleString('ar-EG') },
        { label: 'المبلغ الإجمالي', key: 'total', accessor: (r) => `${(r.total || 0).toFixed(2)} ج.م` },
      ];
      reportData = filteredInvoices;
      totals = {
        customerName: 'الإجمالي',
        total: `${totalSales.toFixed(2)} ج.م`,
      };
    } else if (activeTab === 'customers') {
      reportTitle = 'تقرير بيانات وإحصائيات العملاء';
      columns = [
        { label: 'اسم العميل', key: 'name', accessor: 'name' },
        { label: 'رقم الهاتف', accessor: 'phone' },
        { label: 'عدد الطلبات', key: 'ordersCount', accessor: (r) => r.ordersCount || 1 },
        { label: 'العنوان المسجل', accessor: 'address' },
      ];
      reportData = customersData;
      totals = {
        name: 'الإجمالي',
        ordersCount: `إجمالي العملاء: ${customersData.length}`,
      };
    }

    generateReportPDF({
      title: reportTitle,
      branchName: activeBranchName,
      dateRangeStr: `${dateFrom} إلى ${dateTo}`,
      stats: reportStats,
      columns,
      data: reportData,
      totals,
    });
  };

  const handleExportExcel = () => {
    let fileName = `تقرير_${activeTab}`;
    let columns = [];
    let data = [];

    if (activeTab === 'overview') {
      columns = [
        { label: 'الصنف', accessor: 'name' },
        { label: 'الكمية المباعة', accessor: 'totalQty' },
        { label: 'الإيراد الإجمالي', accessor: (r) => r.totalRevenue },
      ];
      data = topProducts;
    } else if (activeTab === 'daily_attendance') {
      columns = [
        { label: 'الاسم', accessor: (r) => r.driver_name || r.name },
        { label: 'الفرع', accessor: (r) => r.branch_name || activeBranchName },
        { label: 'وقت الحضور', accessor: (r) => r.check_in_time },
        { label: 'وقت الانصراف', accessor: (r) => r.check_out_time },
        { label: 'الحالة', accessor: 'status' },
      ];
      data = attendanceData;
    } else if (activeTab === 'delivery') {
      columns = [
        { label: 'رقم الطلب', accessor: 'orderNumber' },
        { label: 'العميل', accessor: 'customerName' },
        { label: 'الهاتف', accessor: 'customerPhone' },
        { label: 'الطيار', accessor: 'driverName' },
        { label: 'خدمة التوصيل', accessor: 'deliveryFee' },
        { label: 'الإجمالي', accessor: 'total' },
      ];
      data = deliveryOrders;
    } else if (activeTab === 'driver_commissions') {
      columns = [
        { label: 'اسم الطيار', accessor: 'driverName' },
        { label: 'عدد الطلبات', accessor: 'orderCount' },
        { label: 'إجمالي رسوم التوصيل', accessor: 'totalDeliveryFees' },
        { label: 'مجموع قيمة المبيعات', accessor: 'totalOrderAmount' },
      ];
      data = driverPerformanceList;
    } else if (activeTab === 'inventory') {
      columns = [
        { label: 'الخامة / الصنف', accessor: 'name' },
        { label: 'الفئة', accessor: 'category' },
        { label: 'الكمية الحالية', accessor: 'quantity' },
        { label: 'الحد الأدنى', accessor: 'minQuantity' },
      ];
      data = inventoryData;
    } else if (activeTab === 'salaries') {
      columns = [
        { label: 'الموظف', accessor: 'name' },
        { label: 'الوظيفة', accessor: 'role' },
        { label: 'الراتب الأساسي', accessor: 'salary' },
        { label: 'إجمالي المسحوبات والسلف', accessor: 'total_advances' },
      ];
      data = employeesData;
    } else if (activeTab === 'shifts') {
      columns = [
        { label: 'الكاشير', accessor: 'cashier_name' },
        { label: 'وقت الفتح', accessor: 'start_time' },
        { label: 'وقت الإغلاق', accessor: 'end_time' },
        { label: 'المتوقع بالخزنة', accessor: 'expected_cash' },
        { label: 'الفعلي بالخزنة', accessor: 'actual_cash' },
      ];
      data = shiftsData;
    } else if (activeTab === 'orders') {
      columns = [
        { label: 'رقم الطلب', accessor: 'orderNumber' },
        { label: 'نوع الطلب', accessor: 'orderType' },
        { label: 'العميل', accessor: 'customerName' },
        { label: 'التاريخ', accessor: 'createdAt' },
        { label: 'المبلغ الإجمالي', accessor: 'total' },
      ];
      data = filteredInvoices;
    } else if (activeTab === 'customers') {
      columns = [
        { label: 'اسم العميل', accessor: 'name' },
        { label: 'الهاتف', accessor: 'phone' },
        { label: 'العنوان', accessor: 'address' },
      ];
      data = customersData;
    }

    exportToExcel(fileName, columns, data);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header & Filter Toolbar */}
      <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ color: '#4285F4', fontSize: 28 }} /> مجمع التقارير والإحصائيات الشاملة
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5, fontWeight: 600 }}>
              تحليلات مالية وتشغيلية متكاملة للمبيعات، الدليفري، الخامات، المرتبات والشيفتات
            </Typography>
          </Box>

          {/* Export Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdf />}
              onClick={handleExportPDF}
              sx={{ borderRadius: '12px', fontWeight: 800, px: 2.5, bgcolor: '#4285F4' }}
            >
              تصدير PDF / طباعة
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Explicit />}
              onClick={handleExportExcel}
              sx={{ borderRadius: '12px', fontWeight: 800, px: 2.5, bgcolor: '#10B981' }}
            >
              تصدير Excel
            </Button>
          </Box>
        </Box>

        {/* Date Range & Branch Filters Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', pt: 1, borderTop: '1px dashed #E5E7EB' }}>
          {/* Quick Preset Buttons */}
          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
            <Button size="small" onClick={() => setPresetDateRange('today')} sx={{ bgcolor: dateFrom === todayStr && dateTo === todayStr ? '#4285F4' : '#F3F4F6', color: dateFrom === todayStr && dateTo === todayStr ? '#FFF' : '#374151', borderRadius: '8px', fontWeight: 700 }}>اليوم</Button>
            <Button size="small" onClick={() => setPresetDateRange('yesterday')} sx={{ bgcolor: '#F3F4F6', color: '#374151', borderRadius: '8px', fontWeight: 700 }}>أمس</Button>
            <Button size="small" onClick={() => setPresetDateRange('week')} sx={{ bgcolor: '#F3F4F6', color: '#374151', borderRadius: '8px', fontWeight: 700 }}>هذا الأسبوع</Button>
            <Button size="small" onClick={() => setPresetDateRange('month')} sx={{ bgcolor: '#F3F4F6', color: '#374151', borderRadius: '8px', fontWeight: 700 }}>هذا الشهر</Button>
            <Button size="small" onClick={() => setPresetDateRange('all')} sx={{ bgcolor: '#F3F4F6', color: '#374151', borderRadius: '8px', fontWeight: 700 }}>الكل</Button>
          </Box>

          {/* Date Pickers */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8FAFC', p: 0.5, px: 1, borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>من:</Typography>
            <TextField type="date" size="small" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sx={{ '& input': { p: 0.5, fontSize: '0.813rem', fontWeight: 700 } }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>إلى:</Typography>
            <TextField type="date" size="small" value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={{ '& input': { p: 0.5, fontSize: '0.813rem', fontWeight: 700 } }} />
          </Box>

          {/* Branch Dropdown Selector */}
          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} sx={{ borderRadius: '10px', bgcolor: '#FFF', fontWeight: 800, fontSize: '0.813rem' }}>
                <MenuItem value="all">🏢 كافـة الفـروع</MenuItem>
                {branches.map(b => (
                  <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button variant="outlined" startIcon={<Refresh />} onClick={loadAllReportData} sx={{ borderRadius: '10px', fontWeight: 800 }}>
            تحديث البيانات
          </Button>
        </Box>
      </Paper>

      {/* Financial Summary Metric Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#3B82F6', color: '#FFF' }}>
                <AttachMoney />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#1E40AF', fontWeight: 800 }}>إجمالي إيراد المبيعات</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E3A8A' }}>{totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', bgcolor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#10B981', color: '#FFF' }}>
                <Receipt />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 800 }}>عدد فواتير الطلبات</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#064E3B' }}>{totalOrdersCount} طلب</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', bgcolor: '#FFF3EB', border: '1px solid #FFD8B3' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#FF8C42', color: '#FFF' }}>
                <DeliveryDining />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#E06B1F', fontWeight: 800 }}>طلبات الدليفري المحصلة</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#C25108' }}>{deliveryCount} طلب ({deliveryFeesTotal.toFixed(0)} ج.م)</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', bgcolor: '#F3E8FF', border: '1px solid #E9D5FF' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
              <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: '#8B5CF6', color: '#FFF' }}>
                <Assessment />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B21A8', fontWeight: 800 }}>متوسط قيمة الأوردر</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#581C87' }}>{avgOrderValue.toFixed(2)} ج.م</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 9 Category Report Tabs */}
      <Paper sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            '& .MuiTab-root': { fontWeight: 800, fontSize: '0.875rem', py: 1.5, px: 2.5 }
          }}
        >
          <Tab value="overview" label="📊 الإيرادات والأصناف" icon={<AttachMoney fontSize="small" />} iconPosition="start" />
          <Tab value="daily_attendance" label="📋 التمام اليومي" icon={<BadgeOutlined fontSize="small" />} iconPosition="start" />
          <Tab value="delivery" label="🛵 أداء الدليفري" icon={<DeliveryDining fontSize="small" />} iconPosition="start" />
          <Tab value="driver_commissions" label="💰 نسب ومرتبات الطيارين" icon={<AccountBalanceWallet fontSize="small" />} iconPosition="start" />
          <Tab value="inventory" label="📦 استهلاك الخامات" icon={<Inventory fontSize="small" />} iconPosition="start" />
          <Tab value="salaries" label="💵 المرتبات والسُلفيات" icon={<Scale fontSize="small" />} iconPosition="start" />
          <Tab value="shifts" label="🕒 الشيفتات والخزنة" icon={<AccessTime fontSize="small" />} iconPosition="start" />
          <Tab value="orders" label="🛒 تفاصيل الطلبات" icon={<FormatListNumbered fontSize="small" />} iconPosition="start" />
          <Tab value="customers" label="👥 تحليلات العملاء" icon={<Group fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {loading ? (
            <Box sx={{ py: 6, textCenter: 'center', display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, color: '#1A1A2E' }}>🔥 الأصناف الأكثر مبيعاً</Typography>
                    <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>اسم الصنف</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية المباعة</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 800 }}>إجمالي الإيراد</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {topProducts.slice(0, 10).map((prod, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{prod.name}</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800, color: '#3B82F6' }}>{prod.totalQty} قطعة</TableCell>
                              <TableCell align="left" sx={{ fontWeight: 900, color: '#10B981' }}>{prod.totalRevenue.toLocaleString()} ج.م</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, color: '#1A1A2E' }}>📊 ملخص الخزنة اليومي</Typography>
                    {dailyReportSummary && (
                      <Paper sx={{ p: 2, borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: '#ECFDF5', borderRadius: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>إجمالي مبيعات اليوم:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#047857' }}>{(parseFloat(dailyReportSummary.total_sales) || 0).toLocaleString()} ج.م</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: '#EFF6FF', borderRadius: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>تحصيل الكاش:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#1D4ED8' }}>{(parseFloat(dailyReportSummary.cash_total) || 0).toLocaleString()} ج.م</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: '#F3E8FF', borderRadius: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>تحصيل الفيزا / الشبكة:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#7E22CE' }}>{(parseFloat(dailyReportSummary.visa_total) || 0).toLocaleString()} ج.م</Typography>
                        </Box>
                      </Paper>
                    )}
                  </Grid>
                </Grid>
              )}

              {/* TAB 2: DAILY ATTENDANCE */}
              {activeTab === 'daily_attendance' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>اسم الموظف / الطيار</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>وقت الحضور</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>وقت الانصراف</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>{row.driver_name || row.name || 'موظف'}</TableCell>
                          <TableCell>{row.branch_name || activeBranchName}</TableCell>
                          <TableCell>{row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString('ar-EG') : '-'}</TableCell>
                          <TableCell>{row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString('ar-EG') : 'في الشيفت'}</TableCell>
                          <TableCell><Chip label={row.status === 'ready' ? 'جاهز بالدور' : row.status === 'on_delivery' ? 'في مشوار' : 'حاضر'} size="small" color={row.status === 'ready' ? 'success' : 'primary'} sx={{ fontWeight: 800 }} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 3: DELIVERY */}
              {activeTab === 'delivery' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الهاتف</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الطيار</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>رسوم التوصيل</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deliveryOrders.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>#{row.orderNumber || row.id?.slice(0, 6)}</TableCell>
                          <TableCell>{row.customerName || 'عميل'}</TableCell>
                          <TableCell>{row.customerPhone || '-'}</TableCell>
                          <TableCell><Chip label={row.driverName || 'غير محدد'} size="small" sx={{ fontWeight: 800 }} /></TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#E06B1F' }}>{(row.deliveryFee || 0).toFixed(2)} ج.م</TableCell>
                          <TableCell sx={{ fontWeight: 900, color: '#4285F4' }}>{(row.total || 0).toFixed(2)} ج.م</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 4: DRIVER COMMISSIONS */}
              {activeTab === 'driver_commissions' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>اسم الطيار</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>عدد المشاوير / الطلبات</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>إجمالي خدمة التوصيل (ج.م)</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>مجموع مبيعات الطلبات (ج.م)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {driverPerformanceList.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 900, color: '#1A1A2E' }}>🛵 {row.driverName}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: '#3B82F6' }}>{row.orderCount} طلب</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 900, color: '#E06B1F' }}>{row.totalDeliveryFees.toFixed(2)} ج.م</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 900, color: '#10B981' }}>{row.totalOrderAmount.toFixed(2)} ج.م</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 5: INVENTORY */}
              {activeTab === 'inventory' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>اسم الخامة / المنتج</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية الحالية</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>الحد الأدنى</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>حالة المخزون</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventoryData.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
                          <TableCell>{row.category || 'خامات'}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>{row.quantity || 0} {row.unit || ''}</TableCell>
                          <TableCell align="center">{row.minQuantity || 5} {row.unit || ''}</TableCell>
                          <TableCell><Chip label={(row.quantity <= (row.minQuantity || 5)) ? 'نواقص' : 'متوفر'} color={(row.quantity <= (row.minQuantity || 5)) ? 'error' : 'success'} size="small" sx={{ fontWeight: 800 }} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 6: SALARIES */}
              {activeTab === 'salaries' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>الوظيفة</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>الراتب الأساسي</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>إجمالي السُلف والمسحوبات</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>الصافي المستحق</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employeesData.map((row, idx) => {
                        const salary = parseFloat(row.salary || 0);
                        const advances = parseFloat(row.total_advances || 0);
                        const net = salary - advances;
                        return (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 800 }}>👤 {row.name}</TableCell>
                            <TableCell>{row.role || 'كاشير'}</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 800 }}>{salary.toFixed(2)} ج.م</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 800, color: '#EF4444' }}>-{advances.toFixed(2)} ج.م</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 900, color: '#10B981' }}>{net.toFixed(2)} ج.م</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 7: SHIFTS */}
              {activeTab === 'shifts' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>الكاشير</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>وقت الفتح</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>وقت الإغلاق</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>المتوقع بالخزنة</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>الفعلي بالخزنة</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>العجز / الزيادة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shiftsData.map((row, idx) => {
                        const diff = (parseFloat(row.actual_cash) || 0) - (parseFloat(row.expected_cash) || 0);
                        return (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{row.cashier_name || 'كاشير'}</TableCell>
                            <TableCell>{row.start_time ? new Date(row.start_time).toLocaleString('ar-EG') : '-'}</TableCell>
                            <TableCell>{row.end_time ? new Date(row.end_time).toLocaleString('ar-EG') : 'شيفت مفتوح'}</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 800 }}>{(parseFloat(row.expected_cash) || 0).toFixed(2)} ج.م</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 800 }}>{(parseFloat(row.actual_cash) || 0).toFixed(2)} ج.م</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 900, color: diff < 0 ? '#EF4444' : '#10B981' }}>{diff.toFixed(2)} ج.م</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 8: ORDERS */}
              {activeTab === 'orders' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 800 }}>المبلغ الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredInvoices.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>#{row.orderNumber || row.id?.slice(0, 6)}</TableCell>
                          <TableCell><Chip label={row.orderType === 'delivery' ? 'دليفري' : 'تيك أوي'} size="small" color={row.orderType === 'delivery' ? 'warning' : 'primary'} sx={{ fontWeight: 800 }} /></TableCell>
                          <TableCell>{row.customerName || 'كاشير'}</TableCell>
                          <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString('ar-EG') : 'اليوم'}</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 900, color: '#4285F4' }}>{(row.total || 0).toFixed(2)} ج.م</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* TAB 9: CUSTOMERS */}
              {activeTab === 'customers' && (
                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>اسم العميل</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>رقم الهاتف</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>العنوان المسجل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customersData.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 800 }}>👤 {row.name || 'عميل'}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.phone || '-'}</TableCell>
                          <TableCell>{row.address || 'عنوان مسجل'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
