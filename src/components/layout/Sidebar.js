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
  HowToReg,
  ReceiptLong,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { id: 'home', label: 'الرئيسية', icon: Home, path: '/' },
  { id: 'products', label: 'إدارة المنتجات', icon: FastfoodOutlined, path: '/products' },
  { id: 'tables', label: 'الطاولات', icon: GridView, path: '/tables' },
  { id: 'customers', label: 'العملاء', icon: PersonOutlined, path: '/customers' },
  { id: 'orders', label: 'الطلبات', icon: ListAlt, path: '/orders' },
  { id: 'finances', label: 'الإيرادات والمصروفات', icon: ReceiptLong, path: '/finances' },
  { id: 'shift-close', label: 'تقفيل شيفتات', icon: AccessTime, path: '/shift-summary' },
  { id: 'salaries', label: 'المرتبات والقبض', icon: AccountBalanceWallet, path: '/salaries' },
  { id: 'inventory', label: 'الخامات', icon: Inventory2Outlined, path: '/inventory' },
  { id: 'delivery', label: 'الدليفري', icon: DeliveryDining, path: '/delivery' },
  { id: 'attendance', label: 'تمامات الموظفين والطيارين', icon: HowToReg, path: '/attendance' },
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
    { id: 'orders', label: 'الطلبات', icon: ListAlt, path: '/orders' },
    { id: 'attendance', label: 'التمامات', icon: HowToReg, path: '/attendance' },
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

      {/* Ultra-Sleek Mobile "المزيد" Navigation Sheet */}
      <Drawer
        anchor="bottom"
        open={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            p: 2.5,
            pb: 10, // Safe padding for bottom navigation bar
            bgcolor: '#FAFCFF',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.12)',
          },
        }}
      >
        {/* Drag Indicator Handle */}
        <Box
          sx={{
            width: 40,
            height: 5,
            borderRadius: '10px',
            bgcolor: '#CBD5E1',
            mx: 'auto',
            mb: 2,
          }}
        />

        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2.5,
            pb: 1.5,
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#1A1A2E', fontSize: '1.1rem' }}>
              قائمة الخدمات والصفحات
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
              نظام مطعم البرادعي POS
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setMobileMoreOpen(false)}
            sx={{ bgcolor: '#F1F5F9', color: '#475569', '&:hover': { bgcolor: '#E2E8F0' } }}
          >
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Uniform 2-Column Mobile Navigation Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1.5,
          }}
        >
          {allAllowedItems
            .filter((item) => !item.isLogout)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Paper
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  elevation={active ? 3 : 0}
                  sx={{
                    p: 1.5,
                    height: 72,
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: active ? '#3B82F6' : '#E2E8F0',
                    background: active
                      ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                      : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: active ? '0 6px 16px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      minWidth: 42,
                      borderRadius: '12px',
                      bgcolor: active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(59, 130, 246, 0.08)',
                      color: active ? '#FFFFFF' : '#3B82F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ fontSize: 22 }} />
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      lineHeight: 1.25,
                      color: active ? '#FFFFFF' : '#1E293B',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Paper>
              );
            })}
        </Box>

        {/* Distinct Styled Logout Button */}
        {allAllowedItems.some((item) => item.isLogout) && (
          <Box sx={{ mt: 2.5 }}>
            <Paper
              onClick={() => handleNavClick({ isLogout: true })}
              elevation={0}
              sx={{
                p: 1.8,
                borderRadius: '16px',
                bgcolor: '#FEF2F2',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.98)', bgcolor: '#FEE2E2' },
              }}
            >
              <LogoutOutlined sx={{ color: '#EF4444', fontSize: 22 }} />
              <Typography variant="body1" sx={{ fontWeight: 900, color: '#DC2626', fontSize: '0.95rem' }}>
                تسجيل الخروج من النظام
              </Typography>
            </Paper>
          </Box>
        )}
      </Drawer>
    </>
  );
}
