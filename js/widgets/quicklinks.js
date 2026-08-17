/**
 * js/widgets/quicklinks.js - Corporate Quick Links Launcher Widget
 */

import * as store from '../store.js';
import { escapeHtml, emptyStateHtml, showModal } from '../ui.js';

const DEFAULT_QUICK_LINKS = [
  { id: 'ql-1', name: 'Google Sheets', url: 'https://sheets.google.com', icon: '📊' },
  { id: 'ql-2', name: 'Company Portal', url: '#', icon: '🏢' },
  { id: 'ql-3', name: 'Banking / Invoices', url: '#', icon: '💳' },
  { id: 'ql-4', name: 'Accounting System', url: '#', icon: '📑' }
];

export const widget = {
  name: 'quicklinks',
  label: 'Quick Links',
  icon: '🔗',

  async render(container) {
    let links = await store.getSetting('quickLinks', null);
    if (!links) {
      links = DEFAULT_QUICK_LINKS;
      await store.setSetting('quickLinks', links);
    }

    container.innerHTML = `
      <div class="widget-card">
        <div class="widget-header">
          <div class="widget-title">🔗 Quick Links</div>
          <button class="btn-icon btn-xs" id="widget-add-link" title="Add custom link">+</button>
        </div>
        <div class="widget-body">
          ${links.length === 0 
            ? emptyStateHtml('No quick links configured.') 
            : `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2);">
                ${links.map(l => `
                  <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-xs" style="justify-content: flex-start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <span>${escapeHtml(l.icon || '🔗')}</span>
                    <span>${escapeHtml(l.name)}</span>
                  </a>
                `).join('')}
               </div>`
          }
        </div>
      </div>
    `;

    // Event: Add Link
    const addBtn = container.querySelector('#widget-add-link');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        await showModal({
          title: 'Add Quick Link',
          contentHtml: `
            <div class="form-group">
              <label class="form-label" for="link-name">Title / Label</label>
              <input type="text" id="link-name" placeholder="e.g. ERP System" required />
            </div>
            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" for="link-url">URL</label>
              <input type="url" id="link-url" placeholder="https://..." required />
            </div>
          `,
          buttons: [
            { text: 'Cancel', className: 'btn-ghost', value: null },
            {
              text: 'Add Link',
              className: 'btn-primary',
              onClick: async (body) => {
                const name = body.querySelector('#link-name').value.trim();
                const url = body.querySelector('#link-url').value.trim();
                if (!name || !url) return false;

                const current = (await store.getSetting('quickLinks', [])) || [];
                current.push({
                  id: 'ql-' + Date.now(),
                  name,
                  url,
                  icon: '🔗'
                });
                await store.setSetting('quickLinks', current);
                return true;
              }
            }
          ]
        });
        await this.render(container);
      });
    }
  }
};
