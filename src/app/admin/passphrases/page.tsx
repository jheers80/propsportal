'use client';
import { Typography, Box } from '@mui/material';
import PassphraseManager from '@/components/PassphraseManager';

export default function PassphraseAdminPage() {
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
