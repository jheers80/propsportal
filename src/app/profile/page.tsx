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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import { getSessionToken } from '@/lib/supabaseClient';
import apiPost, { apiDelete } from '@/lib/apiPost';

const getRoleDisplayName = (role: string | number | undefined): string => {
  const roleMap: { [key: number]: string } = {
    1: 'Super Admin',
    2: 'Multi-Unit Manager',
    3: 'Manager',
    4: 'Staff',
    5: 'Quick Access',
  };
  if (typeof role === 'number' && role in roleMap) {
    return roleMap[role];
  }
  if (typeof role === 'string') {
    // Handle string roles like 'superadmin'
    if (role === 'superadmin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
  return 'Unknown';
};

export default function ProfilePage() {
  const { user, profile, locations, loading, error, setProfile, refreshLocations } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [unlinkDialog, setUnlinkDialog] = useState<{ open: boolean; locationId: number | null; locationName: string }>({
    open: false,
    locationId: null,
    locationName: '',
  });
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setIsSuperAdmin(profile.role == 1 || profile.role === 'superadmin');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setFeedback(null);
    try {
      try {
  const data = await apiPost<{ profile: { id: string; role: number | string; created_at: string; full_name: string } }>('/api/auth/profile', { full_name: fullName });
  setProfile(data.profile);
      } catch (e: any) {
        setFeedback({ type: 'error', message: e?.message || 'Failed to update profile' });
        setSaving(false);
        return;
      }
      setEditMode(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
      setSaving(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
      setSaving(false);
    }
  };

  const handleUnlinkLocation = (locationId: number, locationName: string) => {
    setUnlinkDialog({
      open: true,
      locationId,
      locationName,
    });
  };

  const confirmUnlinkLocation = async () => {
    if (!unlinkDialog.locationId) return;

    setUnlinking(true);
    setFeedback(null);
    
    try {
      try {
        await apiDelete('/api/unlink-location', { locationId: unlinkDialog.locationId });
        // Refresh locations after successful unlink
        await refreshLocations();
      } catch (e: any) {
        setFeedback({ type: 'error', message: e?.message || 'Failed to unlink location' });
        return;
      }
      setFeedback({ type: 'success', message: 'Location unlinked successfully.' });
      setUnlinkDialog({ open: false, locationId: null, locationName: '' });
    } catch (error) {
      console.error('Error unlinking location:', error);
      setFeedback({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setUnlinking(false);
    }
  };

  const cancelUnlinkLocation = () => {
    setUnlinkDialog({ open: false, locationId: null, locationName: '' });
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
              Error loading profile: {error instanceof Error ? error.message : String(error)}
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
                      <IconButton onClick={handleSave} color="primary" disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : <SaveIcon />}
                      </IconButton>
                      <IconButton onClick={() => setEditMode(false)} color="secondary" disabled={saving}>
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

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Email
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Role
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {getRoleDisplayName(profile.role)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Assigned Locations
                  </Typography>
                  <Button variant='outlined' href="/link-location" sx={{mb: 2}}>Link A Location</Button>
                  {locations.length > 0 ? (
                    <List>
                      {locations.map((location) => (
                        <ListItem 
                          key={location.id} 
                          secondaryAction={
                            !isSuperAdmin ? (
                              <IconButton 
                                edge="end" 
                                aria-label="delete" 
                                onClick={() => handleUnlinkLocation(location.id, location.store_name)}
                                color="error"
                                disabled={unlinking}
                              >
                                <DeleteIcon />
                              </IconButton>
                            ) : null
                          }
                        >
                          <ListItemText 
                            primary={location.store_name}
                            secondary={isSuperAdmin ? "Super Admin access to all locations" : "Linked via passphrase"}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No locations assigned.</Typography>
                  )}
                </Box>

                {isSuperAdmin && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Admin: Role Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
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

      {/* Unlink Location Confirmation Dialog */}
      <Dialog
        open={unlinkDialog.open}
        onClose={cancelUnlinkLocation}
        aria-labelledby="unlink-dialog-title"
        aria-describedby="unlink-dialog-description"
      >
        <DialogTitle id="unlink-dialog-title">
          Unlink Location
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="unlink-dialog-description">
            Are you sure you want to unlink "{unlinkDialog.locationName}"? You will no longer have access to this location unless you link it again with a valid passphrase.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelUnlinkLocation} disabled={unlinking}>
            Cancel
          </Button>
          <Button onClick={confirmUnlinkLocation} color="error" disabled={unlinking}>
            {unlinking ? <CircularProgress size={20} /> : 'Unlink'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
