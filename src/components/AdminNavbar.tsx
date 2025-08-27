'use client';

import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  ListItemIcon,
} from '@mui/material';
import adminRoutes from '../lib/AdminRoutes';


import Link from 'next/link';

//const adminRoutes = [
//  { path: '/admin/users', name: 'Users', icon:<Person/> },
//  { path: '/admin/locations', name: 'Locations',icon: <Storefront/> },
//  { path: '/admin/passphrases', name: 'Passphrases', icon:<Key/> },
//];

export default function AdminNavbar() {

  return (
    <Box sx={{ width: 250, bgcolor: 'background.paper', height: '100vh' }}>
      
        <Box sx={{ p: 2, '&:hover': { cursor: 'pointer' } }}>
          <Link href="/admin/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6">Admin Menu</Typography>
          </Link>
        </Box>
      <Divider />
      <List>
        {adminRoutes.map((route) => (
          <ListItem key={route.path} disablePadding>

            <ListItemButton component={Link} href={route.path}>
                          {(route.icon)?<ListItemIcon>{route.icon}</ListItemIcon>:null}
              <ListItemText primary={route.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
