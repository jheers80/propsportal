'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Box,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import AddUserForm from '@/components/AddUserForm';
import UsersList from '@/components/UsersList';
import UserLocationsManager from '@/components/UserLocationsManager';

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

export default function AdminUsersPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [users, setUsers] = useState<Profile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name');
      if (usersError) {
        setError(usersError.message);
      } else {
        setUsers(usersData);
      }

      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, store_id, store_name');
      if (locationsError) {
        setError(locationsError.message);
      } else {
        setLocations(locationsData);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (permissionsLoading || loading) {
    return <p>Loading...</p>;
  }

  if (!permissions.includes('users.create')) {
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

  const handleUserAdded = (user: Profile) => {
    setUsers((prev) => [...prev, user]);
  };

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
      <UsersList users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
      <Divider orientation="vertical" flexItem />
     {/* <UserLocationsManager selectedUser={selectedUser} locations={locations} /> 
      <Divider orientation="vertical" flexItem />*/}
      <AddUserForm onUserAdded={handleUserAdded} />
    </Box>
  );
}
