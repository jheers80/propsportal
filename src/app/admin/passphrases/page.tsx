'use client';
import { Typography, Box } from '@mui/material';
import PassphraseManager from '@/components/PassphraseManager';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

export default function PassphraseAdminPage() {
  const { loading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  if (authLoading || permissionsLoading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }
  if (!permissions.includes('passphrases.view')) {
    return <Box sx={{ p: 3 }}><Typography variant="h6">Unauthorized</Typography></Box>;
  }
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quick Access Passphrases
      </Typography>
      <Typography paragraph>
        Generate and manage single-use passphrases for temporary location access.
      </Typography>
      <PassphraseManager />
    </Box>
  );
}
