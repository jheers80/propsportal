"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/apiPost';
import logger from '@/lib/logger';
import './tasks.css';
import { useUser } from '@/hooks/useUser';
import { Card, CardActionArea, CardContent, Typography, Box, Stack, Button, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Breadcrumbs } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ListAltIcon from '@mui/icons-material/ListAlt';

export default function ListSelection({ locationId }: { locationId: string }) {
  const router = useRouter();
  // sanitize incoming locationId (strip URL fragments like '#')
  const cleanLocationId = typeof locationId === 'string' ? String(locationId).split('#')[0].trim() : String(locationId || '').trim();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | Error>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Create-list UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');

  // Determine a client-side role name if exposed by useUser (window.__USER_PROFILE__)
  const clientProfile = typeof window !== 'undefined' ? (window as any).__USER_PROFILE__ : null;
  const clientRoleName = clientProfile ? (clientProfile.role || null) : null;
  // also get authoritative location membership from hook
  const { locations: userLocations, loading: userLoading } = useUser();

  const isAssignedToLocation = (() => {
    try {
      if (!userLocations || userLocations.length === 0) return false;
      return userLocations.some((l: any) => String(l.id) === String(cleanLocationId));
    } catch {
      return false;
    }
  })();

  // Attempt to show a friendly location name if the app exposes it globally; otherwise fall back to id
  const locationDisplayName = typeof window !== 'undefined' && (window as any).__SELECTED_LOCATION__ && (window as any).__SELECTED_LOCATION__.name
    ? (window as any).__SELECTED_LOCATION__.name
    : cleanLocationId || 'Location';

  // Breadcrumb trail (rendered by page container)
  const breadcrumbTrail = [
    { label: 'Tasks', href: '/tasks' },
    { label: locationDisplayName }
  ];

  useEffect(() => {
    let mounted = true;
    async function load() {
      // Immediately reset lists and selection to show loading state right away
      setLists([]);
      setSelectedListId(null);
      setError(null);
      setLoading(true);

      try {
        const res = await apiGet<unknown>(`/api/locations/${cleanLocationId}/lists`);
        if (!mounted) return;
        const shaped = res && typeof res === 'object' && (res as any).lists ? (res as any) : { lists: Array.isArray(res) ? res : [] };
        let fetched = Array.isArray(shaped.lists) ? shaped.lists : [];
        // Defensive filter: ensure items have location_id matching the selected location
        try {
          fetched = fetched.filter((it: any) => String((it && (it.location_id ?? it.locationId) || '')).split('#')[0].trim() === String(cleanLocationId));
        } catch (e) {
          // ignore and fall back to returned data
        }
        setLists(fetched as any[]);
        // auto-select first if only one
        if (fetched.length === 1) setSelectedListId(String(fetched[0].id));
      } catch (e: unknown) {
        logger.error('Failed to load lists', e);
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (cleanLocationId) load();
    return () => { mounted = false; };
  }, [locationId]);

  if (!cleanLocationId) return <div>Select a location</div>;
  if (error) return <div>Error loading lists</div>;

  async function handleCreate() {
    setCreateError(null);
    if (!newName || !newName.trim()) {
      setCreateError('Name is required');
      return;
    }
    setCreating(true);
    try {
  const payload = { name: newName.trim(), description: newDesc.trim(), location_id: cleanLocationId };
      // Call server API which enforces role checks and location assignment
      await apiPost('/api/task-lists', payload);
      // Refresh lists
  const refreshed = await apiGet<unknown>(`/api/locations/${cleanLocationId}/lists`);
      const shaped = refreshed && typeof refreshed === 'object' && (refreshed as any).lists ? (refreshed as any) : { lists: Array.isArray(refreshed) ? refreshed : [] };
      let refreshedLists = Array.isArray(shaped.lists) ? shaped.lists : [];
      try {
        refreshedLists = refreshedLists.filter((it: any) => String((it && (it.location_id ?? it.locationId) || '')).split('#')[0].trim() === String(cleanLocationId));
      } catch (e) {}
      setLists(refreshedLists);
      // auto-select created list when possible (match by name)
      const created = refreshedLists.find((r: any) => r.name === newName.trim());
      if (created) setSelectedListId(String(created.id));
      setCreateOpen(false);
      setNewName(''); setNewDesc('');
      setSnackbarMsg('Task list created');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (e: unknown) {
      logger.error('Create task list failed', e);
      setCreateError(e instanceof Error ? e.message : String(e));
      setSnackbarMsg(e instanceof Error ? e.message : String(e));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setCreating(false);
    }
  }

  // Determine whether to show the create button: only if assigned to location or clientRoleName hint
  // Server still enforces the check; this is purely UX to avoid offering impossible actions.
  const canCreate = isAssignedToLocation || !!clientRoleName;

  function selectList(id: string) {
    setSelectedListId((prev) => (prev === id ? null : id));
  }

  function handleContinue() {
    if (!selectedListId) return;
    router.push(`/tasks/locations/${cleanLocationId}/lists/${selectedListId}`);
  }

  return (
    <div className="list-selection">
      {/* Breadcrumb is rendered by the page container to avoid duplicates */}

      <Box sx={{ maxWidth: 720, margin: '8px auto' }}>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 22, color: (theme) => (theme.palette as any).tp.accent, fontFamily: 'Arial, Helvetica, sans-serif' }}>TASK LISTS</Typography>
          <Typography sx={{ fontWeight: 700, mt: 0.5 }}>CREATE OR SELECT A LIST TO CONTINUE</Typography>
        </Box>
        <Box sx={{ maxWidth: 720, mx: 'auto', mt: 1, mb: 2, background: (theme) => (theme.palette as any).tp.cardBg, p: 2, borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>How to use task lists</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>1) Select a task list and click CONTINUE to open it. 2) When you open a list you can check it out to lock it for editing. 3) Toggle item checkboxes to mark items locally, then press "Update Completions" inside the list to sync changes to the server.</Typography>
          <Typography variant="caption" color="text.secondary">Note: Checking out a list prevents others from editing while you make changes. If you are assigned to the location you will be able to check out and update.</Typography>
        </Box>
        {loading ? (
          // show a few skeleton cards while loading
          <Stack spacing={2}>
        {[1, 2, 3].map((n) => (
          <Card key={n} sx={{ borderRadius: 2, background: (theme) => (theme.palette as any).tp.cardBg }}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2.5 }}>
                  <Skeleton variant="rectangular" width={64} height={64} sx={{ borderRadius: 1 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="40%" />
                    <Skeleton width="60%" />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : lists.length === 0 ? (
          <Box sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>No lists available for this location.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Create a new task list to get started.</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ backgroundColor: (theme) => (theme.palette as any).tp.accent, color: '#fff' }}>Create New List for this Location</Button>
          </Box>
        ) : (
          <Stack spacing={3}>
            {lists.map((l) => (
              <Card
                key={l.id}
                sx={{
                  borderRadius: 3,
                  background: (theme) => (theme.palette as any).tp.cardBg,
                  boxShadow: selectedListId === String(l.id) ? '0 12px 28px rgba(0,0,0,0.12)' : '0 3px 8px rgba(0,0,0,0.04)',
                  borderStyle: 'solid',
                  borderWidth: selectedListId === String(l.id) ? 2 : 1,
                  borderColor: selectedListId === String(l.id) ? (theme: any) => (theme.palette as any).tp.accent : 'rgba(0,0,0,0.06)',
                  overflow: 'hidden'
                }}
                onClick={() => selectList(String(l.id))}
              >
                <CardActionArea>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2.5 }}>
                      <Box sx={{ width: 72, height: 72, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.02)' }}>
                      <ListAltIcon fontSize="large" sx={{ color: (theme) => (theme.palette as any).tp.accent }} />
                    </Box>

                    <Box sx={{ flex: 1, textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 18, color: (theme) => (theme.palette as any).tp.accent, fontFamily: 'Arial, Helvetica, sans-serif' }}>{l.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{l.description || ''}</Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-start" sx={{ mt: 4, gap: 2 }}>
            <Button
            variant="outlined"
            startIcon={<ArrowForwardIcon />}
            className="continue-btn"
            disabled={!selectedListId}
            onClick={handleContinue}
            sx={{
              borderColor: (theme) => (theme.palette as any).tp.accent,
              color: (theme) => (theme.palette as any).tp.accent,
              textTransform: 'uppercase',
              fontWeight: 700,
              px: 3
            }}
          >
            CONTINUE
          </Button>

          {canCreate && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                borderColor: (theme) => (theme.palette as any).tp.accent,
                color: (theme) => (theme.palette as any).tp.accent,
                textTransform: 'none',
                fontWeight: 600,
                px: 2
              }}
            >
              Create New List
            </Button>
          )}
        </Stack>
      </Box>

  <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Task List</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required fullWidth />
            <TextField label="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} multiline rows={3} fullWidth />
            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating} variant="contained">{creating ? 'Creating...' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}
