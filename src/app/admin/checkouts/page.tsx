"use client";
import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/apiPost';
import { Box, Button, Typography, Stack, Paper, Divider, CircularProgress, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

type CheckoutRow = {
  task_list_id: string;
  task_list_name?: string | null;
  user_id: string;
  checked_out_at: string;
  user?: { id?: string; full_name?: string; email?: string } | null;
};

export default function AdminCheckoutsPage() {
  const [loading, setLoading] = useState(true);
  const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success'|'info'|'warning'|'error'>('success');

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet(`/api/admin/checkouts?page=${page}&per_page=${perPage}`);
      const cres = res as any;
      if (cres && cres.checkouts) {
        setCheckouts(cres.checkouts as CheckoutRow[]);
        setTotalPages(cres.meta?.total_pages || 1);
      }
      else setCheckouts([]);
    } catch (e: any) {
      setSnackMsg(e?.message || String(e)); setSnackSeverity('error'); setSnackOpen(true);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [page, perPage]);

  async function forceRelease(taskListId: string) {
    setProcessing((s) => ({ ...s, [taskListId]: true }));
    try {
      const res = await apiPost('/api/admin/checkouts', { task_list_id: taskListId });
      const cres = res as any;
      if (cres && cres.success) {
        setSnackMsg('Released checkout'); setSnackSeverity('success'); setSnackOpen(true);
        await load();
      } else {
        setSnackMsg('Failed to release'); setSnackSeverity('warning'); setSnackOpen(true);
      }
    } catch (e: any) {
      setSnackMsg(e?.message || String(e)); setSnackSeverity('error'); setSnackOpen(true);
    } finally { setProcessing((s) => { const c = { ...s }; delete c[taskListId]; return c; }); }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Active Checkouts</Typography>
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : checkouts.length === 0 ? (
          <Typography>No active checkouts</Typography>
        ) : (
          <Stack spacing={2}>
            {checkouts.map((c) => (
              <Box key={c.task_list_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{c.task_list_name || c.task_list_id}</Typography>
                  <Typography variant="body2" color="text.secondary">Checked out by: {c.user?.full_name || c.user?.email || c.user_id} — {new Date(c.checked_out_at).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Button variant="contained" color="error" onClick={() => forceRelease(c.task_list_id)} disabled={!!processing[c.task_list_id]}>
                    {processing[c.task_list_id] ? 'Releasing…' : 'Force Release'}
                  </Button>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box>
            <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="per-page-label">Per page</InputLabel>
              <Select labelId="per-page-label" value={String(perPage)} label="Per page" onChange={(e: SelectChangeEvent<string>) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption">Page {page} of {totalPages}</Typography>
          </Box>
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}>
        <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  );
}
