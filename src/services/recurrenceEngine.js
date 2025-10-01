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
 * @param {number[]} weekdays - Array of weekday numbers (0=Sun, 1=Mon, ..., 6=Sat)
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