/**
 * js/widgets/calls.js - Upcoming Calls Attention Widget
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';

export const widget = {
  name: 'calls',
  label: 'Calls',
  icon: '📞',

  async render(container) {
    const calls = await store.getCalls();
    const activeCalls = calls.filter(c => c.status !== 'done');

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">📞 Calls</div>
          <button class="btn-icon btn-xs" id="widget-add-call" title="Add call">+</button>
        </div>
        <div class="widget-body">
          ${activeCalls.length === 0 
            ? emptyStateHtml('Nothing on the phone today.') 
            : activeCalls.map(c => `
              <div class="kv-row call-row" data-id="${escapeHtml(c.id)}" style="cursor: pointer; padding: 4px 0;">
                <span style="font-weight: 500;">${escapeHtml(c.contact)}</span>
                <span class="badge badge-default">${escapeHtml(c.when || 'Today')}</span>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    // Event: Add Call
    const addBtn = container.querySelector('#widget-add-call');
    if (addBtn) {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showModal({
          title: 'Schedule / Prepare Call',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="call-contact">Contact Name</label>
              <input type="text" id="call-contact" placeholder="e.g. Josh / Client X" required />
            </div>
            <div class="form-row" style="margin-top: 12px;">
              <div class="form-group">
                <label class="form-label" for="call-when">When</label>
                <input type="text" id="call-when" placeholder="e.g. 2:30 PM, Tomorrow" />
              </div>
              <div class="form-group">
                <label class="form-label" for="call-phone">Phone / Extension (Optional)</label>
                <input type="text" id="call-phone" placeholder="e.g. +1-555-0199" />
              </div>
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="call-points">Discussion Points (one per line)</label>
              <textarea id="call-points" rows="3" placeholder="• Missing statement&#10;• Confirm transfer&#10;• Ask closing date"></textarea>
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Call',
              className: 'btn-primary',
              onClick: async (body) => {
                const contact = body.querySelector('#call-contact').value.trim();
                const when = body.querySelector('#call-when').value.trim() || 'Today';
                const phone = body.querySelector('#call-phone').value.trim();
                const points = body.querySelector('#call-points').value.trim();

                if (!contact) return false;
                await store.saveCall({
                  contact,
                  when,
                  phone,
                  points,
                  status: 'scheduled',
                  lastContact: new Date().toLocaleDateString([], { day: 'numeric', month: 'short' })
                });
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }

    // Event: Click Call Row to Open Detail View
    container.querySelectorAll('.call-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const id = row.getAttribute('data-id');
        const call = activeCalls.find(c => c.id === id);
        if (call) {
          await openCallDetailModal(call, container, this);
        }
      });
    });
  }
};

async function openCallDetailModal(call, container, widgetInstance) {
  const pointsList = (call.points || '')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  await showModal({
    title: `📞 Call: ${escapeHtml(call.contact)}`,
    contentHtml: `
      <div class="kv-row">
        <span class="kv-label">Scheduled For:</span>
        <span class="kv-value">${escapeHtml(call.when || 'Today')}</span>
      </div>
      ${call.phone ? `
        <div class="kv-row">
          <span class="kv-label">Number:</span>
          <span class="kv-value"><a href="tel:${escapeHtml(call.phone)}">${escapeHtml(call.phone)}</a></span>
        </div>
      ` : ''}
      <div class="kv-row">
        <span class="kv-label">Previous Contact:</span>
        <span class="kv-value">${escapeHtml(call.lastContact || 'None recorded')}</span>
      </div>

      <div style="margin-top: 12px;">
        <span class="form-label">Discussion Points:</span>
        ${pointsList.length === 0 
          ? '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; margin-top: 4px;">No bullet points specified.</div>'
          : `<ul style="font-size: var(--font-size-sm); margin-top: 6px; padding-left: 18px; line-height: 1.6;">
              ${pointsList.map(p => `<li>${escapeHtml(p.replace(/^[•\-\*]\s*/, ''))}</li>`).join('')}
             </ul>`
        }
      </div>
    `,
    buttons: [
      {
        text: '🗑️ Delete',
        className: 'btn-danger btn-sm',
        onClick: async () => {
          await store.deleteCall(call.id);
          await widgetInstance.render(container);
          return true;
        }
      },
      {
        text: '🗓️ Reschedule',
        className: 'btn-secondary btn-sm',
        onClick: async () => {
          const newWhen = prompt('Reschedule for when? (e.g. Tomorrow, 4:00 PM)', call.when || '');
          if (newWhen) {
            call.when = newWhen;
            await store.saveCall(call);
            await widgetInstance.render(container);
          }
          return true;
        }
      },
      {
        text: '✅ Done / Finished',
        className: 'btn-primary btn-sm',
        onClick: async () => {
          call.status = 'done';
          await store.saveCall(call);
          await widgetInstance.render(container);
          return true;
        }
      }
    ]
  });
}
