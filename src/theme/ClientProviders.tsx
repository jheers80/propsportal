'use client';
import * as React from 'react';
import ClientThemeProvider from './ClientThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientThemeProvider>{children}</ClientThemeProvider>
    </AuthProvider>
  );
}
