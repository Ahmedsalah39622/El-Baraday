'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Print } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { printThermalReceipt } from '@/lib/printReceipt';

export default function OrdersPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter orders by search query
  const filteredOrders = (invoices || []).filter(
    (inv) =>
      !searchQuery ||
      inv.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.orderNumber?.includes(searchQuery) ||
      inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerPhone?.includes(searchQuery)
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
            سجل الطلبات والفواتير
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            إجمالي الطلبات المسجلة ({invoices?.length || 0})
          </Typography>
        </Box>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث برقم الطلب أو اسم العميل..." />
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>اصناف الفاتورة والطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>حالة الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السعر الإجمالي</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>طباعة الفاتورة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((row) => {
              const hasItems = Array.isArray(row.items) && row.items.length > 0;
              const itemSummary = hasItems
                ? row.items.map((i) => `${i.quantity || 1}× ${i.name || i.product_name || 'صنف'}`).join(' ، ')
                : '';

              const isDelivery = row.orderType === 'delivery';

              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.95rem' }}>
                    #{row.orderNumber || row.id?.slice(0, 8)}
                  </TableCell>
                  
                  <TableCell sx={{ fontWeight: 700, color: '#374151' }}>
                    {row.customerName || 'عميل كاشير'}
                    {row.customerPhone ? ` (${row.customerPhone})` : ''}
                  </TableCell>

                  <TableCell sx={{ color: '#4B5563', maxWidth: 300 }}>
                    {hasItems ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {row.items.map((it, idx) => (
                          <Chip
                            key={idx}
                            label={`${it.quantity || 1}× ${it.name || it.product_name || 'صنف'}`}
                            size="small"
                            sx={{ bgcolor: '#F1F5F9', color: '#1E293B', fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                        طلب كاشير بدون تفاصيل
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ color: '#6B7280', fontSize: '0.85rem' }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'اليوم'}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={isDelivery ? 'دليفري' : row.orderType === 'takeaway' ? 'تيك أوي' : 'صالة'}
                      size="small"
                      sx={{
                        bgcolor: isDelivery ? '#FFF3EB' : '#EFF6FF',
                        color: isDelivery ? '#E06B1F' : '#1D4ED8',
                        fontWeight: 800,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.status || 'مكتمل'}
                      size="small"
                      sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 800 }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontWeight: 900, color: '#4285F4', fontSize: '0.95rem' }}>
                    {(row.total || 0).toFixed(2)} ج.م
                  </TableCell>

                  <TableCell align="center">
                    <Tooltip title="إعادة طباعة الفاتورة" arrow>
                      <IconButton
                        size="small"
                        onClick={() => printThermalReceipt({
                          orderNumber: row.orderNumber || '1',
                          dateStr: new Date(row.createdAt || Date.now()).toLocaleString('ar-EG'),
                          cashierName: row.cashierName || 'administrator',
                          customerName: row.customerName,
                          customerPhone: row.customerPhone,
                          items: row.items || [],
                          subtotal: row.subtotal || row.total,
                          deliveryFee: row.deliveryFee || 0,
                          total: row.total,
                          orderType: row.orderType || 'takeaway'
                        })}
                        sx={{ color: '#4285F4', bgcolor: '#F0F7FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                      >
                        <Print fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
