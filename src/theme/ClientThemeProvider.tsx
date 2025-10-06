'use client';
import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from './createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

const clientCache = createEmotionCache();

export default function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try {
      const root = document.documentElement;
      root.style.setProperty('--tp-accent', theme.palette.tp.accent);
      root.style.setProperty('--tp-accent-2', theme.palette.tp.accent2);
      // expose rgb components for CSS rgba() usage: --tp-accent-rgb: "239,68,68"
      if ((theme.palette.tp as any).accentRgb) {
        root.style.setProperty('--tp-accent-rgb', (theme.palette.tp as any).accentRgb);
      }
      if ((theme.palette.tp as any).accent2Rgb) {
        root.style.setProperty('--tp-accent-2-rgb', (theme.palette.tp as any).accent2Rgb);
      }
      root.style.setProperty('--tp-card-bg', theme.palette.tp.cardBg);
    } catch {
      // ignore in SSR
    }
  }, []);
  return (
    <CacheProvider value={clientCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
