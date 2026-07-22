'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Tooltip, Paper, Divider, Drawer, Typography, Grid, IconButton } from '@mui/material';
import {
  Home,
  GridView,
  FastfoodOutlined,
  PersonOutlined,
  ListAlt,
  SettingsOutlined,
  ChevronRight,
  AccessTime,
  AccountBalanceWallet,
  Inventory2Outlined,
  DeliveryDining,
  AssessmentOutlined,
  AdminPanelSettingsOutlined,
  LogoutOutlined,
  Close,
  Menu,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { id: 'home', label: 'الرئيسية', icon: Home, path: '/' },
  { id: 'products', label: 'إدارة المنتجات', icon: FastfoodOutlined, path: '/products' },
  { id: 'tables', label: 'الطاولات', icon: GridView, path: '/tables' },
  { id: 'customers', label: 'العملاء', icon: PersonOutlined, path: '/customers' },
  { id: 'orders', label: 'الطلبات', icon: ListAlt, path: '/orders' },
  { id: 'shift-close', label: 'تقفيل شيفتات', icon: AccessTime, path: '/shift-summary' },
  { id: 'salaries', label: 'المرتبات والقبض', icon: AccountBalanceWallet, path: '/salaries' },
  { id: 'inventory', label: 'الخامات', icon: Inventory2Outlined, path: '/inventory' },
  { id: 'delivery', label: 'الدليفري', icon: DeliveryDining, path: '/delivery' },
  { id: 'reports', label: 'التقارير', icon: AssessmentOutlined, path: '/reports' },
  { id: 'admin', label: 'الأدمن', icon: AdminPanelSettingsOutlined, path: '/admin' },
];

const bottomItems = [
  { id: 'settings', label: 'الإعدادات', icon: SettingsOutlined, path: '/settings' },
  { id: 'logout', label: 'تسجيل خروج', icon: LogoutOutlined, path: '/login', isLogout: true },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  if (pathname === '/login') return null;

  const visibleNavItems = navItems.filter((item) => hasPermission(item.path));
  const visibleBottomItems = bottomItems.filter((item) => item.isLogout || hasPermission(item.path));

  // All allowed items combined for the "More" drawer on mobile
  const allAllowedItems = [...visibleNavItems, ...visibleBottomItems];

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const handleNavClick = (item) => {
    setMobileMoreOpen(false);
    if (item.isLogout) {
      logout();
      router.push('/login');
    } else {
      router.push(item.path);
    }
  };

  const mobileNavItems = [
    { id: 'home', label: 'الرئيسية', icon: Home, path: '/' },
    { id: 'products', label: 'المنتجات', icon: FastfoodOutlined, path: '/products' },
    { id: 'orders', label: 'الطلبات', icon: ListAlt, path: '/orders' },
    { id: 'delivery', label: 'الدليفري', icon: DeliveryDining, path: '/delivery' },
    { id: 'more', label: 'المزيد ☰', icon: Menu, isMore: true },
  ];

  return (
    <>
      {/* Desktop Vertical Sidebar */}
      <Box
        sx={{
          width: 72,
          minWidth: 72,
          height: '100%',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          py: 1.5,
          gap: 0.5,
          borderLeft: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          zIndex: 10,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 0 },
        }}
      >
        {/* Collapse Toggle */}
        <Box
          onClick={() => setCollapsed(!collapsed)}
          sx={{
            cursor: 'pointer',
            color: 'text.secondary',
            mb: 0.3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <ChevronRight sx={{ fontSize: 20 }} />
          <ChevronRight sx={{ fontSize: 20, ml: -1.2 }} />
        </Box>

        {/* Logo */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
            cursor: 'pointer',
            overflow: 'hidden',
          }}
          onClick={() => router.push('/')}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285F4 0%, #FF8C42 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="span"
              sx={{
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                lineHeight: 1,
              }}
            >
              ب
            </Box>
          </Box>
        </Box>

        {/* Navigation Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, flex: 1 }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Tooltip key={item.id} title={item.label} placement="left" arrow>
                <Box
                  className={`sidebar-icon ${active ? 'active' : ''}`}
                  onClick={() => handleNavClick(item)}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: active ? '#FFFFFF' : '#9CA3AF',
                    backgroundColor: active ? '#4285F4' : 'transparent',
                    boxShadow: active ? '0 4px 12px rgba(66, 133, 244, 0.3)' : 'none',
                    '&:hover': {
                      backgroundColor: active ? '#4285F4' : '#F3F4F6',
                      color: active ? '#FFFFFF' : '#4285F4',
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Divider before bottom items */}
        <Divider sx={{ width: '60%', my: 0.5 }} />

        {/* Bottom Items: Settings + Logout */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
          {visibleBottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path) && !item.isLogout;

            return (
              <Tooltip key={item.id} title={item.label} placement="left" arrow>
                <Box
                  className={`sidebar-icon ${active ? 'active' : ''}`}
                  onClick={() => handleNavClick(item)}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: item.isLogout ? '#EF4444' : (active ? '#FFFFFF' : '#9CA3AF'),
                    backgroundColor: active ? '#4285F4' : 'transparent',
                    '&:hover': {
                      backgroundColor: item.isLogout ? '#FEE2E2' : (active ? '#4285F4' : '#F3F4F6'),
                      color: item.isLogout ? '#DC2626' : (active ? '#FFFFFF' : '#4285F4'),
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Mobile Bottom Navigation Bar */}
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          bgcolor: '#FFFFFF',
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
          borderTop: '1px solid #E5E7EB',
          px: 1,
        }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = !item.isMore && isActive(item.path);

          return (
            <Box
              key={item.id}
              onClick={() => {
                if (item.isMore) {
                  setMobileMoreOpen(true);
                } else {
                  router.push(item.path);
                }
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: active ? '#4285F4' : (item.isMore ? '#FF8C42' : '#9CA3AF'),
                cursor: 'pointer',
                flex: 1,
                py: 0.5,
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
              <Box component="span" sx={{ fontSize: '0.62rem', fontWeight: active || item.isMore ? 800 : 500, mt: 0.2 }}>
                {item.label}
              </Box>
            </Box>
          );
        })}
      </Paper>

      {/* Sleek Mobile "المزيد" More Menu Sheet */}
      <Drawer
        anchor="bottom"
        open={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            p: 2.5,
            bgcolor: '#FAFCFF',
            maxHeight: '80vh',
            overflowY: 'auto',
          },
        }}
      >
        {/* Drawer Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            🌐 قـائـمـة الـمـزيـد (الصفحات والخدمات)
          </Typography>
          <IconButton size="small" onClick={() => setMobileMoreOpen(false)}>
            <Close />
          </IconButton>
        </Box>

        {/* Grid of allowed pages */}
        <Grid container spacing={1.5}>
          {allAllowedItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path) && !item.isLogout;

            return (
              <Grid item xs={6} sm={4} key={item.id}>
                <Paper
                  onClick={() => handleNavClick(item)}
                  sx={{
                    p: 1.8,
                    borderRadius: '16px',
                    border: '1.5px solid',
                    borderColor: item.isLogout ? '#FEE2E2' : (active ? '#4285F4' : '#E2E8F0'),
                    bgcolor: item.isLogout ? '#FEF2F2' : (active ? '#F0F7FF' : '#FFFFFF'),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 4px 12px rgba(66, 133, 244, 0.15)' : 'none',
                    '&:active': { transform: 'scale(0.96)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      bgcolor: item.isLogout ? '#EF444415' : (active ? '#4285F4' : 'rgba(66, 133, 244, 0.08)'),
                      color: item.isLogout ? '#EF4444' : (active ? '#FFFFFF' : '#4285F4'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ fontSize: 24 }} />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      color: item.isLogout ? '#DC2626' : (active ? '#1E40AF' : '#1A1A2E'),
                      fontSize: '0.85rem',
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Drawer>
    </>
  );
}
