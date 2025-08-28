import AdminNavbar from '@/components/AdminNavbar';
import Navbar from '@/components/Navbar';
import { Box } from '@mui/material';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <Box sx={{ display: 'flex' }}>
        <AdminNavbar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
      </Box>
    </>
  );
}
