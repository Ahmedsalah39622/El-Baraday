'use client';

import React, { useState } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

export default function BarcodeInput({ onBarcodeScanned }) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && onBarcodeScanned) {
        onBarcodeScanned(value.trim());
      }
      setValue('');
    }
  };

  return (
    <TextField
      label="الباركود"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      autoFocus
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <QrCodeScannerIcon />
          </InputAdornment>
        ),
      }}
      sx={{ width: 200 }}
    />
  );
}
