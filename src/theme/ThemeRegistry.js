'use client';
import { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import theme from './theme';

export default function ThemeRegistry({ children }) {
  const rtlCache = useMemo(
    () =>
      createCache({
        key: 'muirtl',
        stylisPlugins: [prefixer, rtlPlugin],
        prepend: true,
      }),
    []
  );

  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
