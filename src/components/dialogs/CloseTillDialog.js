'use client';

import { useState } from 'react';
import { Dialog, Box, Typography, Button, TextField } from '@mui/material';

export default function CloseTillDialog({ open, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');

  const handleNumClick = (val) => {
    if (val === 'C') {
      setAmount('');
    } else {
      setAmount((prev) => prev + val);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
          إغلاق مبلغ الدرج
        </Typography>

        <Typography variant="body2" sx={{ color: '#6B7280', textAlign: 'center' }}>
          أدخل مبلغ الدرج الموجود الآن
        </Typography>

        <TextField
          fullWidth
          value={amount}
          placeholder="0.00 ج.م"
          inputProps={{ style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 } }}
          sx={{ my: 1 }}
        />

        {/* 3x4 Numpad */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, width: '100%' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
            <button
              key={btn}
              className={`numpad-btn ${btn === 'C' ? 'danger' : ''}`}
              style={{ width: '100%', height: 54 }}
              onClick={() => {
                if (btn === '⌫') setAmount(amount.slice(0, -1));
                else handleNumClick(btn);
              }}
            >
              {btn}
            </button>
          ))}
        </Box>

        <Button
          variant="contained"
          fullWidth
          onClick={() => onSubmit && onSubmit(amount)}
          sx={{ bgcolor: '#4285F4', borderRadius: '12px', py: 1.2, fontWeight: 700, mt: 1 }}
        >
          تأكيد
        </Button>
      </Box>
    </Dialog>
  );
}
