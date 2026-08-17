/**
 * js/app.js - Main Application Orchestrator, Router & ReadMe Guide
 */

import * as store from './store.js';
import { showBanner, showModal, escapeHtml } from './ui.js';

// Page modules
import * as homePage from './pages/home.js';
import * as projectsPage from './pages/projects.js';
import * as phasesPage from './pages/phases.js';
import * as notesPage from './pages/notes.js';
import * as sopPage from './pages/sop.js';
import * as stressbusterPage from './pages/stressbuster.js';
import * as settingsPage from './pages/settings.js';

// Attention Rail Widgets (Right Column)
import { widget as tasksWidget } from './widgets/tasks.js';
import { widget as callsWidget } from './widgets/calls.js';
import { widget as emailsWidget } from './widgets/emails.js';
import { widget as meetingsWidget } from './widgets/meetings.js';
import { widget as remindersWidget } from './widgets/reminders.js';
import { widget as dayssinceWidget } from './widgets/dayssince.js';

// Header & Footer Special Docks
import { widget as weatherWidget } from './widgets/weather.js';
import { widget as stressWidget } from './widgets/stress.js';
import { widget as messagesWidget } from './widgets/messages.js';

const routes = {
  home: homePage,
  projects: projectsPage,
  phases: phasesPage,
  notes: notesPage,
  sop: sopPage,
  stressbuster: stressbusterPage,
  settings: settingsPage
};

// Right Rail Widgets: Focus Tasks, Calls, Emails, Meetings, Reminders, Days Since
const registeredRightWidgets = [
  tasksWidget,
  callsWidget,
  emailsWidget,
  meetingsWidget,
  remindersWidget,
  dayssinceWidget
];

/**
 * Initialize Application
 */
async function init() {
  try {
    // 1. Check mobile detection notice
    checkMobileNotice();

    // 2. Initialize DB and defaults
    await store.initializeDefaults();

    // 3. Load theme
    const theme = await store.getSetting('theme', 'light');
    document.documentElement.setAttribute('data-theme', theme);

    // 4. Start Live Clock in Header
    startHeaderClock();

    // 5. Mount Header Weather Widget
    const headerWeatherEl = document.getElementById('header-weather');
    if (headerWeatherEl) {
      await weatherWidget.render(headerWeatherEl);
    }

    // 6. Read Me Guide button listener
    setupReadMeGuide();

    // 7. Global Search shortcut (Ctrl+K or Header button)
    setupSearch();

    // 8. Setup Router
    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // 9. Render Right Rail Widgets
    await renderAllWidgets();

    // 10. Mount Footer Stress Meter (Center)
    const footerStressEl = document.getElementById('footer-stress-meter');
    if (footerStressEl) {
      await stressWidget.render(footerStressEl);
    }

    // 11. Mount Footer Messages Widget (Left)
    const footerMsgEl = document.getElementById('footer-quote-text');
    if (footerMsgEl) {
      await messagesWidget.render(footerMsgEl);
    }

    // 12. Check Backup Banner
    checkBackupPrompt();

  } catch (error) {
    console.error('Fatal initialization error:', error);
    const contentArea = document.getElementById('app-content');
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="card" style="border-color: var(--color-danger); color: var(--color-danger);">
          <h3>Initialization Error</h3>
          <p>Main Deck could not initialize IndexedDB properly. If you are in private/incognito mode with storage disabled, please check browser permissions.</p>
          <pre style="margin-top: 8px; font-size: 12px;">${error.message}</pre>
        </div>
      `;
    }
  }
}

/**
 * Mobile / Small Screen Notice
 */
function checkMobileNotice() {
  const isSmallScreen = window.innerWidth < 850 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const noticeEl = document.getElementById('mobile-screen-notice');
  const dismissBtn = document.getElementById('btn-dismiss-mobile-notice');

  if (isSmallScreen && noticeEl) {
    const isDismissed = sessionStorage.getItem('maindeck_mobile_dismissed') === 'true';
    if (!isDismissed) {
      noticeEl.style.display = 'flex';
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          noticeEl.style.display = 'none';
          sessionStorage.setItem('maindeck_mobile_dismissed', 'true');
        };
      }
    }
  }
}

/**
 * Read Me & Philosophy Guide Modal
 */
function setupReadMeGuide() {
  const readmeBtn = document.getElementById('header-readme-btn');
  if (readmeBtn) {
    readmeBtn.addEventListener('click', openReadMeModal);
  }
}

async function openReadMeModal() {
  await showModal({
    title: '⚓ Main Deck — Personal Control Surface Guide',
    contentHtml: `
      <div style="font-size: var(--font-size-sm); line-height: 1.6; display: flex; flex-direction: column; gap: var(--space-3); max-height: 460px; overflow-y: auto; padding-right: 4px;">
        <div style="background-color: var(--color-primary-subtle); padding: var(--space-3); border-radius: var(--radius-md); border-left: 3px solid var(--color-primary); color: var(--color-text-main); font-weight: 500;">
          💡 <em>This is not a replacement for your email, spreadsheets, or ERP — just a common converging point to categorize and navigate your day's plan.</em>
        </div>

        <!-- Caution on local data and cloud backups -->
        <div style="background-color: var(--color-warning-subtle); padding: var(--space-3); border-radius: var(--radius-md); border-left: 3px solid var(--color-warning); color: var(--color-text-main); font-size: var(--font-size-xs);">
          <strong>⚠️ CAUTION ON DATA & BACKUPS:</strong><br>
          All data lives strictly inside this browser on this computer. Any browser reset, cache clearing, or OS reset will clear your existing data. Remember to do a backup periodically (from Settings ⚙️) and store it in your personal cloud or drive if you store any sensitive or important data.
        </div>

        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--color-primary);">📋 Projects & Phases</h4>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px;">
            Convert vague mental models into concrete, phased progress. Group tasks under milestones and preserve context notes so you can return days later without reconstructing what comes next.
          </p>
        </div>

        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--color-primary);">🕐 Days Since</h4>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px;">
            A simple, factual record of when you last did key personal or work activities (e.g. <em>Called Mom</em>, <em>Read a book</em>). Zero streak pressure, zero failure penalties — just click 🔄 when done today.
          </p>
        </div>

        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--color-primary);">🧠 Stress Meter (In Footer)</h4>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px;">
            <strong>Just slide to express your day.</strong> A pure self-awareness mood indicator with zero diagnostic algorithms. Move the slider anytime from any page to acknowledge your state (0 = 🧘 Calm, 100 = 🔥 Overwhelmed).
          </p>
        </div>

        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--color-primary);">🎮 Stress Buster (2-Minute Resets)</h4>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px;">
            Quick 2-minute micro-resets (<em>Swat Mosquito</em>, <em>Pop Balloons</em>, <em>Smash Distractions</em>, and <em>Love Them</em>). Features a gentle re-entry guard nudging you back to your projects.
          </p>
        </div>

        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--color-primary);">🔗 Quick Links & Work Attention Widgets</h4>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px;">
            Fast launchers for external portals and spreadsheets on the Home page, paired with right-rail attention cards for Calls, Emails (with multi-ID mailto links), Meetings, and Reminders.
          </p>
        </div>

        <div>
          <h4 style="font-size: var(--font-size-sm); color: var(--color-primary);">💬 Custom Quotes (Settings)</h4>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: 2px;">
            Add your own inspiring personal principles, quotes, or reminders in Settings to appear in the footer dock.
          </p>
        </div>
      </div>
    `,
    buttons: [
      { text: 'Understood, let’s work!', className: 'btn-primary btn-sm', value: null }
    ]
  });
}

/**
 * Route Handler
 */
async function handleRoute() {
  const rawHash = window.location.hash.replace(/^#/, '') || 'home';
  const routeKey = rawHash.split('?')[0] || 'home';
  const routeModule = routes[routeKey] || homePage;

  document.querySelectorAll('.nav-item').forEach((item) => {
    const itemHref = item.getAttribute('href') || '';
    const cleanHref = itemHref.replace(/^#/, '').split('?')[0];
    if (cleanHref === routeKey || (routeKey === 'home' && cleanHref === 'home')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const contentArea = document.getElementById('app-content');
  if (contentArea) {
    contentArea.innerHTML = '<div style="color: var(--color-text-muted); font-size: 13px;">Loading view...</div>';
    await routeModule.render(contentArea);
  }
}

/**
 * Render all registered widgets in the right rail
 */
export async function renderAllWidgets() {
  const widgetContainer = document.getElementById('app-widgets');
  if (!widgetContainer) return;

  widgetContainer.innerHTML = '';
  for (const w of registeredRightWidgets) {
    const container = document.createElement('div');
    container.id = `widget-slot-${w.name}`;
    widgetContainer.appendChild(container);
    try {
      await w.render(container);
    } catch (e) {
      console.error(`Failed to render widget ${w.name}:`, e);
    }
  }

  const headerWeatherEl = document.getElementById('header-weather');
  if (headerWeatherEl) await weatherWidget.render(headerWeatherEl);

  const footerStressEl = document.getElementById('footer-stress-meter');
  if (footerStressEl) await stressWidget.render(footerStressEl);
}

/**
 * Global Search Setup (Ctrl+K or search button)
 */
function setupSearch() {
  const searchBtn = document.getElementById('header-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', openGlobalSearch);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openGlobalSearch();
    }
  });
}

async function openGlobalSearch() {
  const tasks = await store.getTasks();
  const notes = await store.getNotes();
  const sops = await store.getSOPs();
  const projects = await store.getProjects();

  await showModal({
    title: '🔍 Quick Search',
    contentHtml: `
      <div class="form-group">
        <input type="text" id="search-input" placeholder="Type to search tasks, notes, SOPs, projects..." autofocus style="font-size: var(--font-size-md);" />
      </div>
      <div id="search-results" style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); max-height: 350px; overflow-y: auto;">
        <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Type anything to find items.</div>
      </div>
    `,
    buttons: [
      { text: 'Close', className: 'btn-ghost', value: null }
    ]
  });

  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (searchInput && resultsContainer) {
    searchInput.focus();
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        resultsContainer.innerHTML = '<div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Type anything to find items.</div>';
        return;
      }

      const matchTasks = tasks.filter(t => t.title.toLowerCase().includes(q));
      const matchNotes = notes.filter(n => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q)));
      const matchSops = sops.filter(s => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
      const matchProjects = projects.filter(p => p.name.toLowerCase().includes(q));

      const totalMatches = matchTasks.length + matchNotes.length + matchSops.length + matchProjects.length;

      if (totalMatches === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">No matching items found.</div>';
        return;
      }

      let html = '';

      if (matchProjects.length > 0) {
        html += `<div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle);">Projects</div>`;
        matchProjects.forEach(p => {
          html += `<a href="#projects" class="kv-row search-item" style="display: block; padding: 6px; border-radius: 4px; text-decoration: none;">📁 ${escapeHtml(p.name)}</a>`;
        });
      }

      if (matchTasks.length > 0) {
        html += `<div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle); margin-top: 6px;">Tasks</div>`;
        matchTasks.forEach(t => {
          html += `<a href="#projects" class="kv-row search-item" style="display: block; padding: 6px; border-radius: 4px; text-decoration: none;">📋 ${escapeHtml(t.title)}</a>`;
        });
      }

      if (matchNotes.length > 0) {
        html += `<div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle); margin-top: 6px;">Notes</div>`;
        matchNotes.forEach(n => {
          html += `<a href="#notes" class="kv-row search-item" style="display: block; padding: 6px; border-radius: 4px; text-decoration: none;">📝 ${escapeHtml(n.title)}</a>`;
        });
      }

      if (matchSops.length > 0) {
        html += `<div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle); margin-top: 6px;">SOPs</div>`;
        matchSops.forEach(s => {
          html += `<a href="#sop" class="kv-row search-item" style="display: block; padding: 6px; border-radius: 4px; text-decoration: none;">📚 ${escapeHtml(s.title)}</a>`;
        });
      }

      resultsContainer.innerHTML = html;

      resultsContainer.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const overlay = document.getElementById('modal-overlay');
          if (overlay) overlay.classList.remove('is-active');
        });
      });
    });
  }
}

/**
 * Clock updater for header
 */
function startHeaderClock() {
  const clockEl = document.getElementById('header-clock');
  if (!clockEl) return;

  const update = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  update();
  setInterval(update, 1000);
}

/**
 * Check if backup prompt banner should be shown
 */
async function checkBackupPrompt() {
  const shouldPrompt = await store.shouldPromptBackup();
  if (shouldPrompt) {
    showBanner({
      text: '💾 It has been a few days since your last backup. Keep your data safe by exporting a local JSON file.',
      actionText: 'Export Now',
      onAction: async () => {
        window.location.hash = '#settings';
      },
      onDismiss: async () => {
        await store.recordBackup();
      }
    });
  }
}

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
