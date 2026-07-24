'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { AccessTime, Warning, CheckCircle, Home, DirectionsRun } from '@mui/icons-material';

export default function DeliveryTimerBadge({ dispatchedAt, deliveredToCustomerAt, targetMinutes = 30, status, isDelivered }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isCompleted = isDelivered || status === 'delivered' || status === 'مكتمل' || status === 'completed';
  const isCustomerDelivered = status === 'customer_delivered';

  useEffect(() => {
    if (isCompleted) return;

    const startTime = isCustomerDelivered
      ? (deliveredToCustomerAt || dispatchedAt)
      : dispatchedAt;

    if (!startTime) return;

    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diff);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [dispatchedAt, deliveredToCustomerAt, isCompleted, isCustomerDelivered]);

  // If order is fully delivered and completed (driver returned to restaurant)
  if (isCompleted) {
    return (
      <Chip
        size="small"
        icon={<CheckCircle sx={{ fontSize: 15, color: '#047857 !important' }} />}
        label="✅ تم الوصول والرجوع"
        sx={{ bgcolor: '#ECFDF5', color: '#047857', border: '1.5px solid #10B981', fontWeight: 800 }}
      />
    );
  }

  // If order was delivered to customer -> Show return trip timer badge!
  if (isCustomerDelivered) {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.6,
          bgcolor: '#F3E8FF',
          color: '#6B21A8',
          border: '1.5px solid #A855F7',
          px: 1.2,
          py: 0.3,
          borderRadius: '16px',
          fontWeight: 800,
          fontSize: '0.78rem',
          boxShadow: '0 2px 8px rgba(168, 85, 247, 0.2)'
        }}
      >
        <Home sx={{ fontSize: 15, color: '#9333EA' }} />
        <span>🏠 تم التسليم للعميل (رحلة العودة ⏱️ {formattedTime})</span>
      </Box>
    );
  }

  if (!dispatchedAt) {
    return (
      <Chip
        size="small"
        icon={<AccessTime sx={{ fontSize: 14 }} />}
        label="⏳ قيد التحضير"
        sx={{ bgcolor: '#FFFBEB', color: '#B45309', border: '1px solid #F59E0B', fontWeight: 800 }}
      />
    );
  }

  const limitSeconds = (parseInt(targetMinutes) || 30) * 60;
  const isOverdue = elapsedSeconds > limitSeconds;
  const ratio = elapsedSeconds / limitSeconds;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Color schemes
  let colorStyle = {
    bgcolor: '#ECFDF5',
    color: '#047857',
    border: '1px solid #10B981',
    icon: <AccessTime sx={{ fontSize: 15, color: '#10B981' }} />,
    label: `⏱️ ${formattedTime} / ${targetMinutes}د`
  };

  if (isOverdue) {
    const overdueSecs = elapsedSeconds - limitSeconds;
    const overdueMins = Math.floor(overdueSecs / 60);
    colorStyle = {
      bgcolor: '#FEF2F2',
      color: '#991B1B',
      border: '1.5px solid #EF4444',
      icon: <Warning sx={{ fontSize: 16, color: '#EF4444' }} />,
      label: `🔴 تأخير +${overdueMins}د (${formattedTime})`
    };
  } else if (ratio >= 0.75) {
    colorStyle = {
      bgcolor: '#FFFBEB',
      color: '#B45309',
      border: '1px solid #F59E0B',
      icon: <AccessTime sx={{ fontSize: 15, color: '#F59E0B' }} />,
      label: `⚠️ ${formattedTime} / ${targetMinutes}د`
    };
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        bgcolor: colorStyle.bgcolor,
        color: colorStyle.color,
        border: colorStyle.border,
        px: 1.2,
        py: 0.3,
        borderRadius: '16px',
        fontWeight: 800,
        fontSize: '0.78rem',
        boxShadow: isOverdue ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
        animation: isOverdue ? 'pulse 1.5s infinite' : 'none',
        '@keyframes pulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.6 },
          '100%': { opacity: 1 }
        }
      }}
    >
      {colorStyle.icon}
      <span>{colorStyle.label}</span>
    </Box>
  );
}
