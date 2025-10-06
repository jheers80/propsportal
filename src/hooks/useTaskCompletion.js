import { useState } from 'react';
import { getSessionToken } from '../lib/supabaseClient';
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
      // Get session token for authenticated request to server API
      const token = await getSessionToken();
      if (!token) throw new Error('User not authenticated');

      const res = await fetch('/api/task-instances/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ instance_id: instanceId, notes })
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to complete');
        return { success: false, error: json.error || 'Failed to complete' };
      }

      return { success: true, data: json };
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