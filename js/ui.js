/**
 * js/ui.js - Safe DOM rendering helpers and UI utilities
 */

/**
 * Escape HTML to prevent XSS vulnerabilities
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
export function generateId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a DOM element with classes and attributes
 * @param {string} tag 
 * @param {object} options 
 * @returns {HTMLElement}
 */
export function createEl(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.text) el.textContent = options.text;
  if (options.html) el.innerHTML = options.html;
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      if (v !== null && v !== undefined) {
        el.setAttribute(k, v);
      }
    }
  }
  if (options.children && Array.isArray(options.children)) {
    for (const child of options.children) {
      if (child) el.appendChild(child);
    }
  }
  return el;
}

/**
 * Modal Manager
 */
let activeModalResolve = null;

export function showModal({ title, contentHtml, buttons = [], onMount = null }) {
  const overlay = document.getElementById('modal-overlay');
  const windowEl = document.getElementById('modal-window');
  if (!overlay || !windowEl) return Promise.resolve(null);

  // Clear previous
  windowEl.innerHTML = '';

  // Header
  const header = createEl('div', { className: 'modal-header' });
  const titleEl = createEl('h3', { className: 'modal-title', text: title || '' });
  const closeBtn = createEl('button', {
    className: 'btn-icon',
    text: '✕',
    attrs: { 'aria-label': 'Close modal' }
  });
  closeBtn.addEventListener('click', () => closeModal(null));
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = createEl('div', { className: 'modal-body', html: contentHtml || '' });

  // Footer
  const footer = createEl('div', { className: 'modal-footer' });
  
  return new Promise((resolve) => {
    activeModalResolve = resolve;

    buttons.forEach((btnConfig) => {
      const btn = createEl('button', {
        className: `btn ${btnConfig.className || 'btn-secondary'}`,
        text: btnConfig.text
      });
      btn.addEventListener('click', async () => {
        let result = btnConfig.value;
        if (typeof btnConfig.onClick === 'function') {
          const res = await btnConfig.onClick(body);
          if (res === false) return; // don't close if explicit false
          if (res !== undefined) result = res;
        }
        closeModal(result);
      });
      footer.appendChild(btn);
    });

    windowEl.appendChild(header);
    windowEl.appendChild(body);
    if (buttons.length > 0) windowEl.appendChild(footer);

    overlay.classList.add('is-active');

    // Run onMount hook immediately after DOM insertion
    if (typeof onMount === 'function') {
      try {
        onMount(body);
      } catch (err) {
        console.error('Error in modal onMount callback:', err);
      }
    }

    // Close on backdrop click
    const handleBackdrop = (e) => {
      if (e.target === overlay) {
        overlay.removeEventListener('click', handleBackdrop);
        closeModal(null);
      }
    };
    overlay.addEventListener('click', handleBackdrop);
  });
}

export function closeModal(val = null) {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('is-active');
  }
  if (activeModalResolve) {
    activeModalResolve(val);
    activeModalResolve = null;
  }
}

// Global Escape Key Listener for Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(null);
  }
});

/**
 * Empty State Generator
 * @param {string} message 
 * @returns {string} HTML string
 */
export function emptyStateHtml(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

/**
 * Banner Notification Controller
 */
export function showBanner({ text, actionText, onAction, onDismiss }) {
  const banner = document.getElementById('app-banner');
  if (!banner) return;

  const contentEl = banner.querySelector('.banner-content');
  const actionBtn = banner.querySelector('.banner-action-btn');
  const dismissBtn = banner.querySelector('.banner-dismiss-btn');

  if (contentEl) contentEl.textContent = text;

  if (actionBtn) {
    if (actionText && onAction) {
      actionBtn.textContent = actionText;
      actionBtn.style.display = 'inline-flex';
      actionBtn.onclick = () => {
        onAction();
        hideBanner();
      };
    } else {
      actionBtn.style.display = 'none';
    }
  }

  if (dismissBtn) {
    dismissBtn.onclick = () => {
      if (onDismiss) onDismiss();
      hideBanner();
    };
  }

  banner.classList.add('is-visible');
}

export function hideBanner() {
  const banner = document.getElementById('app-banner');
  if (banner) {
    banner.classList.remove('is-visible');
  }
}
