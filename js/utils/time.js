/**
 * js/utils/time.js - Date & Time Utilities
 */

/**
 * Format timestamp into standard readable time (e.g. "2:30 PM")
 * @param {string|number|Date} dateVal 
 * @returns {string}
 */
export function formatTime(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format timestamp into standard readable date (e.g. "12 Aug", "Today", "Tomorrow")
 * @param {string|number|Date} dateVal 
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(d);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/**
 * Calculate days elapsed since a date
 * @param {string|number|Date} dateVal 
 * @returns {number}
 */
export function calculateDaysSince(dateVal) {
  if (!dateVal) return 0;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffTime = today - target;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Check if the current time falls inside the user's defined working hours
 * @param {string} start "09:00"
 * @param {string} end "18:00"
 * @param {number[]} workingDays e.g. [1, 2, 3, 4, 5] (Monday to Friday)
 * @returns {boolean}
 */
export function isWithinWorkingHours(start = '09:00', end = '18:00', workingDays = [1, 2, 3, 4, 5]) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday

  if (!workingDays.includes(currentDay)) {
    return false;
  }

  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startHour * 60 + (startMin || 0);
  const endMins = endHour * 60 + (endMin || 0);

  return currentMins >= startMins && currentMins < endMins;
}
