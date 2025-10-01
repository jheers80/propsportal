/**
 * Permission Service
 * Handles permission checking utilities
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Checks if user has permission to access task list
 * @param {string} userId - User ID
 * @param {string} taskListId - Task list ID
 * @returns {Promise<boolean>} True if user has access
 */
export async function checkTaskListPermission(userId, taskListId) {
  try {
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
  } catch (error) {
    console.error('Error checking task list permission:', error);
    return false;
  }
}

/**
 * Gets user's role from the auth system
 * This should be integrated with your existing auth system
 * @param {string} userId - User ID
 * @returns {Promise<string>} User role ID
 */
export async function getUserRole(userId) {
  try {
    // This is a placeholder - integrate with your existing auth system
    // For now, we'll assume a default role or get it from user metadata
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Get role from user metadata or a custom table
    // This depends on how your auth system stores roles
    return user.user_metadata?.role || 'default';
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Sets user role in Supabase context for RLS
 * @param {string} roleId - User's role ID
 */
export async function setUserRole(roleId) {
  try {
    const { error } = await supabase.rpc('set_user_role', { role_id: roleId });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error setting user role:', error);
    return { success: false, error };
  }
}