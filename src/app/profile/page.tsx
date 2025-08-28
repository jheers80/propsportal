'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, locations, loading, error, setProfile } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setIsSuperAdmin(profile.role === 'superadmin');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      setFeedback({ type: 'error', message: 'Failed to update profile.' });
    } else {
      setProfile(data);
      setEditMode(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    }
  };

  return (
    <>
      <Navbar />
      <Container component="main" maxWidth="md">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            User Profile
          </Typography>

          {feedback && (
            <Alert severity={feedback.type} sx={{ mb: 2 }}>
              {feedback.message}
            </Alert>
          )}

          {loading ? (
            <CircularProgress />
          ) : error ? (
            <Typography color="error">
              Error loading profile: {error.message}
            </Typography>
          ) : user && profile ? (
            <Card sx={{ width: '100%', mt: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {editMode ? (
                    <>
                      <TextField
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ flexGrow: 1 }}
                      />
                      <IconButton onClick={handleSave} color="primary">
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={() => setEditMode(false)} color="secondary">
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                        {profile.full_name}
                      </Typography>
                      <IconButton onClick={() => setEditMode(true)} color="primary">
                        <EditIcon />
                      </IconButton>
                    </>
                  )}
                </Box>

                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  Email: {user.email}
                </Typography>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  Role: {profile.role}
                </Typography>

                <Typography variant="h6" sx={{ mt: 4 }}>
                  Assigned Locations
                </Typography>
                <Button variant='outlined' href="/link-location" sx={{m:2}}>Link A Location</Button>
                {locations.length > 0 ? (
                  <List>
                    {locations.map((location) => (
                      <ListItem key={location.id}>
                        <ListItemText primary={location.store_name} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography>No locations assigned.</Typography>
                )}

                {isSuperAdmin && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6">Admin: Role Management</Typography>
                    {/* Role editor component will go here */}
                    <Typography>
                      Role editing functionality is available for Super Admins.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Typography>Could not load profile.</Typography>
          )}
        </Box>
      </Container>
    </>
  );
}
