'use client';

import { useState, useEffect } from 'react';
import apiPost, { apiGet } from '@/lib/apiPost';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      const fetchUserLocations = async () => {
        setLoading(true);
        setError(null);
        try {
          // Get the access token for API calls
            try {
              const data = await apiGet<{ userLocations: Array<{ location_id: number }> }>(`/api/user-locations?userId=${selectedUser.id}`);
              setUserLocations(data.userLocations.map((ul) => ul.location_id));
            } catch (e) {
            console.error('Error fetching user locations:', e);
            setError('Failed to fetch user locations');
            setUserLocations([]);
          } finally {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user locations:', error);
          setError('Failed to fetch user locations');
          setUserLocations([]);
          setLoading(false);
        }
      };
      fetchUserLocations();
    } else {
      setUserLocations([]);
      setLoading(false);
    }
  }, [selectedUser]);

  const handleLocationChange = async (locationId: number, checked: boolean) => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      // Calculate new location IDs
      const newLocationIds = checked
        ? [...userLocations, locationId]
        : userLocations.filter(id => id !== locationId);

      try {
        await apiPost('/api/user-locations', { userId: selectedUser.id, locationIds: newLocationIds });
        setUserLocations(newLocationIds);
        setError(null);
      } catch (e) {
        console.error('Error updating user locations:', e);
        setError('Failed to update user locations');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating user locations:', error);
      setError('Failed to update user locations');
      setLoading(false);
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
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormGroup>
              {locations.map((location) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={userLocations.includes(location.id)}
                      onChange={(e) =>
                        handleLocationChange(location.id, e.target.checked)
                      }
                      disabled={loading}
                    />
                  }
                  label={`${location.store_id} - ${location.store_name}`}
                  key={location.id}
                />
              ))}
            </FormGroup>
          )}
        </>
      ) : (
        <Typography variant="h6">
          Select a user to manage their locations
        </Typography>
      )}
    </Box>
  );
}
