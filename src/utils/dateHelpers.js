/**
 * Date Helper Utilities
 * Date manipulation and formatting utilities
 */

/**
 * Formats date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats date and time for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Gets relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === 0 && diffHours > 0) return `in ${diffHours} hours`;
  if (diffDays === 0 && diffHours === 0 && diffMinutes > 0) return `in ${diffMinutes} minutes`;
  if (diffDays === 0) return 'now';
  if (diffDays === -1) return 'yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;

  return formatDate(date);
}

/**
 * Checks if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const today = new Date();
  const target = new Date(date);

  return today.getFullYear() === target.getFullYear() &&
         today.getMonth() === target.getMonth() &&
         today.getDate() === target.getDate();
}

/**
 * Checks if date is overdue
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isOverdue(date) {
  return new Date(date) < new Date();
}

/**
 * Gets start of day for a date
 * @param {Date|string} date - Date
 * @returns {Date} Start of day
 */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets end of day for a date
 * @param {Date|string} date - Date
 * @returns {Date} End of day
 */
export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}