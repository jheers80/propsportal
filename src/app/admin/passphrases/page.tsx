'use client';
import { Typography, Box } from '@mui/material';
import PassphraseManager from '@/components/PassphraseManager';

export default function PassphraseAdminPage() {
  const { permissions, loading: permissionsLoading } = require('@/hooks/usePermissions').usePermissions();
  if (permissionsLoading) {
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
