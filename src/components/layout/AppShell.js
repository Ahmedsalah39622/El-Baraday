'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/useAuthStore';

const PUBLIC_ROUTES = ['/login'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const syncUserWithServer = useAuthStore((state) => state.syncUserWithServer);

  // Tracks whether Zustand has rehydrated from sessionStorage
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (useAuthStore.getState().isAuthenticated) {
      syncUserWithServer();
    }
  }, [syncUserWithServer]);

  // Sync user state on window focus or visibility change to pick up live admin changes
  useEffect(() => {
    const handleFocus = () => {
      if (useAuthStore.getState().isAuthenticated) {
        syncUserWithServer();
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncUserWithServer]);

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && isPublic) {
      router.replace('/');
      return;
    }

    if (isAuthenticated && !isPublic) {
      syncUserWithServer();
      if (!hasPermission(pathname)) {
        router.replace('/');
      }
    }
  }, [hydrated, isAuthenticated, pathname, isPublic, hasPermission, router, syncUserWithServer]);

  // Login and public pages render immediately without any blocking spinner
  if (isPublic) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {children}
      </Box>
    );
  }

  // While Zustand is rehydrating from sessionStorage on protected routes
  if (!hydrated || (!isAuthenticated && !isPublic)) {
    return (
      <Box sx={{
        height: '100vh', width: '100vw',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: '#FDF6EC'
      }}>
        <CircularProgress sx={{ color: '#EAB308' }} size={44} thickness={4} />
      </Box>
    );
  }

  // Authenticated layout with sidebar
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      bgcolor: '#F8FAFC',
    }}>
      <Box sx={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F8FAFC',
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 },
        '&::-webkit-scrollbar-track': { bgcolor: '#F1F5F9' },
      }}>
        {children}
      </Box>

      <Sidebar />
    </Box>
  );
}

