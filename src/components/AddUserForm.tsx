'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/apiPost';
import logger from '@/lib/logger';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';

type Profile = {
  id: string;
  email: string;
  full_name: string;
};

interface AddUserFormProps {
    onUserAdded: (user: Profile) => void;
}

export default function AddUserForm({ onUserAdded }: AddUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await apiPost<{ user: { id: string; email: string } }>('/api/users/create', { email, password, full_name: fullName });

      setSuccess(`User ${email} created successfully.`);
      const newUserProfile: Profile = {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
      };
      onUserAdded(newUserProfile);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (error) {
      logger.error('Error creating user:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flex: 1 }}>
      <Typography component="h1" variant="h5">
        Add New User
      </Typography>
      <Box
        component="form"
        onSubmit={handleAddUser}
        noValidate
        sx={{ mt: 1 }}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          id="fullName"
          label="Full Name"
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Creating User...' : 'Add User'}
        </Button>
      </Box>
    </Box>
  );
}