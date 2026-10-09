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
import * as stickiesPage from './pages/stickies.js';
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
import { widget as photoframeWidget } from './widgets/photoframe.js';

// Header & Footer Special Docks
import { widget as stressWidget } from './widgets/stress.js';
import { widget as messagesWidget } from './widgets/messages.js';

const routes = {
  home: homePage,
  projects: projectsPage,
  phases: phasesPage,
  notes: notesPage,
  stickies: stickiesPage,
  sop: sopPage,
  stressbuster: stressbusterPage,
  settings: settingsPage
};

// Right Rail Widgets: Focus Tasks, Calls, Emails, Meetings, Reminders, Days Since, Photo Frame
const registeredRightWidgets = [
  tasksWidget,
  callsWidget,
  emailsWidget,
  meetingsWidget,
  remindersWidget,
  dayssinceWidget,
  photoframeWidget
];

/**
 * Quirk Theme Definitions — 7 daily accent moods
 */
const QUIRK_LIST = [
  { slug: 'calm-tide', name: 'Calm Tide' },
  { slug: 'morning-fog', name: 'Morning Fog' },
  { slug: 'warm-clay', name: 'Warm Clay' },
  { slug: 'moss-garden', name: 'Moss Garden' },
  { slug: 'desert-wind', name: 'Desert Wind' },
  { slug: 'plum-dusk', name: 'Plum Dusk' },
  { slug: 'steel-dawn', name: 'Steel Dawn' }
];

export { QUIRK_LIST };

/**
 * Get today's auto-selected quirk slug based on day-of-year
 */
function getTodaysQuirk() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return QUIRK_LIST[dayOfYear % QUIRK_LIST.length].slug;
}

/**
 * Apply quirk theme to the document
 */
export function applyQuirk(quirkSlug) {
  if (!quirkSlug || quirkSlug === 'calm-tide') {
    // Calm Tide is the default — remove any quirk override
    document.documentElement.removeAttribute('data-quirk');
  } else {
    document.documentElement.setAttribute('data-quirk', quirkSlug);
  }
}

/**
 * Initialize Application
 */
async function init() {
  try {
    // 1. Check mobile detection notice
    checkMobileNotice();

    // 2. Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // A new version took control. Reload once so the user is not left
        // running stale JS against a fresh IndexedDB schema.
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    // 3. Initialize DB and defaults
    await store.initializeDefaults();

    // 3b. Purge expired sticky notes once, in a single transaction.
    //     getStickies() is a pure read; this is the only place that deletes.
    try {
      const purgedStickies = await store.cleanupExpiredStickies();
      if (purgedStickies > 0) {
        console.info(`[stickies] purged ${purgedStickies} expired note(s)`);
      }
    } catch (err) {
      console.warn('Sticky cleanup failed:', err);
    }

    // 4. Load theme
    let theme = await store.getSetting('theme', 'pastel-green');
    if (theme === 'light') theme = 'pastel-green';
    if (theme === 'dark') theme = 'midnight-dark';
    document.documentElement.setAttribute('data-theme', theme);

    // 5. Load quirk (daily auto or user-selected)
    const quirkPref = await store.getSetting('quirk', 'auto');
    const activeQuirk = quirkPref === 'auto' ? getTodaysQuirk() : quirkPref;
    applyQuirk(activeQuirk);

    // 6. Start Live Clock in Header
    startHeaderClock();

    // 7. Read Me Guide button listener
    setupReadMeGuide();

    // 8. Global Search shortcut (Ctrl+K or Header button)
    setupSearch();

    // 9. Setup Router
    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // 10. Render Right Rail Widgets
    await renderAllWidgets();

    // 10b. Keep rail widgets + sticky countdowns in sync with the store
    setupDataChangeRefresh();
    setupExpiryTicker();

    // 11. Mount Footer Stress Meter (Center)
    const footerStressEl = document.getElementById('footer-stress-meter');
    if (footerStressEl) {
      await stressWidget.render(footerStressEl);
    }

    // 12. Mount Footer Messages Widget (Left)
    const footerMsgEl = document.getElementById('footer-quote-text');
    if (footerMsgEl) {
      await messagesWidget.render(footerMsgEl);
    }

    // 13. Check Backup Banner
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
 *
 * The layout requires min-width: 1024px (css/layout.css), so anything narrower
 * than that gets a horizontally scrolling, clipped app. The old 850px threshold
 * left a dead zone between 850 and 1024px with no warning at all.
 */
function checkMobileNotice() {
  const isSmallScreen = window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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

  // Backwards compatibility: gracefully redirect #phases to #projects
  if (routeKey === 'phases') {
    const urlParams = new URLSearchParams(rawHash.split('?')[1] || '');
    const projId = urlParams.get('projectId') || urlParams.get('id');
    window.location.hash = projId ? `#projects?id=${projId}` : '#projects';
    return;
  }

  const routeModule = routes[routeKey] || homePage;

  const routeTitles = {
    home: { title: 'Dashboard ⚓', sub: 'Personal Control Surface' },
    projects: { title: 'Projects 📋', sub: 'Structured Goals & Milestones' },
    notes: { title: 'Notes 📝', sub: 'Instant Context & Ideas' },
    stickies: { title: 'Sticky Notes 📌', sub: 'Quick Dumps & Disappearing Timers' },
    sop: { title: 'SOP 📚', sub: 'Standard Operating Procedures' },
    stressbuster: { title: 'Stress Buster 🎮', sub: '2-Minute Micro Resets' },
    settings: { title: 'Settings ⚙️', sub: 'Preferences & Local Storage' }
  };
  const titleInfo = routeTitles[routeKey] || routeTitles.home;
  const headingEl = document.getElementById('header-page-title');
  const subEl = document.getElementById('header-page-sub');
  if (headingEl) headingEl.textContent = titleInfo.title;
  if (subEl) subEl.textContent = titleInfo.sub;

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
 * Render all registered widgets in the right rail.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.includeDocks=true] Also re-render the footer stress
 *   dock. Pass false from the data-change refresh: the stress slider persists
 *   on every arrow keypress, so re-rendering it would destroy focus
 *   mid-adjustment, and rebuilding it during a pointer drag would swap the
 *   element out from under the captured pointer.
 */
export async function renderAllWidgets({ includeDocks = true } = {}) {
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

  if (!includeDocks) return;

  const footerStressEl = document.getElementById('footer-stress-meter');
  if (footerStressEl) await stressWidget.render(footerStressEl);
}

/**
 * Refresh every mounted widget when persisted data changes.
 * Debounced because batch operations (drag, grid rearrange, import) emit many
 * times in quick succession and each render is an async IndexedDB read.
 * Without this the rail cards go stale on edit while the Home pills — which
 * re-read on navigation — stay correct, and both are visible at once.
 */
function setupDataChangeRefresh() {
  let pending = null;
  document.addEventListener(store.DATA_CHANGED_EVENT, () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      renderAllWidgets({ includeDocks: false }).catch((e) => console.error('Widget refresh failed:', e));
    }, 250);
  });
}

/**
 * Keep sticky expiry countdowns honest while the tab stays open.
 * Updates only the text of existing nodes instead of re-rendering the page, and
 * purges + refreshes once when a note's timer actually runs out.
 */
function setupExpiryTicker() {
  const TICK_MS = 30000;

  const tick = async () => {
    const nodes = document.querySelectorAll('[data-sticky-expiry]');
    if (nodes.length === 0) return;

    const { formatStickyExpiry } = await import('./utils/sticky-shared.js');
    let expiredCount = 0;

    nodes.forEach((node) => {
      const raw = node.getAttribute('data-sticky-expiry') || '';
      const text = formatStickyExpiry(raw);
      // Home renders "⏳ <text>"; the board renders bare "<text>".
      const hasGlyph = node.textContent.trim().startsWith('⏳');
      const next = hasGlyph ? `⏳ ${text}` : text;
      if (node.textContent !== next) node.textContent = next;
      if (text === 'Expired') expiredCount++;
    });

    if (expiredCount > 0) {
      try {
        await store.cleanupExpiredStickies();
      } catch (e) {
        console.warn('Sticky cleanup failed:', e);
      }
      // Re-route so an expired card disappears from the board too, not just
      // from the store. Without this the record is deleted from IndexedDB while
      // the card stays on screen reading "Expired" until the user navigates.
      await handleRoute();
      await renderAllWidgets({ includeDocks: false });
    }
  };

  setInterval(() => { tick().catch(() => {}); }, TICK_MS);

  // Coming back to a tab left open overnight must re-check timers.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick().catch(() => {});
  });
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
  const stickies = await store.getStickies();
  const sops = await store.getSOPs();
  const projects = await store.getProjects();

  await showModal({
    title: '🔍 Quick Search',
    contentHtml: `
      <div class="form-group">
        <input type="text" id="search-input" placeholder="Type to search tasks, notes, stickies, SOPs, projects..." style="font-size: var(--font-size-md);" />
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
      const matchStickies = stickies.filter(s => s.text && s.text.toLowerCase().includes(q));
      const matchSops = sops.filter(s => s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
      const matchProjects = projects.filter(p => p.name.toLowerCase().includes(q));

      const totalMatches = matchTasks.length + matchNotes.length + matchStickies.length + matchSops.length + matchProjects.length;

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

      if (matchStickies.length > 0) {
        html += `<div style="font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; color: var(--color-text-subtle); margin-top: 6px;">Sticky Notes</div>`;
        matchStickies.forEach(s => {
          html += `<a href="#stickies" class="kv-row search-item" style="display: block; padding: 6px; border-radius: 4px; text-decoration: none;">📌 ${escapeHtml(s.text.slice(0, 60))}${s.text.length > 60 ? '...' : ''}</a>`;
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
