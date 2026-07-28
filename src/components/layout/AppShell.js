'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/useAuthStore';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hasPermission } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isLoginPage = pathname === '/login';

    // 1. Unauthenticated users on protected routes -> Redirect to /login
    if (!isAuthenticated && !isLoginPage) {
      router.replace('/login');
      return;
    }

    // 2. Authenticated users on /login -> Redirect to homepage /
    if (isAuthenticated && isLoginPage) {
      router.replace('/');
      return;
    }

    // 3. Granular Permission Check for authenticated users
    if (isAuthenticated && !isLoginPage) {
      const permitted = hasPermission(pathname);
      if (!permitted) {
        router.replace('/');
      }
    }
  }, [mounted, isAuthenticated, pathname, user, router, hasPermission]);

  const isLoginPage = pathname === '/login';

  // While checking hydration / auth status, display a secure loading screen
  if (!mounted) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0F172A', color: '#FFF', gap: 2 }}>
        <CircularProgress color="warning" size={48} />
        <Typography variant="body2" sx={{ fontWeight: 800, color: '#94A3B8' }}>جاري التحقق من أمان وحساب المستخدم...</Typography>
      </Box>
    );
  }

  // 🔒 GATEKEEPER: Strict Deny for unauthenticated users on protected routes
  if (!isAuthenticated && !isLoginPage) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0F172A', color: '#FFF', gap: 2 }}>
        <CircularProgress color="warning" size={48} />
        <Typography variant="body2" sx={{ fontWeight: 800, color: '#EF4444' }}>غير مسموح بالدخول! جاري التوجيه لشاشة تسجيل الدخول...</Typography>
      </Box>
    );
  }

  if (isLoginPage) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {children}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 },
        }}
      >
        {children}
      </Box>

      {/* Sidebar - Renders only for authenticated users */}
      {mounted && isAuthenticated && <Sidebar />}
    </Box>
  );
}
