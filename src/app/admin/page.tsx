"use client";
import { Typography, Card, Container,Box, Grid, CardActionArea} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import adminRoutes from '../../lib/AdminRoutes';

const AdminPage = () => {
    const { profile, loading: authLoading } = useAuth();
    const { permissions, loading: permissionsLoading } = usePermissions();

    if (authLoading || permissionsLoading) {
      return <Box sx={{ p: 3 }}><Typography variant="h6">Loading...</Typography></Box>;
    }

    if (!permissions.includes('users.view') && !permissions.includes('features.view') && !permissions.includes('locations.view')) {
      // Fallback: check if user is superadmin directly
      const profileRole = profile && typeof profile === 'object' && 'role' in profile ? (profile as { role: string | number }).role : null;
      const isSuperAdmin = profileRole === 1 || profileRole === 'superadmin' || profileRole === '1';

      if (!isSuperAdmin) {
        return <Box sx={{ p: 3 }}>
          <Typography variant="h6">Access Denied: Admins only.</Typography>
          <Typography variant="body2">Profile: {JSON.stringify(profile)}</Typography>
          <Typography variant="body2">Permissions: {JSON.stringify(permissions)}</Typography>
        </Box>;
      }
    }
    return (
        <div>
                  <Typography component="h1" variant="h3">
        Admin Section
      </Typography>
            
            <p>Welcome to the admin portal.</p>
                  <Container component="main" maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}></Grid>
          {adminRoutes.map((route) => (
            <Card key={route.path} sx= {{m:2}}>
                <CardActionArea href={route.path} sx={{p:2}}>
                {route.icon||null}
              <Typography variant="h6"> {route.name}</Typography>
              <Typography variant="body2">{route.info||null}</Typography>
            </CardActionArea>
            </Card>
          ))}
                </Box>
                </Container>
        </div>
    );
};

export default AdminPage;