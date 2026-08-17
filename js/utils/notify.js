/**
 * js/utils/notify.js - Safe Browser Notification Utility
 */

/**
 * Request notification permission if not yet granted
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Dispatch a browser notification if permitted
 * @param {string} title 
 * @param {NotificationOptions} options 
 */
export function sendNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: 'assets/icons/favicon.ico',
        ...options
      });
    } catch (e) {
      console.warn('Could not trigger notification:', e);
    }
  }
}
