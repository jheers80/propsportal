'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Container, Paper, Stack, Typography, Button, TextField, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useRouter } from 'next/navigation';
// removed useSearchParams to avoid prerender issues; read params on client instead
import { apiPost } from '@/lib/apiPost';
import logger from '@/lib/logger';

export default function CreateTaskPage() {
  const router = useRouter();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [taskListId, setTaskListId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setLocationId(params.get('location'));
      setTaskListId(params.get('taskList'));
    }
     
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('once');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState('days');
  const [specificDaysOfWeek] = useState<number[]>([]);
  const [specificDaysOfMonth] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!taskListId) {
      setError('Task List is required');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        task_list_id: taskListId,
        is_recurring: isRecurring,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        recurrence_unit: recurrenceUnit,
        specific_days_of_week: specificDaysOfWeek.length ? specificDaysOfWeek : null,
        specific_days_of_month: specificDaysOfMonth.length ? specificDaysOfMonth : null,
        repeat_from_completion: false
      };

      if (dueDate) payload.due_date = new Date(dueDate).toISOString();

      // Call server API
      await apiPost('/api/tasks', payload);

  // navigate back to tasks dashboard for the same location/list (new route)
  router.push(`/tasks/locations/${locationId || ''}?taskList=${taskListId}`);
    } catch (err: any) {
      logger.error('Error creating task', err);
      setError(err?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper sx={{ p: 6 }}>
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <Typography variant="h4">Create Task</Typography>
              <Typography variant="body2">Location: {locationId || 'none selected'}</Typography>
              <Typography variant="body2">Task List: {taskListId || 'none selected'}</Typography>

              {error && <Alert severity="error">{error}</Alert>}

              <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
              <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={4} fullWidth />

              <TextField
                label="Due Date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <FormControl>
                <label>
                  <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} /> Recurring
                </label>
              </FormControl>

              {isRecurring && (
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="recurrence-type-label">Recurrence Type</InputLabel>
                    <Select labelId="recurrence-type-label" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)} label="Recurrence Type">
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="interval">Interval</MenuItem>
                    </Select>
                  </FormControl>

                  <Stack direction="row" spacing={2}>
                    <TextField label="Interval" type="number" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(parseInt(e.target.value || '1'))} />
                    <FormControl>
                      <InputLabel id="recurrence-unit-label">Unit</InputLabel>
                      <Select labelId="recurrence-unit-label" value={recurrenceUnit} onChange={(e) => setRecurrenceUnit(e.target.value)} label="Unit">
                        <MenuItem value="days">Days</MenuItem>
                        <MenuItem value="weeks">Weeks</MenuItem>
                        <MenuItem value="months">Months</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              )}

              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={() => router.push(`/tasks/locations/${locationId || ''}?taskList=${taskListId || ''}`)}>Cancel</Button>
                <Button variant="contained" type="submit" disabled={loading}>Create Task</Button>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </Container>
    </>
  );
}
