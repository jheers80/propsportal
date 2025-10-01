'use client';
import AdminNavbar from '@/components/AdminNavbar';
import Navbar from '@/components/Navbar';
import NoSSR from '@/components/NoSSR';
import { Box } from '@mui/material';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NoSSR fallback={<div className="h-16 bg-blue-600" />}>
        <Navbar />
      </NoSSR>
      <Box sx={{ display: 'flex' }}>
        <NoSSR fallback={<div className="w-64 h-screen bg-gray-100" />}>
          <AdminNavbar />
        </NoSSR>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </>
  );
}
