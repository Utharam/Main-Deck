/**
 * js/widgets/emails.js - Emails Attention & Preparation Widget with Full Email ID Support
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';

export const widget = {
  name: 'emails',
  label: 'Emails',
  icon: '✉️',

  async render(container) {
    const emails = await store.getEmails();
    const activeEmails = emails.filter(e => e.status !== 'done');

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">✉️ Emails</div>
          <button class="btn-icon btn-xs" id="widget-add-email" title="Add email">+</button>
        </div>
        <div class="widget-body">
          ${activeEmails.length === 0 
            ? emptyStateHtml('Nothing queued.') 
            : activeEmails.map(e => {
              const primaryEmail = e.email1 || (e.recipient ? e.recipient.split(',')[0] : '');
              const displayLabel = e.subject || primaryEmail || 'Untitled Email';
              return `
                <div class="kv-row email-row" data-id="${escapeHtml(e.id)}" style="cursor: pointer; padding: 4px 0;">
                  <div style="display: flex; flex-direction: column; overflow: hidden; max-width: 190px;">
                    <span style="font-weight: 500; font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(displayLabel)}
                    </span>
                    ${primaryEmail ? `
                      <span style="font-size: 11px; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ✉️ ${escapeHtml(primaryEmail)}
                      </span>
                    ` : ''}
                  </div>
                  <span class="badge badge-default" style="flex-shrink: 0;">${escapeHtml(e.when || 'Today')}</span>
                </div>
              `;
            }).join('')}
        </div>
      </div>
    `;

    // Event: Add Email
    const addBtn = container.querySelector('#widget-add-email');
    if (addBtn) {
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await showModal({
          title: 'Draft / Prepare Email Task',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="email-subject">Subject</label>
              <input type="text" id="email-subject" placeholder="e.g. Missing documents for August closing" required />
            </div>

            <div style="margin-top: 12px;">
              <span class="form-label">Recipient Email Addresses</span>
              <div class="form-row" style="margin-top: 4px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px;" for="email-id-1">Email 1 (Primary)</label>
                  <input type="email" id="email-id-1" placeholder="client@company.com" />
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px;" for="email-id-2">Email 2 (Optional)</label>
                  <input type="email" id="email-id-2" placeholder="finance@company.com" />
                </div>
              </div>

              <div class="form-row" style="margin-top: 6px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px;" for="email-id-3">Email 3 (Optional)</label>
                  <input type="email" id="email-id-3" placeholder="auditor@firm.com" />
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 11px;" for="email-when">Target Time</label>
                  <input type="text" id="email-when" placeholder="e.g. 2:30 PM, Tomorrow" />
                </div>
              </div>

              <div class="form-group" style="margin-top: 6px;">
                <label class="form-label" style="font-size: 11px;" for="email-additional">Additional Emails / CC / BCC (Comma-separated)</label>
                <input type="text" id="email-additional" placeholder="team@company.com, boss@company.com" />
              </div>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="email-points">Key Points to Cover</label>
              <textarea id="email-points" rows="2" placeholder="• Bank statement&#10;• Investment report"></textarea>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="email-attachments">Attachments to Include (comma separated)</label>
              <input type="text" id="email-attachments" placeholder="statement.pdf, reconciliation.xlsx" />
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Save Email Plan',
              className: 'btn-primary',
              onClick: async (body) => {
                const subject = body.querySelector('#email-subject').value.trim();
                const email1 = body.querySelector('#email-id-1').value.trim();
                const email2 = body.querySelector('#email-id-2').value.trim();
                const email3 = body.querySelector('#email-id-3').value.trim();
                const additional = body.querySelector('#email-additional').value.trim();
                const when = body.querySelector('#email-when').value.trim() || 'Today';
                const points = body.querySelector('#email-points').value.trim();
                const attachments = body.querySelector('#email-attachments').value.trim();

                if (!subject && !email1) {
                  alert('Please enter a subject or recipient email.');
                  return false;
                }

                // Combine for quick display
                const allEmails = [email1, email2, email3, ...additional.split(',').map(s => s.trim())].filter(Boolean);

                await store.saveEmail({
                  subject,
                  email1,
                  email2,
                  email3,
                  additionalEmails: additional,
                  recipient: allEmails.join(', '),
                  when,
                  points,
                  attachments,
                  status: 'queued'
                });
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }

    // Event: Click Email Row for Detail View
    container.querySelectorAll('.email-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const id = row.getAttribute('data-id');
        const email = activeEmails.find(e => e.id === id);
        if (email) {
          await openEmailDetailModal(email, container, this);
        }
      });
    });
  }
};

async function openEmailDetailModal(email, container, widgetInstance) {
  const pointsList = (email.points || '')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  const attachmentsList = (email.attachments || '')
    .split(',')
    .map(a => a.trim())
    .filter(Boolean);

  const emailsList = [
    email.email1,
    email.email2,
    email.email3,
    ...(email.additionalEmails ? email.additionalEmails.split(',').map(s => s.trim()) : [])
  ].filter(Boolean);

  // Fallback to legacy recipient field if array empty
  if (emailsList.length === 0 && email.recipient) {
    emailsList.push(...email.recipient.split(',').map(s => s.trim()).filter(Boolean));
  }

  const mailtoLink = emailsList.length > 0
    ? `mailto:${encodeURIComponent(emailsList.join(','))}?subject=${encodeURIComponent(email.subject || '')}`
    : `mailto:?subject=${encodeURIComponent(email.subject || '')}`;

  await showModal({
    title: `✉️ ${escapeHtml(email.subject || 'Email Preparation')}`,
    contentHtml: `
      <div class="kv-row">
        <span class="kv-label">Timing:</span>
        <span class="kv-value">${escapeHtml(email.when || 'Today')}</span>
      </div>

      <div style="margin-top: 12px;">
        <span class="form-label">Recipient Email IDs:</span>
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
          ${emailsList.length === 0 
            ? '<span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">No email address specified</span>' 
            : emailsList.map(r => `
              <a href="mailto:${escapeHtml(r)}" class="badge badge-primary" style="text-decoration: none;" title="Send email to ${escapeHtml(r)}">
                ✉️ ${escapeHtml(r)} ↗
              </a>
            `).join('')}
        </div>
      </div>

      <div style="margin-top: 12px;">
        <span class="form-label">Key Points to Cover:</span>
        ${pointsList.length === 0 
          ? '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; margin-top: 4px;">No points listed.</div>'
          : `<ul style="font-size: var(--font-size-sm); margin-top: 6px; padding-left: 18px; line-height: 1.6;">
              ${pointsList.map(p => `<li>${escapeHtml(p.replace(/^[•\-\*]\s*/, ''))}</li>`).join('')}
             </ul>`
        }
      </div>

      ${attachmentsList.length > 0 ? `
        <div style="margin-top: 12px;">
          <span class="form-label">Attachments Needed:</span>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
            ${attachmentsList.map(a => `<span class="badge badge-default">📎 ${escapeHtml(a)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `,
    buttons: [
      {
        text: '🗑️ Delete',
        className: 'btn-danger btn-sm',
        onClick: async () => {
          await store.deleteEmail(email.id);
          await widgetInstance.render(container);
          return true;
        }
      },
      {
        text: '✉️ Open in Mail Client ↗',
        className: 'btn-secondary btn-sm',
        onClick: () => {
          window.location.href = mailtoLink;
          return false;
        }
      },
      {
        text: '✅ Prepared / Sent',
        className: 'btn-primary btn-sm',
        onClick: async () => {
          email.status = 'done';
          await store.saveEmail(email);
          await widgetInstance.render(container);
          return true;
        }
      }
    ]
  });
}
