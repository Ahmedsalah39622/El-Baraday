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
  Avatar,
  Select,
  FormControl
} from '@mui/material';
import {
  Settings,
  Inventory,
  DeliveryDining,
  ReceiptLong,
  TableBar,
  Fastfood,
  Logout,
  PointOfSale,
  Person,
  People,
  Assessment,
  Store,
  SwapHoriz
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, hasPermission } = useAuthStore();
  const { branches, selectedBranchId, setSelectedBranchId, fetchBranches, getActiveBranchName } = useBranchStore();
  const [time, setTime] = useState('');
  
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [branchMenuAnchor, setBranchMenuAnchor] = useState(null);

  useEffect(() => {
    fetchBranches();
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
    setBranchMenuAnchor(null);
  };

  const handleLogout = () => {
    handleCloseAll();
    logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'الإعدادات', icon: <Settings />, path: '/settings', onClick: (e) => setSettingsAnchor(e.currentTarget) },
    { label: 'التقارير', icon: <Assessment />, path: '/reports', onClick: () => router.push('/reports') },
    { label: 'تسوية جردية', icon: <Inventory />, path: '/inventory', onClick: () => router.push('/inventory') },
    { label: 'الدليفري', icon: <DeliveryDining />, path: '/delivery', onClick: () => router.push('/delivery') },
    { label: 'العملاء', icon: <People />, path: '/customers', onClick: () => router.push('/customers') },
    { label: 'الطلبات', icon: <ReceiptLong />, path: '/orders', onClick: () => router.push('/orders') },
    { label: 'الطاولات', icon: <TableBar />, path: '/tables', onClick: () => router.push('/tables') },
    { label: 'المنتجات', icon: <Fastfood />, path: '/products', onClick: () => router.push('/products') },
  ].filter((item) => hasPermission(item.path));

  const isAdmin = user?.role === 'admin' || !user?.role;

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

        {/* Multi-Branch Selector Pill for Admin */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isAdmin ? (
            <Chip
              icon={<Store sx={{ fontSize: '18px !important' }} />}
              label={`الفرع: ${getActiveBranchName()}`}
              onClick={(e) => setBranchMenuAnchor(e.currentTarget)}
              onDelete={(e) => setBranchMenuAnchor(e.currentTarget)}
              deleteIcon={<SwapHoriz sx={{ fontSize: '18px !important' }} />}
              sx={{
                bgcolor: selectedBranchId === 'all' ? '#EFF6FF' : '#ECFDF5',
                color: selectedBranchId === 'all' ? '#1D4ED8' : '#047857',
                border: '1.5px solid',
                borderColor: selectedBranchId === 'all' ? '#3B82F6' : '#10B981',
                fontWeight: 900,
                fontSize: '0.85rem',
                cursor: 'pointer',
                '&:hover': { bgcolor: selectedBranchId === 'all' ? '#DBEAFE' : '#D1FAE5' }
              }}
            />
          ) : (
            <Chip
              icon={<Store sx={{ fontSize: '18px !important' }} />}
              label={`الفرع: ${getActiveBranchName()}`}
              sx={{
                bgcolor: '#F3F4F6',
                color: '#374151',
                fontWeight: 800,
                fontSize: '0.82rem'
              }}
            />
          )}

          <Menu
            anchorEl={branchMenuAnchor}
            open={Boolean(branchMenuAnchor)}
            onClose={handleCloseAll}
          >
            <MenuItem
              selected={selectedBranchId === 'all'}
              onClick={() => { setSelectedBranchId('all'); handleCloseAll(); }}
              sx={{ fontWeight: 800, color: '#1D4ED8' }}
            >
              <ListItemIcon><Store fontSize="small" sx={{ color: '#1D4ED8' }} /></ListItemIcon>
              <ListItemText primary="جميع الفروع (ريل تايم مجمع)" />
            </MenuItem>
            <Divider />
            {branches.map((b) => (
              <MenuItem
                key={b.id}
                selected={selectedBranchId === b.id}
                onClick={() => { setSelectedBranchId(b.id); handleCloseAll(); }}
                sx={{ fontWeight: 700 }}
              >
                <ListItemIcon><Store fontSize="small" /></ListItemIcon>
                <ListItemText primary={b.name} secondary={b.phone} />
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* Navigation Items */}
        <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5 }}>
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
          <MenuItem onClick={() => { handleCloseAll(); router.push('/attendance'); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            <ListItemText>تمامات الموظفين والطيارين</ListItemText>
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
