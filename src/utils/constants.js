/**
 * Application Constants
 * Shared constants used throughout the application
 */

// Recurrence types
export const RECURRENCE_TYPES = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  INTERVAL: 'interval'
};

// Recurrence units for interval type
export const RECURRENCE_UNITS = {
  DAYS: 'days',
  WEEKS: 'weeks',
  MONTHS: 'months'
};

// Task instance statuses
export const TASK_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  REPLACED: 'replaced'
};

// Days of week (0 = Sunday, 6 = Saturday)
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

// Common days of month
export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

// Filter options
export const TASK_FILTERS = {
  ALL: 'all',
  TODAY: 'today',
  OVERDUE: 'overdue',
  COMPLETED: 'completed'
};

// Default pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_COMPLETION_HISTORY = 100;

// Date/time formats
export const DATE_FORMAT = 'en-US';
export const DATETIME_FORMAT = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
};

// Completion history retention (in months)
export const COMPLETION_RETENTION_MONTHS = 6;