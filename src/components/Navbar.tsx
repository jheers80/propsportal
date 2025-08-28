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
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const { user, profile } = useUser();
  const { permissions } = usePermissions();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
console.log("[Navbar]User: ", user);
  return (
    <AppBar position="static">
      <Toolbar>
        <Link href="/portal" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, cursor: 'pointer' }}>
            Pizza Ranch Operations Portal
          </Typography>
        </Link>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          {profile && (
            <Typography variant="h6" component="div" sx={{ mr: 2 }}>
              {profile.full_name}
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
            {permissions.includes('users.create') && (
              <MenuItem onClick={handleAdmin}>Admin</MenuItem>
            )}
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
