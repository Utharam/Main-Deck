/**
 * js/pages/settings.js - Settings, Profile & Custom Quotes View (Main Deck)
 */

import * as store from '../store.js';
import { escapeHtml } from '../ui.js';
import { exportFullBackup } from '../utils/export.js';
import { readJsonFile, handleImport } from '../utils/import.js';
import { renderAllWidgets, QUIRK_LIST, applyQuirk } from '../app.js';


export async function render(container) {
  const settings = await store.getAllSettings();
  const metaInstalled = await store.getMeta('installedAt');
  const metaLastBackup = await store.getMeta('lastBackupAt');
  const allMessages = await store.getMessages();

  // Find user-added custom quotes
  const customMessages = allMessages.filter(m => m.isCustom || !m.id.startsWith('msg-'));

  container.innerHTML = `
    <div class="page-container">

      <!-- SECTION 1: ⚙️ Preferences & Profile -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">⚙️ Preferences & Profile</h2>
        </div>
        
        <form id="form-preferences" style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="setting-name">Your Name</label>
            <input type="text" id="setting-name" value="${escapeHtml(settings.userName || '')}" placeholder="e.g. Alex" />
            <span class="form-help">Used for personalized dashboard greetings.</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="setting-work-start">Work Start Time</label>
              <input type="time" id="setting-work-start" value="${escapeHtml(settings.workStart || '09:00')}" />
            </div>

            <div class="form-group">
              <label class="form-label" for="setting-work-end">Work End Time</label>
              <input type="time" id="setting-work-end" value="${escapeHtml(settings.workEnd || '18:00')}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="setting-timezone">Timezone</label>
              <input type="text" id="setting-timezone" value="${escapeHtml(settings.timezone || '')}" />
            </div>

            <div class="form-group">
              <label class="form-label" for="setting-theme">Appearance Palette</label>
              <select id="setting-theme">
                <option value="pastel-green" ${(settings.theme === 'pastel-green' || settings.theme === 'light' || !settings.theme) ? 'selected' : ''}>🌿 Soft Pastel Green (Morning Breeze)</option>
                <option value="sage-green" ${settings.theme === 'sage-green' ? 'selected' : ''}>🍃 Executive Sage (Grounding Focus)</option>
                <option value="warm-clay" ${settings.theme === 'warm-clay' ? 'selected' : ''}>🏺 Warm Clay & Sand (Cozy Earth)</option>
                <option value="calm-light" ${settings.theme === 'calm-light' ? 'selected' : ''}>☁️ Calm Studio (Clean & Minimal)</option>
                <option value="midnight-dark" ${(settings.theme === 'midnight-dark' || settings.theme === 'dark') ? 'selected' : ''}>🌘 Midnight Forest (Deep Night)</option>
              </select>
              <span class="form-help">Select to preview instantly.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="setting-quirk">Daily Quirk Accent</label>
              <select id="setting-quirk">
                <option value="auto" ${(settings.quirk || 'auto') === 'auto' ? 'selected' : ''}>🎲 Auto (changes daily)</option>
                ${QUIRK_LIST.map(q => `<option value="${escapeHtml(q.slug)}" ${settings.quirk === q.slug ? 'selected' : ''}>${escapeHtml(q.name)}</option>`).join('')}
              </select>
              <span class="form-help">Subtle daily accent mood.</span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
            <button type="submit" class="btn btn-primary">Save Profile & Appearance</button>
          </div>
        </form>
      </div>

      <!-- SECTION 2: 💬 Custom Quotes & Daily Encouragements -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">💬 Custom Quotes & Daily Encouragements</h3>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              Add your favorite personal mantras, calming quotes, or principles. They will rotate in the footer dock.
            </div>
          </div>
        </div>

        <!-- Add Quote Form -->
        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
          <input type="text" id="new-quote-text" placeholder="e.g. Focus on what you can control, let go of the rest." style="flex: 1; min-width: 260px;" />
          <select id="new-quote-category" style="width: 140px;">
            <option value="focus">🎯 Focus</option>
            <option value="calm">😌 Calm & Rest</option>
            <option value="life">🌿 Life</option>
            <option value="afterhours">🌙 After-Hours</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="btn-add-custom-quote">+ Add Quote</button>
        </div>

        <!-- Custom Quotes List -->
        <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); max-height: 240px; overflow-y: auto;">
          <div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle);">
            Custom Quotes (${customMessages.length})
          </div>

          ${customMessages.length === 0 
            ? '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic;">No custom quotes added yet. Add one above to personalize your footer dock!</div>'
            : customMessages.map(msg => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background-color: var(--color-bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: var(--font-size-xs);">
                <div style="flex: 1; padding-right: 8px; line-height: 1.4;">
                  <span>💬 "${escapeHtml(msg.text)}"</span>
                  <span class="badge badge-default" style="font-size: 10px; margin-left: 6px;">${escapeHtml(msg.category || 'focus')}</span>
                </div>
                <button type="button" class="btn-icon btn-xs btn-delete-quote" data-id="${escapeHtml(msg.id)}" title="Delete quote">✕</button>
              </div>
            `).join('')
          }
        </div>
      </div>

      <!-- SECTION 3: 💾 Local Storage & Portability -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">💾 Local Storage & Portability</h3>
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5;">
          All Main Deck data lives 100% locally in your browser's IndexedDB on this device. Remember to export periodic backups if you reset your browser or switch laptops.
        </p>

        <div class="kv-row">
          <span class="kv-label">First Installed:</span>
          <span class="kv-value">${metaInstalled ? new Date(metaInstalled).toLocaleDateString() : 'Today'}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">Last Backup:</span>
          <span class="kv-value">${metaLastBackup ? new Date(metaLastBackup).toLocaleString() : 'Never'}</span>
        </div>

        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-3); flex-wrap: wrap;">
          <button id="btn-export-backup" class="btn btn-secondary">
            📦 Download Full Backup (JSON)
          </button>

          <label class="btn btn-secondary" style="cursor: pointer;">
            📥 Restore Backup (JSON)
            <input type="file" id="btn-import-backup" accept=".json" style="display: none;" />
          </label>
        </div>
      </div>

    </div>
  `;

  // --- Handlers for SECTION 1: Preferences & Profile ---
  const themeSelect = container.querySelector('#setting-theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.target.value);
    });
  }

  const formPref = container.querySelector('#form-preferences');
  if (formPref) {
    formPref.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userName = container.querySelector('#setting-name').value.trim() || 'User';
      const workStart = container.querySelector('#setting-work-start').value || '09:00';
      const workEnd = container.querySelector('#setting-work-end').value || '18:00';
      const timezone = container.querySelector('#setting-timezone').value.trim() || 'UTC';
      const theme = container.querySelector('#setting-theme').value;
      const quirk = container.querySelector('#setting-quirk').value;

      await store.setSetting('userName', userName);
      await store.setSetting('workStart', workStart);
      await store.setSetting('workEnd', workEnd);
      await store.setSetting('timezone', timezone);
      await store.setSetting('theme', theme);
      await store.setSetting('quirk', quirk);

      document.documentElement.setAttribute('data-theme', theme);

      // Apply quirk immediately
      if (quirk === 'auto') {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        const autoSlug = QUIRK_LIST[dayOfYear % QUIRK_LIST.length].slug;
        applyQuirk(autoSlug);
      } else {
        applyQuirk(quirk);
      }

      await renderAllWidgets();
      alert('Preferences & Profile saved successfully!');
    });
  }

  // --- Handlers for SECTION 2: Custom Quotes & Encouragements ---
  const addQuoteBtn = container.querySelector('#btn-add-custom-quote');
  const quoteInput = container.querySelector('#new-quote-text');
  const quoteCat = container.querySelector('#new-quote-category');

  if (addQuoteBtn && quoteInput) {
    addQuoteBtn.addEventListener('click', async () => {
      const text = quoteInput.value.trim();
      const category = quoteCat.value;
      if (!text) {
        alert('Please enter quote text.');
        return;
      }

      await store.saveMessage({
        text,
        category,
        isCustom: true
      });

      render(container);
    });
  }

  container.querySelectorAll('.btn-delete-quote').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-id');
      await store.deleteMessage(msgId);
      render(container);
    });
  });

  // --- Handlers for SECTION 3: Local Storage & Portability ---
  const exportBtn = container.querySelector('#btn-export-backup');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      await exportFullBackup();
      render(container);
    });
  }

  const importInput = container.querySelector('#btn-import-backup');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const json = await readJsonFile(file);
          const res = await handleImport(json);
          alert(res.message);
          render(container);
        } catch (err) {
          alert(`Restore Error: ${err.message}`);
        }
      }
    });
  }
}
