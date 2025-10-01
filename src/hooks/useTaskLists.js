import { useState, useEffect } from 'react';
import { fetchTaskLists, createTaskList, updateTaskList, deleteTaskList } from '../services/taskListService';

/**
 * Custom hook for managing task lists
 * @returns {Object} Task lists data and methods
 */
export function useTaskLists() {
  const [taskLists, setTaskLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch task lists on mount
  useEffect(() => {
    fetchLists();
  }, []);

  /**
   * Fetches task lists from the database
   */
  const fetchLists = async () => {
    setLoading(true);
    setError(null);

    const result = await fetchTaskLists();

    if (result.success) {
      setTaskLists(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  /**
   * Creates a new task list
   * @param {Object} taskListData - Task list data
   * @returns {Promise<Object>} Result
   */
  const handleCreateTaskList = async (taskListData) => {
    const result = await createTaskList(taskListData);

    if (result.success) {
      await fetchLists(); // Refresh list
    }

    return result;
  };

  /**
   * Updates an existing task list
   * @param {string} taskListId - Task list ID
   * @param {Object} updates - Updated fields
   * @returns {Promise<Object>} Result
   */
  const handleUpdateTaskList = async (taskListId, updates) => {
    const result = await updateTaskList(taskListId, updates);

    if (result.success) {
      await fetchLists(); // Refresh list
    }

    return result;
  };

  /**
   * Deletes a task list
   * @param {string} taskListId - Task list ID
   * @returns {Promise<Object>} Result
   */
  const handleDeleteTaskList = async (taskListId) => {
    const result = await deleteTaskList(taskListId);

    if (result.success) {
      await fetchLists(); // Refresh list
    }

    return result;
  };

  return {
    taskLists,
    loading,
    error,
    createTaskList: handleCreateTaskList,
    updateTaskList: handleUpdateTaskList,
    deleteTaskList: handleDeleteTaskList,
    refetch: fetchLists
  };
}