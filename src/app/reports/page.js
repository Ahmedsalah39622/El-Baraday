'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, TextField,
  Button, Chip, FormControl, Select, MenuItem, CircularProgress
} from '@mui/material';
import {
  AttachMoney, Receipt, Assessment, TrendingUp, LocalDining,
  DeliveryDining, AccessTime, Store, Refresh
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ReportsPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReportData, setDailyReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const targetBranch = selectedBranchId && selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || 'b1');

  const loadReports = async () => {
    setLoadingReport(true);
    try {
      fetchInvoices(100, targetBranch);

      const url = `/api/reports/daily?date=${dateFrom}${targetBranch && targetBranch !== 'all' ? `&branch_id=${targetBranch}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDailyReportData(data);
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedBranchId, dateFrom]);

  // Live calculations from real invoices isolated strictly per branch
  const branchInvoices = (invoices || []).filter(inv => !selectedBranchId || selectedBranchId === 'all' || inv.branchId === selectedBranchId || inv.branch_id === selectedBranchId);

  const totalSales = branchInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const totalInvoicesCount = branchInvoices.length;
  const avgInvoiceValue = totalInvoicesCount > 0 ? totalSales / totalInvoicesCount : 0;
  const deliveryOrdersCount = branchInvoices.filter(i => i.orderType === 'delivery').length;

  // Aggregate top sold products for selected branch
  const productSalesMap = {};
  branchInvoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      const pName = item.name || item.product_name || 'صنف';
      if (!productSalesMap[pName]) {
        productSalesMap[pName] = { name: pName, totalQty: 0, totalRevenue: 0 };
      }
      productSalesMap[pName].totalQty += (item.quantity || 1);
      productSalesMap[pName].totalRevenue += (parseFloat(item.price || 0) * (item.quantity || 1));
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.totalQty - a.totalQty);

  const stats = [
    { title: 'إجمالي مبيعات الفرع', value: `${totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`, icon: <AttachMoney color="primary" fontSize="large" /> },
    { title: 'عدد فواتير الفرع', value: totalInvoicesCount.toString(), icon: <Receipt color="info" fontSize="large" /> },
    { title: 'متوسط قيمة الفاتورة', value: `${avgInvoiceValue.toFixed(2)} ج.م`, icon: <Assessment color="success" fontSize="large" /> },
    { title: 'طلبات الدليفري للفرع', value: `${deliveryOrdersCount} طلب`, icon: <DeliveryDining color="warning" fontSize="large" /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
            التقارير والإحصائيات الماليـة للحظية
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            تحليل دقيق وحصري لمبيعات الفرع، أصناف الأكثر مبيعاً، وأداء الخزنة
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            sx={{ bgcolor: '#FFF', borderRadius: '12px' }}
          />

          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                sx={{ borderRadius: '12px', bgcolor: '#FFF', fontWeight: 800 }}
              >
                <MenuItem value="all">🏢 كافـة الفـروع</MenuItem>
                {branches.map(b => (
                  <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button variant="outlined" startIcon={<Refresh />} onClick={loadReports} sx={{ borderRadius: '12px', fontWeight: 800 }}>
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Financial Summary Cards */}
      <Grid container spacing={2.5}>
        {stats.map((stat, index) => (
          <Grid xs={12} sm={6} md={3} key={index}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(66, 133, 244, 0.08)' }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h6" fontWeight={900} color="#1A1A2E">
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Report Tables */}
      <Grid container spacing={3}>
        {/* Top Selling Products */}
        <Grid xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid #E5E7EB' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800} color="#1A1A2E">
                🔥 الأصناف الأكثر مبيعاً بالفرع
              </Typography>
              <Chip label={`${topProducts.length} أصناف`} size="small" color="primary" sx={{ fontWeight: 800 }} />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>اسم الصنف</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية المباعة</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 800 }}>إجمالي الإيراد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.slice(0, 8).map((prod, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{prod.name}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#3B82F6' }}>
                        {prod.totalQty} قطعة
                      </TableCell>
                      <TableCell align="left" sx={{ fontWeight: 900, color: '#10B981' }}>
                        {prod.totalRevenue.toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        لا توجد مبيعات أصناف مسجلة لهذا الفرع حالياً.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Daily Financial Breakdown */}
        <Grid xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" fontWeight={800} color="#1A1A2E">
              📊 ملخص إحصائيات الخزنة والمبيعات اليومية
            </Typography>

            {loadingReport ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={30} /></Box>
            ) : dailyReportData ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', bgcolor: '#ECFDF5' }}>
                  <Typography variant="body2" fontWeight={800} color="#065F46">إجمالي مبيعات اليوم:</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#047857">{(parseFloat(dailyReportData.total_sales) || 0).toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', bgcolor: '#EFF6FF' }}>
                  <Typography variant="body2" fontWeight={800} color="#1E40AF">تحصيل الخزنة النقدي (كاش):</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#1D4ED8">{(parseFloat(dailyReportData.cash_total) || 0).toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', bgcolor: '#F3E8FF' }}>
                  <Typography variant="body2" fontWeight={800} color="#6B21A8">تحصيل الفيزا والشبكة:</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#7E22CE">{(parseFloat(dailyReportData.visa_total) || 0).toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: '12px', bgcolor: '#FFFBEB' }}>
                  <Typography variant="body2" fontWeight={800} color="#92400E">رسوم الدليفري المحصلة:</Typography>
                  <Typography variant="subtitle2" fontWeight={900} color="#B45309">{(parseFloat(dailyReportData.total_delivery_fees) || 0).toLocaleString()} ج.م</Typography>
                </Box>
              </Box>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
