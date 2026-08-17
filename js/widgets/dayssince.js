/**
 * js/widgets/dayssince.js - Days Since Activity Tracker
 * Not a streak system. Just a quiet statement of fact: "It's been X days."
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';
import { calculateDaysSince } from '../utils/time.js';

const DEFAULT_ACTIVITIES = [
  { id: 'act-1', name: 'Called Mom / Family', icon: '📞', lastDate: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'act-2', name: 'Went to Gym / Exercise', icon: '🏋️', lastDate: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'act-3', name: 'Read a Book', icon: '📖', lastDate: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: 'act-4', name: 'Worked on Certification', icon: '🎓', lastDate: new Date(Date.now() - 3 * 86400000).toISOString() }
];

export const widget = {
  name: 'dayssince',
  label: 'Days Since',
  icon: '🕐',

  async render(container) {
    let activities = await store.getActivities();
    if (activities.length === 0) {
      for (const act of DEFAULT_ACTIVITIES) {
        await store.saveActivity(act);
      }
      activities = await store.getActivities();
    }

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">🕐 Days Since</div>
          <button class="btn-icon btn-xs" id="widget-add-activity" title="Add activity">+</button>
        </div>
        <div class="widget-body">
          ${activities.length === 0 
            ? emptyStateHtml('No activities logged.') 
            : activities.map(a => {
              const days = calculateDaysSince(a.lastDate);
              const daysLabel = days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;
              return `
                <div class="kv-row activity-row" style="align-items: center; padding: 4px 0;">
                  <div style="display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden;">
                    <span>${escapeHtml(a.icon || '🎯')}</span>
                    <span style="font-weight: 500; font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(a.name)}
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="badge ${days > 7 ? 'badge-warning' : 'badge-default'}">${daysLabel}</span>
                    <button class="btn-icon btn-xs btn-reset-activity" data-id="${escapeHtml(a.id)}" title="Reset to today">🔄</button>
                    <button class="btn-icon btn-xs btn-delete-activity" data-id="${escapeHtml(a.id)}" title="Delete">✕</button>
                  </div>
                </div>
              `;
            }).join('')}
        </div>
      </div>
    `;

    // Event: Add Activity
    const addBtn = container.querySelector('#widget-add-activity');
    if (addBtn) {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showModal({
          title: 'Track "Days Since"',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="act-name">Activity / Habit</label>
              <input type="text" id="act-name" placeholder="e.g. Call Mom / Family outing" required />
            </div>
            <div class="form-row" style="margin-top: 12px;">
              <div class="form-group">
                <label class="form-label" for="act-icon">Icon / Emoji</label>
                <input type="text" id="act-icon" value="🎯" style="max-width: 70px; text-align: center;" />
              </div>
              <div class="form-group">
                <label class="form-label" for="act-days-ago">Last Done (Days Ago)</label>
                <input type="number" id="act-days-ago" min="0" value="0" />
              </div>
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Activity',
              className: 'btn-primary',
              onClick: async (body) => {
                const name = body.querySelector('#act-name').value.trim();
                const icon = body.querySelector('#act-icon').value.trim() || '🎯';
                const daysAgo = parseInt(body.querySelector('#act-days-ago').value, 10) || 0;

                if (!name) return false;
                const lastDate = new Date(Date.now() - daysAgo * 86400000).toISOString();
                await store.saveActivity({
                  name,
                  icon,
                  lastDate
                });
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }

    // Event: Reset Activity (Done Today)
    container.querySelectorAll('.btn-reset-activity').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const act = activities.find(a => a.id === id);
        if (act) {
          act.lastDate = new Date().toISOString();
          await store.saveActivity(act);
          await this.render(container);
        }
      });
    });

    // Event: Delete Activity
    container.querySelectorAll('.btn-delete-activity').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await store.deleteActivity(id);
        await this.render(container);
      });
    });
  }
};
