/**
 * js/pages/home.js - Home Page Dashboard with Quick Links & Status Overview
 */

import * as store from '../store.js';
import { escapeHtml, safeUrl, showModal } from '../ui.js';
import { isWithinWorkingHours } from '../utils/time.js';
import { icons } from '../icons.js';
import {
  formatStickyExpiry,
  countExpiringSoon,
  sortStickiesForDisplay,
  stickyColorId,
  stickyPriorityDef
} from '../utils/sticky-shared.js';

const DEFAULT_QUICK_LINKS = [
  { id: 'ql-1', name: 'Google Sheets', url: '#', icon: '📊' },
  { id: 'ql-2', name: 'Company Portal', url: '#', icon: '🏢' },
  { id: 'ql-3', name: 'Banking / Invoices', url: '#', icon: '💳' },
  { id: 'ql-4', name: 'Accounting System', url: '#', icon: '📑' }
];

const PREVIEW_LIMIT = 4;

export async function render(container) {
  const settings = await store.getAllSettings();
  const userName = settings.userName || 'User';
  const isWorkTime = isWithinWorkingHours(settings.workStart, settings.workEnd, settings.workingDays);

  const projects = await store.getProjects();
  const activeProjects = projects.filter(p => p.status !== 'completed');

  const tasks = await store.getTasks();
  const calls = await store.getCalls();
  const emails = await store.getEmails();
  const meetings = await store.getMeetings();
  const reminders = await store.getReminders();
  const activities = await store.getActivities();
  const stickies = await store.getStickies();

  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const pendingCalls = calls.filter(c => c.status !== 'done').length;
  const pendingEmails = emails.filter(e => e.status !== 'done' && e.status !== 'sent').length;
  const pendingMeetings = meetings.filter(m => m.status !== 'done').length;
  const pendingReminders = reminders.filter(r => r.status !== 'done').length;
  const totalActivities = activities.length;

  const totalStickies = stickies.length;
  const urgentStickies = stickies.filter(s => s.priority === 'urgent').length;
  const highStickies = stickies.filter(s => s.priority === 'high').length;
  const mediumStickies = stickies.filter(s => s.priority === 'medium').length;
  const lowStickies = stickies.filter(s => s.priority === 'low').length;
  const expiringSoon = countExpiringSoon(stickies);
  const standardOnly = totalStickies > 0 &&
    urgentStickies === 0 && highStickies === 0 && mediumStickies === 0 && lowStickies === 0;

  const previewStickies = sortStickiesForDisplay(stickies).slice(0, PREVIEW_LIMIT);

  let links = await store.getSetting('quickLinks', null);
  if (!links) {
    links = DEFAULT_QUICK_LINKS;
    await store.setSetting('quickLinks', links);
  }

  const now = new Date();
  const currentHour = now.getHours();
  let greetingTitle = 'Good Afternoon! ⛅';
  if (currentHour < 12) greetingTitle = 'Good Morning! ☀️';
  else if (currentHour < 17) greetingTitle = 'Good Afternoon! ⛅';
  else if (currentHour < 21) greetingTitle = 'Good Evening! 🌇';
  else greetingTitle = 'Rest Well Tonight! 🌙';

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  container.innerHTML = `
    <div class="page-container">
      <!-- 1. Warm Apricot / Peach Hero Greeting Card (Reference Bento Style) -->
      <div class="hero-bento-card">
        <div class="hero-bento-character" title="Welcome back, ${escapeHtml(userName)}!">
          <span>🧑‍💻</span>
        </div>
        <div class="hero-bento-body">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div>
              <h2 class="hero-bento-title">${greetingTitle}</h2>
              <div class="hero-bento-time">${timeString} · Welcome back, ${escapeHtml(userName)}!</div>
            </div>
            <span class="badge ${isWorkTime ? 'badge-primary' : 'badge-default'}" style="padding: 4px 12px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor; margin-right: 6px;"></span>
              ${isWorkTime ? 'Working Hours' : 'Outside Hours'}
            </span>
          </div>
          <p class="hero-bento-quote">
            ${isWorkTime 
              ? 'Focus on what matters. Finish what you can. Leave the rest for tomorrow.'
              : 'You are outside working hours. Take a breath and remember to disconnect.'}
          </p>
        </div>
      </div>

      <!-- 2. Bento Stat Cards Row (Lilac, Peach, Mint Squircles) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
        <!-- Active Projects -->
        <div class="bento-stat-card">
          <div class="bento-stat-header">
            <span class="bento-stat-title">Active Projects</span>
            <div class="squircle-icon squircle-lilac">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="m9 14 2 2 4-4"/></svg>
            </div>
          </div>
          <div class="bento-stat-num">${activeProjects.length}</div>
          <div class="bento-stat-footer">
            <span class="bento-stat-trend" style="color: var(--color-success);">↑ ${activeProjects.length} active</span>
            <span>in motion</span>
          </div>
        </div>

        <!-- Pending Tasks -->
        <div class="bento-stat-card">
          <div class="bento-stat-header">
            <span class="bento-stat-title">Pending Tasks</span>
            <div class="squircle-icon squircle-peach">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="bento-stat-num">${pendingTasks}</div>
          <div class="bento-stat-footer">
            <span class="bento-stat-trend" style="color: ${pendingTasks === 0 ? 'var(--color-success)' : 'var(--color-warning)'};">
              ${pendingTasks === 0 ? '✓ Caught up' : `⚡ ${pendingTasks} pending`}
            </span>
            <span>${pendingTasks === 0 ? 'great job' : 'today'}</span>
          </div>
        </div>

        <!-- Habit / Days Since Trackers -->
        <div class="bento-stat-card">
          <div class="bento-stat-header">
            <span class="bento-stat-title">Habit Trackers</span>
            <div class="squircle-icon squircle-mint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div class="bento-stat-num">${totalActivities}</div>
          <div class="bento-stat-footer">
            <span class="bento-stat-trend" style="color: var(--color-success);">● Factual log</span>
            <span>zero pressure</span>
          </div>
        </div>
      </div>

      <!-- 3. Quick Pending Attention Rail Pill Bar -->
      <div class="pending-pills-bar" role="group" aria-label="Pending attention">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-subtle); margin-right: 6px; display: flex; align-items: center; gap: 4px;">
          <span>Attention:</span>
        </div>

        <button class="pending-pill" data-widget="tasks" title="Jump to Focus Tasks">
          <span style="display: inline-flex; align-items: center;">${icons.tasks}</span>
          <span>Tasks</span>
          <span class="pending-pill-count ${pendingTasks > 0 ? 'has-items' : 'zero-items'}">${pendingTasks}</span>
        </button>

        <button class="pending-pill" data-widget="calls" title="Jump to Calls">
          <span style="display: inline-flex; align-items: center;">${icons.calls}</span>
          <span>Calls</span>
          <span class="pending-pill-count ${pendingCalls > 0 ? 'has-items' : 'zero-items'}">${pendingCalls}</span>
        </button>

        <button class="pending-pill" data-widget="emails" title="Jump to Emails">
          <span style="display: inline-flex; align-items: center;">${icons.emails}</span>
          <span>Emails</span>
          <span class="pending-pill-count ${pendingEmails > 0 ? 'has-items' : 'zero-items'}">${pendingEmails}</span>
        </button>

        <button class="pending-pill" data-widget="meetings" title="Jump to Meetings">
          <span style="display: inline-flex; align-items: center;">${icons.meetings}</span>
          <span>Meetings</span>
          <span class="pending-pill-count ${pendingMeetings > 0 ? 'has-items' : 'zero-items'}">${pendingMeetings}</span>
        </button>

        <button class="pending-pill" data-widget="reminders" title="Jump to Reminders">
          <span style="display: inline-flex; align-items: center;">${icons.reminders}</span>
          <span>Reminders</span>
          <span class="pending-pill-count ${pendingReminders > 0 ? 'has-items' : 'zero-items'}">${pendingReminders}</span>
        </button>

        <button class="pending-pill" data-widget="dayssince" title="Jump to Days Since Tracker">
          <span style="display: inline-flex; align-items: center;">${icons.dayssince}</span>
          <span>Days Since</span>
          <span class="pending-pill-count ${totalActivities > 0 ? 'has-items' : 'zero-items'}">${totalActivities}</span>
        </button>

        <a href="#stickies" class="pending-pill" aria-label="Open Sticky Notes Desk" style="text-decoration: none;">
          <span style="display: inline-flex; align-items: center;">${icons.pin}</span>
          <span>Stickies</span>
          <span class="pending-pill-count ${totalStickies > 0 ? 'has-items' : 'zero-items'}">${totalStickies}</span>
        </a>
      </div>

      <!-- 4. Bento Middle Row: Navigation & Sticky Notes Preview Hub -->
      <div class="home-bento-row">
        <!-- Core Work Navigation Bento -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
              <span class="squircle-icon squircle-sky squircle-icon--sm">🧭</span>
              <span>Workspace Navigation</span>
            </h3>
          </div>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: 4px;">
            <a href="#projects" class="btn btn-secondary btn-sm" style="gap: 8px;">
              <span style="display: inline-flex;">${icons.tasks}</span>
              <span>Projects &amp; Milestones</span>
            </a>
            <a href="#sop" class="btn btn-secondary btn-sm" style="gap: 8px;">
              <span style="display: inline-flex;">${icons.sop}</span>
              <span>Standard Procedures (SOP)</span>
            </a>
            <a href="#notes" class="btn btn-secondary btn-sm" style="gap: 8px;">
              <span style="display: inline-flex;">${icons.notes}</span>
              <span>Notes</span>
            </a>
            <a href="#stickies" class="btn btn-secondary btn-sm" style="gap: 8px;">
              <span style="display: inline-flex;">${icons.pin}</span>
              <span>Sticky Notes</span>
            </a>
            <a href="#stressbuster" class="btn btn-secondary btn-sm" style="gap: 8px;">
              <span style="display: inline-flex;">${icons.stress}</span>
              <span>2-Minute Reset</span>
            </a>
          </div>

          <!-- Core Principles: the app's thesis, restored here. It was the only
               always-visible answer to "what is this for?", and it gives the
               unnamed Stress Meter and 2-Minute Reset their meaning. -->
          <div class="home-principles">
            <div class="home-principles__line"><strong>1. Work</strong> deserves focus.</div>
            <div class="home-principles__line"><strong>2. Rest</strong> deserves permission.</div>
            <div class="home-principles__line"><strong>3. Life</strong> deserves the remaining time.</div>
            <button type="button" id="btn-home-search-hint" class="home-principles__kbd">
              <kbd>Ctrl</kbd> + <kbd>K</kbd> to search everything
            </button>
          </div>
        </div>

        <!-- Sticky Notes Desk Preview & Status Hub -->
        <div class="card">
          <div class="card-header home-sticky-card__actions">
            <div>
              <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
                <span class="squircle-icon squircle-lemon squircle-icon--sm">📌</span>
                <span>Sticky Notes Desk</span>
              </h3>
              <div class="home-sticky-card__sub">
                Active thoughts, scratchpads &amp; disappearing notes.
              </div>
            </div>
            <a href="#stickies" class="btn btn-xs btn-primary">
              <span>Open Board</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <!-- Priority & Status Metric Chips. Hidden entirely at 0 notes:
               a "0 Notes" chip stacked above "your desk is empty" was two
               contradictory statements of the same fact. -->
          ${totalStickies > 0 ? `
            <div class="home-sticky-card__chips">
              <span class="home-chip" data-tone="quiet">📌 ${totalStickies} ${totalStickies === 1 ? 'Note' : 'Notes'}</span>
              ${urgentStickies > 0 ? `<span class="home-chip" data-tone="urgent">🔥 ${urgentStickies} Urgent</span>` : ''}
              ${highStickies > 0 ? `<span class="home-chip" data-tone="high">⚡ ${highStickies} High Priority</span>` : ''}
              ${mediumStickies > 0 ? `<span class="home-chip" data-tone="medium">● ${mediumStickies} Med</span>` : ''}
              ${lowStickies > 0 ? `<span class="home-chip" data-tone="low">● ${lowStickies} Low</span>` : ''}
              ${expiringSoon > 0 ? `<span class="home-chip" data-tone="high" title="Due within the next 24 hours">⏳ ${expiringSoon} Expiring soon</span>` : ''}
              ${standardOnly ? `<span class="home-chip" data-tone="quiet">All Standard</span>` : ''}
            </div>
          ` : ''}

          <!-- Items Preview Grid or Empty Prompt -->
          ${totalStickies === 0 ? `
            <div class="home-sticky-empty">
              <div class="home-sticky-empty__icon" aria-hidden="true">📌</div>
              <div class="home-sticky-empty__title">Your desk is empty</div>
              <div class="home-sticky-empty__body">
                Nothing captured yet. Throw quick thoughts, phone numbers, or scratchpads —
                each note can carry a disappearing timer.
              </div>
              <a href="#stickies?new=1" class="btn btn-xs btn-secondary">+ Throw First Sticky</a>
            </div>
          ` : `
            <div class="home-sticky-preview-grid">
              ${previewStickies.map(s => {
                const colorId = stickyColorId(s);
                const pDef = stickyPriorityDef(s);
                const expiryText = formatStickyExpiry(s.expiresAt);
                const label = `${s.text.slice(0, 80)}${s.text.length > 80 ? '…' : ''} — ${pDef.label || 'No priority'}, ${expiryText}`;
                return `
                  <a
                    href="#stickies?id=${encodeURIComponent(s.id)}"
                    class="home-sticky-mini"
                    data-color="${colorId}"
                    title="${escapeHtml(label)}"
                    aria-label="Open sticky note: ${escapeHtml(label)}"
                  >
                    <span class="home-sticky-mini__tape" aria-hidden="true"></span>
                    <span class="home-sticky-mini__head">
                      ${pDef.badge ? `
                        <span class="home-sticky-mini__badge" data-priority="${pDef.id}">
                          <span class="home-sticky-mini__badge-dot" aria-hidden="true"></span>${pDef.badge}
                        </span>` : ''}
                      <span class="home-sticky-mini__expiry" data-sticky-expiry="${escapeHtml(s.expiresAt || '')}">⏳ ${escapeHtml(expiryText)}</span>
                    </span>
                    <span class="home-sticky-mini__text">${escapeHtml(s.text)}</span>
                    <span class="home-sticky-mini__cta" aria-hidden="true">Open →</span>
                  </a>
                `;
              }).join('')}
            </div>
          `}

          ${totalStickies > PREVIEW_LIMIT ? `
            <div class="home-sticky-card__footer">
              <span>Showing ${previewStickies.length} of ${totalStickies}</span>
              <a href="#stickies" class="home-sticky-card__more">
                View ${totalStickies - PREVIEW_LIMIT} more on board →
              </a>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 5. Quick Links Section (Bento Card Launchpad) -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
              <span class="squircle-icon squircle-amber squircle-icon--sm">⚡</span>
              <span>Quick Launch Links</span>
            </h3>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">
              Fast launchpad for external corporate tools, portals, and spreadsheets.
            </div>
          </div>
          <button class="btn btn-xs btn-primary" id="btn-home-add-link">+ Add Link</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-3); margin-top: var(--space-2);">
          ${links.map(l => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background-color: var(--color-bg-subtle); border-radius: var(--radius-lg); border: 1px solid var(--color-border); transition: all var(--transition-fast);">
              <a href="${safeUrl(l.url)}" target="_blank" rel="noopener" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--color-text-main); font-weight: 500; font-size: var(--font-size-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                <span style="font-size: 16px;">${escapeHtml(l.icon || '🔗')}</span>
                <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(l.name)}</span>
              </a>
              <button class="btn-icon btn-xs btn-delete-quicklink" data-id="${escapeHtml(l.id)}" title="Delete link" style="color: var(--color-text-subtle);">${icons.close}</button>
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

  // Attach Event: Workspace Navigation footer keyboard hint opens global search
  const searchHintBtn = container.querySelector('#btn-home-search-hint');
  if (searchHintBtn) {
    searchHintBtn.addEventListener('click', () => {
      const headerSearch = document.getElementById('header-search-btn');
      if (headerSearch) headerSearch.click();
    });
  }

  // Attach Event: Click Pending Pill to Scroll & Highlight Right Rail Widget
  // Scoped to buttons carrying data-widget — the Stickies pill is an <a href>
  // and has no widget slot to jump to.
  container.querySelectorAll('button.pending-pill[data-widget]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const widgetName = pill.getAttribute('data-widget');
      const targetEl = document.getElementById(`widget-slot-${widgetName}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetEl.classList.remove('widget-slot-glow');
        void targetEl.offsetWidth; // Trigger reflow for animation reset
        targetEl.classList.add('widget-slot-glow');
      }
    });
  });
}
