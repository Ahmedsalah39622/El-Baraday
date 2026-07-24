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
  Divider,
  Alert
} from '@mui/material';
import { EditOutlined, DeleteOutlined, Add, Phone, Home, LocationOn, StarOutlined, StarBorder } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useCustomerStore } from '@/store/useCustomerStore';

export default function CustomersPage() {
  const { customers, fetchCustomers, saveOrUpdateCustomer, updateCustomerAddresses, deleteCustomer } = useCustomerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Manage Addresses Dialog state
  const [addressManageDialog, setAddressManageDialog] = useState(false);
  const [selectedCustomerForAddresses, setSelectedCustomerForAddresses] = useState(null);
  const [newAddressInput, setNewAddressInput] = useState({ address: '', floor: '', apartment: '' });

  // Form states for Add/Edit Customer
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addresses: [{ address: '', floor: '', apartment: '' }]
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      addresses: [{ address: '', floor: '', apartment: '' }]
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    const addrs = customer.addresses && customer.addresses.length > 0
      ? customer.addresses
      : [{ address: customer.address || '', floor: customer.floor || '', apartment: customer.apartment || '' }];

    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      addresses: addrs
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  const handleAddAddressFieldInForm = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, { address: '', floor: '', apartment: '' }]
    });
  };

  const handleRemoveAddressFieldInForm = (index) => {
    if (formData.addresses.length <= 1) return;
    const updated = formData.addresses.filter((_, idx) => idx !== index);
    setFormData({ ...formData, addresses: updated });
  };

  const handleAddressChangeInForm = (index, field, value) => {
    const updated = [...formData.addresses];
    updated[index][field] = value;
    setFormData({ ...formData, addresses: updated });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const validAddresses = formData.addresses.filter(a => a.address && a.address.trim());
    const finalAddresses = validAddresses.length > 0 ? validAddresses : [{ address: '', floor: '', apartment: '' }];
    const primary = finalAddresses[0];

    await saveOrUpdateCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: primary.address,
      floor: primary.floor,
      apartment: primary.apartment,
      addresses: finalAddresses
    });

    handleCloseDialog();
    fetchCustomers();
  };

  const handleDelete = async (id) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا العميل؟')) {
      await deleteCustomer(id);
    }
  };

  // Address Manager Functions
  const handleOpenAddressManager = (customer) => {
    setSelectedCustomerForAddresses(customer);
    setNewAddressInput({ address: '', floor: '', apartment: '' });
    setAddressManageDialog(true);
  };

  const handleAddNewAddressToCustomer = async () => {
    if (!selectedCustomerForAddresses || !newAddressInput.address.trim()) return;
    const currentList = selectedCustomerForAddresses.addresses || [];
    const updatedList = [...currentList, {
      address: newAddressInput.address.trim(),
      floor: newAddressInput.floor.trim(),
      apartment: newAddressInput.apartment.trim()
    }];

    await updateCustomerAddresses(selectedCustomerForAddresses.id, updatedList);
    setSelectedCustomerForAddresses({ ...selectedCustomerForAddresses, addresses: updatedList });
    setNewAddressInput({ address: '', floor: '', apartment: '' });
    fetchCustomers();
  };

  const handleDeleteAddressFromCustomer = async (index) => {
    if (!selectedCustomerForAddresses) return;
    const currentList = selectedCustomerForAddresses.addresses || [];
    if (currentList.length <= 1) {
      alert('يجب الإبقاء على عنوان واحد على الأقل للعميل');
      return;
    }
    const updatedList = currentList.filter((_, idx) => idx !== index);
    await updateCustomerAddresses(selectedCustomerForAddresses.id, updatedList);
    setSelectedCustomerForAddresses({ ...selectedCustomerForAddresses, addresses: updatedList });
    fetchCustomers();
  };

  const handleSetPrimaryAddress = async (index) => {
    if (!selectedCustomerForAddresses) return;
    const currentList = [...(selectedCustomerForAddresses.addresses || [])];
    const [selected] = currentList.splice(index, 1);
    const updatedList = [selected, ...currentList];

    await updateCustomerAddresses(selectedCustomerForAddresses.id, updatedList);
    setSelectedCustomerForAddresses({ ...selectedCustomerForAddresses, addresses: updatedList });
    fetchCustomers();
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
            إدارة العملاء والعناوين المتعددة
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
                    <Tooltip title="اضغط لإدارة كافه عناوين العميل">
                      <Chip
                        icon={<LocationOn sx={{ fontSize: '14px !important' }} />}
                        label={`${addrs.length} ${addrs.length === 1 ? 'عنوان' : 'عناوين'}`}
                        size="small"
                        onClick={() => handleOpenAddressManager(row)}
                        clickable
                        sx={{ bgcolor: '#EFF6FF', color: '#1E40AF', fontWeight: 800, '&:hover': { bgcolor: '#DBEAFE' } }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1A1A2E' }}>
                    {row.totalTransactions || row.ordersCount || 0} طلب
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                    {(row.totalSpend || 0).toLocaleString()} ج.م
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="تعديل العميل والتعناوين">
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

      {/* Add / Edit Customer Dialog with Multiple Addresses */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
          {editingCustomer ? '✏️ تعديل بيانات وعناوين العميل' : '➕ إضافة عميل جديد بعناوين متعددة'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
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
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E40AF' }}>
              📍 العناوين المحفوظة للعميل ({formData.addresses.length}):
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddAddressFieldInForm}
              sx={{ borderRadius: '8px', fontWeight: 700 }}
            >
              إضافة عنوان آخر
            </Button>
          </Box>

          {formData.addresses.map((addrObj, index) => (
            <Paper key={index} sx={{ p: 2, bgcolor: index === 0 ? '#F0FDF4' : '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: index === 0 ? '#166534' : '#475569' }}>
                  {index === 0 ? '⭐️ العنوان الرئيسي (الأول)' : `عنوان فرعي رقم ${index + 1}`}
                </Typography>
                {formData.addresses.length > 1 && (
                  <IconButton size="small" onClick={() => handleRemoveAddressFieldInForm(index)} sx={{ color: '#EF4444' }}>
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="العنوان *"
                  placeholder="اسم الشارع - العلامة المميزة"
                  value={addrObj.address}
                  onChange={(e) => handleAddressChangeInForm(index, 'address', e.target.value)}
                  sx={{ flex: 2, minWidth: 200, bgcolor: '#FFF' }}
                />
                <TextField
                  size="small"
                  label="الدور"
                  placeholder="مثال: 3"
                  value={addrObj.floor}
                  onChange={(e) => handleAddressChangeInForm(index, 'floor', e.target.value)}
                  sx={{ flex: 1, minWidth: 90, bgcolor: '#FFF' }}
                />
                <TextField
                  size="small"
                  label="الشقة"
                  placeholder="مثال: 5"
                  value={addrObj.apartment}
                  onChange={(e) => handleAddressChangeInForm(index, 'apartment', e.target.value)}
                  sx={{ flex: 1, minWidth: 90, bgcolor: '#FFF' }}
                />
              </Box>
            </Paper>
          ))}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={handleCloseDialog} variant="outlined" sx={{ borderRadius: '10px', px: 3, fontWeight: 700 }}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: '10px', px: 3, fontWeight: 700, bgcolor: '#4285F4' }}>
            حفظ بيانات العميل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Address Manager Dialog for Customer */}
      <Dialog open={addressManageDialog} onClose={() => setAddressManageDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          📍 إدارة عناوين العميل: {selectedCustomerForAddresses?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {selectedCustomerForAddresses && (
            <>
              {/* Existing addresses list */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(selectedCustomerForAddresses.addresses || []).map((addr, idx) => (
                  <Paper key={idx} sx={{ p: 1.5, borderRadius: '12px', border: idx === 0 ? '2px solid #10B981' : '1px solid #E2E8F0', bgcolor: idx === 0 ? '#F0FDF4' : '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={800} color="#1E293B">
                          🏠 {addr.address}
                        </Typography>
                        {idx === 0 && <Chip label="الرئيسي" size="small" color="success" sx={{ fontWeight: 800 }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {[addr.floor ? `الدور ${addr.floor}` : '', addr.apartment ? `شقة ${addr.apartment}` : ''].filter(Boolean).join(' - ') || 'بدون دور/شقة'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {idx !== 0 && (
                        <Tooltip title="تعيين كعنوان رئيسي">
                          <IconButton size="small" onClick={() => handleSetPrimaryAddress(idx)} sx={{ color: '#F59E0B' }}>
                            <StarBorder />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(selectedCustomerForAddresses.addresses || []).length > 1 && (
                        <Tooltip title="حذف هذا العنوان">
                          <IconButton size="small" onClick={() => handleDeleteAddressFromCustomer(idx)} sx={{ color: '#EF4444' }}>
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Add New Address Section */}
              <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1E40AF" mb={1}>
                  ➕ إضافة عنوان جديد للعميل:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <TextField
                    size="small"
                    label="العنوان الجديد *"
                    placeholder="شارع الجيش - أمام المستشفى"
                    value={newAddressInput.address}
                    onChange={(e) => setNewAddressInput({ ...newAddressInput, address: e.target.value })}
                    sx={{ flex: 2, minWidth: 200, bgcolor: '#FFF' }}
                  />
                  <TextField
                    size="small"
                    label="الدور"
                    value={newAddressInput.floor}
                    onChange={(e) => setNewAddressInput({ ...newAddressInput, floor: e.target.value })}
                    sx={{ flex: 1, minWidth: 80, bgcolor: '#FFF' }}
                  />
                  <TextField
                    size="small"
                    label="الشقة"
                    value={newAddressInput.apartment}
                    onChange={(e) => setNewAddressInput({ ...newAddressInput, apartment: e.target.value })}
                    sx={{ flex: 1, minWidth: 80, bgcolor: '#FFF' }}
                  />
                </Box>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddNewAddressToCustomer}
                  disabled={!newAddressInput.address.trim()}
                  sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, fontWeight: 800, borderRadius: '8px' }}
                >
                  حفظ العنوان الجديد للعميل
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddressManageDialog(false)} variant="outlined">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
