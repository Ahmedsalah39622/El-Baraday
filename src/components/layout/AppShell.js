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
  const { isAuthenticated, hasPermission } = useAuthStore();

  // Tracks whether Zustand has rehydrated from localStorage
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persisted store needs a tick to rehydrate
    setHydrated(true);
  }, []);

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

    if (isAuthenticated && !isPublic && !hasPermission(pathname)) {
      router.replace('/');
    }
  }, [hydrated, isAuthenticated, pathname, isPublic, hasPermission, router]);

  // While Zustand is rehydrating from localStorage, show nothing to prevent flash
  if (!hydrated) {
    return (
      <Box sx={{
        height: '100vh', width: '100vw',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: '#0F172A'
      }}>
        <CircularProgress color="warning" size={44} thickness={5} />
      </Box>
    );
  }

  // Block render of protected content while redirect is pending
  if (!isAuthenticated && !isPublic) {
    return (
      <Box sx={{
        height: '100vh', width: '100vw',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: '#0F172A'
      }}>
        <CircularProgress color="error" size={44} thickness={5} />
      </Box>
    );
  }

  // Login page - full screen, no sidebar
  if (isPublic) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {children}
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
      bgcolor: 'background.default',
    }}>
      <Box sx={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#CBD5E1', borderRadius: 4 },
      }}>
        {children}
      </Box>

      <Sidebar />
    </Box>
  );
}
