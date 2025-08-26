'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { supabase } from '@/lib/supabaseClient';

interface Location {
  id: number;
  store_name: string;
}

export default function PassphraseManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [generatedPassphrase, setGeneratedPassphrase] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from('locations').select('id, store_name');
      if (error) {
        setError('Failed to fetch locations.');
      } else {
        setLocations(data);
      }
    };
    fetchLocations();
  }, []);

  const handleGenerate = async () => {
    if (!selectedLocation) {
      setError('Please select a location.');
      return;
    }
    setLoading(true);
    setError(null);
    setGeneratedPassphrase('');

    try {
      // In a real app, you'd call a serverless function to generate a secure passphrase
      // and store its hash. For now, we'll simulate it.
      const words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape'];
      const passphrase = [1, 2, 3].map(() => words[Math.floor(Math.random() * words.length)]).join('-');
      
      setGeneratedPassphrase(passphrase);

    } catch (e) {
      setError('Failed to generate passphrase.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (event: SelectChangeEvent<string>) => {
    setSelectedLocation(event.target.value);
  };

  return (
    <Card>
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="location-select-label">Location</InputLabel>
          <Select
            labelId="location-select-label"
            id="location-select"
            value={selectedLocation}
            label="Location"
            onChange={handleLocationChange}
            disabled={loading}
          >
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id.toString()}>
                {loc.store_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading || !selectedLocation}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : 'Generate Passphrase'}
        </Button>
        {generatedPassphrase && (
          <Box sx={{ mt: 3, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
            <Typography variant="h6" align="center">
              Your new passphrase is:
            </Typography>
            <Typography variant="h4" align="center" sx={{ mt: 1, color: 'primary.main' }}>
              {generatedPassphrase}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
