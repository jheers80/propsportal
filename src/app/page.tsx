'use client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <Box
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: '#fff',
          py: { xs: 8, md: 12 },
        })}
      >
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography variant="h2" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Pizza Ranch Operations Portal
            </Typography>
            <Typography variant="h6" sx={{ maxWidth: 820 }}>
              Streamline day-to-day operations across locations. Manage users, roles, and permissions, and
              provide fast, secure access for in-store tasks with time-limited Quick Access.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                color="inherit"
                sx={{
                  color: 'primary.main',
                  backgroundColor: '#fff',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' },
                  px: 3,
                  py: 1.2,
                  fontWeight: 600,
                }}
              >
                Log in
              </Button>
              <Button
                component={Link}
                href="/quick-login"
                variant="contained"
                color="secondary"
                sx={{ px: 3, py: 1.2, fontWeight: 600 }}
              >
                Quick Access
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Value Props / Features */}
      <Container component="section" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Centralized Management
                </Typography>
                <Typography color="text.secondary">
                  Keep user profiles, locations, and permissions organized in one place with role-based
                  controls.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Secure by Design
                </Typography>
                <Typography color="text.secondary">
                  Built on Supabase with Row Level Security and permissions so the right people see the right
                  data.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Quick Access Sessions
                </Typography>
                <Typography color="text.secondary">
                  Grant short-lived access to specific locations for on-shift tasks without sharing accounts.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* How It Works */}
      <Box sx={{ backgroundColor: 'background.default', py: { xs: 6, md: 10 } }}>
        <Container component="section" maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 4 }}>
            How it works
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    1. Sign in
                  </Typography>
                  <Typography color="text.secondary">
                    Team members authenticate with secure accounts. Admins manage roles and permissions.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    2. Work by role
                  </Typography>
                  <Typography color="text.secondary">
                    Access is tailored by role and location. Staff see what they need—no more, no less.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    3. Quick Access (optional)
                  </Typography>
                  <Typography color="text.secondary">
                    For time-limited tasks, launch Quick Access to get temporary permissions without a full
                    login.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }} justifyContent="center">
            <Button component={Link} href="/login" variant="contained" color="primary" sx={{ px: 3, py: 1.2 }}>
              Go to Login
            </Button>
            <Button component={Link} href="/quick-login" variant="outlined" color="primary" sx={{ px: 3, py: 1.2 }}>
              Use Quick Access
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Roles Overview */}
      <Container component="section" maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 4 }}>
          Roles at a glance
        </Typography>
        <Grid container spacing={3}>
          {[{
            title: 'User',
            desc: 'Access to assigned locations for daily tasks. Limited settings.',
          }, {
            title: 'Staff',
            desc: 'Operational staff with access to store-specific tools and data.',
          }, {
            title: 'Manager',
            desc: 'Manage team members and location-level permissions.',
          }, {
            title: 'Multiunit',
            desc: 'Oversee multiple locations with aggregated access.',
          }, {
            title: 'Superadmin',
            desc: 'Full administrative access across the system.',
          }].map((role) => (
            <Grid key={role.title} item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {role.title}
                  </Typography>
                  <Typography color="text.secondary">{role.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* New Here Section */}
      <Box sx={{ backgroundColor: 'background.default', py: { xs: 6, md: 10 } }}>
        <Container component="section" maxWidth="lg">
          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    New here?
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    If you need access, contact your manager or IT administrator to request an account and
                    assigned locations. Once your profile is created, sign in to get started.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button component={Link} href="/login" variant="contained" color="primary" sx={{ px: 3, py: 1.2 }}>
                      Sign in
                    </Button>
                    <Button component={Link} href="/quick-login" variant="outlined" color="primary" sx={{ px: 3, py: 1.2 }}>
                      Try Quick Access
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Helpful to know
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    • Accounts are permissioned by role and location.
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    • Quick Access sessions are time-limited and scoped for in-store tasks.
                  </Typography>
                  <Typography color="text.secondary">
                    • For account issues, ask your manager or designated admin.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Pizza Ranch Operations Portal
        </Typography>
      </Box>
    </>
  );
}
