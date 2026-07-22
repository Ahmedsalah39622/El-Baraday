'use client';

import React from 'react';
import { Box, Button, Grid } from '@mui/material';

export default function NumPad({ onNumberPress, onClear, onEnter, onComplete, onCancel }) {
  const handlePress = (val) => {
    if (onNumberPress) onNumberPress(val);
  };

  return (
    <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Grid container spacing={1}>
        {/* Row 1 */}
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('7')}>7</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('8')}>8</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('9')}>9</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="contained" color="success" size="large" sx={{ minHeight: 50 }} onClick={onComplete}>سداد</Button></Grid>

        {/* Row 2 */}
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('4')}>4</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('5')}>5</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('6')}>6</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="contained" color="warning" size="large" sx={{ minHeight: 50 }}>خصم مبلغ</Button></Grid>

        {/* Row 3 */}
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('1')}>1</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('2')}>2</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('3')}>3</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="contained" color="info" size="large" sx={{ minHeight: 50 }}>نسب الخصم</Button></Grid>

        {/* Row 4 */}
        <Grid item xs={6}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('0')}>0</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50, fontSize: '1.25rem' }} onClick={() => handlePress('.')}>.</Button></Grid>
        <Grid item xs={3}><Button fullWidth variant="contained" color="error" size="large" sx={{ minHeight: 50 }} onClick={onClear}>C</Button></Grid>

        {/* Row 5 */}
        <Grid item xs={4}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50 }} onClick={onCancel}>إنهاء</Button></Grid>
        <Grid item xs={4}><Button fullWidth variant="outlined" size="large" sx={{ minHeight: 50 }}>إتمام</Button></Grid>
        <Grid item xs={4}><Button fullWidth variant="contained" color="primary" size="large" sx={{ minHeight: 50 }} onClick={onEnter}>Enter</Button></Grid>
      </Grid>
    </Box>
  );
}
