'use client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import KeyIcon from '@mui/icons-material/Key';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Placeholder features; replace or extend as features are defined
const features = [
  { title: 'Overview', description: 'At-a-glance status and recent activity.', icon: <DashboardIcon />, href: '#' },
  { title: 'Users', description: 'Manage team members and roles.', icon: <PeopleIcon />, href: '#' },
  { title: 'Locations', description: 'View and manage store locations.', icon: <StorefrontIcon />, href: '#' },
  { title: 'Passphrases', description: 'Manage quick access passphrases.', icon: <KeyIcon />, href: '#' },
  { title: 'Reports', description: 'Operational insights and exports.', icon: <AssessmentIcon />, href: '#' },
  { title: 'Settings', description: 'Portal configuration and preferences.', icon: <SettingsIcon />, href: '#' },
];

export default function PortalPage() {
  return (
    <>
      <Navbar />

      <Box sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Welcome back
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Choose a section to get started. These cards will become your quick links to key features.
          </Typography>

          <Grid container spacing={3}>
            {features.map((f) => (
              <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea component={Link} href={f.href} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ mr: 1, color: 'primary.main' }}>{f.icon}</Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.title}</Typography>
                      </Box>
                      <Typography color="text.secondary">{f.description}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Coming soon
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Need something else? Visit
              {' '}
              <Link href="/quick-login" style={{ color: 'inherit', textDecoration: 'underline' }}>Quick Access</Link>
              {' '}for time-limited, on-shift tasks.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}