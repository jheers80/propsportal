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
        try {
          // Get the access token for API calls
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            setError('Authentication required');
            return;
          }

          const response = await fetch(`/api/user-locations?userId=${selectedUser.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to fetch user locations');
            setUserLocations([]);
            return;
          }

          const data = await response.json();
          setUserLocations(data.userLocations.map((ul: { location_id: number }) => ul.location_id));
        } catch (error) {
          console.error('Error fetching user locations:', error);
          setError('Failed to fetch user locations');
          setUserLocations([]);
        }
      };
      fetchUserLocations();
    }
  }, [selectedUser]);

  const handleLocationChange = async (locationId: number, checked: boolean) => {
    if (!selectedUser) return;

    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        return;
      }

      // Calculate new location IDs
      const newLocationIds = checked
        ? [...userLocations, locationId]
        : userLocations.filter(id => id !== locationId);

      const response = await fetch('/api/user-locations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          locationIds: newLocationIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user locations');
        return;
      }

      setUserLocations(newLocationIds);
      setError(null);
    } catch (error) {
      console.error('Error updating user locations:', error);
      setError('Failed to update user locations');
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
