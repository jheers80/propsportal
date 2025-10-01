'use client';

import { useState } from 'react';
import apiPost from '@/lib/apiPost';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
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
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewLocation((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLocation = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await apiPost<{ location: Location }>('/api/locations', {
        store_name: newLocation.store_name,
        store_id: newLocation.store_id,
        address: '', // Address is not in the form, so we'll leave it empty
        city: newLocation.city,
        state: newLocation.state,
        zip: newLocation.zip,
      });
      setSuccess('Location added successfully.');
      onLocationAdded({
        id: data.location.id,
        store_id: data.location.store_id,
        store_name: data.location.store_name,
        city: data.location.city,
        state: data.location.state,
        zip: data.location.zip,
      });
      setNewLocation({
        store_id: '',
        store_name: '',
        city: '',
        state: '',
        zip: '',
      });
      setLoading(false);
    } catch (error) {
      console.error('Error adding location:', error);
      setError('An unexpected error occurred');
      setLoading(false);
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
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Add Location'}
        </Button>
      </Box>
    </Box>
  );
}
