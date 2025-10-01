/**
 * Task Service
 * Handles task business logic and Supabase interactions
 */

import { supabase } from '../lib/supabaseClient';
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
    // Basic validation
    if (!taskData || !taskData.task_list_id) {
      throw new Error('task_list_id is required');
    }
    if (!taskData.title || !taskData.title.trim()) {
      throw new Error('title is required');
    }
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
      // order by the joined table's column - use foreignTable so PostgREST parses correctly
      .order('due_date', { foreignTable: 'task_instances', ascending: true });

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

/**
 * Updates an existing task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Updated fields
 * @returns {Promise<Object>} Result
 */
export async function updateTask(taskId, updates) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error };
  }
}

/**
 * Deletes a task
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Result
 */
export async function deleteTask(taskId) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error };
  }
}

/**
 * Fetch all tasks for a task list including instances and completion info
 * @param {string} taskListId
 * @returns {Promise<Object>} { success, data }
 */
export async function fetchAllTasksInList(taskListId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_instances(*, task_completions(*))
      `)
      .eq('task_list_id', taskListId)
      .order('id', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return { success: false, error };
  }
}