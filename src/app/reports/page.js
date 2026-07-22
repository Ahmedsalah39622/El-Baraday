'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, TextField, Button,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import { 
  AttachMoney, Receipt, Assessment, DeliveryDining, ShoppingBag
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const { invoices, fetchInvoices } = useInvoiceStore();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // Live calculations from real invoices
  const totalSales = (invoices || []).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const totalInvoicesCount = invoices?.length || 0;
  const avgInvoiceValue = totalInvoicesCount > 0 ? totalSales / totalInvoicesCount : 0;
  const deliveryOrdersCount = (invoices || []).filter(i => i.orderType === 'delivery').length;

  // Aggregate most sold products
  const productSalesMap = {};
  (invoices || []).forEach(inv => {
    (inv.items || []).forEach(item => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { name: item.name, totalQty: 0, totalRevenue: 0 };
      }
      productSalesMap[item.name].totalQty += (item.quantity || 1);
      productSalesMap[item.name].totalRevenue += (item.price * (item.quantity || 1));
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.totalQty - a.totalQty);

  const stats = [
    { title: 'إجمالي المبيعات', value: `${totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`, icon: <AttachMoney color="primary" fontSize="large" /> },
    { title: 'عدد الفواتير', value: totalInvoicesCount.toString(), icon: <Receipt color="info" fontSize="large" /> },
    { title: 'متوسط الفاتورة', value: `${avgInvoiceValue.toFixed(2)} ج.م`, icon: <Assessment color="success" fontSize="large" /> },
    { title: 'طلبات الدليفري', value: `${deliveryOrdersCount} طلب`, icon: <DeliveryDining color="warning" fontSize="large" /> },
  ];

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
          التقارير والإحصائيات الحية
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2.5}>
        {stats.map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5 }}>
                <Box>
                  <Typography color="text.secondary" variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#1A1A2E' }}>
                    {stat.value}
                  </Typography>
                </Box>
                {stat.icon}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ width: '100%', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="سجل المبيعات الحية" sx={{ fontWeight: 700 }} />
          <Tab label="الأكثر مبيعاً" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {/* Tab 1: Live Sales Record */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>رقم الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>المبلغ الإجمالي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invoices || []).map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 800 }}>#{row.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.orderType === 'delivery' ? 'دليفري' : row.orderType === 'takeaway' ? 'تيك أوي' : 'صالة'}
                      size="small"
                      sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.customerName || 'عميل محلي'}</TableCell>
                  <TableCell sx={{ color: '#6B7280' }}>{row.date}</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#4285F4' }}>{(row.total || 0).toFixed(2)} ج.م</TableCell>
                </TableRow>
              ))}

              {(invoices || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#9CA3AF' }}>
                    لا توجد فواتير مبيعات مسجلة بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 2: Top Products */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم المنتج</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>إجمالي الكمية المباعة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>إجمالي الإيرادات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topProducts.map((p, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{p.name}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#4285F4' }}>{p.totalQty} قطعة</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#059669' }}>{p.totalRevenue.toFixed(2)} ج.م</TableCell>
                </TableRow>
              ))}

              {topProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 5, color: '#9CA3AF' }}>
                    لا توجد بيانات مبيعات منتجات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </Box>
  );
}
