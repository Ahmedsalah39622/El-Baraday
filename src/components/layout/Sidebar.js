'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, Tooltip, Paper, Divider } from '@mui/material';
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
} from '@mui/icons-material';

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

// Mobile bottom bar shows only core 5 items
const mobileNavItems = [
  { id: 'home', label: 'الرئيسية', icon: Home, path: '/' },
  { id: 'products', label: 'المنتجات', icon: FastfoodOutlined, path: '/products' },
  { id: 'orders', label: 'الطلبات', icon: ListAlt, path: '/orders' },
  { id: 'delivery', label: 'الدليفري', icon: DeliveryDining, path: '/delivery' },
  { id: 'more', label: 'المزيد', icon: GridView, path: '/admin' },
];

const bottomItems = [
  { id: 'settings', label: 'الإعدادات', icon: SettingsOutlined, path: '/settings' },
  { id: 'logout', label: 'تسجيل خروج', icon: LogoutOutlined, path: '/login', isLogout: true },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === '/login') return null;

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const handleNavClick = (item) => {
    if (item.isLogout) {
      // Clear session and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('el-baraday-session');
      }
      router.push('/login');
    } else {
      router.push(item.path);
    }
  };

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
          {navItems.map((item) => {
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
          {bottomItems.map((item) => {
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
          const active = isActive(item.path);
          return (
            <Box
              key={item.id}
              onClick={() => router.push(item.path)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: active ? '#4285F4' : '#9CA3AF',
                cursor: 'pointer',
                flex: 1,
                py: 0.5,
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
              <Box component="span" sx={{ fontSize: '0.6rem', fontWeight: active ? 700 : 500, mt: 0.2 }}>
                {item.label}
              </Box>
            </Box>
          );
        })}
      </Paper>
    </>
  );
}
