'use client';
import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';

export default function QuickLoginPage() {
  const [p_passphrase, setp_Passphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const p_role = "quickaccess";

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_passphrase, p_role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setSuccess('Quick access granted for 1 hour.');
      // Optional: redirect to a store-specific page or dashboard
      router.push('/portal/');
  } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Invalid passphrase or login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Quick Access Login
        </Typography>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="p_passphrase"
            label="3-Word Passphrase"
            name="p_passphrase"
            autoFocus
            value={p_passphrase}
            onChange={(e) => setp_Passphrase(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Box>
      </Box>
    </Container>
  );
}
