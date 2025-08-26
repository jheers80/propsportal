'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';

type Profile = {
  id: string;
  email: string;
  full_name: string;
};

type Location = {
  id: number;
  store_id: string;
  store_name: string;
};

interface UserLocationsManagerProps {
    selectedUser: Profile | null;
    locations: Location[];
}

export default function UserLocationsManager({ selectedUser, locations }: UserLocationsManagerProps) {
  const [userLocations, setUserLocations] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedUser) {
      const fetchUserLocations = async () => {
        const { data, error } = await supabase
          .from('user_locations')
          .select('location_id')
          .eq('user_id', selectedUser.id);

        if (error) {
          setError(error.message);
          setUserLocations([]);
        } else {
          setUserLocations(data.map((ul) => ul.location_id));
        }
      };
      fetchUserLocations();
    }
  }, [selectedUser]);

  const handleLocationChange = async (locationId: number, checked: boolean) => {
    if (!selectedUser) return;

    if (checked) {
      const { error } = await supabase
        .from('user_locations')
        .insert([{ user_id: selectedUser.id, location_id: locationId }]);
      if (error) {
        setError(error.message);
      } else {
        setUserLocations((prev) => [...prev, locationId]);
      }
    } else {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .match({ user_id: selectedUser.id, location_id: locationId });
      if (error) {
        setError(error.message);
      } else {
        setUserLocations((prev) => prev.filter((id) => id !== locationId));
      }
    }
  };

  return (
    <Box sx={{ flex: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {selectedUser ? (
        <>
          <Typography component="h1" variant="h5">
            Manage Locations for {selectedUser.email}
          </Typography>
          <FormGroup>
            {locations.map((location) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={userLocations.includes(location.id)}
                    onChange={(e) =>
                      handleLocationChange(location.id, e.target.checked)
                    }
                  />
                }
                label={`${location.store_id} - ${location.store_name}`}
                key={location.id}
              />
            ))}
          </FormGroup>
        </>
      ) : (
        <Typography variant="h6">
          Select a user to manage their locations
        </Typography>
      )}
    </Box>
  );
}
