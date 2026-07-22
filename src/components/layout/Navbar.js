'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar as MuiToolbar,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import {
  Settings,
  Inventory,
  DeliveryDining,
  ReceiptLong,
  TableBar,
  Fastfood,
  Logout,
  Print,
  PointOfSale,
  LocalOffer,
  Business,
  DateRange,
  Person,
  PersonOff,
  Insights,
  People,
  MoneyOff,
  Payment,
  LocationCity,
  Search,
  Receipt,
  Assessment,
  ArrowBackIosNew
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [time, setTime] = useState('');
  
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [inventoryAnchor, setInventoryAnchor] = useState(null);
  const [deliveryAnchor, setDeliveryAnchor] = useState(null);
  const [invoicesAnchor, setInvoicesAnchor] = useState(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };
      setTime(now.toLocaleString('ar-EG', options).replace(',', ' '));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseAll = () => {
    setSettingsAnchor(null);
    setInventoryAnchor(null);
    setDeliveryAnchor(null);
    setInvoicesAnchor(null);
  };

  const handleLogout = () => {
    handleCloseAll();
    logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'الإعدادات', icon: <Settings />, onClick: (e) => setSettingsAnchor(e.currentTarget) },
    { label: 'التقارير', icon: <Assessment />, onClick: () => router.push('/reports') },
    { label: 'تسوية جردية', icon: <Inventory />, onClick: () => router.push('/inventory') },
    { label: 'الدليفري', icon: <DeliveryDining />, onClick: () => router.push('/delivery') },
    { label: 'العملاء', icon: <People />, onClick: () => router.push('/customers') },
    { label: 'الطلبات', icon: <ReceiptLong />, onClick: () => router.push('/orders') },
    { label: 'الطاولات', icon: <TableBar />, onClick: () => router.push('/tables') },
    { label: 'المنتجات', icon: <Fastfood />, onClick: () => router.push('/products') },
  ];

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#FFF' }}>
      <MuiToolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
        
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => router.push('/')}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285F4 0%, #FF8C42 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: '1rem',
            }}
          >
            ب
          </Box>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
            البرادعى
          </Typography>
        </Box>

        {/* Navigation Items */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {navItems.map((item) => (
            <Button 
              key={item.label}
              color="inherit" 
              onClick={item.onClick}
              startIcon={item.icon}
              sx={{ fontWeight: 700, borderRadius: '8px', fontSize: '0.85rem' }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Active Cashier User Info & Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', direction: 'rtl' }}>
              {time}
            </Typography>
          </Box>

          <Box
            onClick={(e) => setSettingsAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#F3F4F6',
              px: 1.5,
              py: 0.5,
              borderRadius: '20px',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#E5E7EB' }
            }}
          >
            <Avatar sx={{ width: 28, height: 28, bgcolor: '#4285F4', fontSize: '0.85rem', fontWeight: 800 }}>
              {(user?.name || 'A')[0].toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
              {user?.name || 'المدير العام'}
            </Typography>
          </Box>
        </Box>

        {/* Settings & User Menu */}
        <Menu anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={handleCloseAll}>
          <MenuItem onClick={() => { handleCloseAll(); router.push('/shift-summary'); }}>
            <ListItemIcon><PointOfSale fontSize="small" /></ListItemIcon>
            <ListItemText>ملخص الوردية والشيفت الحالي</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { handleCloseAll(); router.push('/salaries'); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            <ListItemText>المرتبات والسلف</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { handleCloseAll(); router.push('/settings'); }}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText>إعدادات النظام والبرنتر</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>تسجيل الخروج</ListItemText>
          </MenuItem>
        </Menu>

      </MuiToolbar>
    </AppBar>
  );
}
