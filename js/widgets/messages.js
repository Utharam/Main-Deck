/**
 * js/widgets/messages.js - Footer Human Encouragement & After-Hours Messages
 */

import * as store from '../store.js';
import { isWithinWorkingHours } from '../utils/time.js';

let intervalId = null;

export const widget = {
  name: 'messages',
  label: 'Messages',

  async render(container) {
    const settings = await store.getAllSettings();
    const isWorkTime = isWithinWorkingHours(settings.workStart, settings.workEnd, settings.workingDays);
    const messages = await store.getMessages();

    let pool = messages;
    if (!isWorkTime) {
      const afterHours = messages.filter(m => m.category === 'afterhours');
      if (afterHours.length > 0) pool = afterHours;
    }

    if (pool.length === 0) {
      container.textContent = 'One thing at a time.';
      return;
    }

    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    container.textContent = `💬 "${randomMsg.text}"`;

    if (intervalId) clearInterval(intervalId);

    // Rotate every 60 seconds
    intervalId = setInterval(async () => {
      const currentSettings = await store.getAllSettings();
      const currentWorkTime = isWithinWorkingHours(currentSettings.workStart, currentSettings.workEnd, currentSettings.workingDays);
      const allMsgs = await store.getMessages();

      let activePool = allMsgs;
      if (!currentWorkTime) {
        const ah = allMsgs.filter(m => m.category === 'afterhours');
        if (ah.length > 0) activePool = ah;
      }

      if (activePool.length > 0) {
        const nextMsg = activePool[Math.floor(Math.random() * activePool.length)];
        container.textContent = `💬 "${nextMsg.text}"`;
      }
    }, 60000);
  }
};
