'use client';

import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import Link from 'next/link';

const adminRoutes = [
  { path: '/admin/users', name: 'Users' },
  { path: '/admin/locations', name: 'Locations' },
  { path: '/admin/passphrases', name: 'Passphrases' },
];

export default function AdminNavbar() {

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', height: '100vh' }}>
      
        <Box sx={{ p: 2, '&:hover': { cursor: 'pointer' } }}>
          <Link href="/admin/users" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6">Admin</Typography>
          </Link>
        </Box>
      <Divider />
      <List>
        {adminRoutes.map((route) => (
          <ListItem key={route.path} disablePadding>
            <ListItemButton component={Link} href={route.path}>
              <ListItemText primary={route.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
