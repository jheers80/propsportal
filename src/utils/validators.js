/**
 * Validation Utilities
 * Input validation functions
 */

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