'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Alert,
  Stack,
} from '@mui/material';
import {
  Close,
  Add,
  Remove,
  Delete,
  Save,
  ShoppingBag,
  MonetizationOn,
  Edit,
  Print,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useProductStore } from '@/store/useProductStore';
import { printThermalReceipt } from '@/lib/printReceipt';

export default function EditOrderModal({ open, onClose, order, onSaveSuccess }) {
  const { updateOrder } = useInvoiceStore();
  const { products, fetchProducts } = useProductStore();

  const [editedItems, setEditedItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderType, setOrderType] = useState('takeaway');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Add Product Search State
  const [selectedProductToAdd, setSelectedProductToAdd] = useState(null);
  const [addQty, setAddQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, []);

  useEffect(() => {
    if (order) {
      const itemsCopy = (order.items || []).map((it) => ({
        id: it.id || `item_${Date.now()}_${Math.random()}`,
        product_id: it.product_id || it.productId || it.id,
        name: it.name || it.product_name || 'صنف',
        product_name: it.name || it.product_name || 'صنف',
        price: parseFloat(it.price || 0),
        quantity: parseInt(it.quantity || 1),
        size: it.size || 'عادي',
        extras: it.extras || '',
        notes: it.notes || '',
      }));
      setEditedItems(itemsCopy);
      setCustomerName(order.customerName || order.customer_name || '');
      setCustomerPhone(order.customerPhone || order.customer_phone || '');
      setCustomerAddress(order.customerAddress || order.customer_address || '');
      setOrderType(order.orderType || order.order_type || 'takeaway');
      setPaymentMethod(order.paymentMethod || order.payment_method || 'cash');
      setDeliveryFee(parseFloat(order.deliveryFee || order.delivery_fee || 0));
      setDiscount(parseFloat(order.discount || 0));
    }
  }, [order, open]);

  if (!order) return null;

  const originalTotal = parseFloat(order.total || 0);

  // Calculations
  const subtotal = editedItems.reduce(
    (sum, item) => sum + parseFloat(item.price || 0) * (parseInt(item.quantity) || 1),
    0
  );
  const currentDeliveryFee = orderType === 'delivery' ? parseFloat(deliveryFee || 0) : 0;
  const currentDiscount = parseFloat(discount || 0);
  const newTotal = Math.max(0, subtotal + currentDeliveryFee - currentDiscount);
  const priceDifference = newTotal - originalTotal;

  // Item Manipulation
  const handleUpdateQty = (idx, delta) => {
    const next = [...editedItems];
    const newQty = (next[idx].quantity || 1) + delta;
    if (newQty <= 0) {
      next.splice(idx, 1);
    } else {
      next[idx].quantity = newQty;
    }
    setEditedItems(next);
  };

  const handleRemoveItem = (idx) => {
    const next = [...editedItems];
    next.splice(idx, 1);
    setEditedItems(next);
  };

  const handleAddItemToOrder = () => {
    if (!selectedProductToAdd) return;

    const existingIdx = editedItems.findIndex(
      (it) =>
        (it.product_id === selectedProductToAdd.id || it.name === selectedProductToAdd.name) &&
        it.size === (selectedProductToAdd.size || 'عادي')
    );

    if (existingIdx >= 0) {
      const next = [...editedItems];
      next[existingIdx].quantity += addQty;
      setEditedItems(next);
    } else {
      const newItem = {
        id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        product_id: selectedProductToAdd.id,
        name: selectedProductToAdd.name,
        product_name: selectedProductToAdd.name,
        price: parseFloat(selectedProductToAdd.price || 0),
        quantity: addQty,
        size: selectedProductToAdd.size || 'كبير',
        notes: '',
      };
      setEditedItems([...editedItems, newItem]);
    }

    setSelectedProductToAdd(null);
    setAddQty(1);
  };

  const handleSaveOrderEdits = async (andPrint = false) => {
    if (editedItems.length === 0) {
      alert('⚠️ لا يمكن إخلاء الطلب تماماً بدون أصناف! يمكنك إلغاء الطلب بالكامل إذا أردت.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        order_type: orderType,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        subtotal: subtotal,
        delivery_fee: currentDeliveryFee,
        discount: currentDiscount,
        total: newTotal,
        paid_amount: newTotal,
        remaining_amount: 0,
        items: editedItems.map((it) => ({
          product_id: it.product_id || it.id,
          product_name: it.name || it.product_name,
          name: it.name || it.product_name,
          price: parseFloat(it.price || 0),
          quantity: parseInt(it.quantity || 1),
          size: it.size || 'عادي',
          notes: it.notes || '',
        })),
      };

      const res = await updateOrder(order.id, payload);
      if (res.success) {
        alert(
          `✅ تم تعديل الطلب رقم #${order.orderNumber || order.id} بنجاح!\n` +
            `إجمالي المبلغ الجديد: ${newTotal.toFixed(2)} ج.م ` +
            `(${priceDifference > 0 ? `زيادة +${priceDifference.toFixed(2)}` : priceDifference < 0 ? `خصم ${priceDifference.toFixed(2)}` : 'بدون تغيير في المبلغ'})`
        );

        if (andPrint) {
          printThermalReceipt({
            orderNumber: order.orderNumber || '1',
            dateStr: new Date(order.createdAt || Date.now()).toLocaleString('ar-EG'),
            cashierName: order.cashierName || 'أحمد محمود',
            customerName: customerName,
            customerPhone: customerPhone,
            customerAddress: customerAddress,
            items: editedItems,
            subtotal: subtotal,
            deliveryFee: currentDeliveryFee,
            discount: currentDiscount,
            total: newTotal,
            orderType: orderType,
          });
        }

        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        alert(`❌ حدث خطأ في حفظ التعديلات: ${res.error}`);
      }
    } catch (err) {
      alert(`❌ خطأ غير متوقع: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          fontWeight: 900,
          color: '#1E293B',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit sx={{ color: '#2563EB' }} />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            تعديل الطلب رقم #{order.orderNumber || order.id}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Order Details & Customer Header */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#F8FAFC' }}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الطلب</InputLabel>
                <Select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  label="نوع الطلب"
                  sx={{ borderRadius: '10px', bgcolor: '#FFF' }}
                >
                  <MenuItem value="takeaway">🥡 تيك أوي (Takeaway)</MenuItem>
                  <MenuItem value="delivery">🛵 دليفري (Delivery)</MenuItem>
                  <MenuItem value="dine_in">🍽️ صالة (Dine-in)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>طريقة الدفع</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="طريقة الدفع"
                  sx={{ borderRadius: '10px', bgcolor: '#FFF' }}
                >
                  <MenuItem value="cash">💵 كاش (نقدي)</MenuItem>
                  <MenuItem value="vodafone">📱 فودافون كاش</MenuItem>
                  <MenuItem value="card">💳 شبكة / فيزا</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="اسم العميل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                sx={{ bgcolor: '#FFF' }}
              />
            </Grid>

            <Grid xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="رقم هاتف العميل"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                sx={{ bgcolor: '#FFF' }}
              />
            </Grid>

            {orderType === 'delivery' && (
              <Grid xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="عنوان العميل والتفاصيل"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Section: Add New Items to Order */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1E40AF', mb: 1.5 }}>
            ➕ إضافة صنف جديد إلى الطلب:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Autocomplete
              options={products || []}
              getOptionLabel={(prod) => `${prod.name} (${prod.price} ج.م)`}
              value={selectedProductToAdd}
              onChange={(e, val) => setSelectedProductToAdd(val)}
              renderInput={(params) => (
                <TextField {...params} label="اختر صنف للتبديل أو الإضافة..." size="small" placeholder="بحث عن صنف..." />
              )}
              sx={{ flexGrow: 1, minWidth: 220, bgcolor: '#FFF' }}
            />
            <TextField
              type="number"
              size="small"
              label="الكمية"
              value={addQty}
              onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 80, bgcolor: '#FFF' }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddItemToOrder}
              disabled={!selectedProductToAdd}
              sx={{ bgcolor: '#2563EB', borderRadius: '10px', fontWeight: 800, px: 2.5 }}
            >
              إضافة صنف
            </Button>
          </Box>
        </Paper>

        {/* Section: Edit Order Items Table */}
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1E293B' }}>
          🛒 الأصناف والمكونات في الطلب:
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F1F5F9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>اسم الصنف</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحجم / الملاحظات</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>سعر الوحدة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>الكمية والتعديل</TableCell>
                <TableCell align="left" sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>حذف</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editedItems.map((item, idx) => {
                const lineTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                return (
                  <TableRow key={item.id || idx} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{item.name || item.product_name}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="ملاحظات الصنف..."
                        value={item.notes || ''}
                        onChange={(e) => {
                          const next = [...editedItems];
                          next[idx].notes = e.target.value;
                          setEditedItems(next);
                        }}
                        variant="standard"
                        sx={{ fontSize: '0.8rem' }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      <TextField
                        type="number"
                        size="small"
                        value={item.price}
                        onChange={(e) => {
                          const next = [...editedItems];
                          next[idx].price = Math.max(0, parseFloat(e.target.value) || 0);
                          setEditedItems(next);
                        }}
                        variant="standard"
                        sx={{ width: 65, input: { textAlign: 'center', fontWeight: 800 } }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleUpdateQty(idx, -1)} color="error">
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography sx={{ fontWeight: 900, px: 1, minWidth: 24, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton size="small" onClick={() => handleUpdateQty(idx, 1)} color="primary">
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="left" sx={{ fontWeight: 900, color: '#10B981' }}>
                      {lineTotal.toFixed(2)} ج.م
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleRemoveItem(idx)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Section: Financials & Price Difference Banner */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFDF5', borderColor: '#FDE68A' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="الخصم (ج.م)"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                sx={{ bgcolor: '#FFF' }}
              />
            </Grid>

            {orderType === 'delivery' && (
              <Grid xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="رسوم التوصيل الدليفري (ج.م)"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>
            )}

            <Grid xs={12} sm={orderType === 'delivery' ? 4 : 8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  المبلغ الأصلي السابق: <strong>{originalTotal.toFixed(2)} ج.م</strong>
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1E293B' }}>
                  الإجمالي المعدل الجديد: <span style={{ color: '#2563EB' }}>{newTotal.toFixed(2)} ج.م</span>
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Difference Chip / Alert */}
          {Math.abs(priceDifference) > 0.01 && (
            <Alert
              severity={priceDifference > 0 ? 'warning' : 'info'}
              icon={priceDifference > 0 ? <TrendingUp /> : <TrendingDown />}
              sx={{ mt: 2, borderRadius: '10px', fontWeight: 800 }}
            >
              {priceDifference > 0 ? (
                <>
                  ⚠️ تم إضافة أصناف/زيادة بمبلغ <strong>+{priceDifference.toFixed(2)} ج.م</strong> ستحصّل إضافياً من العميل.
                </>
              ) : (
                <>
                  💡 تم إلغاء أصناف/تخفيض بمبلغ <strong>{priceDifference.toFixed(2)} ج.م</strong> سينقص من إجمالي الأوردر.
                </>
              )}
            </Alert>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: '#FAFBFC', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px' }}>
          إلغاء
        </Button>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="success"
            startIcon={<Save />}
            disabled={saving}
            onClick={() => handleSaveOrderEdits(false)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', px: 3, fontWeight: 900 }}
          >
            حفظ التعديلات 💾
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Print />}
            disabled={saving}
            onClick={() => handleSaveOrderEdits(true)}
            sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, borderRadius: '10px', px: 3, fontWeight: 900 }}
          >
            حفظ وطباعة الفاتورة 🖨️
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
