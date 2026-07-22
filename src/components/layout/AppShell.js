'use client';

import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  const pathname = usePathname();
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

      {/* Sidebar - Appears ONLY after login on POS pages */}
      <Sidebar />
    </Box>
  );
}
