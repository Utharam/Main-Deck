/**
 * js/widgets/reminders.js - Timed Reminders Attention Widget
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';
import { sendNotification, requestNotificationPermission } from '../utils/notify.js';

export const widget = {
  name: 'reminders',
  label: 'Reminders',
  icon: '🔔',

  async render(container) {
    const reminders = await store.getReminders();
    const activeReminders = reminders.filter(r => r.status !== 'dismissed');

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">🔔 Reminders</div>
          <button class="btn-icon btn-xs" id="widget-add-reminder" title="Add reminder">+</button>
        </div>
        <div class="widget-body">
          ${activeReminders.length === 0 
            ? emptyStateHtml('All clear.') 
            : activeReminders.map(r => `
              <div class="kv-row reminder-row" data-id="${escapeHtml(r.id)}" style="cursor: pointer; padding: 4px 0;">
                <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
                  ${escapeHtml(r.text)}
                </span>
                <span class="badge badge-warning">${escapeHtml(r.due || 'Now')}</span>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    // Event: Add Reminder
    const addBtn = container.querySelector('#widget-add-reminder');
    if (addBtn) {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await requestNotificationPermission();

        await showModal({
          title: 'Set Reminder',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="reminder-text">Reminder</label>
              <input type="text" id="reminder-text" placeholder="e.g. MIS Review / Submit invoice" required />
            </div>
            <div class="form-row" style="margin-top: 12px;">
              <div class="form-group">
                <label class="form-label" for="reminder-due">When Due</label>
                <select id="reminder-due">
                  <option value="In 15 minutes">In 15 minutes</option>
                  <option value="In 1 hour">In 1 hour</option>
                  <option value="End of Day">End of Day (5:00 PM)</option>
                  <option value="Tomorrow morning">Tomorrow morning</option>
                </select>
              </div>
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Reminder',
              className: 'btn-primary',
              onClick: async (body) => {
                const text = body.querySelector('#reminder-text').value.trim();
                const due = body.querySelector('#reminder-due').value;

                if (!text) return false;
                await store.saveReminder({
                  text,
                  due,
                  status: 'active',
                  createdAt: new Date().toISOString()
                });
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }

    // Event: Click Reminder Row for Detail & Snooze/Dismiss View
    container.querySelectorAll('.reminder-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const id = row.getAttribute('data-id');
        const reminder = activeReminders.find(r => r.id === id);
        if (reminder) {
          await openReminderModal(reminder, container, this);
        }
      });
    });
  }
};

async function openReminderModal(reminder, container, widgetInstance) {
  await showModal({
    title: `🔔 Reminder`,
    contentHtml: `
      <div style="font-size: var(--font-size-md); font-weight: 600; margin-bottom: 8px;">
        ${escapeHtml(reminder.text)}
      </div>
      <div class="kv-row">
        <span class="kv-label">Status:</span>
        <span class="kv-value badge badge-warning">Due: ${escapeHtml(reminder.due || 'Now')}</span>
      </div>
    `,
    buttons: [
      {
        text: '⏰ Snooze +15m',
        className: 'btn-secondary btn-sm',
        onClick: async () => {
          reminder.due = 'In 15 minutes';
          await store.saveReminder(reminder);
          await widgetInstance.render(container);
          return true;
        }
      },
      {
        text: '⏰ Tomorrow',
        className: 'btn-secondary btn-sm',
        onClick: async () => {
          reminder.due = 'Tomorrow';
          await store.saveReminder(reminder);
          await widgetInstance.render(container);
          return true;
        }
      },
      {
        text: '✕ Dismiss',
        className: 'btn-primary btn-sm',
        onClick: async () => {
          reminder.status = 'dismissed';
          await store.saveReminder(reminder);
          await widgetInstance.render(container);
          return true;
        }
      }
    ]
  });
}
