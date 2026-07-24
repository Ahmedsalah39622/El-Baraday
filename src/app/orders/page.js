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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { Print, VisibilityOutlined, Close, Person, Phone, LocationOn, ReceiptLong, Store } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { printThermalReceipt } from '@/lib/printReceipt';
import DeliveryTimerBadge from '@/components/delivery/DeliveryTimerBadge';

export default function OrdersPage() {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');

  // View Order Details Modal State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const targetBranch = selectedBranchId || 'all';

  useEffect(() => {
    fetchInvoices(100, targetBranch);
  }, [targetBranch]);

  // Filter orders strictly by selected branch & search query
  const filteredOrders = (invoices || []).filter((inv) => {
    const matchBranch = !selectedBranchId || selectedBranchId === 'all' || inv.branchId === selectedBranchId || inv.branch_id === selectedBranchId;
    if (!matchBranch) return false;

    if (!searchQuery) return true;
    const cleanSearch = searchQuery.toLowerCase().trim();
    return (
      inv.id?.toLowerCase().includes(cleanSearch) ||
      inv.orderNumber?.includes(cleanSearch) ||
      inv.customerName?.toLowerCase().includes(cleanSearch) ||
      inv.customerPhone?.includes(cleanSearch)
    );
  });

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
            سجل الطلبات والفواتير
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            إجمالي الطلبات المسجلة للفرع المحدد ({filteredOrders.length})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث برقم الطلب أو اسم العميل..." />
        </Box>
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>رقم الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الفرع</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العميل</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>أصناف الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>التاريخ والوقت</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>نوع الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>حالة الطلب</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السعر الإجمالي</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراءات والتفاصيل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((row) => {
              const hasItems = Array.isArray(row.items) && row.items.length > 0;
              const isDelivery = row.orderType === 'delivery';

              const branchObj = branches.find((b) => b.id === (row.branchId || row.branch_id));
              const displayBranchName = row.branchName || (branchObj ? branchObj.name : ((row.branchId || row.branch_id) === 'b2' ? 'الفرع الثاني' : 'الفرع الأول - الرئيسي'));

              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.95rem' }}>
                    #{row.orderNumber || row.id?.slice(0, 8)}
                  </TableCell>

                  <TableCell>
                    <Chip
                      icon={<Store sx={{ fontSize: '0.9rem !important', color: '#1E40AF' }} />}
                      label={displayBranchName}
                      size="small"
                      sx={{
                        bgcolor: '#EFF6FF',
                        color: '#1E40AF',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700, color: '#374151' }}>
                    {row.customerName || 'عميل كاشير'}
                    {row.customerPhone ? ` (${row.customerPhone})` : ''}
                  </TableCell>

                  <TableCell sx={{ color: '#4B5563', maxWidth: 280 }}>
                    {hasItems ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {row.items.slice(0, 3).map((it, idx) => (
                          <Chip
                            key={idx}
                            label={`${it.quantity || 1}× ${it.name || it.product_name || 'صنف'}`}
                            size="small"
                            sx={{ bgcolor: '#F1F5F9', color: '#1E293B', fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        ))}
                        {row.items.length > 3 && (
                          <Chip
                            label={`+${row.items.length - 3} أصناف أخرى`}
                            size="small"
                            sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.72rem' }}
                          />
                        )}
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                      <Chip
                        label={row.status || 'مكتمل'}
                        size="small"
                        sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 800 }}
                      />
                      {isDelivery && (row.dispatched_at || row.createdAt) && (
                        <DeliveryTimerBadge dispatchedAt={row.dispatched_at || row.createdAt} status={row.status} />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 900, color: '#4285F4', fontSize: '0.95rem' }}>
                    {(parseFloat(row.total) || 0).toFixed(2)} ج.م
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {/* View Details Button */}
                      <Tooltip title="عرض تفاصيل الطلب والفاتورة الكاملة" arrow>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDetails(row)}
                          sx={{ color: '#10B981', bgcolor: '#ECFDF5', '&:hover': { bgcolor: '#D1FAE5' } }}
                        >
                          <VisibilityOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Reprint Invoice Button */}
                      <Tooltip title="إعادة طباعة الفاتورة" arrow>
                        <IconButton
                          size="small"
                          onClick={() => printThermalReceipt({
                            orderNumber: row.orderNumber || '1',
                            dateStr: new Date(row.createdAt || Date.now()).toLocaleString('ar-EG'),
                            cashierName: row.cashierName || '',
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
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#9CA3AF', fontWeight: 700 }}>
                  لا توجد طلبات مسجلة لهذا الفرع حالياً.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Full Order Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1,
            }
          }
        }}
      >
        {selectedOrder && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #E5E7EB' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReceiptLong />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#1A1A2E' }}>
                    تفاصيل الطلب رقم #{selectedOrder.orderNumber || selectedOrder.id?.slice(0, 8)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    تاريخ الطلب: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('ar-EG') : 'اليوم'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={selectedOrder.orderType === 'delivery' ? 'دليفري 🛵' : selectedOrder.orderType === 'takeaway' ? 'تيك أوي 🛍️' : 'صالة 🍽️'}
                  sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 800 }}
                />
                <IconButton onClick={() => setDetailsOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
              {/* Customer & Order Metadata Row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* Customer Details Box */}
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Person fontSize="small" sx={{ color: '#4285F4' }} /> بيانات العميل:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    الاسم: {selectedOrder.customerName || 'عميل كاشير مباشر'}
                  </Typography>
                  {selectedOrder.customerPhone && (
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone fontSize="inherit" /> الهاتف: {selectedOrder.customerPhone}
                    </Typography>
                  )}
                  {selectedOrder.customerAddress && (
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn fontSize="inherit" /> العنوان: {selectedOrder.customerAddress}
                    </Typography>
                  )}
                </Paper>

                {/* Cashier & Status Box */}
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', mb: 1 }}>
                    ℹ️ معلومات الفاتورة:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    الكاشير المنفذ: {selectedOrder.cashierName || 'أحمد محمود'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                    حالة الفاتورة: <Chip label={selectedOrder.status || 'مكتمل'} size="small" color="success" sx={{ fontWeight: 800 }} />
                  </Typography>
                  {selectedOrder.driverName && (
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                      طيار التوصيل: {selectedOrder.driverName}
                    </Typography>
                  )}
                </Paper>
              </Box>

              {/* Items Breakdown Table */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A1A2E', mt: 1 }}>
                📦 الأصناف والمحتويات المطلوبة:
              </Typography>

              <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>الصنف</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>الحجم</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>سعر الوحدة</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800 }}>الإجمالي الفرعي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((it, idx) => {
                        const qty = it.quantity || 1;
                        const price = parseFloat(it.price || 0);
                        const lineTotal = qty * price;

                        return (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                              {it.name || it.product_name || 'صنف'}
                              {it.notes && (
                                <Typography variant="caption" sx={{ color: '#F59E0B', display: 'block' }}>
                                  📝 {it.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ color: '#64748B' }}>{it.size || 'عادي'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>{qty}</TableCell>
                            <TableCell align="center">{price.toFixed(2)} ج.م</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 900, color: '#10B981' }}>
                              {lineTotal.toFixed(2)} ج.م
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                          لا توجد تفاصيل تفصيلية أصناف مخزنة لهذا الأوردر القديم
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Financial Totals Breakdown Box */}
              <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#FFFDF5', border: '1.5px solid #F59E0B', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#78350F', fontWeight: 700 }}>المجموع الفرعي:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{(parseFloat(selectedOrder.subtotal || selectedOrder.total) || 0).toFixed(2)} ج.م</Typography>
                </Box>
                {selectedOrder.deliveryFee > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#78350F', fontWeight: 700 }}>رسوم التوصيل الدليفري:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>+{parseFloat(selectedOrder.deliveryFee).toFixed(2)} ج.م</Typography>
                  </Box>
                )}
                {selectedOrder.discount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 700 }}>الخصم:</Typography>
                    <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 800 }}>-{parseFloat(selectedOrder.discount).toFixed(2)} ج.م</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#B45309' }}>المبلغ الإجمالي الكلي:</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#D97706' }}>{(parseFloat(selectedOrder.total) || 0).toFixed(2)} ج.م</Typography>
                </Box>
              </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#FAFBFC', borderTop: '1px solid #E5E7EB', gap: 1 }}>
              <Button onClick={() => setDetailsOpen(false)} sx={{ color: '#64748B', fontWeight: 700 }}>
                إغلاق
              </Button>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={() => {
                  printThermalReceipt({
                    orderNumber: selectedOrder.orderNumber || '1',
                    dateStr: new Date(selectedOrder.createdAt || Date.now()).toLocaleString('ar-EG'),
                    cashierName: selectedOrder.cashierName || 'أحمد محمود',
                    customerName: selectedOrder.customerName,
                    customerPhone: selectedOrder.customerPhone,
                    items: selectedOrder.items || [],
                    subtotal: selectedOrder.subtotal || selectedOrder.total,
                    deliveryFee: selectedOrder.deliveryFee || 0,
                    total: selectedOrder.total,
                    orderType: selectedOrder.orderType || 'takeaway'
                  });
                }}
                sx={{ bgcolor: '#4285F4', borderRadius: '10px', px: 3, fontWeight: 800 }}
              >
                طباعة الفاتورة 🖨️
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
