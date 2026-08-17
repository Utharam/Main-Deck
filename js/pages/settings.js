/**
 * js/pages/settings.js - Settings, Location & Custom Quotes View (Main Deck)
 */

import * as store from '../store.js';
import { escapeHtml } from '../ui.js';
import { exportFullBackup } from '../utils/export.js';
import { readJsonFile, handleImport } from '../utils/import.js';
import { renderAllWidgets } from '../app.js';

const LOCATION_PRESETS = [
  { label: 'Auto-detect from System Timezone / Geolocation', city: '', lat: '', lon: '' },
  { label: 'GMT+5:00 — Karachi / Islamabad (Pakistan)', city: 'Karachi', lat: '24.86', lon: '67.00' },
  { label: 'GMT+5:30 — New Delhi / Mumbai (India)', city: 'New Delhi', lat: '28.61', lon: '77.20' },
  { label: 'GMT+4:00 — Dubai / Abu Dhabi (UAE)', city: 'Dubai', lat: '25.20', lon: '55.27' },
  { label: 'GMT+3:00 — Riyadh / Doha / Kuwait', city: 'Riyadh', lat: '24.71', lon: '46.67' },
  { label: 'GMT+6:00 — Dhaka / Almaty', city: 'Dhaka', lat: '23.81', lon: '90.41' },
  { label: 'GMT+8:00 — Singapore / Hong Kong / Beijing', city: 'Singapore', lat: '1.35', lon: '103.82' },
  { label: 'GMT+9:00 — Tokyo / Seoul', city: 'Tokyo', lat: '35.67', lon: '139.65' },
  { label: 'GMT+0:00 — London (UK)', city: 'London', lat: '51.50', lon: '-0.12' },
  { label: 'GMT+1:00 — Paris / Berlin / Amsterdam', city: 'Paris', lat: '48.85', lon: '2.35' },
  { label: 'GMT-5:00 — New York / Toronto / Eastern US', city: 'New York', lat: '40.71', lon: '-74.00' },
  { label: 'GMT-6:00 — Chicago / Central US', city: 'Chicago', lat: '41.87', lon: '-87.62' },
  { label: 'GMT-8:00 — Los Angeles / San Francisco / Pacific', city: 'San Francisco', lat: '37.77', lon: '-122.41' }
];

export async function render(container) {
  const settings = await store.getAllSettings();
  const metaInstalled = await store.getMeta('installedAt');
  const metaLastBackup = await store.getMeta('lastBackupAt');
  const allMessages = await store.getMessages();

  // Find user-added custom quotes (or display all)
  const customMessages = allMessages.filter(m => m.isCustom || !m.id.startsWith('msg-'));

  container.innerHTML = `
    <div class="page-container">
      <!-- 1. Preferences & Profile Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">⚙️ Preferences & Profile</h2>
        </div>
        
        <form id="settings-form" style="display: flex; flex-direction: column; gap: var(--space-4);">
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
              <label class="form-label" for="setting-theme">Appearance Theme</label>
              <select id="setting-theme">
                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Calm Light</option>
                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Focused Dark</option>
              </select>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--color-border); margin: var(--space-2) 0;" />

          <div class="card-header" style="border: none; padding: 0;">
            <h3 class="card-title" style="font-size: var(--font-size-md);">🌦️ Weather Location & Coordinates</h3>
          </div>

          <div class="form-group">
            <label class="form-label" for="setting-location-preset">Assisted Location / GMT Offset Preset</label>
            <select id="setting-location-preset">
              ${LOCATION_PRESETS.map((p) => {
                const isSelected = settings.weatherCity === p.city && (settings.weatherLat || '') === p.lat;
                return `<option value="${escapeHtml(JSON.stringify(p))}" ${isSelected ? 'selected' : ''}>${escapeHtml(p.label)}</option>`;
              }).join('')}
            </select>
            <span class="form-help">Select your general region or enter a custom city / coordinates below.</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="setting-weather-city">City Name (Display)</label>
              <input type="text" id="setting-weather-city" value="${escapeHtml(settings.weatherCity || '')}" placeholder="e.g. Karachi / Mumbai / Dubai" />
            </div>

            <div class="form-group">
              <label class="form-label" for="setting-weather-lat">Latitude (Optional)</label>
              <input type="text" id="setting-weather-lat" value="${escapeHtml(settings.weatherLat || '')}" placeholder="e.g. 24.86" />
            </div>

            <div class="form-group">
              <label class="form-label" for="setting-weather-lon">Longitude (Optional)</label>
              <input type="text" id="setting-weather-lon" value="${escapeHtml(settings.weatherLon || '')}" placeholder="e.g. 67.00" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: var(--space-2);">
            <button type="submit" class="btn btn-primary">Save Preferences</button>
          </div>
        </form>
      </div>

      <!-- 2. Custom Quotes & Encouragements Card -->
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

      <!-- 3. Local Storage, Portability & Backups Card -->
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

  // Preset selection auto-fills city, lat, lon
  const presetSelect = container.querySelector('#setting-location-preset');
  const cityInput = container.querySelector('#setting-weather-city');
  const latInput = container.querySelector('#setting-weather-lat');
  const lonInput = container.querySelector('#setting-weather-lon');

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      try {
        const selected = JSON.parse(e.target.value);
        if (selected.city) {
          cityInput.value = selected.city;
          latInput.value = selected.lat;
          lonInput.value = selected.lon;
        } else {
          cityInput.value = '';
          latInput.value = '';
          lonInput.value = '';
        }
      } catch (err) {}
    });
  }

  // Attach Form Submit Handler
  const form = container.querySelector('#settings-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userName = container.querySelector('#setting-name').value.trim() || 'User';
      const workStart = container.querySelector('#setting-work-start').value || '09:00';
      const workEnd = container.querySelector('#setting-work-end').value || '18:00';
      const timezone = container.querySelector('#setting-timezone').value.trim() || 'UTC';
      const theme = container.querySelector('#setting-theme').value;

      const weatherCity = cityInput.value.trim();
      let weatherLat = latInput.value.trim();
      let weatherLon = lonInput.value.trim();

      // Geocoding lookup if city entered without coordinates
      if (weatherCity && (!weatherLat || !weatherLon)) {
        try {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&count=1`);
          if (geoRes.ok) {
            const geoJson = await geoRes.json();
            if (geoJson.results && geoJson.results.length > 0) {
              weatherLat = String(geoJson.results[0].latitude);
              weatherLon = String(geoJson.results[0].longitude);
            }
          }
        } catch (err) {}
      }

      await store.setSetting('userName', userName);
      await store.setSetting('workStart', workStart);
      await store.setSetting('workEnd', workEnd);
      await store.setSetting('timezone', timezone);
      await store.setSetting('theme', theme);
      await store.setSetting('weatherCity', weatherCity);
      await store.setSetting('weatherLat', weatherLat);
      await store.setSetting('weatherLon', weatherLon);

      document.documentElement.setAttribute('data-theme', theme);
      await renderAllWidgets();
      alert('Preferences & Location saved successfully!');
    });
  }

  // Attach Event: Add Custom Quote
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

  // Attach Event: Delete Custom Quote
  container.querySelectorAll('.btn-delete-quote').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const msgId = btn.getAttribute('data-id');
      await store.deleteMessage(msgId);
      render(container);
    });
  });

  // Attach Export Backup Handler
  const exportBtn = container.querySelector('#btn-export-backup');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      await exportFullBackup();
      render(container);
    });
  }

  // Attach Import Backup Handler
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
