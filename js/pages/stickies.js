/**
 * js/pages/stickies.js - Sticky Notes Board with Freeform Canvas, Disappearing Timers,
 * Priority Selector, Quick Delete, and Auto-Grid Rearrangement.
 */

import * as store from '../store.js';
import { escapeHtml, showModal } from '../ui.js';
import { icons } from '../icons.js';
import { formatRelativeTime } from '../utils/time.js';

// Color themes for sticky notes (Cozy Pastel Bento Palette)
const STICKY_COLORS = {
  yellow: { id: 'yellow', name: 'Lemon', bg: '#fef9c3', border: '#fef08a', text: '#713f12', tape: 'rgba(234, 179, 8, 0.25)' },
  peach:  { id: 'peach',  name: 'Peach', bg: '#fdeee3', border: '#fad5bf', text: '#7c2d12', tape: 'rgba(249, 115, 22, 0.25)' },
  mint:   { id: 'mint',   name: 'Mint',  bg: '#e7f7ed', border: '#c4ebd1', text: '#14532d', tape: 'rgba(34, 197, 94, 0.25)' },
  sky:    { id: 'sky',    name: 'Sky',   bg: '#e7f4fe', border: '#c7e5fc', text: '#0c4a6e', tape: 'rgba(14, 165, 233, 0.25)' },
  lilac:  { id: 'lilac',  name: 'Lilac', bg: '#eee9fc', border: '#ded4fa', text: '#4c1d95', tape: 'rgba(168, 85, 247, 0.25)' },
  rose:   { id: 'rose',   name: 'Rose',  bg: '#fce7f3', border: '#fbcfe8', text: '#831843', tape: 'rgba(236, 72, 153, 0.25)' }
};

// Priority definitions
const PRIORITIES = {
  none:   { id: 'none',   label: 'None',   badge: '',          dot: '' },
  low:    { id: 'low',    label: 'Low',    badge: 'Low',       dot: '#10b981' },
  medium: { id: 'medium', label: 'Medium', badge: 'Medium',    dot: '#f59e0b' },
  high:   { id: 'high',   label: 'High',   badge: 'High',      dot: '#f97316' },
  urgent: { id: 'urgent', label: 'Urgent', badge: 'Urgent 🔥', dot: '#ef4444' }
};

// Expiry options: 0 = Off (Never), 1..7 days
const EXPIRY_OPTIONS = [
  { days: 0, label: 'Off (Never)' },
  { days: 1, label: '1 Day' },
  { days: 2, label: '2 Days' },
  { days: 3, label: '3 Days' },
  { days: 4, label: '4 Days' },
  { days: 5, label: '5 Days' },
  { days: 6, label: '6 Days' },
  { days: 7, label: '7 Days' }
];

let highestZIndex = 10;
let currentViewMode = 'canvas'; // 'canvas' | 'grid'
let selectedColor = 'yellow';
let selectedPriority = 'none';
let currentExpiryDays = 3; // Default 3 days disappearing timer

/**
 * Format remaining time until expiration
 * @param {string|null} expiresAt ISO date
 * @returns {string} Human badge text
 */
function getRemainingTimeText(expiresAt) {
  if (!expiresAt) return '∞ Never expires';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return '⏳ Expiring now';
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;

  if (diffDays >= 1) {
    return remHours > 0 ? `⏳ ${diffDays}d ${remHours}h left` : `⏳ ${diffDays}d left`;
  }
  if (diffHours >= 1) {
    return `⏳ ${diffHours}h left`;
  }
  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `⏳ ${diffMins}m left`;
}

/**
 * Render Sticky Notes Board
 * @param {HTMLElement} container 
 */
export async function render(container) {
  // Load default timer preference if saved
  const savedDefaultTimer = await store.getSetting('sticky_default_timer', 3);
  currentExpiryDays = Number(savedDefaultTimer);

  const stickies = await store.getStickies();
  
  // Calculate max z-index to stack properly
  if (stickies.length > 0) {
    highestZIndex = Math.max(...stickies.map(s => s.zIndex || 1), 10);
  }

  container.innerHTML = `
    <div class="page-container sticky-page-wrapper">
      <!-- Top Sticky Notes Header & Toolbar -->
      <div class="card sticky-header-card" style="margin-bottom: var(--space-4);">
        <div class="card-header" style="flex-wrap: wrap; gap: var(--space-3); padding-bottom: 0; border-bottom: none;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="squircle-icon" style="background: var(--pastel-lemon-bg, #fef9c3); border-color: var(--pastel-lemon-border, #fef08a); color: #854d0e;">
                ${icons.pin || '📌'}
              </span>
              <div>
                <h2 class="card-title" style="margin: 0;">Sticky Notes Board</h2>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
                  Quick brain dumps, random notes & scratchpads with disappearing timers.
                </div>
              </div>
            </div>
          </div>

          <!-- Toolbar actions: Arrange to Grid, View Toggle, Default Timer, Total Counter -->
          <div class="sticky-toolbar-actions" style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <div class="sticky-count-pill" style="font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 9999px; background: var(--color-bg-subtle); color: var(--color-text-muted);">
              ${stickies.length} ${stickies.length === 1 ? 'note' : 'notes'}
            </div>

            <!-- Rearrange to Grid Button -->
            <button id="btn-rearrange-grid" class="btn btn-sm btn-secondary" title="Neatly snap and arrange all notes into an organized grid">
              ${icons.grid || '📐'} <span>Rearrange to Grid</span>
            </button>

            <!-- Mode Switcher: Canvas vs Grid -->
            <div class="btn-group" role="group" aria-label="View Mode" style="display: inline-flex; border-radius: 9999px; overflow: hidden; border: 1px solid var(--color-border);">
              <button id="btn-view-canvas" class="btn btn-xs ${currentViewMode === 'canvas' ? 'btn-primary' : 'btn-ghost'}" title="Freeform draggable desk canvas" style="border-radius: 0; padding: 6px 11px;">
                🎨 Canvas
              </button>
              <button id="btn-view-grid" class="btn btn-xs ${currentViewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}" title="Organized list / grid view" style="border-radius: 0; padding: 6px 11px;">
                📐 Grid
              </button>
            </div>

            <!-- Default Timer Setting -->
            <div class="sticky-timer-config" style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-muted); margin-left: 4px;">
              <span title="Default lifetime assigned to newly created sticky notes">Default Timer:</span>
              <select id="select-default-timer" class="form-input form-input-sm" style="width: auto; padding: 3px 8px; font-size: 11px; height: 28px; border-radius: 9999px;">
                ${EXPIRY_OPTIONS.map(opt => `
                  <option value="${opt.days}" ${opt.days === currentExpiryDays ? 'selected' : ''}>
                    ${opt.label}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Quick Throw Composer Box -->
        <div class="sticky-composer-box" style="margin-top: var(--space-4); background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-radius: 18px; padding: 14px 16px;">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <textarea 
                id="sticky-input-text" 
                rows="2" 
                class="form-input" 
                placeholder="Throw a quick thought, phone number, snippet, or reminder... (Enter to throw)"
                style="flex: 1; resize: vertical; border-radius: 12px; font-family: inherit; font-size: 13px; line-height: 1.5; padding: 10px 12px; background: var(--color-bg-surface); border: 1px solid var(--color-border);"
              ></textarea>
              <button id="btn-throw-sticky" class="btn btn-primary" style="height: auto; align-self: stretch; min-width: 120px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>📌</span> <strong>Throw Note</strong>
              </button>
            </div>

            <!-- Composer Options Bar: Color, Priority, Timer -->
            <div class="sticky-composer-controls" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 12px;">
              <!-- Color Selector -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 600; color: var(--color-text-muted);">Color:</span>
                <div class="sticky-color-picker" style="display: flex; gap: 6px;">
                  ${Object.values(STICKY_COLORS).map(c => `
                    <button 
                      type="button" 
                      class="sticky-color-swatch ${c.id === selectedColor ? 'active' : ''}" 
                      data-color="${c.id}"
                      title="${c.name}"
                      style="width: 20px; height: 20px; border-radius: 50%; background: ${c.bg}; border: 2px solid ${c.border}; cursor: pointer; transition: transform 0.15s ease;"
                    ></button>
                  `).join('')}
                </div>
              </div>

              <!-- Priority Selector (Optional) -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 600; color: var(--color-text-muted);">Priority:</span>
                <div class="sticky-priority-pills" style="display: flex; gap: 4px;">
                  ${Object.values(PRIORITIES).map(p => `
                    <button 
                      type="button" 
                      class="sticky-priority-btn ${p.id === selectedPriority ? 'active' : ''}"
                      data-priority="${p.id}"
                      style="font-size: 11px; padding: 3px 9px; border-radius: 9999px; border: 1px solid var(--color-border); background: ${p.id === selectedPriority ? 'var(--color-primary)' : 'var(--color-bg-surface)'}; color: ${p.id === selectedPriority ? '#fff' : 'var(--color-text-muted)'}; cursor: pointer;"
                    >
                      ${p.dot ? `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${p.dot}; margin-right:4px;"></span>` : ''}
                      ${p.label}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Disappearing Timer for this note -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 600; color: var(--color-text-muted);">${icons.clock || '⏳'} Timer:</span>
                <select id="select-note-timer" class="form-input form-input-sm" style="width: auto; padding: 2px 8px; font-size: 11px; height: 26px; border-radius: 9999px;">
                  ${EXPIRY_OPTIONS.map(opt => `
                    <option value="${opt.days}" ${opt.days === currentExpiryDays ? 'selected' : ''}>
                      ${opt.label}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Sticky Notes Work Area (Canvas or Grid) -->
      <div 
        id="sticky-board-viewport" 
        class="sticky-board-viewport ${currentViewMode === 'grid' ? 'grid-mode' : 'canvas-mode'}"
        style="position: relative; min-height: 520px; border-radius: 22px; padding: 20px; background: var(--color-bg-app); border: 2px dashed var(--color-border-subtle); overflow: hidden;"
      >
        ${stickies.length === 0 ? `
          <div class="sticky-empty-state" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--color-text-muted);">
            <div style="font-size: 42px; margin-bottom: 10px;">📌</div>
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">Desk is completely clear!</div>
            <div style="font-size: 13px; max-width: 320px; opacity: 0.8; margin: 0 auto;">
              Throw quick notes, thoughts, or reminders above. Drag them around freely or let them auto-expire.
            </div>
          </div>
        ` : ''}

        <!-- Render All Active Sticky Notes -->
        <div id="sticky-cards-container" class="${currentViewMode === 'grid' ? 'sticky-grid-layout' : 'sticky-canvas-layout'}">
          ${stickies.map((s, index) => renderStickyCardHtml(s, index)).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach all interactive event handlers
  attachStickyEventListeners(container, stickies);
}

/**
 * Render single sticky note card HTML
 * @param {object} s Sticky note data
 * @param {number} index Index for default placement if coords not set
 * @returns {string} HTML markup
 */
function renderStickyCardHtml(s, index) {
  const colorDef = STICKY_COLORS[s.color] || STICKY_COLORS.yellow;
  const priorityDef = PRIORITIES[s.priority] || PRIORITIES.none;
  const timeText = getRemainingTimeText(s.expiresAt);

  // Position calculation for canvas mode
  let posX = s.x;
  let posY = s.y;
  if (typeof posX !== 'number' || typeof posY !== 'number') {
    // Default staggered cascade layout
    posX = 20 + (index % 5) * 230;
    posY = 20 + Math.floor(index / 5) * 200;
  }
  const zIdx = s.zIndex || 1;
  const rot = typeof s.rotation === 'number' ? s.rotation : ((index % 5) - 2) * 0.8;

  const styleAttr = currentViewMode === 'canvas'
    ? `position: absolute; left: ${posX}px; top: ${posY}px; z-index: ${zIdx}; transform: rotate(${rot}deg);`
    : `position: relative;`;

  return `
    <div 
      class="sticky-note-card ${s.priority !== 'none' ? 'has-priority' : ''}" 
      id="sticky-${escapeHtml(s.id)}"
      data-id="${escapeHtml(s.id)}"
      data-x="${posX}"
      data-y="${posY}"
      data-z="${zIdx}"
      data-rot="${rot}"
      style="${styleAttr} width: 220px; min-height: 160px; background: ${colorDef.bg}; border: 1px solid ${colorDef.border}; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: space-between; padding: 12px 14px; cursor: grab; user-select: none; transition: box-shadow 0.2s ease, transform 0.2s ease;"
    >
      <!-- Subtle Scotch Tape Decoration on top -->
      <div class="sticky-tape" style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 44px; height: 16px; background: ${colorDef.tape}; border-radius: 2px; backdrop-filter: blur(1px); opacity: 0.85; pointer-events: none;"></div>

      <!-- Card Header: Priority, Timer, and Quick Delete (✕) -->
      <div class="sticky-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 4px; overflow: hidden;">
          ${priorityDef.badge ? `
            <span class="sticky-priority-tag" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 9999px; background: rgba(0,0,0,0.06); color: ${priorityDef.dot}; display: inline-flex; align-items: center; gap: 3px;">
              <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:${priorityDef.dot};"></span>
              ${priorityDef.badge}
            </span>
          ` : ''}
          <span class="sticky-timer-tag" style="font-size: 10px; color: ${colorDef.text}; opacity: 0.75; font-weight: 500;" title="${s.expiresAt ? `Expires: ${new Date(s.expiresAt).toLocaleString()}` : 'Never expires'}">
            ${timeText}
          </span>
        </div>

        <!-- Quick 1-Click Delete Button -->
        <button 
          class="btn-sticky-quick-delete" 
          data-id="${escapeHtml(s.id)}" 
          title="Quick delete note"
          style="background: transparent; border: none; cursor: pointer; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${colorDef.text}; opacity: 0.6; transition: opacity 0.15s, background 0.15s; font-size: 14px; font-weight: bold; padding: 0; line-height: 1;"
        >
          ✕
        </button>
      </div>

      <!-- Card Body: Note Text with Click-to-Edit -->
      <div 
        class="sticky-card-body" 
        style="flex: 1; font-size: 13px; line-height: 1.45; color: ${colorDef.text}; white-space: pre-wrap; word-break: break-word; overflow-y: auto; max-height: 160px; padding: 2px 0;"
        title="Double-click to edit text"
      >${escapeHtml(s.text)}</div>

      <!-- Card Footer: Relative Time -->
      <div class="sticky-card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.08); font-size: 10px; color: ${colorDef.text}; opacity: 0.65;">
        <span>${formatRelativeTime(s.createdAt)}</span>
        <span class="sticky-drag-hint" style="opacity: 0.5; font-size: 9px;">⠿ drag</span>
      </div>
    </div>
  `;
}

/**
 * Attach Event Listeners to Sticky Board
 * @param {HTMLElement} container 
 * @param {object[]} stickies 
 */
function attachStickyEventListeners(container, stickies) {
  const boardViewport = container.querySelector('#sticky-board-viewport');
  const cardsContainer = container.querySelector('#sticky-cards-container');
  const inputText = container.querySelector('#sticky-input-text');
  const btnThrow = container.querySelector('#btn-throw-sticky');
  const btnRearrange = container.querySelector('#btn-rearrange-grid');
  const btnViewCanvas = container.querySelector('#btn-view-canvas');
  const btnViewGrid = container.querySelector('#btn-view-grid');
  const selectDefaultTimer = container.querySelector('#select-default-timer');
  const selectNoteTimer = container.querySelector('#select-note-timer');

  // --- 1. Quick Throw Composer Actions ---

  // Color Swatch Selection
  container.querySelectorAll('.sticky-color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.sticky-color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
    });
  });

  // Priority Pill Selection
  container.querySelectorAll('.sticky-priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.sticky-priority-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'var(--color-bg-surface)';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--color-primary)';
      btn.style.color = '#fff';
      selectedPriority = btn.dataset.priority;
    });
  });

  // Default Timer Setting Change
  if (selectDefaultTimer) {
    selectDefaultTimer.addEventListener('change', async (e) => {
      const days = Number(e.target.value);
      currentExpiryDays = days;
      await store.setSetting('sticky_default_timer', days);
      if (selectNoteTimer) selectNoteTimer.value = days;
    });
  }

  // Note Expiry Setting Change
  if (selectNoteTimer) {
    selectNoteTimer.addEventListener('change', (e) => {
      currentExpiryDays = Number(e.target.value);
    });
  }

  // Create Note Function
  async function handleCreateSticky() {
    const text = inputText.value.trim();
    if (!text) {
      inputText.focus();
      return;
    }

    const expiryDays = selectNoteTimer ? Number(selectNoteTimer.value) : currentExpiryDays;

    // Calculate spawn position in canvas: center-ish or slightly randomized
    const boardRect = boardViewport.getBoundingClientRect();
    const spawnX = Math.max(20, Math.floor(Math.random() * Math.max(100, boardRect.width - 260)));
    const spawnY = Math.max(20, Math.floor(Math.random() * Math.max(100, boardRect.height - 220)));
    
    highestZIndex += 1;

    const newSticky = {
      text,
      color: selectedColor,
      priority: selectedPriority,
      expiryDays,
      x: spawnX,
      y: spawnY,
      zIndex: highestZIndex,
      rotation: (Math.random() * 4 - 2) // Subtle natural tilt
    };

    await store.saveSticky(newSticky);
    inputText.value = '';
    
    // Refresh board
    render(container);
  }

  if (btnThrow) btnThrow.addEventListener('click', handleCreateSticky);

  if (inputText) {
    inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCreateSticky();
      }
    });
  }

  // --- 2. Quick Delete Button (1-Click) ---
  container.querySelectorAll('.btn-sticky-quick-delete').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.opacity = '1';
      btn.style.background = 'rgba(0,0,0,0.12)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.opacity = '0.6';
      btn.style.background = 'transparent';
    });

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const card = container.querySelector(`#sticky-${id}`);
      
      if (card) {
        // Instant visual feedback: poof / scale-down animation
        card.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease';
        card.style.transform = 'scale(0.2) rotate(15deg)';
        card.style.opacity = '0';
        
        setTimeout(async () => {
          await store.deleteSticky(id);
          card.remove();
          // Update count pill
          const countPill = container.querySelector('.sticky-count-pill');
          const remaining = container.querySelectorAll('.sticky-note-card').length;
          if (countPill) countPill.textContent = `${remaining} ${remaining === 1 ? 'note' : 'notes'}`;
          if (remaining === 0) render(container);
        }, 220);
      } else {
        await store.deleteSticky(id);
        render(container);
      }
    });
  });

  // --- 3. Double-Click to Edit Note Content ---
  container.querySelectorAll('.sticky-card-body').forEach(body => {
    body.addEventListener('dblclick', async (e) => {
      const card = body.closest('.sticky-note-card');
      const id = card.dataset.id;
      const targetSticky = stickies.find(s => s.id === id);
      if (!targetSticky) return;

      await showModal({
        title: 'Edit Sticky Note',
        contentHtml: `
          <div class="form-group">
            <label class="form-label">Note Content</label>
            <textarea id="modal-edit-sticky-text" rows="5" class="form-input" style="font-family: inherit; font-size: 13px;">${escapeHtml(targetSticky.text)}</textarea>
          </div>
          <div class="form-group" style="margin-top: 12px; display: flex; gap: 12px;">
            <div style="flex: 1;">
              <label class="form-label">Priority</label>
              <select id="modal-edit-sticky-priority" class="form-input">
                ${Object.values(PRIORITIES).map(p => `
                  <option value="${p.id}" ${targetSticky.priority === p.id ? 'selected' : ''}>${p.label}</option>
                `).join('')}
              </select>
            </div>
            <div style="flex: 1;">
              <label class="form-label">Color</label>
              <select id="modal-edit-sticky-color" class="form-input">
                ${Object.values(STICKY_COLORS).map(c => `
                  <option value="${c.id}" ${targetSticky.color === c.id ? 'selected' : ''}>${c.name}</option>
                `).join('')}
              </select>
            </div>
          </div>
        `,
        buttons: [
          { text: 'Cancel', className: 'btn-ghost', value: null },
          {
            text: 'Save Changes',
            className: 'btn-primary',
            onClick: async (modalEl) => {
              const updatedText = modalEl.querySelector('#modal-edit-sticky-text').value.trim();
              if (!updatedText) {
                alert('Please enter note text.');
                return false;
              }
              targetSticky.text = updatedText;
              targetSticky.priority = modalEl.querySelector('#modal-edit-sticky-priority').value;
              targetSticky.color = modalEl.querySelector('#modal-edit-sticky-color').value;
              await store.saveSticky(targetSticky);
              render(container);
              return true;
            }
          }
        ]
      });
    });
  });

  // --- 4. Freeform Drag & Drop (Pointer Events with Stacking) ---
  if (currentViewMode === 'canvas') {
    setupCanvasDraggables(container, stickies, boardViewport);
  }

  // --- 5. "Rearrange to Grid" Action ---
  if (btnRearrange) {
    btnRearrange.addEventListener('click', async () => {
      await neatlyRearrangeToGrid(container, stickies, boardViewport);
    });
  }

  // --- 6. View Mode Toggles ---
  if (btnViewCanvas) {
    btnViewCanvas.addEventListener('click', () => {
      if (currentViewMode !== 'canvas') {
        currentViewMode = 'canvas';
        render(container);
      }
    });
  }

  if (btnViewGrid) {
    btnViewGrid.addEventListener('click', () => {
      if (currentViewMode !== 'grid') {
        currentViewMode = 'grid';
        render(container);
      }
    });
  }
}

/**
 * Setup Pointer-Based Drag and Stacking on Canvas
 */
function setupCanvasDraggables(container, stickies, boardViewport) {
  let activeCard = null;
  let startX = 0;
  let startY = 0;
  let initialCardLeft = 0;
  let initialCardTop = 0;
  let hasMoved = false;

  const cards = container.querySelectorAll('.sticky-note-card');

  cards.forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      // Don't drag if clicking buttons
      if (e.target.closest('.btn-sticky-quick-delete') || e.target.closest('button')) {
        return;
      }

      // Elevate z-index immediately (stack on top)
      highestZIndex += 1;
      card.style.zIndex = highestZIndex;
      card.dataset.z = highestZIndex;
      const targetSticky = stickies.find(s => s.id === card.dataset.id);
      if (targetSticky) {
        targetSticky.zIndex = highestZIndex;
      }

      activeCard = card;
      startX = e.clientX;
      startY = e.clientY;
      initialCardLeft = parseFloat(card.style.left) || 0;
      initialCardTop = parseFloat(card.style.top) || 0;
      hasMoved = false;

      card.setPointerCapture(e.pointerId);
      card.style.cursor = 'grabbing';
      card.style.boxShadow = '0 20px 35px -8px rgba(0,0,0,0.18), 0 8px 16px -4px rgba(0,0,0,0.08)';
      card.style.transition = 'none'; // Instant movement while dragging
    });

    card.addEventListener('pointermove', (e) => {
      if (!activeCard || activeCard !== card) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasMoved = true;
      }

      const boardRect = boardViewport.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // Constrain within viewport padding
      let newLeft = initialCardLeft + deltaX;
      let newTop = initialCardTop + deltaY;

      const minX = 10;
      const minY = 10;
      const maxX = Math.max(minX, boardViewport.clientWidth - cardRect.width - 15);
      const maxY = Math.max(minY, boardViewport.clientHeight - cardRect.height - 15);

      newLeft = Math.max(minX, Math.min(newLeft, maxX));
      newTop = Math.max(minY, Math.min(newTop, maxY));

      card.style.left = `${newLeft}px`;
      card.style.top = `${newTop}px`;
      card.dataset.x = newLeft;
      card.dataset.y = newTop;
    });

    card.addEventListener('pointerup', async (e) => {
      if (!activeCard || activeCard !== card) return;

      try {
        card.releasePointerCapture(e.pointerId);
      } catch (err) {}

      card.style.cursor = 'grab';
      card.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)';
      card.style.transition = 'box-shadow 0.2s ease, transform 0.2s ease';

      activeCard = null;

      // Save position and z-index to IndexedDB
      const targetSticky = stickies.find(s => s.id === card.dataset.id);
      if (targetSticky) {
        targetSticky.x = parseFloat(card.dataset.x);
        targetSticky.y = parseFloat(card.dataset.y);
        targetSticky.zIndex = parseInt(card.dataset.z, 10);
        await store.saveSticky(targetSticky);
      }
    });

    card.addEventListener('pointercancel', (e) => {
      if (activeCard === card) {
        try {
          card.releasePointerCapture(e.pointerId);
        } catch (err) {}
        card.style.cursor = 'grab';
        activeCard = null;
      }
    });
  });
}

/**
 * Neatly snap and rearrange all active sticky notes into an organized responsive grid
 */
async function neatlyRearrangeToGrid(container, stickies, boardViewport) {
  if (!stickies || stickies.length === 0) return;

  const cardWidth = 230;
  const cardHeight = 180;
  const gap = 20;
  const padding = 20;

  const containerWidth = boardViewport.clientWidth || 900;
  const cols = Math.max(1, Math.floor((containerWidth - padding * 2) / (cardWidth + gap)));

  // If in grid mode, switch to canvas first so coordinates can be animated
  if (currentViewMode === 'grid') {
    currentViewMode = 'canvas';
    await render(container);
    return;
  }

  // Calculate grid coordinates for each card
  const cards = Array.from(container.querySelectorAll('.sticky-note-card'));
  const updatedList = [];

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const targetX = padding + col * (cardWidth + gap);
    const targetY = padding + row * (cardHeight + gap);

    // Smooth transition into grid slot
    card.style.transition = 'left 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2), top 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2), transform 0.3s ease';
    card.style.left = `${targetX}px`;
    card.style.top = `${targetY}px`;
    card.style.transform = 'rotate(0deg)'; // Neatly upright
    card.dataset.x = targetX;
    card.dataset.y = targetY;
    card.dataset.rot = 0;

    const matchedSticky = stickies.find(s => s.id === card.dataset.id);
    if (matchedSticky) {
      matchedSticky.x = targetX;
      matchedSticky.y = targetY;
      matchedSticky.rotation = 0;
      updatedList.push(matchedSticky);
    }
  });

  // Adjust container min-height if rows exceed view
  const totalRows = Math.ceil(cards.length / cols);
  const neededHeight = padding * 2 + totalRows * (cardHeight + gap);
  if (neededHeight > 520) {
    boardViewport.style.minHeight = `${neededHeight}px`;
  }

  // Batch persist updated positions
  if (updatedList.length > 0) {
    await store.batchSaveStickies(updatedList);
  }
}
