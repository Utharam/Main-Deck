/**
 * js/widgets/meetings.js - Upcoming Meetings Attention Widget
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';

export const widget = {
  name: 'meetings',
  label: 'Meetings',
  icon: '👥',

  async render(container) {
    const meetings = await store.getMeetings();
    const activeMeetings = meetings.filter(m => m.status !== 'done');

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">👥 Meetings</div>
          <button class="btn-icon btn-xs" id="widget-add-meeting" title="Add meeting">+</button>
        </div>
        <div class="widget-body">
          ${activeMeetings.length === 0 
            ? emptyStateHtml('Nothing on the calendar.') 
            : activeMeetings.map(m => `
              <div class="kv-row meeting-row" data-id="${escapeHtml(m.id)}" style="cursor: pointer; padding: 4px 0;">
                <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
                  ${escapeHtml(m.title)}
                </span>
                <span class="badge badge-default">${escapeHtml(m.time || 'Today')}</span>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    // Event: Add Meeting
    const addBtn = container.querySelector('#widget-add-meeting');
    if (addBtn) {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showModal({
          title: 'Schedule / Prepare Meeting',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="meeting-title">Meeting Title</label>
              <input type="text" id="meeting-title" placeholder="e.g. CFO + 1 Review" required />
            </div>
            <div class="form-row" style="margin-top: 12px;">
              <div class="form-group">
                <label class="form-label" for="meeting-time">Time</label>
                <input type="text" id="meeting-time" placeholder="e.g. 2:00 PM / In 20 min" />
              </div>
              <div class="form-group">
                <label class="form-label" for="meeting-link">Room Link / URL (Optional)</label>
                <input type="url" id="meeting-link" placeholder="https://meet.google.com/..." />
              </div>
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="meeting-people">People / Attendees (comma separated)</label>
              <input type="text" id="meeting-people" placeholder="CFO, Finance Manager, Alex" />
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="meeting-agenda">Discussion / Agenda Points</label>
              <textarea id="meeting-agenda" rows="3" placeholder="• MIS variance&#10;• Cash position&#10;• Pending approvals"></textarea>
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Meeting',
              className: 'btn-primary',
              onClick: async (body) => {
                const title = body.querySelector('#meeting-title').value.trim();
                const time = body.querySelector('#meeting-time').value.trim() || 'Today';
                const link = body.querySelector('#meeting-link').value.trim();
                const people = body.querySelector('#meeting-people').value.trim();
                const agenda = body.querySelector('#meeting-agenda').value.trim();

                if (!title) return false;
                await store.saveMeeting({
                  title,
                  time,
                  link,
                  people,
                  agenda,
                  status: 'scheduled'
                });
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }

    // Event: Click Meeting Row for Detail View
    container.querySelectorAll('.meeting-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const id = row.getAttribute('data-id');
        const meeting = activeMeetings.find(m => m.id === id);
        if (meeting) {
          await openMeetingDetailModal(meeting, container, this);
        }
      });
    });
  }
};

async function openMeetingDetailModal(meeting, container, widgetInstance) {
  const peopleList = (meeting.people || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  const agendaList = (meeting.agenda || '')
    .split('\n')
    .map(a => a.trim())
    .filter(Boolean);

  await showModal({
    title: `👥 Meeting: ${escapeHtml(meeting.title)}`,
    contentHtml: `
      <div class="kv-row">
        <span class="kv-label">Scheduled Time:</span>
        <span class="kv-value">${escapeHtml(meeting.time || 'Today')}</span>
      </div>

      ${meeting.link ? `
        <div class="kv-row">
          <span class="kv-label">Join Link:</span>
          <span class="kv-value"><a href="${escapeHtml(meeting.link)}" target="_blank" rel="noopener">🔗 Open Meeting Room ↗</a></span>
        </div>
      ` : ''}

      <div style="margin-top: 12px;">
        <span class="form-label">Attendees:</span>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
          ${peopleList.length === 0 
            ? '<span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">None specified</span>' 
            : peopleList.map(p => `<span class="badge badge-default">👤 ${escapeHtml(p)}</span>`).join('')}
        </div>
      </div>

      <div style="margin-top: 12px;">
        <span class="form-label">Agenda / Discussion:</span>
        ${agendaList.length === 0 
          ? '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; margin-top: 4px;">No agenda points entered.</div>'
          : `<ul style="font-size: var(--font-size-sm); margin-top: 6px; padding-left: 18px; line-height: 1.6;">
              ${agendaList.map(a => `<li>${escapeHtml(a.replace(/^[•\-\*]\s*/, ''))}</li>`).join('')}
             </ul>`
        }
      </div>
    `,
    buttons: [
      {
        text: '🗑️ Delete',
        className: 'btn-danger btn-sm',
        onClick: async () => {
          await store.deleteMeeting(meeting.id);
          await widgetInstance.render(container);
          return true;
        }
      },
      ...(meeting.link ? [{
        text: '🔗 Join Room',
        className: 'btn-secondary btn-sm',
        onClick: () => {
          window.open(meeting.link, '_blank');
          return true;
        }
      }] : []),
      {
        text: '✅ Done / Finished',
        className: 'btn-primary btn-sm',
        onClick: async () => {
          meeting.status = 'done';
          await store.saveMeeting(meeting);
          await widgetInstance.render(container);
          return true;
        }
      }
    ]
  });
}
