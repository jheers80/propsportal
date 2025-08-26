'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else if (data.user) {
      setSuccess(`User ${data.user.email} created successfully.`);
      const newUserProfile: Profile = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: fullName,
      };
      onUserAdded(newUserProfile);
      setEmail('');
      setPassword('');
      setFullName('');
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
        >
          Add User
        </Button>
      </Box>
    </Box>
  );
}
