# Task Management System Architecture Guide

## Project Overview

A React-based web application for managing tasks with recurring capabilities, integrated with Supabase PostgreSQL database. Supports multiple users with role-based permissions.

### Key Features
- One-time and recurring tasks
- Multiple recurrence patterns (daily, weekly, monthly, custom intervals)
- Specific days of week/month scheduling
- Completion-based and schedule-based recurrence
- Task lists with role-based permissions
- Completion history tracking (6+ months retention)
- Dashboard and list views

---

## Database Schema

### Tables Structure

```sql
-- Task Lists Table
CREATE TABLE task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_id TEXT NOT NULL, -- Links to your existing permission system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Recurrence settings
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly', 'interval')),
  recurrence_interval INTEGER, -- For interval type (e.g., every 3 days)
  recurrence_unit TEXT CHECK (recurrence_unit IN ('days', 'weeks', 'months')),
  specific_days_of_week INTEGER[], -- Array: [0=Sun, 1=Mon, ..., 6=Sat]
  specific_days_of_month INTEGER[], -- Array: [1-31]
  repeat_from_completion BOOLEAN DEFAULT FALSE, -- true = from completion, false = from schedule
  
  -- Scheduling
  due_date TIMESTAMPTZ,
  due_time TIME, -- Separate time for easier querying
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Task Instances (Active/Current)
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'replaced')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Completion History
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  task_instance_id UUID REFERENCES task_instances(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_lists_role ON task_lists(role_id);
CREATE INDEX idx_tasks_list ON tasks(task_list_id);
CREATE INDEX idx_task_instances_task ON task_instances(task_id);
CREATE INDEX idx_task_instances_due ON task_instances(due_date);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_completions_task ON task_completions(task_id);
CREATE INDEX idx_completions_date ON task_completions(completed_at);

-- RLS Policies (enable RLS on all tables)
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust based on your auth system)
CREATE POLICY "Users can view task lists for their role"
  ON task_lists FOR SELECT
  USING (role_id = current_setting('app.current_role')::TEXT);

-- Add similar policies for INSERT, UPDATE, DELETE on each table
-- Ensure policies check against your existing permission system
```

### Data Retention Policy

```sql
-- Function to clean up old completion records (older than 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_completions()
RETURNS void AS $$
BEGIN
  DELETE FROM task_completions
  WHERE completed_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run monthly via pg_cron or Supabase Edge Function
```

---

## React Project Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardView.jsx          # Main dashboard container
│   │   ├── TaskSummaryCard.jsx        # Summary stats card
│   │   ├── UpcomingTasksList.jsx      # Upcoming tasks widget
│   │   └── CompletionChart.jsx        # Visual completion statistics
│   ├── tasks/
│   │   ├── TaskList.jsx               # List view of tasks
│   │   ├── TaskItem.jsx               # Individual task component
│   │   ├── TaskForm.jsx               # Create/edit task form
│   │   ├── RecurrenceSelector.jsx     # Recurrence pattern selector
│   │   ├── TaskCompletionHistory.jsx  # Show completion history
│   │   └── TaskFilters.jsx            # Filter/sort controls
│   ├── task-lists/
│   │   ├── TaskListSelector.jsx       # Dropdown to select task list
│   │   ├── TaskListForm.jsx           # Create/edit task list
│   │   └── TaskListManager.jsx        # Manage all task lists
│   └── shared/
│       ├── DateTimePicker.jsx         # Date/time input component
│       ├── LoadingSpinner.jsx         # Loading state indicator
│       └── ErrorBoundary.jsx          # Error handling wrapper
├── hooks/
│   ├── useTaskLists.js                # Task list CRUD operations
│   ├── useTasks.js                    # Task CRUD operations
│   ├── useTaskInstances.js            # Task instance management
│   ├── useTaskCompletion.js           # Task completion logic
│   └── useSupabase.js                 # Supabase client wrapper
├── services/
│   ├── supabaseClient.js              # Supabase initialization
│   ├── taskService.js                 # Task business logic
│   ├── recurrenceEngine.js            # Recurrence calculation engine
│   ├── taskInstanceService.js         # Instance generation logic
│   └── permissionService.js           # Permission checking utilities
├── utils/
│   ├── dateHelpers.js                 # Date manipulation utilities
│   ├── recurrenceCalculator.js        # Recurrence math functions
│   ├── validators.js                  # Input validation
│   └── constants.js                   # App constants
├── types/
│   └── taskTypes.js                   # Type definitions (or .ts)
└── contexts/
    └── AuthContext.jsx                # Auth state management
```

---

## Core Service Implementations

### 1. Recurrence Engine (`services/recurrenceEngine.js`)

```javascript
/**
 * Recurrence Engine
 * Handles all recurrence calculation logic for tasks
 */

/**
 * Calculates the next due date for a recurring task
 * @param {Object} task - Task object with recurrence settings
 * @param {Date} fromDate - Date to calculate from (completion date or current due date)
 * @returns {Date} Next due date
 */
export function calculateNextDueDate(task, fromDate) {
  const baseDate = new Date(fromDate);
  
  switch (task.recurrence_type) {
    case 'daily':
      return addDays(baseDate, 1);
    
    case 'weekly':
      if (task.specific_days_of_week && task.specific_days_of_week.length > 0) {
        return getNextWeekdayOccurrence(baseDate, task.specific_days_of_week);
      }
      return addDays(baseDate, 7);
    
    case 'monthly':
      if (task.specific_days_of_month && task.specific_days_of_month.length > 0) {
        return getNextMonthDayOccurrence(baseDate, task.specific_days_of_month);
      }
      return addMonths(baseDate, 1);
    
    case 'interval':
      return addInterval(baseDate, task.recurrence_interval, task.recurrence_unit);
    
    default:
      return null;
  }
}

/**
 * Adjusts date if it falls on invalid day of month (e.g., Feb 31 -> Feb 28/29)
 * @param {Date} date - Date to adjust
 * @returns {Date} Adjusted date (last day of month if needed)
 */
export function adjustForMonthEnd(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const requestedDay = date.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  if (requestedDay > lastDayOfMonth) {
    return new Date(year, month, lastDayOfMonth);
  }
  
  return date;
}

/**
 * Generates next task instance based on recurrence rules
 * @param {Object} task - Task configuration
 * @param {Date} baseDate - Date to calculate from
 * @returns {Object} New task instance data
 */
export function generateNextInstance(task, baseDate) {
  const nextDueDate = calculateNextDueDate(task, baseDate);
  const adjustedDate = adjustForMonthEnd(nextDueDate);
  
  return {
    task_id: task.id,
    due_date: adjustedDate,
    status: 'pending'
  };
}

/**
 * Gets next occurrence of specific weekdays
 * @param {Date} fromDate - Starting date
 * @param {number[]} weekdays - Array of weekday numbers (0=Sun, 6=Sat)
 * @returns {Date} Next occurrence
 */
function getNextWeekdayOccurrence(fromDate, weekdays) {
  const sortedDays = [...weekdays].sort((a, b) => a - b);
  const currentDay = fromDate.getDay();
  
  // Find next day in the same week
  const nextDay = sortedDays.find(day => day > currentDay);
  
  if (nextDay !== undefined) {
    const daysToAdd = nextDay - currentDay;
    return addDays(fromDate, daysToAdd);
  }
  
  // Move to first day of next week
  const daysToNextWeek = 7 - currentDay + sortedDays[0];
  return addDays(fromDate, daysToNextWeek);
}

/**
 * Gets next occurrence of specific days of month
 * @param {Date} fromDate - Starting date
 * @param {number[]} monthDays - Array of day numbers (1-31)
 * @returns {Date} Next occurrence
 */
function getNextMonthDayOccurrence(fromDate, monthDays) {
  const sortedDays = [...monthDays].sort((a, b) => a - b);
  const currentDay = fromDate.getDate();
  
  // Find next day in current month
  const nextDay = sortedDays.find(day => day > currentDay);
  
  if (nextDay !== undefined) {
    const testDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), nextDay);
    return adjustForMonthEnd(testDate);
  }
  
  // Move to first specified day of next month
  const nextMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, sortedDays[0]);
  return adjustForMonthEnd(nextMonth);
}

// Helper functions
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addInterval(date, interval, unit) {
  switch (unit) {
    case 'days':
      return addDays(date, interval);
    case 'weeks':
      return addDays(date, interval * 7);
    case 'months':
      return addMonths(date, interval);
    default:
      return date;
  }
}
```

### 2. Task Service (`services/taskService.js`)

```javascript
/**
 * Task Service
 * Handles task business logic and Supabase interactions
 */

import { supabase } from './supabaseClient';
import { generateNextInstance } from './recurrenceEngine';

/**
 * Completes a task instance and generates next instance if recurring
 * @param {string} instanceId - Task instance ID
 * @param {string} userId - User completing the task
 * @param {string} notes - Optional completion notes
 * @returns {Promise<Object>} Result of completion
 */
export async function completeTask(instanceId, userId, notes = null) {
  try {
    // Step 1: Get task instance and parent task
    const { data: instance, error: instanceError } = await supabase
      .from('task_instances')
      .select('*, tasks(*)')
      .eq('id', instanceId)
      .single();
    
    if (instanceError) throw instanceError;
    
    const task = instance.tasks;
    
    // Step 2: Create completion record
    const { error: completionError } = await supabase
      .from('task_completions')
      .insert({
        task_id: task.id,
        task_instance_id: instanceId,
        completed_by: userId,
        notes: notes
      });
    
    if (completionError) throw completionError;
    
    // Step 3: Update instance status to 'completed'
    const { error: updateError } = await supabase
      .from('task_instances')
      .update({ status: 'completed' })
      .eq('id', instanceId);
    
    if (updateError) throw updateError;
    
    // Step 4: If recurring and repeat_from_completion, generate next instance
    if (task.is_recurring && task.repeat_from_completion) {
      const nextInstanceData = generateNextInstance(task, new Date());
      
      const { error: nextInstanceError } = await supabase
        .from('task_instances')
        .insert(nextInstanceData);
      
      if (nextInstanceError) throw nextInstanceError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false, error };
  }
}

/**
 * Replaces old task instance with new one (for schedule-based recurring tasks)
 * @param {string} taskId - Parent task ID
 * @param {Date} newDueDate - New due date
 * @returns {Promise<Object>} Result of replacement
 */
export async function replaceTaskInstance(taskId, newDueDate) {
  try {
    // Step 1: Mark old pending instance as 'replaced'
    const { error: updateError } = await supabase
      .from('task_instances')
      .update({ status: 'replaced' })
      .eq('task_id', taskId)
      .eq('status', 'pending');
    
    if (updateError) throw updateError;
    
    // Step 2: Create new instance with new due date
    const { error: insertError } = await supabase
      .from('task_instances')
      .insert({
        task_id: taskId,
        due_date: newDueDate,
        status: 'pending'
      });
    
    if (insertError) throw insertError;
    
    return { success: true };
  } catch (error) {
    console.error('Error replacing task instance:', error);
    return { success: false, error };
  }
}

/**
 * Creates a new task with optional first instance
 * @param {Object} taskData - Task configuration
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  try {
    // Insert task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (taskError) throw taskError;
    
    // Create initial instance if due date is set
    if (task.due_date) {
      const { error: instanceError } = await supabase
        .from('task_instances')
        .insert({
          task_id: task.id,
          due_date: task.due_date,
          status: 'pending'
        });
      
      if (instanceError) throw instanceError;
    }
    
    return { success: true, data: task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error };
  }
}

/**
 * Fetches tasks with their current instances
 * @param {string} taskListId - Task list ID
 * @returns {Promise<Array>} Tasks with instances
 */
export async function fetchTasksWithInstances(taskListId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_instances!inner(*)
      `)
      .eq('task_list_id', taskListId)
      .eq('task_instances.status', 'pending')
      .order('task_instances.due_date', { ascending: true });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { success: false, error };
  }
}

/**
 * Fetches completion history for a task
 * @param {string} taskId - Task ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<Array>} Completion history
 */
export async function fetchCompletionHistory(taskId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('task_completions')
      .select(`
        *,
        completed_by:auth.users(email, full_name)
      `)
      .eq('task_id', taskId)
      .order('completed_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching completion history:', error);
    return { success: false, error };
  }
}
```

### 3. Scheduled Job (Supabase Edge Function or External Cron)

```javascript
/**
 * Scheduled Instance Generator
 * Runs daily to generate new instances for schedule-based recurring tasks
 * Deploy as Supabase Edge Function or run via external cron job
 */

import { supabase } from './supabaseClient';
import { generateNextInstance } from './recurrenceEngine';

/**
 * Main function to generate scheduled instances
 * Should run daily (e.g., at midnight)
 */
export async function generateScheduledInstances() {
  try {
    console.log('Starting scheduled instance generation...');
    
    // Step 1: Find all recurring tasks with repeat_from_completion = false
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .eq('repeat_from_completion', false);
    
    if (tasksError) throw tasksError;
    
    // Step 2: For each task, check if new instance should be created
    for (const task of tasks) {
      // Get current pending instance
      const { data: currentInstance, error: instanceError } = await supabase
        .from('task_instances')
        .select('*')
        .eq('task_id', task.id)
        .eq('status', 'pending')
        .single();
      
      if (instanceError && instanceError.code !== 'PGRST116') {
        console.error(`Error fetching instance for task ${task.id}:`, instanceError);
        continue;
      }
      
      // Determine if we need to generate next instance
      const shouldGenerate = shouldGenerateNextInstance(task, currentInstance);
      
      if (shouldGenerate) {
        const baseDate = currentInstance ? 
          new Date(currentInstance.due_date) : 
          new Date();
        
        const nextInstanceData = generateNextInstance(task, baseDate);
        
        // Replace old instance
        if (currentInstance) {
          await supabase
            .from('task_instances')
            .update({ status: 'replaced' })
            .eq('id', currentInstance.id);
        }
        
        // Create new instance
        const { error: createError } = await supabase
          .from('task_instances')
          .insert(nextInstanceData);
        
        if (createError) {
          console.error(`Error creating instance for task ${task.id}:`, createError);
        } else {
          console.log(`Created new instance for task ${task.id}`);
        }
      }
    }
    
    console.log('Scheduled instance generation completed');
    return { success: true };
  } catch (error) {
    console.error('Error in scheduled instance generation:', error);
    return { success: false, error };
  }
}

/**
 * Determines if a new instance should be generated
 * @param {Object} task - Task configuration
 * @param {Object} currentInstance - Current pending instance (or null)
 * @returns {boolean} Whether to generate new instance
 */
function shouldGenerateNextInstance(task, currentInstance) {
  if (!currentInstance) return true;
  
  const now = new Date();
  const dueDate = new Date(currentInstance.due_date);
  
  // Generate if current instance is past due
  return dueDate < now;
}
```

---

## Custom Hooks Patterns

### Example Hook: `hooks/useTasks.js`

```javascript
import { useState, useEffect } from 'react';
import { fetchTasksWithInstances, createTask, updateTask, deleteTask } from '../services/taskService';

/**
 * Custom hook for managing tasks within a task list
 * @param {string} taskListId - Task list UUID
 * @returns {Object} Tasks data and methods
 */
export function useTasks(taskListId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks on mount and when taskListId changes
  useEffect(() => {
    if (taskListId) {
      fetchTasks();
    }
  }, [taskListId]);

  /**
   * Fetches tasks from the database
   */
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    
    const result = await fetchTasksWithInstances(taskListId);
    
    if (result.success) {
      setTasks(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  /**
   * Creates a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Result
   */
  const handleCreateTask = async (taskData) => {
    const result = await createTask({ ...taskData, task_list_id: taskListId });
    
    if (result.success) {
      await fetchTasks(); // Refresh list
    }
    
    return result;
  };

  /**
   * Updates an existing task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Updated fields
   * @returns {Promise<Object>} Result
   */
  const handleUpdateTask = async (taskId, updates) => {
    const result = await updateTask(taskId, updates);
    
    if (result.success) {
      await fetchTasks(); // Refresh list
    }
    
    return result;
  };

  /**
   * Deletes a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Result
   */
  const handleDeleteTask = async (taskId) => {
    const result = await deleteTask(taskId);
    
    if (result.success) {
      await fetchTasks(); // Refresh list
    }
    
    return result;
  };

  return {
    tasks,
    loading,
    error,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    refetch: fetchTasks
  };
}
```

---

## GitHub Copilot Best Practices

### 1. Use Extensive JSDoc Comments

```javascript
/**
 * Calculates the next due date for a recurring task based on recurrence rules
 * Handles daily, weekly, monthly, and custom interval patterns
 * @param {Object} task - Task object containing recurrence configuration
 * @param {string} task.recurrence_type - Type: 'daily', 'weekly', 'monthly', 'interval'
 * @param {number} task.recurrence_interval - Interval value for 'interval' type
 * @param {string} task.recurrence_unit - Unit for interval: 'days', 'weeks', 'months'
 * @param {number[]} task.specific_days_of_week - Array of weekday numbers (0-6)
 * @param {number[]} task.specific_days_of_month - Array of month days (1-31)
 * @param {Date} fromDate - Date to calculate from (completion or scheduled date)
 * @returns {Date|null} Next due date or null if not recurring
 * @example
 * const task = { recurrence_type: 'daily' };
 * const nextDate = calculateNextDueDate(task, new Date());
 */
```

### 2. Consistent Naming Conventions

- **Event Handlers**: `handleClick`, `handleSubmit`, `handleChange`
- **Data Fetching**: `fetchTasks`, `fetchTaskLists`, `fetchCompletions`
- **CRUD Operations**: `createTask`, `updateTask`, `deleteTask`
- **Calculations**: `calculateNextDate`, `calculateProgress`, `calculateStats`
- **Validation**: `validateTaskData`, `isValidRecurrence`, `checkPermissions`
- **Utilities**: `formatDate`, `parseRecurrence`, `sanitizeInput`

### 3. Structure Files with Outline Comments

```javascript
// ============================================================
// TASK SERVICE
// Handles all task-related business logic and database operations
// ============================================================

// -------------------- Imports --------------------
import { supabase } from './supabaseClient';
import { generateNextInstance } from './recurrenceEngine';

// -------------------- Task CRUD Operations --------------------

// Create a new task
export async function createTask(taskData) { }

// Update existing task
export async function updateTask(taskId, updates) { }

// Delete a task
export async function deleteTask(taskId) { }

// -------------------- Task Completion --------------------

// Complete a task instance
export async function completeTask(instanceId, userId, notes) { }

// Fetch completion history
export async function fetchCompletionHistory(taskId, limit) { }

// -------------------- Helper Functions --------------------

// Validate task data before saving
function validateTaskData(data) { }
```

### 4. Create Skeleton Code for Copilot

```javascript
// Step 1: Fetch current user
// Step 2: Check user has permission for this task list
// Step 3: Fetch task data from database
// Step 4: Validate task can be completed
// Step 5: Create completion record
// Step 6: Update task instance status
// Step 7: Generate next instance if recurring
// Step 8: Return success response
```

### 5. Use Type Definitions

Even without TypeScript, define types in comments:

```javascript
/**
 * @typedef {Object} Task
 * @property {string} id - UUID
 * @property {string} task_list_id - Parent task list UUID
 * @property {string} title - Task title
 * @property {string} description - Task description
 * @property {boolean} is_recurring - Whether task repeats
 * @property {string} recurrence_type - Type of recurrence
 * @property {Date} due_date - When task is due
 */

/**
 * @typedef {Object} TaskInstance
 * @property {string} id - UUID
 * @property {string} task_id - Parent task UUID
 * @property {Date} due_date - Instance due date
 * @property {string} status - 'pending' | 'completed' | 'replaced'
 */
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up Supabase project and database tables
- [ ] Configure RLS policies
- [ ] Create Supabase client wrapper
- [ ] Set up React project structure
- [ ] Implement authentication integration

### Phase 2: Basic Task Management (Week 2)
- [ ] Create task list CRUD operations
- [ ] Build task list selector UI
- [ ] Implement basic task CRUD (no recurrence)
- [ ] Create task list view component
- [ ] Add task form component

### Phase 3: Task Instances (Week 3)
- [ ] Implement task instance creation
- [ ] Build task completion flow
- [ ] Create completion history view
- [ ] Add task detail view with history

### Phase 4: Recurrence Engine (Week 4)
- [ ] Build recurrence calculation functions
- [ ] Implement date adjustment logic
- [ ] Create recurrence selector UI component
- [ ] Add completion-based recurrence
- [ ] Test all recurrence patterns

### Phase 5: Scheduled Tasks (Week 5)
- [ ] Create scheduled instance generator
- [ ] Set up Supabase Edge Function or cron job
- [ ] Implement schedule-based recurrence
- [ ] Test automatic instance generation
- [ ] Add monitoring/logging

### Phase 6: UI Enhancement (Week 6)
- [ ] Build dashboard view
- [ ] Create task summary widgets
- [ ] Add filtering and sorting
- [ ] Implement search functionality
- [ ] Polish UI/UX

### Phase 7: Testing & Optimization (Week 7)
- [ ] Write unit tests for recurrence engine
- [ ] Test edge cases (month-end, leap years, etc.)
- [ ] Optimize database queries
- [ ] Add error handling and loading states
- [ ] Performance testing

### Phase 8: Polish & Deploy (Week 8)
- [ ] Implement data retention cleanup
- [ ] Add user feedback/notifications
- [ ] Write documentation
- [ ] Deploy to production
- [ ] Monitor and iterate

---

## Key Business Logic Rules

### Completion-Based Recurring Tasks
1. Task completes → immediately generate next instance
2. Next due date calculated from completion date
3. Only one active instance exists at a time
4. Old instance marked 'completed'

### Schedule-Based Recurring Tasks
1. New instance generated on schedule (daily cron job)
2. Next due date calculated from current due date (not completion)
3. Old instance marked 'replaced' when new one created
4. Missed instances are replaced, not accumulated

### Month-End Date Handling
1. If task scheduled for day 31 in a 30-day month
2. Automatically move to day 30 (last day of month)
3. February 30/31 → February 28/29
4. Use `adjustForMonthEnd()` function consistently

### Specific Days Logic
- **Days of Week**: Task repeats every Monday, Wednesday, Friday
  - Store as `[1, 3, 5]` in `specific_days_of_week`
  - Find next occurrence after current date
- **Days of Month**: Task repeats on 1st and 15th
  - Store as `[1, 15]` in `specific_days_of_month`
  - Find next occurrence in current or next month
  - Apply month-end adjustment if needed

### Data Retention
- Keep completion history for minimum 6 months
- Run monthly cleanup job to remove old records
- Preserve task configuration indefinitely
- Archive replaced instances (don't delete)

---

## Common Patterns & Code Snippets

### Supabase Client Setup (`services/supabaseClient.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Set user role in Supabase context for RLS
 * @param {string} roleId - User's role ID from your auth system
 */
export async function setUserRole(roleId) {
  await supabase.rpc('set_config', {
    setting: 'app.current_role',
    value: roleId
  });
}
```

### React Component Pattern

```javascript
import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTaskCompletion } from '../hooks/useTaskCompletion';
import TaskItem from './TaskItem';
import LoadingSpinner from '../shared/LoadingSpinner';

/**
 * TaskList Component
 * Displays list of tasks with completion functionality
 * @param {Object} props
 * @param {string} props.taskListId - Task list UUID
 */
export default function TaskList({ taskListId }) {
  const { tasks, loading, error, refetch } = useTasks(taskListId);
  const { completeTask, loading: completing } = useTaskCompletion();
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'overdue'

  const handleComplete = async (instanceId) => {
    const result = await completeTask(instanceId);
    if (result.success) {
      refetch(); // Refresh task list
    }
  };

  const filteredTasks = filterTasks(tasks, filter);

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error loading tasks: {error.message}</div>;

  return (
    <div className="task-list">
      <div className="filters">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('today')}>Today</button>
        <button onClick={() => setFilter('overdue')}>Overdue</button>
      </div>

      <div className="tasks">
        {filteredTasks.length === 0 ? (
          <p>No tasks found</p>
        ) : (
          filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleComplete}
              completing={completing}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Filters tasks based on criteria
 * @param {Array} tasks - Array of tasks
 * @param {string} filter - Filter type
 * @returns {Array} Filtered tasks
 */
function filterTasks(tasks, filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (filter) {
    case 'today':
      return tasks.filter(task => {
        const dueDate = new Date(task.task_instances[0].due_date);
        return dueDate >= today && dueDate < tomorrow;
      });
    
    case 'overdue':
      return tasks.filter(task => {
        const dueDate = new Date(task.task_instances[0].due_date);
        return dueDate < today && task.task_instances[0].status === 'pending';
      });
    
    default:
      return tasks;
  }
}
```

### Date Helper Utilities (`utils/dateHelpers.js`)

```javascript
/**
 * Formats date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats date and time for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Gets relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === 0 && diffHours > 0) return `in ${diffHours} hours`;
  if (diffDays === 0 && diffHours === 0 && diffMinutes > 0) return `in ${diffMinutes} minutes`;
  if (diffDays === 0) return 'now';
  if (diffDays === -1) return 'yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  
  return formatDate(date);
}

/**
 * Checks if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const today = new Date();
  const target = new Date(date);
  
  return today.getFullYear() === target.getFullYear() &&
         today.getMonth() === target.getMonth() &&
         today.getDate() === target.getDate();
}

/**
 * Checks if date is overdue
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isOverdue(date) {
  return new Date(date) < new Date();
}

/**
 * Gets start of day for a date
 * @param {Date|string} date - Date
 * @returns {Date} Start of day
 */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets end of day for a date
 * @param {Date|string} date - Date
 * @returns {Date} End of day
 */
export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
```

### Validation Utilities (`utils/validators.js`)

```javascript
/**
 * Validates task data before saving
 * @param {Object} taskData - Task data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTaskData(taskData) {
  const errors = [];

  // Required fields
  if (!taskData.title || taskData.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!taskData.task_list_id) {
    errors.push('Task must belong to a task list');
  }

  // Recurrence validation
  if (taskData.is_recurring) {
    if (!taskData.recurrence_type) {
      errors.push('Recurrence type is required for recurring tasks');
    }

    if (taskData.recurrence_type === 'interval') {
      if (!taskData.recurrence_interval || taskData.recurrence_interval < 1) {
        errors.push('Recurrence interval must be at least 1');
      }
      if (!taskData.recurrence_unit) {
        errors.push('Recurrence unit is required for interval type');
      }
    }

    if (taskData.recurrence_type === 'weekly' && 
        taskData.specific_days_of_week && 
        taskData.specific_days_of_week.length === 0) {
      errors.push('At least one day of week must be selected');
    }

    if (taskData.recurrence_type === 'monthly' && 
        taskData.specific_days_of_month && 
        taskData.specific_days_of_month.length === 0) {
      errors.push('At least one day of month must be selected');
    }
  }

  // Date validation
  if (taskData.due_date) {
    const dueDate = new Date(taskData.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates recurrence configuration
 * @param {Object} recurrence - Recurrence settings
 * @returns {boolean} True if valid
 */
export function isValidRecurrence(recurrence) {
  const validTypes = ['once', 'daily', 'weekly', 'monthly', 'interval'];
  
  if (!validTypes.includes(recurrence.type)) {
    return false;
  }

  if (recurrence.type === 'interval') {
    if (!recurrence.interval || recurrence.interval < 1) {
      return false;
    }
    if (!['days', 'weeks', 'months'].includes(recurrence.unit)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes user input
 * @param {string} input - User input
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 500); // Limit length
}
```

---

## Testing Strategy

### Unit Tests Example (Jest)

```javascript
// recurrenceEngine.test.js
import { calculateNextDueDate, adjustForMonthEnd } from './recurrenceEngine';

describe('Recurrence Engine', () => {
  describe('calculateNextDueDate', () => {
    test('daily recurrence adds 1 day', () => {
      const task = { recurrence_type: 'daily' };
      const fromDate = new Date('2025-01-15');
      const result = calculateNextDueDate(task, fromDate);
      
      expect(result.getDate()).toBe(16);
    });

    test('weekly recurrence with specific days', () => {
      const task = {
        recurrence_type: 'weekly',
        specific_days_of_week: [1, 3, 5] // Mon, Wed, Fri
      };
      const fromDate = new Date('2025-01-15'); // Wednesday
      const result = calculateNextDueDate(task, fromDate);
      
      expect(result.getDay()).toBe(5); // Friday
    });

    test('monthly recurrence moves to next month', () => {
      const task = { recurrence_type: 'monthly' };
      const fromDate = new Date('2025-01-15');
      const result = calculateNextDueDate(task, fromDate);
      
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('adjustForMonthEnd', () => {
    test('adjusts Feb 31 to Feb 28 in non-leap year', () => {
      const date = new Date('2025-02-31');
      const result = adjustForMonthEnd(date);
      
      expect(result.getDate()).toBe(28);
      expect(result.getMonth()).toBe(1);
    });

    test('adjusts Feb 31 to Feb 29 in leap year', () => {
      const date = new Date('2024-02-31');
      const result = adjustForMonthEnd(date);
      
      expect(result.getDate()).toBe(29);
    });

    test('adjusts Apr 31 to Apr 30', () => {
      const date = new Date('2025-04-31');
      const result = adjustForMonthEnd(date);
      
      expect(result.getDate()).toBe(30);
    });
  });
});
```

### Integration Tests

```javascript
// taskService.test.js
import { completeTask, createTask } from './taskService';
import { supabase } from './supabaseClient';

describe('Task Service', () => {
  beforeEach(async () => {
    // Setup test data
    await setupTestDatabase();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupTestDatabase();
  });

  test('completing task creates completion record', async () => {
    const instanceId = 'test-instance-id';
    const userId = 'test-user-id';
    
    const result = await completeTask(instanceId, userId);
    
    expect(result.success).toBe(true);
    
    // Verify completion record exists
    const { data } = await supabase
      .from('task_completions')
      .select('*')
      .eq('task_instance_id', instanceId);
    
    expect(data.length).toBe(1);
    expect(data[0].completed_by).toBe(userId);
  });

  test('completing recurring task generates next instance', async () => {
    const task = {
      title: 'Test Task',
      is_recurring: true,
      recurrence_type: 'daily',
      repeat_from_completion: true
    };
    
    // Create task and complete it
    const { data: createdTask } = await createTask(task);
    // Test completion and instance generation
    // ...assertions
  });
});
```

---

## Performance Optimization Tips

### Database Indexing
- Index frequently queried columns: `due_date`, `status`, `task_list_id`
- Create composite indexes for common query patterns
- Monitor slow queries in Supabase dashboard

### Query Optimization
```javascript
// Bad: Multiple queries
const tasks = await fetchTasks(listId);
for (let task of tasks) {
  const instances = await fetchInstances(task.id);
}

// Good: Single query with join
const tasks = await supabase
  .from('tasks')
  .select('*, task_instances(*)')
  .eq('task_list_id', listId);
```

### Caching Strategy
- Cache task lists in React state/context
- Use Supabase real-time subscriptions for live updates
- Implement optimistic UI updates

### Pagination
```javascript
// Paginate large task lists
const PAGE_SIZE = 50;

const { data, error } = await supabase
  .from('task_instances')
  .select('*, tasks(*)')
  .eq('status', 'pending')
  .order('due_date', { ascending: true })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

---

## Security Considerations

### Row Level Security (RLS) Policies

```sql
-- Task Lists: Users can only access lists for their role
CREATE POLICY "task_lists_select_policy"
  ON task_lists FOR SELECT
  USING (role_id = current_setting('app.current_role')::TEXT);

CREATE POLICY "task_lists_insert_policy"
  ON task_lists FOR INSERT
  WITH CHECK (role_id = current_setting('app.current_role')::TEXT);

-- Tasks: Users can only access tasks in their lists
CREATE POLICY "tasks_select_policy"
  ON tasks FOR SELECT
  USING (
    task_list_id IN (
      SELECT id FROM task_lists 
      WHERE role_id = current_setting('app.current_role')::TEXT
    )
  );

-- Similar policies for task_instances and task_completions
```

### Input Validation
- Always validate on both client and server side
- Sanitize user input before storing
- Use parameterized queries (Supabase handles this)
- Validate dates, recurrence patterns, and IDs

### Permission Checks
```javascript
/**
 * Checks if user has permission to access task list
 * @param {string} userId - User ID
 * @param {string} taskListId - Task list ID
 * @returns {Promise<boolean>} True if user has access
 */
export async function checkTaskListPermission(userId, taskListId) {
  // Get user's role from your auth system
  const userRole = await getUserRole(userId);
  
  // Check if task list belongs to user's role
  const { data, error } = await supabase
    .from('task_lists')
    .select('role_id')
    .eq('id', taskListId)
    .single();
  
  if (error || !data) return false;
  
  return data.role_id === userRole;
}
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Edge Functions deployed (if using)
- [ ] Cron jobs configured
- [ ] Error logging set up
- [ ] Performance testing completed

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify cron job execution
- [ ] Test user workflows
- [ ] Monitor API rate limits
- [ ] Set up alerts for failures

---

## Troubleshooting Guide

### Common Issues

**Issue: Recurring tasks not generating**
- Check cron job is running
- Verify recurrence calculation logic
- Check database permissions
- Review Edge Function logs

**Issue: Permission errors**
- Verify RLS policies are correct
- Check user role is set in Supabase context
- Ensure auth tokens are valid
- Test policies in Supabase SQL editor

**Issue: Date calculations incorrect**
- Check timezone handling
- Verify month-end adjustment logic
- Test with edge cases (leap years, different timezones)
- Use UTC consistently

**Issue: Performance slow**
- Add missing database indexes
- Optimize queries (use EXPLAIN)
- Implement pagination
- Cache frequently accessed data

---

## Additional Resources

### Supabase Documentation
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)

### React Best Practices
- [React Hooks](https://react.dev/reference/react)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

### Date/Time Libraries
Consider using for complex date operations:
- [date-fns](https://date-fns.org/) - Modern date utility library
- [Day.js](https://day.js.org/) - Lightweight alternative to Moment.js

---

## Notes

- Always test recurrence logic with edge cases (month-end, leap years, DST)
- Keep functions pure and side-effect free where possible
- Use transactions for operations that modify multiple tables
- Implement comprehensive error handling
- Log important operations for debugging
- Consider implementing undo functionality for task completions
- Monitor database size as completion history grows
- Regularly review and optimize slow queries

**Last Updated**: September 29, 2025