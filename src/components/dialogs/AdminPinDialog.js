'use client';

import { useState } from 'react';
import { Dialog, Box, Typography, Button } from '@mui/material';

export default function AdminPinDialog({ open, onClose, onSubmit }) {
  const [pin, setPin] = useState('');

  const handleNumClick = (val) => {
    if (pin.length < 4) {
      setPin((prev) => prev + val);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
          رمز تأكيد المدير
        </Typography>

        {/* 4 PIN Dots */}
        <Box sx={{ display: 'flex', gap: 2, my: 1 }}>
          {[0, 1, 2, 3].map((idx) => (
            <Box
              key={idx}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                border: '1.5px solid #E5E7EB',
                bgcolor: pin.length > idx ? '#4285F4' : '#FFFFFF',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
              }}
            >
              {pin.length > idx ? '●' : ''}
            </Box>
          ))}
        </Box>

        {/* Numpad */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, width: '100%' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((btn) => (
            <button
              key={btn}
              className={`numpad-btn ${btn === '✓' ? 'primary' : btn === 'C' ? 'danger' : ''}`}
              style={{ width: '100%', height: 54 }}
              onClick={() => {
                if (btn === 'C') setPin('');
                else if (btn === '✓') onSubmit && onSubmit(pin);
                else handleNumClick(btn);
              }}
            >
              {btn}
            </button>
          ))}
        </Box>
      </Box>
    </Dialog>
  );
}
