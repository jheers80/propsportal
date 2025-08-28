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
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { supabase } from '@/lib/supabaseClient';

interface Location {
  id: number;
  store_name: string;
  store_id?: string;
}

interface ListedPassphrase {
  location_id: number;
  passphrase: string;
  created_at: string;
  locations: { id: number; store_id: string; store_name: string };
}

export default function PassphraseManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [generatedPassphrase, setGeneratedPassphrase] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<ListedPassphrase[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const refreshList = async () => {
    setListLoading(true);
    const res = await fetch('/api/passphrases/list');
    const data = await res.json();
    if (res.ok) {
      setList(data.passphrases || []);
    }
    setListLoading(false);
  };

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from('locations').select('id, store_name, store_id');
      if (error) {
        setError('Failed to fetch locations.');
      } else {
        setLocations(data);
      }
    };
    fetchLocations();
    refreshList();
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
      const res = await fetch('/api/passphrases/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: Number(selectedLocation) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setGeneratedPassphrase(data.passphrase);
      await refreshList();
  } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to generate passphrase.');
      }
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
                {loc.store_id ? `${loc.store_id} - ${loc.store_name}` : loc.store_name}
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
              New passphrase:
            </Typography>
            <Typography variant="h4" align="center" sx={{ mt: 1, color: 'primary.main' }}>
              {generatedPassphrase}
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>Current Passphrases You Can View</Typography>
        {listLoading ? (
          <CircularProgress />
        ) : (
          <List>
            {list.map((p) => (
              <ListItem key={p.location_id} divider>
                <ListItemText
                  primary={`${p.locations.store_id} - ${p.locations.store_name}`}
                  secondary={`Passphrase: ${p.passphrase} • Updated: ${new Date(p.created_at).toLocaleString()}`}
                />
              </ListItem>
            ))}
            {list.length === 0 && (
              <Typography color="text.secondary">No passphrases available.</Typography>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
