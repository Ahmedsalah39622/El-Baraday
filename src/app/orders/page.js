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
import { Print, DeleteOutlined, VisibilityOutlined } from '@mui/icons-material';
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
      inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerPhone?.includes(searchQuery)
  );

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            سجل الطلبات والفواتير
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            إجمالي الطلبات المسجلة ({invoices?.length || 0})
          </Typography>
        </Box>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث برقم الطلب أو اسم العميل..." />
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>تفاصيل الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>حالة الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السعر الإجمالي</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>طباعة الفاتورة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((row) => {
              const itemSummary = (row.items || [])
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(' ، ');

              const isDelivery = row.orderType === 'delivery';

              return (
                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.95rem' }}>#{row.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#374151' }}>
                    {row.customerName || 'عميل محلي'}
                    {row.customerPhone ? ` (${row.customerPhone})` : ''}
                  </TableCell>
                  <TableCell sx={{ color: '#4B5563', maxWidth: 260 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {itemSummary || 'طلب بدون أصناف'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#6B7280', fontSize: '0.85rem' }}>{row.date}</TableCell>
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
                      sx={{
                        bgcolor: '#D1FAE5',
                        color: '#065F46',
                        fontWeight: 800,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#4285F4', fontSize: '0.95rem' }}>
                    {(row.total || 0).toFixed(2)} ج.م
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="إعادة طباعة الفاتورة على برنتر الكاشير (8 سنتي)">
                      <IconButton
                        size="small"
                        onClick={() => {
                          printThermalReceipt({
                            orderNumber: row.id,
                            dateStr: row.date,
                            driverName: row.driverName || 'محمد علي الصوفي',
                            cashierName: 'administrator',
                            customerName: row.customerName || 'عميل',
                            customerPhone: row.customerPhone || '',
                            customerAddress: row.customerAddress || 'الخمسين',
                            items: row.items || [],
                            subtotal: row.subtotal || row.total,
                            deliveryFee: row.deliveryFee || 0,
                            total: row.total || 0,
                            paidAmount: row.paidAmount || row.total,
                            remainingAmount: row.remainingAmount || 0,
                            orderType: row.orderType || 'takeaway',
                          });
                        }}
                        sx={{ color: '#4285F4' }}
                      >
                        <Print sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                  لا توجد طلبات مسجلة حالياً
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
