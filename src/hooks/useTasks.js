import { useState, useEffect, useCallback } from 'react';
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
  }, [taskListId, fetchTasks]);

  /**
   * Fetches tasks from the database
   */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchTasksWithInstances(taskListId);

    if (result.success) {
      setTasks(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [taskListId]);

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