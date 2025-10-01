'use client';
import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { apiPost } from '@/lib/apiPost';

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { permissions } = usePermissions();

  // ...existing code...

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await apiPost('/api/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    }
    try {
      await (signOut as () => Promise<void>)();
    } catch (e) {
      console.error('SignOut failed', e);
    }
    handleClose();
    router.replace('/');
  };

  const handleProfile = () => {
    handleClose();
    router.push('/profile');
  };

  const handleAdmin = () => {
    handleClose();
    router.push('/admin/');
  };
  return (
    <AppBar position="static">
      <Toolbar>
        <Link href="/portal" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }}>
            Pizza Ranch Operations Portal
          </Typography>
        </Link>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          {user ? (
            <>
              {profile && (
                <Typography variant="h6" component="div" sx={{ mr: 2 }}>
                  {(profile as { full_name?: string }).full_name}
                </Typography>
              )}
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                {(permissions.includes('users.create') || (profile as { role?: string | number })?.role === 'superadmin' || (profile as { role?: string | number })?.role === 1) && (
                  <MenuItem onClick={handleAdmin}>Admin</MenuItem>
                )}
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="h6" component="div">Login</Typography>
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
