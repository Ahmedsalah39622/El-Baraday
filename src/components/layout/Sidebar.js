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
  Receipt,
  CardGiftcard,
  AssignmentReturnOutlined,
  Hub,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { id: 'home', label: 'الرئيسية', icon: Home, path: '/' },
  { id: 'invoices', label: 'الفواتير والتحصيل', icon: Receipt, path: '/invoices' },
  { id: 'returns', label: 'المرتجعات', icon: AssignmentReturnOutlined, path: '/returns' },
  { id: 'products', label: 'إدارة المنتجات', icon: FastfoodOutlined, path: '/products' },
  { id: 'prizes', label: 'السحب والجوائز', icon: CardGiftcard, path: '/prizes' },
  { id: 'customers', label: 'العملاء', icon: PersonOutlined, path: '/customers' },
  { id: 'orders', label: 'الطلبات', icon: ListAlt, path: '/orders' },
  { id: 'finances', label: 'الإيرادات والمصروفات', icon: ReceiptLong, path: '/finances' },
  { id: 'shift-close', label: 'تقفيل شيفتات', icon: AccessTime, path: '/shift-summary' },
  { id: 'salaries', label: 'المرتبات والقبض', icon: AccountBalanceWallet, path: '/salaries' },
  { id: 'inventory', label: 'الخامات', icon: Inventory2Outlined, path: '/inventory' },
  { id: 'branches-inventory', label: 'خامات الفروع', icon: Hub, path: '/branches-inventory' },
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

  const isAdmin = user?.role === 'admin';
  const hasPos = isAdmin || hasPermission('/');

  const visibleNavItems = navItems
    .map((item) => {
      if (item.path === '/') {
        return {
          ...item,
          label: hasPos ? 'الرئيسية (الكاشير)' : 'الرئيسية (المتابعة والإحصائيات)',
          icon: hasPos ? Home : AssessmentOutlined,
        };
      }
      return item;
    })
    .filter((item) => item.path === '/' || hasPermission(item.path));

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

  // Build dynamic mobile bottom nav (Home + top allowed screens + More)
  const otherAllowedNav = visibleNavItems.filter((item) => item.path !== '/').slice(0, 3);
  const mobileNavItems = [
    {
      id: 'home',
      label: hasPos ? 'الرئيسية' : 'المتابعة',
      icon: hasPos ? Home : AssessmentOutlined,
      path: '/',
    },
    ...otherAllowedNav,
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
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    color: active ? '#FFFFFF' : '#6B7280',
                    background: active
                      ? 'linear-gradient(135deg, #60A5FA 0%, #2563EB 50%, #1D4ED8 100%)'
                      : 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
                    border: active ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                    boxShadow: active
                      ? 'inset 0 2px 3px rgba(255, 255, 255, 0.6), inset 0 -2px 3px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(37, 99, 235, 0.4)'
                      : 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.04)',
                    transform: active ? 'scale(1.05)' : 'scale(1)',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 100%)',
                      borderRadius: '12px 12px 0 0',
                      pointerEvents: 'none'
                    },
                    '&:hover': {
                      transform: 'translateY(-2px) scale(1.08)',
                      background: active
                        ? 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #2563EB 100%)'
                        : 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)',
                      boxShadow: active
                        ? 'inset 0 2px 3px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.3), 0 12px 20px rgba(37, 99, 235, 0.5)'
                        : 'inset 0 1px 2px rgba(255, 255, 255, 0.9), 0 4px 8px rgba(0, 0, 0, 0.08)',
                      color: active ? '#FFFFFF' : '#2563EB',
                    },
                  }}
                >
                  <Icon sx={{
                    fontSize: 22,
                    filter: active
                      ? 'drop-shadow(0px 1px 1px rgba(0,0,0,0.3)) drop-shadow(0px -0.5px 0px rgba(255,255,255,0.4))'
                      : 'drop-shadow(0px 1px 0px rgba(255,255,255,0.8)) drop-shadow(0px -0.5px 0px rgba(0,0,0,0.15))',
                    transition: 'all 0.2s ease',
                  }} />
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
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    color: item.isLogout ? '#EF4444' : (active ? '#FFFFFF' : '#6B7280'),
                    background: active
                      ? 'linear-gradient(135deg, #60A5FA 0%, #2563EB 50%, #1D4ED8 100%)'
                      : (item.isLogout ? 'linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%)' : 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)'),
                    border: active
                      ? '1px solid #93C5FD'
                      : (item.isLogout ? '1px solid #FCA5A5' : '1px solid #E2E8F0'),
                    boxShadow: active
                      ? 'inset 0 2px 3px rgba(255, 255, 255, 0.6), inset 0 -2px 3px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(37, 99, 235, 0.4)'
                      : (item.isLogout ? 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(239, 68, 68, 0.05)' : 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.04)'),
                    transform: active ? 'scale(1.05)' : 'scale(1)',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 100%)',
                      borderRadius: '12px 12px 0 0',
                      pointerEvents: 'none'
                    },
                    '&:hover': {
                      transform: 'translateY(-2px) scale(1.08)',
                      background: item.isLogout
                        ? 'linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)'
                        : (active ? 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #2563EB 100%)' : 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)'),
                      boxShadow: item.isLogout
                        ? 'inset 0 2px 3px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(239, 68, 68, 0.3)'
                        : (active ? 'inset 0 2px 3px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.3), 0 12px 20px rgba(37, 99, 235, 0.5)' : 'inset 0 1px 2px rgba(255, 255, 255, 0.9), 0 4px 8px rgba(0, 0, 0, 0.08)'),
                      color: item.isLogout ? '#DC2626' : (active ? '#FFFFFF' : '#4285F4'),
                    },
                  }}
                >
                  <Icon sx={{
                    fontSize: 22,
                    filter: active
                      ? 'drop-shadow(0px 1px 1px rgba(0,0,0,0.3)) drop-shadow(0px -0.5px 0px rgba(255,255,255,0.4))'
                      : (item.isLogout ? 'drop-shadow(0px 1px 0.5px rgba(255,255,255,0.8)) drop-shadow(0px -0.5px 0px rgba(0,0,0,0.15))' : 'drop-shadow(0px 1px 0px rgba(255,255,255,0.8)) drop-shadow(0px -0.5px 0px rgba(0,0,0,0.15))'),
                    transition: 'all 0.2s ease',
                  }} />
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
        slotProps={{
          paper: {
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
          }
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
