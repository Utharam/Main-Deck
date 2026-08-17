/**
 * js/pages/home.js - Home Page Dashboard with Quick Links & Status Overview
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { isWithinWorkingHours } from '../utils/time.js';

const DEFAULT_QUICK_LINKS = [
  { id: 'ql-1', name: 'Google Sheets', url: 'https://sheets.google.com', icon: '📊' },
  { id: 'ql-2', name: 'Company Portal', url: '#', icon: '🏢' },
  { id: 'ql-3', name: 'Banking / Invoices', url: '#', icon: '💳' },
  { id: 'ql-4', name: 'Accounting System', url: '#', icon: '📑' }
];

export async function render(container) {
  const settings = await store.getAllSettings();
  const userName = settings.userName || 'User';
  const isWorkTime = isWithinWorkingHours(settings.workStart, settings.workEnd, settings.workingDays);

  const projects = await store.getProjects();
  const activeProjects = projects.filter(p => p.status !== 'completed');

  let links = await store.getSetting('quickLinks', null);
  if (!links) {
    links = DEFAULT_QUICK_LINKS;
    await store.setSetting('quickLinks', links);
  }

  container.innerHTML = `
    <div class="page-container">
      <!-- Welcome Greeting & Status -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h2>Welcome back, ${escapeHtml(userName)}</h2>
          <span class="badge ${isWorkTime ? 'badge-primary' : 'badge-default'}">
            ${isWorkTime ? '💼 Working Hours' : '🌙 Outside Hours'}
          </span>
        </div>
        <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-top: 4px;">
          ${isWorkTime 
            ? 'Focus on what matters. Finish what you can. Leave the rest for tomorrow.'
            : 'You are outside working hours. Take a breath and remember to disconnect.'}
        </p>
      </div>

      <!-- Quick Metrics & Philosophy -->
      <div class="form-row">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Active Projects</h3>
            <a href="#projects" class="btn btn-xs btn-secondary">View all</a>
          </div>
          <div style="font-size: var(--font-size-2xl); font-weight: bold; color: var(--color-primary);">
            ${activeProjects.length}
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            ${activeProjects.length === 0 ? 'No active projects currently.' : 'Structured projects in motion'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Work Philosophy</h3>
          </div>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.6;">
            1. Work deserves focus.<br>
            2. Rest deserves permission.<br>
            3. Life deserves the remaining time.
          </p>
        </div>
      </div>

      <!-- Core Work Navigation -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Workspace Navigation</h3>
        </div>
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <a href="#projects" class="btn btn-secondary">📋 Projects & Tasks</a>
          <a href="#phases" class="btn btn-secondary">🧩 Phases</a>
          <a href="#sop" class="btn btn-secondary">📚 Standard Procedures (SOP)</a>
          <a href="#notes" class="btn btn-secondary">📝 Notes</a>
          <a href="#stressbuster" class="btn btn-secondary">🧠 2-Minute Reset</a>
        </div>
      </div>

      <!-- Quick Links Section (Main Page Last Item) -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">🔗 Quick Launch Links</h3>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Fast launchpad for external corporate tools and spreadsheets.
            </div>
          </div>
          <button class="btn btn-xs btn-primary" id="btn-home-add-link">+ Add Link</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3); margin-top: var(--space-2);">
          ${links.map(l => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-3); background-color: var(--color-bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" style="display: flex; align-items: center; gap: 6px; text-decoration: none; color: var(--color-text-main); font-weight: 500; font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                <span>${escapeHtml(l.icon || '🔗')}</span>
                <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(l.name)}</span>
              </a>
              <button class="btn-icon btn-xs btn-delete-quicklink" data-id="${escapeHtml(l.id)}" title="Delete link" style="color: var(--color-text-subtle);">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach Event: Add Quick Link
  const addLinkBtn = container.querySelector('#btn-home-add-link');
  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', async () => {
      await showModal({
        title: 'Add Quick Launch Link',
        contentHtml: `
          <div class="form-group">
            <label class="form-label" for="link-name">Tool / Site Name</label>
            <input type="text" id="link-name" placeholder="e.g. ERP System / Google Drive" required />
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
      render(container);
    });
  }

  // Attach Event: Delete Quick Link
  container.querySelectorAll('.btn-delete-quicklink').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      let current = (await store.getSetting('quickLinks', [])) || [];
      current = current.filter(l => l.id !== id);
      await store.setSetting('quickLinks', current);
      render(container);
    });
  });
}
