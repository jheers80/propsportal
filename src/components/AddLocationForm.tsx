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

type Location = {
  id: number;
  store_id: string;
  store_name: string;
  city: string;
  state: string;
  zip: string;
};

interface AddLocationFormProps {
    onLocationAdded: (location: Location) => void;
}

export default function AddLocationForm({ onLocationAdded }: AddLocationFormProps) {
  const [newLocation, setNewLocation] = useState({
    store_id: '',
    store_name: '',
    city: '',
    state: '',
    zip: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewLocation((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLocation = async () => {
    setError(null);
    setSuccess(null);
    const { data, error } = await supabase.from('locations').insert([newLocation]).select();
    if (error) {
      setError(error.message);
    } else if (data) {
      setSuccess('Location added successfully.');
      onLocationAdded(data[0]);
      setNewLocation({
        store_id: '',
        store_name: '',
        city: '',
        state: '',
        zip: '',
      });
    }
  };

  return (
    <Box sx={{ flex: 1 }}>
      <Typography component="h1" variant="h5">
        Add New Location
      </Typography>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAddLocation();
        }}
        noValidate
        sx={{ mt: 1 }}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          id="store_id"
          label="Store ID"
          name="store_id"
          autoFocus
          value={newLocation.store_id}
          onChange={handleInputChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="store_name"
          label="Store Name"
          name="store_name"
          value={newLocation.store_name}
          onChange={handleInputChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="city"
          label="City"
          name="city"
          value={newLocation.city}
          onChange={handleInputChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="state"
          label="State"
          name="state"
          value={newLocation.state}
          onChange={handleInputChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="zip"
          label="Zip"
          name="zip"
          value={newLocation.zip}
          onChange={handleInputChange}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Add Location
        </Button>
      </Box>
    </Box>
  );
}
