'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Box,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import AddUserForm from '@/components/AddUserForm';
import UsersList from '@/components/UsersList';
{/* import UserLocationsManager from '@/components/UserLocationsManager';*/}

type AdminProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

type Location = {
  id: number;
  store_id: string;
  store_name: string;
};

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get the access token for API calls
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Fetch users from API
        const usersResponse = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!usersResponse.ok) {
          const errorData = await usersResponse.json();
          setError(errorData.error || 'Failed to fetch users');
        } else {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }

        // Fetch locations from API
        const locationsResponse = await fetch('/api/locations', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!locationsResponse.ok) {
          const errorData = await locationsResponse.json();
          setError(errorData.error || 'Failed to fetch locations');
        } else {
          const locationsData = await locationsResponse.json();
          setLocations(locationsData.locations || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Only return after all hooks are called
  if (permissionsLoading || loading) {
    return <p>Loading...</p>;
  }

  if (!permissions.includes('users.view')) {
    return (
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Unauthorized
        </Typography>
        <p>You are not authorized to view this page.</p>
      </Box>
    );
  }

  const handleUserAdded = async (newUser: { id: string; email: string; full_name: string }) => {
    // Fetch the complete profile data from the database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, created_at, full_name')
      .eq('id', newUser.id)
      .single();

    if (!profileError && profileData) {
      const completeUser: AdminProfile = {
        ...profileData,
        email: newUser.email,
      };
      setUsers((prev) => [...prev, completeUser]);
    }
  };

  const handleSelectUser = (user: { id: string; email: string; full_name: string }) => {
    // Find the full user data from our users array
    const fullUser = users.find(u => u.id === user.id);
    setSelectedUser(fullUser || null);
  };

  // Convert AdminProfile[] to the format expected by UsersList
  const usersListFormat = users.map(user => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name
  }));

  const selectedUserListFormat = selectedUser ? {
    id: selectedUser.id,
    email: selectedUser.email,
    full_name: selectedUser.full_name
  } : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 4,
        p: 2,
      }}
    >
      {error && <Alert severity="error">{error}</Alert>}
      <UsersList users={usersListFormat} selectedUser={selectedUserListFormat} onSelectUser={handleSelectUser} />
      <Divider orientation="vertical" flexItem />
     {/* <UserLocationsManager selectedUser={selectedUser} locations={locations} /> 
      <Divider orientation="vertical" flexItem />*/}
      <AddUserForm onUserAdded={handleUserAdded} />
    </Box>
  );
}
