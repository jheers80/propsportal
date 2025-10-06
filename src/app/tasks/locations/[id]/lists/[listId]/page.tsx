"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TasksBreadcrumb from '@/components/TasksBreadcrumb';
import Navbar from '@/components/Navbar';
import { apiGet, apiPost } from '@/lib/apiPost';
import { Card, CardContent, Typography, Box, Stack, Button, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useUser } from '@/hooks/useUser';

export default function TaskListPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const id = params?.id || '';
  const listId = params?.listId || search?.get('taskList') || '';

  const [listName, setListName] = useState<string>('TASK LIST');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>(String(id || 'Location'));
  // per-instance completion state removed (not used here)
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('success');
  const [checkedOutBy, setCheckedOutBy] = useState<string | null>(null);
  const [isCheckedOutByMe, setIsCheckedOutByMe] = useState(false);
  const [localCompletionMap, setLocalCompletionMap] = useState<Record<string, boolean>>({});
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateAndCheckIn, setUpdateAndCheckIn] = useState(true);
  const [processingUpdate, setProcessingUpdate] = useState(false);

  // completion hook available if needed
  const { locations: userLocations } = useUser();

  const isAssignedToLocation = (() => {
    try {
      if (!userLocations || userLocations.length === 0) return false;
      return userLocations.some((l: any) => String(l.id) === String(id)); 
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
  if (!listId) return;
  // Fetch tasks + instances
  const res = await apiGet(`/api/task-lists/${listId}/instances`);
  // Debug: log the raw response from the instances endpoint so we can inspect shapes
   
  console.log('API /instances response', { listId, res });
        if (!mounted) return;
        if (res && typeof res === 'object' && Array.isArray((res as any).tasks)) {
          const t = (res as any).tasks as any[];
          setTasks(t);
          // initialize local completion map
          const map: Record<string, boolean> = {};
          t.forEach((task) => {
            const completed = (task.instances || []).some((i: any) => (i.status || '').toLowerCase() === 'completed');
            map[String(task.id)] = !!completed;
          });
          setLocalCompletionMap(map);
          // set the listName from first task's task_list name if available
          if (t.length > 0 && t[0].task_list_name) setListName(t[0].task_list_name);
        } else {
          setTasks([]);
        }
        // also fetch the list record for a reliable name
        try {
          const listRes = await apiGet(`/api/task-lists/${listId}`);
          if (listRes && (listRes as any).list) setListName((listRes as any).list.name || String(listId));
        } catch {
          // ignore
        }
        // fetch checkout state from the list record
        try {
          const listRes = await apiGet(`/api/task-lists/${listId}`);
          if (listRes && (listRes as any).list) {
            const who = (listRes as any).list.checked_out_by || null;
            setCheckedOutBy(who);
            const me = typeof window !== 'undefined' ? (window as any).__USER_PROFILE__?.id : null;
            setIsCheckedOutByMe(!!who && me && String(who) === String(me));
          }
        } catch {
          // ignore
        }
        // fetch location name
        try {
          const locRes = await apiGet(`/api/locations/${id}`);
          if (locRes && (locRes as any).location) setLocationName((locRes as any).location.store_name || String(id));
        } catch {}
      } catch {
        // ignore for now
        setTasks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [listId, id]);

  // per-instance completion helper removed (not used) to avoid unused-symbol warnings

  return (
    <div>
      <Navbar />
      <Box sx={{ p: 2 }}>
        <TasksBreadcrumb trail={[{ label: 'Tasks', href: '/tasks' }, { label: locationName, href: `/tasks/locations/${id}` }, { label: listName }]} backTo={`/tasks`} />

          {/* Large header banner similar to design */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 900 }}>
              <Box sx={{ background: '#e9e9e9', py: 2.5, boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.05)', borderRadius: 1 }}>
                <Typography sx={{ textAlign: 'center', fontWeight: 900, color: (theme) => (theme.palette as any).tp.accent, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 28, letterSpacing: 2 }}> {listName.toUpperCase()} </Typography>
              </Box>
            </Box>

              <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
                <Box sx={{ background: (theme) => (theme.palette as any).tp.cardBg, p: 2, borderRadius: 1 }}>
                  <Typography sx={{ fontWeight: 800 }}>How to complete tasks</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    1) Ensure you have selected the correct location and list. 2) Click "Check Out" to lock the list for editing. 3) Toggle item checkboxes to mark progress — these are updated locally until you press "Update Completions". 4) Press "Update Completions" to sync your changes to the server (you can choose to check the list back in when applying updates).
                  </Typography>
                </Box>
              </Box>
          </Box>

        <Box sx={{ maxWidth: 900, mx: 'auto', mt: 3 }}>
          {loading ? (
            <Typography>Loading tasks...</Typography>
          ) : tasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>No tasks in this list</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Add a new task to get started.</Typography>
              <Button variant="contained" onClick={() => router.push(`/tasks/create?location=${id}&taskList=${listId}`)} sx={{ backgroundColor: (theme) => (theme.palette as any).tp.accent, color: '#fff' }}>Add New Task</Button>
            </Box>
          ) : (
            <Stack spacing={2}>
                {tasks.map((task) => (
          <Card key={task.id} sx={{ borderRadius: 2, boxShadow: '0 6px 14px rgba(0,0,0,0.06)', overflow: 'visible' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box
                          sx={{ width: 64, height: 64, borderRadius: 2, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(0,0,0,0.08)' }}
                          onPointerDown={(e) => {   console.log('Card Box onPointerDown', { taskId: task.id, target: (e.target as any)?.dataset }); }}
                          onClick={(e) => {   console.log('Card Box onClick', { taskId: task.id, target: (e.target as any)?.dataset }); }}
                        >
                          {
                            // compute once per render to avoid re-finding after optimistic updates
                          }
                          {(() => {
                            const instances = task.instances || [];
                            // compute completed instances
                            const completedInstances = instances.filter((i: any) => (i.status || '').toLowerCase() === 'completed');
                            if (completedInstances.length > 0) {
                              let latestComp: any = null;
                              for (const inst of completedInstances) {
                                const comps = Array.isArray(inst.task_completions) ? inst.task_completions : [];
                                if (comps.length === 0) continue;
                                // pick the most recent completion for this instance
                                const mostRecent = comps.slice().sort((a: any, b: any) => {
                                  const ta = a?.completed_at ? new Date(a.completed_at).getTime() : 0;
                                  const tb = b?.completed_at ? new Date(b.completed_at).getTime() : 0;
                                  return tb - ta;
                                })[0];
                                if (!mostRecent) continue;
                                if (!latestComp || (mostRecent.completed_at && new Date(mostRecent.completed_at) > new Date(latestComp.completed_at))) {
                                  latestComp = mostRecent;
                                }
                              }
                            }

                            return (
                              <Checkbox
                                checked={!!localCompletionMap[String(task.id)]}
                                onChange={(e) => {
                                  if (!isCheckedOutByMe) {
                                    setSnackMsg('List must be checked out to modify tasks');
                                    setSnackSeverity('info');
                                    setSnackOpen(true);
                                    return;
                                  }
                                  const checked = e.target.checked;
                                  setLocalCompletionMap((s) => ({ ...s, [String(task.id)]: checked }));
                                }}
                                inputProps={{ 'aria-label': `complete-${task.id}` }}
                              />
                            );
                          })()}
                        </Box>

                        <Box sx={{ maxWidth: 'calc(100% - 220px)' }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{task.name}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{task.description}</Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                        <Typography variant="body2" color="text.secondary">Due Date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{(task.instances && task.instances[0] && task.instances[0].due_date) ? new Date(task.instances[0].due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
          )}
    
        </Box>

        {/* Footer action bar */}
        <Box sx={{ position: 'fixed', left: 20, right: 20, bottom: 20, display: 'flex', justifyContent: 'space-between', maxWidth: 1000, margin: '0 auto', gap: 2 }}>
          <Box>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push(`/tasks/locations/${id}`)} sx={{ borderColor: (theme) => (theme.palette as any).tp.accent, color: (theme) => (theme.palette as any).tp.accent, textTransform: 'uppercase', fontWeight: 700, px: 4 }}>
              Back
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {checkedOutBy ? (
              <Button
                variant="contained"
                color={isCheckedOutByMe ? 'primary' : 'secondary'}
                onClick={async () => {
                  if (isCheckedOutByMe) {
                    // Check in
                    try {
                      const me = typeof window !== 'undefined' ? (window as any).__USER_PROFILE__?.id : null;
                      if (!me) {
                        setSnackMsg('Unable to determine user');
                        setSnackSeverity('error');
                        setSnackOpen(true);
                        return;
                      }
                      await apiPost(`/api/task-lists/${listId}/checkin`, { user_id: me });
                      setCheckedOutBy(null);
                      setIsCheckedOutByMe(false);
                      setSnackMsg('Checked in');
                      setSnackSeverity('success');
                      setSnackOpen(true);
                    } catch (err: any) {
                      setSnackMsg(err?.message || String(err));
                      setSnackSeverity('error');
                      setSnackOpen(true);
                    }
                  } else {
                    setSnackMsg(`List already checked out by ${checkedOutBy}`);
                    setSnackSeverity('info');
                    setSnackOpen(true);
                  }
                }}
              >
                {isCheckedOutByMe ? 'Check In' : `Checked Out (${checkedOutBy})`}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    const me = typeof window !== 'undefined' ? (window as any).__USER_PROFILE__?.id : null;
                    if (!me) {
                      setSnackMsg('Unable to determine user');
                      setSnackSeverity('error');
                      setSnackOpen(true);
                      return;
                    }
                    // ensure assigned client-side to reduce failed attempts
                    if (!isAssignedToLocation) {
                      setSnackMsg('You are not assigned to this location');
                      setSnackSeverity('error');
                      setSnackOpen(true);
                      return;
                    }
                    const res = await apiPost(`/api/task-lists/${listId}/checkout`, { user_id: me });
                    const cres = res as any;
                    if (cres && cres.success) {
                      setCheckedOutBy(me);
                      setIsCheckedOutByMe(true);
                      setSnackMsg('Checked out');
                      setSnackSeverity('success');
                      setSnackOpen(true);
                    } else if (cres && cres.locked_by) {
                      setSnackMsg(`Locked by ${cres.locked_by}`);
                      setSnackSeverity('info');
                      setSnackOpen(true);
                    }
                  } catch (e: any) {
                    setSnackMsg(e?.message || String(e));
                    setSnackSeverity('error');
                    setSnackOpen(true);
                  }
                }}
              >
                Check Out
              </Button>
            )}

            <Button variant="contained" onClick={() => setUpdateDialogOpen(true)} disabled={!isCheckedOutByMe || processingUpdate || !isAssignedToLocation} sx={{ backgroundColor: (theme) => (theme.palette as any).tp.accent, color: '#fff', textTransform: 'none', fontWeight: 700, px: 4 }}>
              Update Completions
            </Button>
            {isAssignedToLocation ? (
              <Button variant="outlined" onClick={() => router.push(`/tasks/create?location=${id}&taskList=${listId}`)} sx={{ borderColor: (theme) => (theme.palette as any).tp.accent, color: (theme) => (theme.palette as any).tp.accent, textTransform: 'none', fontWeight: 700, px: 2 }}>
                + Add New Task
              </Button>
            ) : (
              <Button variant="outlined" disabled sx={{ borderColor: (theme) => `rgba( ${(theme as any).palette.tp.accentRgb || '220,20,60'}, 0.12)`, color: (theme) => `rgba(${(theme as any).palette.tp.accentRgb || '220,20,60'}, 0.35)`, textTransform: 'none', fontWeight: 700, px: 2 }}>
                + Add New Task
              </Button>
            )}
          </Box>
        </Box>

        <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)}>
          <DialogTitle>Apply completion updates</DialogTitle>
          <DialogContent>
            <FormControlLabel control={<Checkbox checked={updateAndCheckIn} onChange={(e) => setUpdateAndCheckIn(e.target.checked)} />} label="Check list in after applying updates (allow others to edit)" />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">You have changed {Object.keys(localCompletionMap).filter(k => {
                const task = tasks.find(t => String(t.id) === k);
                const serverCompleted = (task?.instances || []).some((i: any) => (i.status || '').toLowerCase() === 'completed');
                return !!localCompletionMap[k] !== !!serverCompleted;
              }).length} items.</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              setProcessingUpdate(true);
              try {
                const me = typeof window !== 'undefined' ? (window as any).__USER_PROFILE__?.id : null;
                const changes = Object.keys(localCompletionMap).map(k => ({ task_id: k, completed: !!localCompletionMap[k] }));
                const res = await apiPost(`/api/task-lists/${listId}/apply-completions`, { changes, user_id: me, checkin: updateAndCheckIn });
                const cres = res as any;
                if (cres && cres.success) {
                  setSnackMsg('Applied updates');
                  setSnackSeverity('success');
                  setUpdateDialogOpen(false);
                  // refresh
                  const refreshed = await apiGet(`/api/task-lists/${listId}/instances`);
                  if (refreshed && Array.isArray((refreshed as any).tasks)) setTasks((refreshed as any).tasks);
                  if (updateAndCheckIn) {
                    setCheckedOutBy(null); setIsCheckedOutByMe(false);
                  }
                } else {
                  setSnackMsg('Failed to apply some updates');
                  setSnackSeverity('warning');
                }
              } catch (e: any) {
                setSnackMsg(e?.message || String(e));
                setSnackSeverity('error');
              } finally {
                setProcessingUpdate(false);
              }
            }} variant="contained">Apply</Button>
          </DialogActions>
        </Dialog>

        {/* Global snackbar for in-page messages */}
        <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}>
          <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>{snackMsg}</Alert>
        </Snackbar>
      </Box>
    </div>
  );
}
