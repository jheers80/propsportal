import { useState } from 'react';
import { completeTask } from '../services/taskService';
import { supabase } from '../lib/supabaseClient';
import logger from '../lib/logger';

/**
 * Custom hook for task completion functionality
 * @returns {Object} Completion methods and state
 */
export function useTaskCompletion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Completes a task instance
   * @param {string} instanceId - Task instance ID
   * @param {string} notes - Optional completion notes
   * @returns {Promise<Object>} Result
   */
  const handleCompleteTask = async (instanceId, notes = null) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user ID (this should come from your auth context)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await completeTask(instanceId, user.id, notes);

      if (!result.success) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      logger.error('Error completing task via hook:', err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    completeTask: handleCompleteTask,
    loading,
    error
  };
}