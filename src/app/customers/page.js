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
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from '@mui/material';
import { EditOutlined, DeleteOutlined, Add, Phone, Home, Layers, LocationOn } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useCustomerStore } from '@/store/useCustomerStore';

export default function CustomersPage() {
  const { customers, fetchCustomers, saveOrUpdateCustomer, deleteCustomer } = useCustomerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    floor: '',
    apartment: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', floor: '', apartment: '' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    const mainAddr = customer.addresses?.[0] || {};
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      address: mainAddr.address || customer.address || '',
      floor: mainAddr.floor || customer.floor || '',
      apartment: mainAddr.apartment || customer.apartment || '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;

    await saveOrUpdateCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      floor: formData.floor.trim(),
      apartment: formData.apartment.trim(),
    });

    handleCloseDialog();
    fetchCustomers();
  };

  const handleDelete = async (id) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا العميل؟')) {
      await deleteCustomer(id);
    }
  };

  // Filter customers by search query
  const filteredCustomers = (customers || []).filter(
    (c) =>
      !searchQuery ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  );

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            إدارة العملاء
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            إجمالي العملاء المسجلين ({customers?.length || 0})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث باسم العميل أو رقم الهاتف..." />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAdd}
            sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            إضافة عميل جديد
          </Button>
        </Box>
      </Box>

      {/* Customers Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>اسم العميل</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>رقم الهاتف</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العنوان الرئيسي</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الدور / الشقة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>العناوين المحفوظة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>عدد الطلبات</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>إجمالي الإنفاق</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.map((row) => {
              const addrs = row.addresses || [];
              const mainAddr = addrs[0] || {};
              const displayAddress = mainAddr.address || row.address || '—';
              const displayFloor = mainAddr.floor || row.floor || '';
              const displayApartment = mainAddr.apartment || row.apartment || '';
              const floorApartmentText = [
                displayFloor ? `الدور ${displayFloor}` : '',
                displayApartment ? `شقة ${displayApartment}` : ''
              ].filter(Boolean).join(' - ') || '—';

              return (
                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.95rem' }}>{row.name}</TableCell>
                  <TableCell sx={{ color: '#4285F4', fontWeight: 800, dir: 'ltr', textAlign: 'right' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone sx={{ fontSize: 16, color: '#6B7280' }} />
                      {row.phone}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#374151', fontWeight: 600, maxWidth: 220 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Home sx={{ fontSize: 16, color: '#9CA3AF' }} />
                      {displayAddress}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#4B5563', fontWeight: 700 }}>
                    {floorApartmentText}
                  </TableCell>
                  <TableCell>
                    {addrs.length > 0 ? (
                      <Chip
                        icon={<LocationOn sx={{ fontSize: '14px !important' }} />}
                        label={`${addrs.length} عنوان`}
                        size="small"
                        sx={{ bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 700 }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#9CA3AF' }}>1 عنوان</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1A1A2E' }}>
                    {row.totalTransactions || row.ordersCount || 0} طلب
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                    {(row.totalSpend || 0).toLocaleString()} ج.م
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="تعديل بيانات العميل والعناوين">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#4285F4' }}>
                        <EditOutlined sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف العميل">
                      <IconButton size="small" onClick={() => handleDelete(row.id)} sx={{ color: '#EF4444' }}>
                        <DeleteOutlined sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                  لا يوجد عملاء مطبقين لنتائج البحث
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Customer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
          {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="اسم العميل *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ bgcolor: '#FFF' }}
          />

          <TextField
            fullWidth
            size="small"
            label="رقم الهاتف *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            sx={{ bgcolor: '#FFF' }}
          />

          <TextField
            fullWidth
            size="small"
            label="العنوان"
            placeholder="مثال:   - بجوار قهوة المشربية"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            sx={{ bgcolor: '#FFF' }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="الدور"
              placeholder="مثال: 3"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              sx={{ bgcolor: '#FFF' }}
            />
            <TextField
              fullWidth
              size="small"
              label="الشقة"
              placeholder="مثال: 5"
              value={formData.apartment}
              onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
              sx={{ bgcolor: '#FFF' }}
            />
          </Box>

          {/* Show saved addresses list if editing */}
          {editingCustomer && (editingCustomer.addresses || []).length > 1 && (
            <Box sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: '12px', border: '1px solid #E2E8F0', mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E40AF', mb: 1 }}>
                📍 العناوين المحفوظة السابقة لـ {editingCustomer.name}:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {editingCustomer.addresses.map((a, idx) => (
                  <Box key={idx} sx={{ p: 1, bgcolor: '#FFF', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '0.813rem', fontWeight: 700 }}>
                    🏠 {a.address} {a.floor ? `- (دور ${a.floor}` : ''}{a.apartment ? ` شقة ${a.apartment})` : a.floor ? ')' : ''}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={handleCloseDialog} variant="outlined" sx={{ borderRadius: '10px', px: 3, fontWeight: 700 }}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: '10px', px: 3, fontWeight: 700, bgcolor: '#4285F4' }}>
            حفظ البيانات
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
