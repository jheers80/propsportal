'use client';
import { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { apiPost } from '@/lib/apiPost';

export default function LinkLocationPage() {
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiPost<{ success?: boolean; message?: string }>('/api/link-location', { passphrase });
      setMessage('Location successfully linked to your account.');
      setPassphrase('');
    } catch {
      setError('Failed to link location.');
    } finally {
      setLoading(false);
    }
  };

  return (
   
    <Container maxWidth="sm" sx={{ py: 6 }}>
      
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Link Your Account to a Location</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter the current 3-word passphrase for your store to associate your account with that location.
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <TextField
          fullWidth
          label="Passphrase (e.g., red-bison-moon)"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading || !passphrase.trim()}>
          {loading ? <CircularProgress size={24} /> : 'Link Location'}
        </Button>
      </Box>
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Container>
  );
}