'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useUser } from '@/hooks/useUser';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  
} from '@mui/material';
import { Assignment, LocationOn, ListAlt } from '@mui/icons-material';
import { fetchTaskLists } from '@/services/taskListService';
import * as taskService from '@/services/taskService';
import { apiPost } from '@/lib/apiPost';
import logger from '@/lib/logger';
import type { SelectChangeEvent } from '@mui/material';

// Types for tasks UI
type TaskList = { id: number | string; name: string; location_id?: number };
type TaskCompletion = { id: number; completed_by?: string; completed_at?: string };
type TaskInstance = { id: number; due_date?: string; status: 'pending' | 'completed' | string; task_completions?: TaskCompletion[] };
type Task = { id: number | string; title?: string; name?: string; description?: string; is_recurring?: boolean; repeat_from_completion?: boolean; task_instances?: TaskInstance[] };

const TasksPage = () => {
  const router = useRouter();
  const { user, /* profile, */ locations, loading: userLoading, refreshLocations } = useUser();

  const [selectedLocation, setSelectedLocation] = useState<number | ''>('');
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string | ''>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  // intentionally not using setters yet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hideCompleted, _setHideCompleted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [upcomingOnly, _setUpcomingOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [step, setStep] = useState<'selectLocation' | 'manageLists' | 'viewTasks'>('selectLocation');

  // Initialize locations selection when locations load
  useEffect(() => {
    if (!userLoading) {
      if (locations && locations.length === 1) {
        // auto-select single location
        setSelectedLocation(locations[0].id);
        // if only one location, proceed to managing lists automatically
        setStep('manageLists');
      }
      // if multiple locations, require explicit selection (leave as '')
    }
  }, [userLoading, locations, step]);

  // Load task lists when a location is selected
  useEffect(() => {
    if (!selectedLocation) {
      setTaskLists([]);
      setSelectedTaskList('');
      return;
    }

    let mounted = true;
    const loadTaskLists = async () => {
      setLoading(true);
      setError(null);
      try {
  const res = await fetchTaskLists(selectedLocation) as unknown;
  const lists = Array.isArray(res) ? (res as TaskList[]) : ((res as { data?: TaskList[] })?.data || []);
        if (!lists) throw new Error('Failed to load task lists');
        if (!mounted) return;
        setTaskLists(lists || []);
        if (lists && lists.length > 0) {
          const firstId = lists[0].id;
          setSelectedTaskList(typeof firstId === 'number' ? String(firstId) : (firstId || ''));
        } else {
          setSelectedTaskList('');
        }
        // after lists load, if we are on manageLists step, move to viewTasks so tasks will show
        if (step === 'manageLists') {
          setStep('viewTasks');
        }
      } catch (e: any) {
        logger.error('Error loading task lists', e);
        if (mounted) setError('Unable to load task lists');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadTaskLists();
    return () => { mounted = false; };
  }, [selectedLocation, step]);

  // Load tasks when selectedTaskList changes
  useEffect(() => {
    if (!selectedTaskList) return;
    let mounted = true;
    const loadTasks = async () => {
      setLoading(true);
      setError(null);
      try {
  const res = await taskService.fetchAllTasksInList(selectedTaskList as string) as unknown;
  const list = (res as { data?: Task[] } )?.data || [];
        if (!mounted) return;
        setTasks(list || []);
      } catch (e) {
        logger.error('Error loading tasks', e);
        if (mounted) setError('Unable to load tasks');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadTasks();
    return () => { mounted = false; };
  }, [selectedTaskList]);

  const onLocationChange = (e: SelectChangeEvent<number | ''>) => {
    setSelectedLocation(e.target.value as number);
  };

  const onTaskListChange = (e: SelectChangeEvent<string | ''>) => {
    setSelectedTaskList(e.target.value as string);
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper
          elevation={2}
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          }}
        >
          <Stack spacing={3} alignItems="center">
            <Assignment sx={{ fontSize: 72, color: 'primary.main' }} />

            <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main">
              Task Management
            </Typography>

            <Typography variant="body1" color="text.secondary" maxWidth={600}>
              Manage tasks for your selected location and task list. Use the selectors below to
              switch context if you have access to multiple locations.
            </Typography>

                {step === 'selectLocation' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ width: '100%', justifyContent: 'center' }}>
                <FormControl sx={{ minWidth: 300 }}>
                  <InputLabel id="location-select-label">Location</InputLabel>
                  <Select
                    labelId="location-select-label"
                    value={selectedLocation}
                    label="Location"
                    onChange={onLocationChange}
                  >
                    {locations && locations.length > 0 ? (
                      locations.map((loc) => (
                        <MenuItem key={loc.id} value={loc.id}>{loc.store_name}</MenuItem>
                      ))
                    ) : (
                      <MenuItem value="">No locations</MenuItem>
                    )}
                  </Select>
                </FormControl>

                <Button variant="contained" onClick={() => {
                  if (!selectedLocation) {
                    setError('Please select a location before continuing');
                    return;
                  }
                  setError(null);
                  setStep('manageLists');
                }}>Select Location</Button>

                <Button variant="outlined" startIcon={<ListAlt />} onClick={() => { refreshLocations(); }}>
                  Refresh Locations
                </Button>
              </Stack>
            )}

            {step !== 'selectLocation' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ width: '100%', justifyContent: 'center' }}>
                <Typography variant="body2" sx={{ mr: 2 }}>Location: {locations?.find((l:any) => l.id === selectedLocation)?.store_name || 'None'}</Typography>
                <Button variant="text" onClick={() => setStep('selectLocation')}>Change Location</Button>

                <FormControl sx={{ minWidth: 220 }}>
                  <InputLabel id="tasklist-select-label">Task List</InputLabel>
                  <Select
                    labelId="tasklist-select-label"
                    value={selectedTaskList}
                    label="Task List"
                    onChange={onTaskListChange}
                  >
                    {taskLists && taskLists.length > 0 ? (
                      taskLists.map((tl) => (
                        <MenuItem key={tl.id} value={tl.id}>{tl.name}</MenuItem>
                      ))
                    ) : (
                      <MenuItem value="">No task lists</MenuItem>
                    )}
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" onClick={() => {
                    // Only allow creating lists after a location is chosen
                    if (!selectedLocation) {
                      setError('Please select a location before creating a task list');
                      setStep('selectLocation');
                      return;
                    }
                    setCreateDialogOpen(true);
                  }}>New Task List</Button>
                </Stack>

                <Button variant="contained" startIcon={<ListAlt />} onClick={() => { refreshLocations(); }}>
                  Refresh Locations
                </Button>
              </Stack>
            )}

            <Box sx={{ width: '100%', mt: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Upcoming Tasks</Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Typography color="error">{error}</Typography>
                ) : tasks && tasks.length > 0 ? (
                  <List>
                    {tasks
                      .map((t) => ({
                        ...t,
                        // normalize instances: sort by due_date asc
                        task_instances: (t.task_instances || []).slice().sort((a: TaskInstance, b: TaskInstance) => {
                          const da = a?.due_date ? new Date(a.due_date).getTime() : 0;
                          const db = b?.due_date ? new Date(b.due_date).getTime() : 0;
                          return da - db;
                        })
                      }))
                      .filter((t) => {
                        if (!hideCompleted) return true;
                        // hide tasks that have any completed instance
                        const hasCompleted = (t.task_instances || []).some((inst) => inst.status === 'completed');
                        return !hasCompleted;
                      })
                      .filter((t) => {
                        if (!upcomingOnly) return true;
                        // show tasks that have a pending instance due in the future
                        const now = Date.now();
                        const upcoming = (t.task_instances || []).some((inst) => inst.status === 'pending' && inst.due_date && new Date(inst.due_date).getTime() > now);
                        return upcoming;
                      })
                      .map((t) => {
                        return (
                          <React.Fragment key={t.id}>
                            <ListItem sx={{ alignItems: 'flex-start' }}>
                              <ListItemText
                                primary={t.title || t.name || 'Untitled Task'}
                                secondary={
                                  <>
                                    <div>{t.description}</div>
                                    <div style={{ marginTop: 6 }}>
                                      {t.is_recurring ? <strong>Recurring</strong> : <em>One-time</em>} • {t.repeat_from_completion ? 'Repeat from completion' : 'Scheduled recurrence'}
                                    </div>
                                    <div style={{ marginTop: 6 }}>
                                      Instances:
                                      <ul>
                                        {(t.task_instances || []).map((inst) => (
                                          <li key={inst.id}>
                                            {inst.due_date ? new Date(inst.due_date).toLocaleString() : 'No due date'} — {inst.status}
                                            {inst.task_completions && inst.task_completions.length > 0 && (
                                              <div>Completed by {inst.task_completions[0].completed_by} at {inst.task_completions[0].completed_at ? new Date(inst.task_completions[0].completed_at).toLocaleString() : ''}</div>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </>
                                }
                              />
                              <Stack spacing={1}>
                                {/* actions: complete pending instance or uncomplete existing completion */}
                                {t.task_instances && t.task_instances.length > 0 && t.task_instances[0].status === 'pending' ? (
                                  <Button variant="contained" size="small" onClick={async () => {
                                    const inst = t.task_instances[0];
                                    if (!inst?.id || !user) return;
                                    setLoading(true);
                                    try {
                                      await apiPost('/api/task-instances/complete', { instance_id: inst.id });
                                      // refresh tasks
                                      const refreshed = await taskService.fetchAllTasksInList(selectedTaskList as string) as { data?: Task[] };
                                      setTasks(refreshed?.data || []);
                                      setSnackbarMessage('Task completed'); setSnackbarSeverity('success'); setSnackbarOpen(true);
                                    } catch (err) {
                                      const msg = err instanceof Error ? err.message : String(err);
                                      setSnackbarMessage(msg); setSnackbarSeverity('error'); setSnackbarOpen(true); setError(msg);
                                    } finally { setLoading(false); }
                                  }}>Complete</Button>
                                ) : (
                                  // show uncomplete button if there's a completion record on first instance
                                  (t.task_instances && t.task_instances[0] && t.task_instances[0].task_completions && t.task_instances[0].task_completions.length > 0) ? (
                                    <Button variant="outlined" size="small" onClick={async () => {
                                      const inst = t.task_instances[0];
                                      const comp = inst.task_completions?.[0];
                                      if (!inst?.id || !comp?.id) return;
                                      setLoading(true);
                                        try {
                                        await apiPost('/api/task-instances/uncomplete', { instance_id: inst.id, completion_id: comp.id });
                                        const refreshed = await taskService.fetchAllTasksInList(selectedTaskList as string) as { data?: Task[] };
                                        setTasks(refreshed?.data || []);
                                        setSnackbarMessage('Completion removed'); setSnackbarSeverity('success'); setSnackbarOpen(true);
                                      } catch (err) {
                                        const msg = err instanceof Error ? err.message : String(err);
                                        setSnackbarMessage(msg); setSnackbarSeverity('error'); setSnackbarOpen(true); setError(msg);
                                      } finally { setLoading(false); }
                                    }}>Remove Completion</Button>
                                  ) : null
                                )}
                              </Stack>
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        );
                      })}
                  </List>
                ) : (
                  <Typography color="text.secondary">No upcoming tasks for the selected list.</Typography>
                )}
              </Paper>
            </Box>

            <Stack direction="row" spacing={2} mt={2}>
              <Button variant="outlined" onClick={() => router.push('/portal') } startIcon={<LocationOn />}>Back to Portal</Button>
              <Button
                variant="contained"
                onClick={() => router.push(`/tasks/create?location=${selectedLocation}&taskList=${selectedTaskList}`)}
                disabled={!selectedTaskList}
              >
                Create Task
              </Button>
            </Stack>

              {/* Create Task List Dialog */}
              <Dialog open={createDialogOpen} onClose={() => { if (!creatingList) { setCreateDialogOpen(false); setNewListName(''); setNewListDesc(''); setCreateError(null); } }}>
                <DialogTitle>Create Task List</DialogTitle>
                <DialogContent>
                  <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
                    <TextField label="Name" value={newListName} onChange={(e) => setNewListName(e.target.value)} fullWidth required />
                    <TextField label="Description" value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)} fullWidth multiline rows={3} />
                    <Typography variant="body2" color="text.secondary">Location: {locations?.find((l: any) => l.id === selectedLocation)?.store_name || (selectedLocation ? selectedLocation : 'Global / none selected')}</Typography>
                    {createError && <Typography color="error">{createError}</Typography>}
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => { setCreateDialogOpen(false); setNewListName(''); setNewListDesc(''); setCreateError(null); }} disabled={creatingList}>Cancel</Button>
                      <Button variant="contained" onClick={async () => {
                    setCreateError(null);
                    if (!newListName.trim()) { setCreateError('Name is required'); return; }
                    setCreatingList(true);
                    try {
                      const payload: any = { name: newListName.trim() };
                      if (selectedLocation) payload.location_id = selectedLocation;
                      if (newListDesc.trim()) payload.description = newListDesc.trim();
                      // Call server-side API to create a task list (server resolves role_id)
                      const res = await apiPost<{ data?: TaskList[] } | TaskList>('/api/task-lists', payload);
                      // Refresh lists for the selected location and select the new one
                      const refreshed = await fetchTaskLists(selectedLocation) as unknown;
                      const lists = Array.isArray(refreshed) ? (refreshed as TaskList[]) : ((refreshed as { data?: TaskList[] })?.data || []);
                      setTaskLists(lists || []);
                      // If response included created data, try to select it
                      let created: TaskList | null = null;
                      if (Array.isArray(res)) created = res[0] as TaskList;
                      else if ((res as { data?: TaskList[] }).data) created = (res as { data?: TaskList[] }).data?.[0] || null;
                      const newId = created?.id || null;
                      if (newId) setSelectedTaskList(typeof newId === 'number' ? String(newId) : newId);
                      else if (lists && lists.length > 0) {
                        const fid = lists[0].id;
                        setSelectedTaskList(typeof fid === 'number' ? String(fid) : (fid || ''));
                      }

                      // show success snackbar
                      setSnackbarMessage('Task list created');
                      setSnackbarSeverity('success');
                      setSnackbarOpen(true);

                      setCreateDialogOpen(false);
                      setNewListName('');
                      setNewListDesc('');
                    } catch (e: any) {
                      logger.error('Error creating task list', e);
                      const msg = e?.message || 'Failed to create task list';
                      setCreateError(msg);
                      setSnackbarMessage(msg);
                      setSnackbarSeverity('error');
                      setSnackbarOpen(true);
                    } finally {
                      setCreatingList(false);
                    }
                  }} disabled={creatingList}>{creatingList ? 'Creating...' : 'Create'}</Button>
                </DialogActions>
              </Dialog>

          </Stack>
        </Paper>
      </Container>
      {/* Snackbar for success / error feedback */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TasksPage;