'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box } from '@mui/material';
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

    // 1. Unauthenticated users -> Redirect to /login
    if (!isAuthenticated && !isLoginPage) {
      router.replace('/login');
      return;
    }

    // 2. Authenticated users on /login -> Redirect to homepage /
    if (isAuthenticated && isLoginPage) {
      router.replace('/');
      return;
    }

    // 3. Permission Check
    if (isAuthenticated && !isLoginPage) {
      const permitted = hasPermission(pathname);
      if (!permitted) {
        router.replace('/');
      }
    }
  }, [mounted, isAuthenticated, pathname, user, router]);

  const isLoginPage = pathname === '/login';

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
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>

      {/* Sidebar - Renders consistently after hydration */}
      {mounted && isAuthenticated && <Sidebar />}
    </Box>
  );
}
