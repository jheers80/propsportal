'use client';
import React, { useEffect, useState } from 'react';
import { TextField, Button, Select, MenuItem, Checkbox, ListItemText, FormControl, InputLabel, OutlinedInput, Typography, Box, Switch } from '@mui/material';
import apiPost, { apiGet } from '@/lib/apiPost';
import { materialIcons } from '@/lib/materialIcons';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

    type UserRole = {
      id: number;
      name: string;
      display_name: string;
      description: string;
    };

    type Feature = {
  id?: string;
  name: string;
  link: string;
  icon: string;
  description: string;
  roles: string[];
  new_tab?: boolean;
  created_at?: string;
    };

    const emptyFeature: Feature = {
  name: '',
  link: '',
  icon: '',
  description: '',
  roles: [],
  new_tab: false,
    };


export default function FeaturesAdminPage() {
  const { loading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [form, setForm] = useState<Feature>(emptyFeature);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rolesList, setRolesList] = useState<UserRole[]>([]);

  useEffect(() => {
    fetchFeatures();
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      const data = await apiGet<{ roles?: UserRole[] }>('/api/admin/features');
      setRolesList(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }

  async function fetchFeatures() {
    setLoading(true);
    try {
      const data = await apiGet<{ features?: Feature[] }>('/api/admin/features');
      setFeatures(data.features || []);
    } catch (err) {
      console.error('Error fetching features:', err);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const action = editingId ? 'update' : 'create';
      const requestBody = { action, ...form } as any;
      if (editingId) requestBody.id = editingId;
      await apiPost('/api/admin/features', requestBody);

      setForm(emptyFeature);
      setEditingId(null);
      await fetchFeatures();
    } catch (error) {
      console.error('Error submitting feature:', error);
    }
    setLoading(false);
  }

  function handleEdit(feature: Feature) {
    setForm(feature);
    setEditingId(feature.id || null);
  }

  async function handleDelete(id: string) {
    setLoading(true);

    try {
      await apiPost('/api/admin/features', { action: 'delete', id });
      await fetchFeatures();
    } catch (error) {
      console.error('Error deleting feature:', error);
    }
    setLoading(false);
  }

  if (authLoading || permissionsLoading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Manage Portal Features</Typography>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <TextField label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required fullWidth margin="normal" />
        <TextField label="Link" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} required fullWidth margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>Icon</InputLabel>
          <Select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value as string })} input={<OutlinedInput label="Icon" />} required>
            {materialIcons.map((icon: string) => (
              <MenuItem key={icon} value={icon}>{icon}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth margin="normal" />
        <FormControl fullWidth margin="normal">
          <InputLabel>Roles</InputLabel>
          <Select multiple value={form.roles} onChange={e => setForm({ ...form, roles: e.target.value as string[] })} input={<OutlinedInput label="Roles" />} renderValue={selected => (selected as string[]).join(', ')}>
            {rolesList.map((role: UserRole) => (
              <MenuItem key={role.name} value={role.name}>
                <Checkbox checked={form.roles.indexOf(role.name) > -1} />
                <ListItemText primary={role.display_name} secondary={role.description} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {/* Use MUI Slider for modern toggle, fallback to Checkbox if Slider is unavailable */}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography sx={{ mr: 2 }}>Open in new window</Typography>
              <Switch
                checked={!!form.new_tab}
                onChange={e => setForm({ ...form, new_tab: e.target.checked })}
                inputProps={{ 'aria-label': 'Open in new window' }}
              />
            </Box>
          </Box>
        </FormControl>
        {permissions.includes('features.create') && (
          <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ mt: 2 }}>{editingId ? 'Update' : 'Add'} Feature</Button>
        )}
        {editingId && <Button onClick={() => { setForm(emptyFeature); setEditingId(null); }} sx={{ mt: 2, ml: 2 }}>Cancel</Button>}
      </form>
      <Box>
        {features.map((feature: Feature) => (
          <Box key={feature.id} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
            <Typography variant="h6">{feature.name}</Typography>
            <Typography variant="body2">{feature.description}</Typography>
            <Typography variant="body2">Link: {feature.link}</Typography>
            <Typography variant="body2">Icon: {feature.icon}</Typography>
            <Typography variant="body2">Roles: {feature.roles.join(', ')}</Typography>
            <Typography variant="body2">Open in new window: {feature.new_tab ? 'Yes' : 'No'}</Typography>
            <Button onClick={() => handleEdit(feature)} sx={{ mr: 2 }}>Edit</Button>
            <Button onClick={() => handleDelete(feature.id!)} color="error">Delete</Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
