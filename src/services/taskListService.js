/**
 * Task List Service
 * Handles task list CRUD operations
 */

import { supabase } from '../lib/supabaseClient';
import logger from '../lib/logger';

/**
 * Creates a new task list
 * @param {Object} taskListData - Task list data
 * @returns {Promise<Object>} Created task list
 */
export async function createTaskList(taskListData) {
  try {
    const { data, error } = await supabase
      .from('task_lists')
      .insert(taskListData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    logger.error('Error creating task list:', error);

    // Some deployments / older schemas may not have optional columns (e.g., description)
    // Supabase/Postgres can return errors like "Could not find the 'description' column"
    // Detect that case, remove the offending property and retry once.
    try {
      const msg = (error && (error.message || error.msg || error.details)) ? String(error.message || error.msg || error.details) : '';
      // Patterns that may indicate a missing/unknown column
      const patterns = [ /Could not find the '([\w_]+)' column/i, /column "?([\w_]+)"? of relation/i, /column "([\w_]+)" does not exist/i ];
      let missingCol = null;
      for (const p of patterns) {
        const m = msg.match(p);
        if (m) { missingCol = m[1]; break; }
      }

      if (missingCol && typeof taskListData === 'object' && taskListData !== null && missingCol in taskListData) {
        const cleaned = { ...taskListData };
        delete cleaned[missingCol];
        const { data: data2, error: error2 } = await supabase
          .from('task_lists')
          .insert(cleaned)
          .select()
          .single();
        if (error2) throw error2;
        return { success: true, data: data2 };
      }
    } catch (e2) {
      logger.error('Retry without missing column failed:', e2);
      return { success: false, error: e2 };
    }

    return { success: false, error };
  }
}

/**
 * Fetches all task lists for the current user's role
 * @returns {Promise<Array>} Task lists
 */
/**
 * Fetches all task lists for the current user's role or for a specific location
 * @param {number|string|null} locationId - Optional location id to filter task lists
 * @returns {Promise<Array|Object>} Task lists (array) or { success, data }
 */
export async function fetchTaskLists(locationId = null) {
  try {
    // Base query for task lists
    const baseQuery = supabase
      .from('task_lists')
      .select('*')
      .order('name', { ascending: true });

    // If a locationId is provided, try to scope by location_id. Some DB
    // schemas don't include a location_id on task_lists (older migrations
    // or role-scoped lists), so if Postgres returns undefined-column error
    // (42703) we fall back to returning all task lists.
    if (locationId !== null && locationId !== '' && typeof locationId !== 'undefined') {
      const { data, error } = await baseQuery.eq('location_id', locationId);
      if (error) {
        // If column doesn't exist, retry without the filter
        if (error.code === '42703') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('task_lists')
            .select('*')
            .order('name', { ascending: true });
          if (fallbackError) throw fallbackError;
          return { success: true, data: fallbackData };
        }
        throw error;
      }

      return { success: true, data };
    }

    const { data, error } = await baseQuery;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    logger.error('Error fetching task lists:', error);
    return { success: false, error };
  }
}

/**
 * Updates a task list
 * @param {string} taskListId - Task list ID
 * @param {Object} updates - Updated fields
 * @returns {Promise<Object>} Result
 */
export async function updateTaskList(taskListId, updates) {
  try {
    const { data, error } = await supabase
      .from('task_lists')
      .update(updates)
      .eq('id', taskListId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    logger.error('Error updating task list:', error);
    return { success: false, error };
  }
}

/**
 * Deletes a task list
 * @param {string} taskListId - Task list ID
 * @returns {Promise<Object>} Result
 */
export async function deleteTaskList(taskListId) {
  try {
    const { error } = await supabase
      .from('task_lists')
      .delete()
      .eq('id', taskListId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error deleting task list:', error);
    return { success: false, error };
  }
}

/**
 * Fetches a single task list by ID
 * @param {string} taskListId - Task list ID
 * @returns {Promise<Object>} Task list
 */
export async function fetchTaskList(taskListId) {
  try {
    const { data, error } = await supabase
      .from('task_lists')
      .select('*')
      .eq('id', taskListId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    logger.error('Error fetching task list:', error);
    return { success: false, error };
  }
}