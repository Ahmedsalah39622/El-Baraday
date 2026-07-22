'use client';

import React from 'react';
import { Card, Box, Autocomplete, TextField, Select, MenuItem, Button, Stack, Typography, FormControl, InputLabel } from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { formatCurrency } from '@/utils/formatters';

export default function PaymentPanel({
  subtotal = 0,
  discount = 0,
  total = 0,
  paidAmount = 0,
  change = 0,
  onPaidAmountChange,
  onPaymentMethodChange,
  paymentMethod,
  onSelectCustomer,
  onSelectArea,
  selectedCustomer,
  selectedArea,
  onAddCustomer
}) {
  return (
    <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Section 1: Customer selection */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Autocomplete
          options={[]}
          value={selectedCustomer || null}
          onChange={(e, val) => onSelectCustomer && onSelectCustomer(val)}
          renderInput={(params) => <TextField {...params} label="اختر الاسم" size="small" />}
          sx={{ flex: 2, minWidth: 150 }}
        />
        <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
          <InputLabel>اختر المنطقة</InputLabel>
          <Select
            value={selectedArea || ''}
            label="اختر المنطقة"
            onChange={(e) => onSelectArea && onSelectArea(e.target.value)}
          >
            <MenuItem value="area1">المنطقة 1</MenuItem>
            <MenuItem value="area2">المنطقة 2</MenuItem>
          </Select>
        </FormControl>
        <TextField 
          label="الأوردر" 
          size="small" 
          sx={{ flex: 1, minWidth: 100 }} 
        />
        <Button variant="contained" color="primary" onClick={onAddCustomer}>
          إضافة
        </Button>
      </Box>

      {/* Section 2: Amount display */}
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" color="primary" fontWeight="bold">المطلوب</Typography>
          <Typography variant="h5" color="primary" fontWeight="bold">{formatCurrency(total)}</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">المدفوع</Typography>
          <TextField 
            value={paidAmount}
            onChange={(e) => onPaidAmountChange && onPaidAmountChange(e.target.value)}
            size="small"
            type="number"
            inputProps={{ style: { textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' } }}
            sx={{ width: 150 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">الباقي</Typography>
          <Typography 
            variant="h5" 
            color={change >= 0 ? 'success.main' : 'error.main'}
            fontWeight="bold"
          >
            {formatCurrency(change)}
          </Typography>
        </Box>
      </Stack>

      {/* Section 3: Payment action */}
      <Box sx={{ display: 'flex', mt: 1 }}>
        <Button 
          variant="outlined" 
          fullWidth 
          startIcon={<CreditCardIcon />}
          size="large"
          sx={{ minHeight: 50, fontSize: '1.1rem' }}
        >
          دفع بالفيزا
        </Button>
      </Box>
    </Card>
  );
}
