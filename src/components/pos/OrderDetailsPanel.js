'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Autocomplete, Chip
} from '@mui/material';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, Print, DeliveryDining, LocationOn, Phone, ExpandMore, ExpandLess, WhatsApp, ConfirmationNumber, Close } from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import DeliveryReceipts from './DeliveryReceipts';
import { printThermalReceipt, printRaffleCoupon } from '@/lib/printReceipt';
import { sendDeliveryWhatsApp } from '@/lib/whatsapp';

import { useAuthStore } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useShiftStore } from '@/store/useShiftStore';
import { Store, Lock } from '@mui/icons-material';

export default function OrderDetailsPanel({
  items = [],
  orderType = 'delivery',
  onOrderTypeChange,
  orderDate = '19/07/2026 08:33 PM',
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  subtotal = 0,
  onCloseMobile,
  // tax and total are no longer used here; subtotal is the only source of truth
}) {
  const { addInvoice, nextOrderNumber, fetchNextOrderNumber } = useInvoiceStore();
  const { customers = [], drivers = [], activeQueue = [], saveOrUpdateCustomer } = useCustomerStore();
  const { user } = useAuthStore();
  const { branches, selectedBranchId, fetchBranches } = useBranchStore();
  const { activeShift } = useShiftStore();
  const isShiftActive = activeShift && activeShift.status === 'active';
  const activeCashierName = user?.name || user?.username || 'أحمد محمود';

  const [shiftClosedDialogOpen, setShiftClosedDialogOpen] = useState(false);

  const [orderBranchId, setOrderBranchId] = useState(selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || 'b1'));

  useEffect(() => {
    const targetBranch = selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || 'b1');
    setOrderBranchId(targetBranch);
    fetchNextOrderNumber(targetBranch);
    fetchBranches(); // Always refresh branches from DB on mount
  }, [selectedBranchId, user]);

  const currentBranch = branches.find(b => b.id === orderBranchId);
  const activeBranchName = currentBranch ? currentBranch.name : (orderBranchId === 'all' ? 'جميع الفروع' : 'الفرع الرئيسي');

  // Filter drivers checked-in for current active shift & branch
  const checkedInDrivers = (activeQueue || []).filter(q => !orderBranchId || orderBranchId === 'all' || q.branch_id === orderBranchId);
  const readyDrivers = checkedInDrivers.filter(q => q.status === 'ready');
  const onDeliveryDrivers = checkedInDrivers.filter(q => q.status === 'on_delivery');

  // Filter all registered drivers for THIS BRANCH ONLY
  const branchRegisteredDrivers = (drivers || []).filter(d => !orderBranchId || orderBranchId === 'all' || d.branch_id === orderBranchId);

  const availableDriverOptions = [];

  // 1. Ready drivers ranked first (Top ready is #1)
  readyDrivers.forEach((q, idx) => {
    const isTop = idx === 0;
    const label = isTop 
      ? `👑 ${q.driver_name} (الدور 1 - التالي)` 
      : `🟢 ${q.driver_name} (الدور ${idx + 1})`;
    availableDriverOptions.push({ id: q.driver_id || q.id, name: q.driver_name, label, isCheckedIn: true, isReady: true });
  });

  // 2. On-delivery drivers at the bottom
  onDeliveryDrivers.forEach((q) => {
    availableDriverOptions.push({
      id: q.driver_id || q.id,
      name: q.driver_name,
      label: `🛵 ${q.driver_name} (في مشوار توصيل)`,
      isCheckedIn: true,
      isReady: false
    });
  });

  // 3. Registered drivers of THIS BRANCH ONLY who have not checked-in
  branchRegisteredDrivers.forEach(d => {
    if (!availableDriverOptions.some(opt => opt.name === d.name)) {
      availableDriverOptions.push({ id: d.id, name: d.name, label: `${d.name} (لم يتمم الحضور)`, isCheckedIn: false, isReady: false });
    }
  });

  const [driverName, setDriverName] = useState(availableDriverOptions[0]?.name || '');

  useEffect(() => {
    if (availableDriverOptions.length > 0) {
      const topReady = availableDriverOptions.find(d => d.isReady);
      if (topReady) {
        setDriverName(topReady.name);
      } else {
        setDriverName(availableDriverOptions[0].name);
      }
    }
  }, [activeQueue, drivers, orderBranchId]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerFloor, setCustomerFloor] = useState('');
  const [customerApartment, setCustomerApartment] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(15);
  const [paidAmount, setPaidAmount] = useState('');
  const [showDeliveryForm, setShowDeliveryForm] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
  const [discountValue, setDiscountValue] = useState('');

  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState(null);

  const numDiscountVal = parseFloat(discountValue) || 0;
  const calculatedDiscount = discountType === 'percent'
    ? ((subtotal * numDiscountVal) / 100)
    : numDiscountVal;

  const parsedFeeVal = parseFloat(deliveryFee);
  const currentDeliveryFee = orderType === 'delivery' ? (isNaN(parsedFeeVal) ? 0 : parsedFeeVal) : 0;
  const finalTotal = Math.max(0, subtotal + currentDeliveryFee - calculatedDiscount);
  const numericPaid = parseFloat(paidAmount) || finalTotal;
  const remainingChange = Math.max(0, numericPaid - finalTotal);

  // Handle selecting an existing customer from phone search
  const handleSelectCustomer = (selectedCust) => {
    if (!selectedCust) return;
    if (typeof selectedCust === 'string') {
      const cleanPhone = selectedCust.includes(' - ') ? selectedCust.split(' - ')[0].trim() : selectedCust.trim();
      setCustomerPhone(cleanPhone);
      return;
    }

    const cleanPhone = (selectedCust.phone || '').includes(' - ') ? selectedCust.phone.split(' - ')[0].trim() : (selectedCust.phone || '').trim();
    setCustomerName(selectedCust.name || '');
    setCustomerPhone(cleanPhone);

    const addrs = selectedCust.addresses || [];
    setSavedAddresses(addrs);

    if (addrs.length > 0) {
      const firstAddr = addrs[0];
      setCustomerAddress(firstAddr.address || '');
      setCustomerFloor(firstAddr.floor || '');
      setCustomerApartment(firstAddr.apartment || '');
      const rawFee = firstAddr.deliveryFee ?? firstAddr.delivery_fee ?? selectedCust.deliveryFee ?? selectedCust.delivery_fee;
      const savedFee = (rawFee !== undefined && rawFee !== null && !isNaN(parseFloat(rawFee))) ? parseFloat(rawFee) : 15;
      setDeliveryFee(savedFee);
    } else if (selectedCust.deliveryFee !== undefined || selectedCust.delivery_fee !== undefined) {
      const rawFee = selectedCust.deliveryFee ?? selectedCust.delivery_fee;
      const savedFee = (rawFee !== undefined && rawFee !== null && !isNaN(parseFloat(rawFee))) ? parseFloat(rawFee) : 15;
      setDeliveryFee(savedFee);
    }
  };

  const resetOrderFormAfterCompletion = () => {
    if (onClearOrder) onClearOrder();
    if (orderType === 'delivery' && onOrderTypeChange) {
      onOrderTypeChange('takeaway');
    }
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerFloor('');
    setCustomerApartment('');
    setSavedAddresses([]);
    setDeliveryFee(15);
    setPaidAmount('');
    setOrderNotes('');
    setDiscountType('amount');
    setDiscountValue('');
    setPaymentMethod('cash');
    if (onCloseMobile) onCloseMobile();
  };

  const handleCompleteOrder = () => {
    if (items.length === 0) return;

    if (!isShiftActive) {
      setShiftClosedDialogOpen(true);
      return;
    }

    const currentOrderNum = nextOrderNumber ? nextOrderNumber.toString() : '35';

    // Save/Update Customer with phone, name, address, floor, apartment, and deliveryFee
    if (orderType === 'delivery' && customerPhone) {
      saveOrUpdateCustomer({
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        floor: customerFloor,
        apartment: customerApartment,
        deliveryFee: isNaN(parseFloat(deliveryFee)) ? 15 : parseFloat(deliveryFee),
      });
    }

    const currentOrderData = {
      orderNumber: currentOrderNum,
      dateStr: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      branchName: currentBranch?.name || activeBranchName,
      branch_name: currentBranch?.name || activeBranchName,
      driverName,
      cashierName: activeCashierName,
      customerName,
      customerPhone,
      customerAddress,
      customerFloor,
      customerApartment,
      notes: orderNotes,
      orderNotes,
      items: [...items],
      subtotal,
      discount: calculatedDiscount,
      deliveryFee: currentDeliveryFee,
      total: finalTotal,
      paidAmount: numericPaid,
      remainingAmount: remainingChange,
      paymentMethod: paymentMethod,
      payment_method: paymentMethod,
      orderType,
      branch_id: orderBranchId,
    };

    addInvoice({
      items: [...items],
      orderType,
      customerName,
      customerPhone,
      customerAddress,
      driverName,
      driver_name: driverName,
      cashierName: activeCashierName,
      subtotal,
      discount: calculatedDiscount,
      deliveryFee: currentDeliveryFee,
      total: finalTotal,
      paidAmount: numericPaid,
      remainingAmount: remainingChange,
      paymentMethod: paymentMethod,
      payment_method: paymentMethod,
      branch_id: orderBranchId,
      notes: orderNotes,
    });

    setCompletedOrderData(currentOrderData);
    setSuccessDialogOpen(true);

    // 🖨️ Isolated Iframe Thermal Print (100% Bulletproof for Epson 80mm Printers)
    printThermalReceipt(currentOrderData);

    // 📱 Automatic WhatsApp Delivery Message to Customer (Order details + Driver phone)
    const targetCustomerPhone = (customerPhone || '').toString().trim();
    if (targetCustomerPhone) {
      setWhatsAppStatus({ loading: true });
      const foundDriver = (activeQueue || []).find(q => q.driver_name === driverName || q.name === driverName) 
                       || (drivers || []).find(d => d.name === driverName);
      const targetDriverPhone = foundDriver?.driver_phone || foundDriver?.phone || '';

      sendDeliveryWhatsApp({
        orderData: currentOrderData,
        driverPhone: targetDriverPhone,
        companySettings: { company_name: 'مطعم البرادعي للحواوشي' },
        autoOpenBrowser: true
      })
      .then(res => {
        console.log('📱 WhatsApp Send Result:', res);
        setWhatsAppStatus(res);
      })
      .catch(err => {
        console.error('❌ Error sending WhatsApp message:', err);
        setWhatsAppStatus({ success: false, error: err.message });
      });
    } else {
      setWhatsAppStatus(null);
    }

    // Clear order cart, form fields, and return to takeaway after delivery completion.
    resetOrderFormAfterCompletion();
  };

  const handleCloseDialog = () => {
    setSuccessDialogOpen(false);
    setWhatsAppStatus(null);
    resetOrderFormAfterCompletion();
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 380 },
        minWidth: { xs: '100%', md: 380 },
        height: '100%',
        bgcolor: '#FFFFFF',
        borderRight: { md: '1px solid' },
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        gap: 1.5,
        overflowY: 'auto',
      }}
    >
      {/* Title & Branch Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
          تفاصيل الطلب #{nextOrderNumber || '35'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<Store sx={{ fontSize: '1rem !important', color: '#1E40AF' }} />}
            label={activeBranchName}
            size="small"
            sx={{
              fontWeight: 800,
              bgcolor: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
              fontSize: '0.813rem',
              py: 0.5,
              px: 0.5,
            }}
          />
          {onCloseMobile && (
            <IconButton
              onClick={onCloseMobile}
              size="small"
              sx={{
                bgcolor: '#F3F4F6',
                color: '#6B7280',
                '&:hover': { bgcolor: '#FEE2E2', color: '#DC2626' },
                width: 28,
                height: 28,
              }}
            >
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Order Type Buttons: تيك أوي | دليفري */}
      <Box
        sx={{
          display: 'flex',
          bgcolor: '#F3F4F6',
          p: 0.5,
          borderRadius: '24px',
          gap: 0.5,
        }}
      >
        <Button
          fullWidth
          suppressHydrationWarning
          onClick={() => onOrderTypeChange && onOrderTypeChange('takeaway')}
          sx={{
            borderRadius: '20px',
            py: 0.8,
            fontWeight: 700,
            fontSize: '0.813rem',
            bgcolor: orderType === 'takeaway' ? '#4285F4' : 'transparent',
            color: orderType === 'takeaway' ? '#FFFFFF' : '#6B7280',
            boxShadow: orderType === 'takeaway' ? '0 2px 8px rgba(66, 133, 244, 0.25)' : 'none',
          }}
        >
          تيك أوي
        </Button>

        <Button
          fullWidth
          suppressHydrationWarning
          onClick={() => onOrderTypeChange && onOrderTypeChange('delivery')}
          startIcon={<DeliveryDining sx={{ fontSize: 16 }} />}
          sx={{
            borderRadius: '20px',
            py: 0.8,
            fontWeight: 700,
            fontSize: '0.813rem',
            bgcolor: orderType === 'delivery' ? '#FF8C42' : 'transparent',
            color: orderType === 'delivery' ? '#FFFFFF' : '#6B7280',
            boxShadow: orderType === 'delivery' ? '0 2px 8px rgba(255, 140, 66, 0.3)' : 'none',
          }}
        >
          دليفري
        </Button>
      </Box>

      {/* Takeaway Branch Selector Box - ADMIN ONLY */}
      {orderType === 'takeaway' && (user?.role === 'admin' || !user) && (
        <Box
          sx={{
            bgcolor: '#EFF6FF',
            border: '1.5px solid #BFDBFE',
            borderRadius: '14px',
            p: 1.2,
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 800 }}>🏢 فرع التيك أوي المنفذ (الأدمن فقط)</InputLabel>
            <Select
              value={orderBranchId}
              label="🏢 فرع التيك أوي المنفذ (الأدمن فقط)"
              onChange={(e) => {
                const newBranchId = e.target.value;
                setOrderBranchId(newBranchId);
                fetchNextOrderNumber(newBranchId);
              }}
              renderValue={(val) => {
                const found = branches.find(b => b.id === val);
                return found ? `🏢 ${found.name}` : (val || '');
              }}
              sx={{ borderRadius: '8px', bgcolor: '#FFF', fontSize: '0.813rem', fontWeight: 800 }}
            >
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Delivery Details Collapsible Box */}
      {orderType === 'delivery' && (
        <Box
          sx={{
            bgcolor: '#FFF8F0',
            border: '1.5px solid #FFD8B3',
            borderRadius: '14px',
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.2,
          }}
        >
          {/* Header Toggle */}
          <Box
            onClick={() => setShowDeliveryForm(!showDeliveryForm)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#E06B1F', display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.875rem' }}>
              <DeliveryDining sx={{ fontSize: 20 }} /> بيانات الدليفري ({customerName || 'عميل'})
            </Typography>
            <IconButton size="small" sx={{ color: '#E06B1F', p: 0.2 }}>
              {showDeliveryForm ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          {/* Form Fields (Expandable / Collapsible) */}
          {showDeliveryForm && (
            <>
              {/* Branch Selector for Delivery - ADMIN ONLY */}
              {(user?.role === 'admin' || !user) && (
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 800 }}>🏢 فرع التوصيل المنفذ (الأدمن فقط)</InputLabel>
                  <Select
                    value={orderBranchId}
                    label="🏢 فرع التوصيل المنفذ (الأدمن فقط)"
                    onChange={(e) => {
                      const newBranchId = e.target.value;
                      setOrderBranchId(newBranchId);
                      fetchNextOrderNumber(newBranchId);
                    }}
                    renderValue={(val) => {
                      const found = branches.find(b => b.id === val);
                      return found ? `🏢 ${found.name}` : (val || '');
                    }}
                    sx={{ borderRadius: '8px', bgcolor: '#FFF', fontSize: '0.813rem', fontWeight: 800 }}
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Driver & Phone in 2 Columns */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem' }}>الطيار</InputLabel>
                  <Select
                    value={driverName}
                    label="الطيار"
                    onChange={(e) => setDriverName(e.target.value)}
                    sx={{ borderRadius: '8px', bgcolor: '#FFF', fontSize: '0.813rem' }}
                  >
                    {availableDriverOptions.map((d) => (
                      <MenuItem key={d.id || d.name} value={d.name}>
                        {d.label || d.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Autocomplete
                  freeSolo
                  fullWidth
                  options={customers}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    const cleanPhone = (option.phone || '').includes(' - ') ? option.phone.split(' - ')[0].trim() : (option.phone || '');
                    return cleanPhone ? `${cleanPhone} - ${option.name || ''}` : (option.name || '');
                  }}
                  inputValue={customerPhone}
                  onInputChange={(e, val) => {
                    const rawVal = val || '';
                    const cleanVal = rawVal.includes(' - ') ? rawVal.split(' - ')[0].trim() : rawVal;
                    setCustomerPhone(cleanVal);

                    if (cleanVal.length >= 3) {
                      const match = customers.find(c => c.phone === cleanVal);
                      if (match) {
                        setCustomerName(match.name || '');
                        setSavedAddresses(match.addresses || []);
                        if (match.addresses && match.addresses.length > 0) {
                          const firstAddr = match.addresses[0];
                          setCustomerAddress(firstAddr.address || '');
                          setCustomerFloor(firstAddr.floor || '');
                          setCustomerApartment(firstAddr.apartment || '');
                          const rawFee = firstAddr.deliveryFee ?? firstAddr.delivery_fee ?? match.deliveryFee ?? match.delivery_fee;
                          const savedFee = (rawFee !== undefined && rawFee !== null && !isNaN(parseFloat(rawFee))) ? parseFloat(rawFee) : 15;
                          setDeliveryFee(savedFee);
                        } else if (match.deliveryFee !== undefined || match.delivery_fee !== undefined) {
                          const rawFee = match.deliveryFee ?? match.delivery_fee;
                          const savedFee = (rawFee !== undefined && rawFee !== null && !isNaN(parseFloat(rawFee))) ? parseFloat(rawFee) : 15;
                          setDeliveryFee(savedFee);
                        }
                      } else {
                        setSavedAddresses([]);
                      }
                    }
                  }}
                  onChange={(e, val) => handleSelectCustomer(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="رقم الهاتف"
                      placeholder=" "
                      sx={{ bgcolor: '#FFF', '& input': { fontSize: '0.813rem' } }}
                    />
                  )}
                />
              </Box>

              {/* New Customer Indicator Banner */}
              {customerPhone && !customers.some(c => c.phone === customerPhone) && (
                <Chip
                  label="✨ عميل جديد (سيتم إضافته وحفظه في النظام تلقائياً)"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 800, fontSize: '0.73rem', borderRadius: '8px', py: 0.2 }}
                />
              )}

              {/* Customer Name */}
              <TextField
                fullWidth
                size="small"
                label="اسم العميل *"
                placeholder="أدخل اسم العميل..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
                sx={{ bgcolor: '#FFF', '& input': { fontSize: '0.813rem' } }}
              />

              {/* Saved Addresses Dropdown (If customer has >= 1 saved address) */}
              {savedAddresses.length > 0 && (
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E40AF' }}>
                    📍 عناوين العميل المحفوظة ({savedAddresses.length})
                  </InputLabel>
                  <Select
                    value={customerAddress}
                    label={`📍 عناوين العميل المحفوظة (${savedAddresses.length})`}
                    onChange={(e) => {
                      const selectedAddr = savedAddresses.find(a => a.address === e.target.value);
                      if (selectedAddr) {
                        setCustomerAddress(selectedAddr.address);
                        setCustomerFloor(selectedAddr.floor || '');
                        setCustomerApartment(selectedAddr.apartment || '');
                        const addrFee = selectedAddr.deliveryFee !== undefined ? parseFloat(selectedAddr.deliveryFee) : (selectedAddr.delivery_fee !== undefined ? parseFloat(selectedAddr.delivery_fee) : null);
                        if (addrFee !== null && !isNaN(addrFee)) {
                          setDeliveryFee(addrFee);
                        }
                      } else {
                        setCustomerAddress(e.target.value);
                      }
                    }}
                    sx={{ borderRadius: '8px', bgcolor: '#EFF6FF', fontSize: '0.813rem', fontWeight: 800 }}
                  >
                    {savedAddresses.map((addrObj, idx) => {
                      const feeDisp = addrObj.deliveryFee !== undefined ? addrObj.deliveryFee : (addrObj.delivery_fee !== undefined ? addrObj.delivery_fee : null);
                      return (
                        <MenuItem key={idx} value={addrObj.address}>
                          🏠 {addrObj.address} {addrObj.floor ? `- (د ${addrObj.floor}` : ''}{addrObj.apartment ? ` ش ${addrObj.apartment})` : addrObj.floor ? ')' : ''} {feeDisp !== null && !isNaN(feeDisp) ? `- (توصيل: ${feeDisp} ج.م)` : ''}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}

              {/* Address (العنوان) */}
              <TextField
                fullWidth
                size="small"
                label="العنوان التفصيلي"
                placeholder="اسم الشارع - العلامة المميزة"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
                sx={{ bgcolor: '#FFF', '& input': { fontSize: '0.813rem' } }}
              />

              {/* Floor, Apartment, and Delivery Fee in 1 Row */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="الدور"
                  placeholder="3"
                  value={customerFloor}
                  onChange={(e) => setCustomerFloor(e.target.value)}
                  slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
                  sx={{ width: '30%', bgcolor: '#FFF', '& input': { fontSize: '0.813rem' } }}
                />
                <TextField
                  size="small"
                  label="الشقة"
                  placeholder="5"
                  value={customerApartment}
                  onChange={(e) => setCustomerApartment(e.target.value)}
                  slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
                  sx={{ width: '30%', bgcolor: '#FFF', '& input': { fontSize: '0.813rem' } }}
                />
                <TextField
                  type="number"
                  size="small"
                  label="التوصيل"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
                  sx={{
                    width: '40%',
                    bgcolor: '#FFF',
                    '& input': {
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '0.813rem',
                      MozAppearance: 'textfield',
                      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0,
                      },
                    },
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Items Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.95rem' }}>
          🛒 عناصر الطلب ({items.reduce((acc, item) => acc + item.quantity, 0)})
        </Typography>
        {items.length > 0 && (
          <Button size="small" onClick={onClearOrder} sx={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, p: 0 }}>
            محي السلة
          </Button>
        )}
      </Box>

      {/* Item Cards Container - GUARANTEED VISIBLE HEIGHT */}
      <Box
        sx={{
          minHeight: items.length > 0 ? 160 : 100,
          maxHeight: 280,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          pr: 0.5,
          border: '1px solid #F1F5F9',
          borderRadius: '12px',
          p: 1,
          bgcolor: '#FAFCFF',
        }}
      >
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              borderRadius: '12px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="img"
                src={item.image || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' rx='8' fill='%23FDF3E7'/><circle cx='22' cy='22' r='14' fill='%23FF8C42'/></svg>"}
                alt={item.name}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  objectFit: 'cover',
                  bgcolor: '#FFF8F0',
                  border: '1px solid #E5E7EB',
                }}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '0.813rem', lineHeight: 1.2 }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#4285F4', fontWeight: 800, fontSize: '0.75rem', mt: 0.3 }}>
                  {(item.price * item.quantity).toFixed(0)} ج.م ({item.price} × {item.quantity})
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#F8FAFC', p: 0.2, borderRadius: '16px', border: '1px solid #CBD5E1' }}>
                <IconButton
                  size="small"
                  onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity - 1)}
                  sx={{ color: '#6B7280', p: 0.3, width: 22, height: 22, fontWeight: 900 }}
                >
                  -
                </IconButton>
                <Typography variant="body2" sx={{ fontWeight: 900, minWidth: 18, textAlign: 'center', fontSize: '0.813rem' }}>
                  {item.quantity}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, item.quantity + 1)}
                  sx={{ color: '#4285F4', p: 0.3, width: 22, height: 22, fontWeight: 900 }}
                >
                  +
                </IconButton>
              </Box>

              <IconButton
                size="small"
                onClick={() => onRemoveItem && onRemoveItem(item.id)}
                sx={{ color: '#EF4444', p: 0.4 }}
              >
                <DeleteOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        ))}

        {items.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 80,
              color: '#9CA3AF',
              gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.813rem' }}>
              السلة فارغة، اختر بعض الأطباق من القائمة
            </Typography>
          </Box>
        )}
      </Box>

      {/* Special Notes / Additions Field */}
      <TextField
        fullWidth
        size="small"
        label="📝 ملاحظات وإضافات الطلب (اختياري)"
        placeholder="مثال: بدون بصل، زيادة طحينة، مخلل، حار..."
        value={orderNotes}
        onChange={(e) => setOrderNotes(e.target.value)}
        slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
        sx={{
          bgcolor: '#FFF',
          '& input': { fontSize: '0.813rem' },
          '& .MuiOutlinedInput-root': { borderRadius: '10px' },
        }}
      />

      {/* Summary Box */}
      <Box
        sx={{
          bgcolor: '#FAFBFC',
          p: 1.5,
          borderRadius: '14px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6B7280', fontSize: '0.813rem' }}>المجموع الفرعي</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1A1A2E' }}>{subtotal.toFixed(0)} ج.م</Typography>
        </Box>

        {orderType === 'delivery' && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#E06B1F', fontWeight: 600, fontSize: '0.813rem' }}>خدمة التوصيل</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#E06B1F' }}>+{currentDeliveryFee.toFixed(0)} ج.م</Typography>
          </Box>
        )}

        {/* Discount Control Bar (نسبة أو مبلغ خصم) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: '#FEF2F2', p: 1, borderRadius: '10px', border: '1px solid #FECACA' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#DC2626', fontSize: '0.813rem' }}>
              🏷️ خصم للطلب:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                size="small"
                variant={discountType === 'percent' ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setDiscountType('percent')}
                sx={{ minWidth: 32, px: 0.8, py: 0.2, fontSize: '0.7rem', fontWeight: 900 }}
              >
                % نسبة
              </Button>
              <Button
                size="small"
                variant={discountType === 'amount' ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setDiscountType('amount')}
                sx={{ minWidth: 32, px: 0.8, py: 0.2, fontSize: '0.7rem', fontWeight: 900 }}
              >
                ج.م مبلغ
              </Button>
              <TextField
                type="number"
                size="small"
                placeholder={discountType === 'percent' ? '10%' : '0 ج.م'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
                sx={{ width: 75, '& input': { textAlign: 'center', fontWeight: 800, p: 0.5, color: '#DC2626', fontSize: '0.8rem', bgcolor: '#FFF', borderRadius: '6px' } }}
              />
            </Box>
          </Box>

          {/* Quick Percentage Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', mt: 0.3 }}>
            {[5, 10, 15, 20, 25, 50].map((pct) => (
              <Chip
                key={pct}
                label={`${pct}%`}
                size="small"
                onClick={() => {
                  setDiscountType('percent');
                  setDiscountValue(pct.toString());
                }}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  height: 22,
                  bgcolor: (discountType === 'percent' && discountValue === pct.toString()) ? '#DC2626' : '#FFF',
                  color: (discountType === 'percent' && discountValue === pct.toString()) ? '#FFF' : '#DC2626',
                  border: '1px solid #FCA5A5',
                  cursor: 'pointer'
                }}
              />
            ))}
          </Box>

          {calculatedDiscount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.2 }}>
              <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 700 }}>قيمة الخصم المخصومة:</Typography>
              <Typography variant="body2" sx={{ color: '#DC2626', fontWeight: 900 }}>
                -{calculatedDiscount.toFixed(2)} ج.م
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 0.3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A1A2E' }}>الصافي / الإجمالي</Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#4285F4', fontSize: '1.25rem' }}>{finalTotal.toFixed(2)} ج.م</Typography>
        </Box>

        {/* Paid Input Field */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 0.3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1A1A2E', fontSize: '0.813rem' }}>المبلغ المدفوع</Typography>
          <TextField
            type="number"
            size="small"
            placeholder={finalTotal.toFixed(0)}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            slotProps={{ htmlInput: { suppressHydrationWarning: true } }}
            sx={{ width: 100, '& input': { textAlign: 'center', fontWeight: 800, p: 0.6, color: '#1A1A2E', fontSize: '0.875rem' } }}
          />
        </Box>

        {/* Remaining Change Display */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#EFF6FF', p: 0.8, borderRadius: '8px' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.813rem' }}>المتبقي / الباقي للعميل</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '0.95rem' }}>
            {remainingChange.toFixed(2)} ج.م
          </Typography>
        </Box>

        {/* Payment Method Selector (طريقة الدفع: كاش، إنستا باي، فودافون كاش، شبكة/فيزا) */}
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155', display: 'block', mb: 0.8 }}>
            💳 طريقة دفع وتحصيل الطلب:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.6 }}>
            {[
              { id: 'cash', label: '💵 كاش', color: '#10B981', bgcolor: '#ECFDF5' },
              { id: 'instapay', label: '⚡ إنستا باي', color: '#7E22CE', bgcolor: '#F3E8FF' },
              { id: 'vodafone_cash', label: '📱 فودافون كاش', color: '#DC2626', bgcolor: '#FEF2F2' },
              { id: 'card', label: '💳 شبكة/فيزا', color: '#2563EB', bgcolor: '#EFF6FF' },
            ].map((method) => (
              <Button
                key={method.id}
                size="small"
                variant={paymentMethod === method.id ? 'contained' : 'outlined'}
                onClick={() => setPaymentMethod(method.id)}
                sx={{
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 0.2,
                  minWidth: 'auto',
                  bgcolor: paymentMethod === method.id ? method.color : method.bgcolor,
                  color: paymentMethod === method.id ? '#FFF' : method.color,
                  borderColor: method.color,
                  '&:hover': { bgcolor: method.color, color: '#FFF' }
                }}
              >
                {method.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Order Complete / Print Button */}
      <Button
        variant="contained"
        fullWidth
        suppressHydrationWarning
        disabled={items.length === 0}
        onClick={handleCompleteOrder}
        sx={{
          py: 1.2,
          borderRadius: '12px',
          fontSize: '0.95rem',
          fontWeight: 800,
          bgcolor: orderType === 'delivery' ? '#FF8C42' : '#4285F4',
          '&:hover': {
            bgcolor: orderType === 'delivery' ? '#E06B1F' : '#2B6FD4',
          },
        }}  
      >
        إتمام الطلب وطباعة الفاتورة
      </Button>

      {/* Shift Closed Warning Dialog Popup */}
      <Dialog
        open={shiftClosedDialogOpen}
        onClose={() => setShiftClosedDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '24px', p: 1, textAlign: 'center' }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 3 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
            <Lock sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#991B1B' }}>
            ⚠️ الوردية (الشيفت) مغلق حالياً
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 1 }}>
          <Typography variant="body1" sx={{ color: '#374151', fontWeight: 700, mb: 1 }}>
            لا يمكن تسجيل أو تنفيذ أو طباعة أي أوردر بدون فتح وردية نشطة.
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 600 }}>
            برجاء التوجه لصفحة **ملخص الوردية والشيفت** وسحب عهدة البداية لفتح الشيفت أولاً.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => setShiftClosedDialogOpen(false)}
            sx={{ borderRadius: '12px', fontWeight: 700, px: 2.5, borderColor: '#D1D5DB', color: '#4B5563' }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShiftClosedDialogOpen(false);
              window.location.href = '/shift-summary';
            }}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '12px', fontWeight: 800, px: 3, py: 1 }}
          >
            فتح وردية جديدة 🔓
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
