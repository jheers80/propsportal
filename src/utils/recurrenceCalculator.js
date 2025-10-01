/**
 * Recurrence Calculator
 * Recurrence math functions and utilities
 */

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
 * Gets the next occurrence of a recurring event
 * @param {Date} startDate - Start date
 * @param {Object} recurrence - Recurrence configuration
 * @returns {Date} Next occurrence
 */
export function getNextRecurrence(startDate, recurrence) {
  const baseDate = new Date(startDate);

  switch (recurrence.type) {
    case 'daily':
      return addDays(baseDate, 1);

    case 'weekly':
      if (recurrence.specificDays && recurrence.specificDays.length > 0) {
        return getNextWeekday(baseDate, recurrence.specificDays);
      }
      return addDays(baseDate, 7);

    case 'monthly':
      if (recurrence.specificDays && recurrence.specificDays.length > 0) {
        return getNextMonthDay(baseDate, recurrence.specificDays);
      }
      return addMonths(baseDate, 1);

    case 'interval':
      return addInterval(baseDate, recurrence.interval, recurrence.unit);

    default:
      return baseDate;
  }
}

/**
 * Gets next occurrence of specific weekdays
 * @param {Date} fromDate - Starting date
 * @param {number[]} weekdays - Array of weekday numbers (0=Sun, 6=Sat)
 * @returns {Date} Next occurrence
 */
function getNextWeekday(fromDate, weekdays) {
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
function getNextMonthDay(fromDate, monthDays) {
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

/**
 * Adjusts date if it falls on invalid day of month
 * @param {Date} date - Date to adjust
 * @returns {Date} Adjusted date
 */
function adjustForMonthEnd(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const requestedDay = date.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  if (requestedDay > lastDayOfMonth) {
    return new Date(year, month, lastDayOfMonth);
  }

  return date;
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