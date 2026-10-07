/**
 * js/utils/sticky-shared.js - Single source of truth for Sticky Notes.
 *
 * Imported by both js/pages/stickies.js and js/pages/home.js.
 *
 * Colours are deliberately NOT defined here. They live in css/theme.css as
 * --sticky-{color}-{bg,border,text,tape} tokens and are selected by a
 * `data-color` attribute, so notes are theme-aware without any JS hex.
 */

export const STICKY_COLOR_IDS = ['yellow', 'peach', 'mint', 'sky', 'lilac', 'rose'];

export const STICKY_COLOR_NAMES = {
  yellow: 'Lemon',
  peach: 'Peach',
  mint: 'Mint',
  sky: 'Sky',
  lilac: 'Lilac',
  rose: 'Rose'
};

export const STICKY_COLOR_FALLBACK = 'yellow';

/**
 * `dot` is a CSS variable reference, not a hex, so it follows the theme.
 * `weight` drives the Home preview sort order.
 */
export const STICKY_PRIORITIES = {
  none:   { id: 'none',   label: 'None',      badge: '',          dot: '',                          weight: 0 },
  low:    { id: 'low',    label: 'Low',       badge: 'LOW',       dot: 'var(--priority-low-dot)',    weight: 1 },
  medium: { id: 'medium', label: 'Medium',    badge: 'MED',       dot: 'var(--priority-medium-dot)', weight: 2 },
  high:   { id: 'high',   label: 'High',      badge: 'HIGH',      dot: 'var(--priority-high-dot)',   weight: 3 },
  urgent: { id: 'urgent', label: 'Urgent',    badge: 'URGENT',    dot: 'var(--priority-urgent-dot)', weight: 4 }
};

export const STICKY_PRIORITY_RANK = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0
};

/**
 * A note counts as "expiring soon" only while its remaining time still shows
 * hours, never days. This keeps the chip and the per-note label from
 * contradicting each other at the 24h boundary.
 */
export const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

/** 0 = Off (Never), 1..7 days. */
export const STICKY_EXPIRY_OPTIONS = [
  { days: 0, label: 'Off (Never)' },
  { days: 1, label: '1 Day' },
  { days: 2, label: '2 Days' },
  { days: 3, label: '3 Days' },
  { days: 4, label: '4 Days' },
  { days: 5, label: '5 Days' },
  { days: 6, label: '6 Days' },
  { days: 7, label: '7 Days' }
];

/**
 * Parse a date-ish value to epoch ms. Returns 0 for missing or invalid input so
 * callers never see NaN in a subtraction.
 * @param {any} value
 * @returns {number}
 */
export function parseTime(value) {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * THE expiry formatter for sticky notes. Replaces the previous separate
 * `formatShortExpiry` (home.js) and `getRemainingTimeText` (stickies.js).
 * Returns plain text with no icon prefix - the markup owns the glyph.
 * @param {string|null} expiresAt
 * @returns {string}
 */
export function formatStickyExpiry(expiresAt) {
  if (!expiresAt) return 'No timer';
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return 'No timer';

  const diffMs = ts - Date.now();
  if (diffMs <= 0) return 'Expired';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m left`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h left` : `${days}d left`;
}

export function isExpired(sticky, now = Date.now()) {
  return Boolean(sticky && sticky.expiresAt) && parseTime(sticky.expiresAt) <= now;
}

export function countExpiringSoon(stickies, now = Date.now()) {
  if (!Array.isArray(stickies)) return 0;
  return stickies.filter((s) => {
    if (!s || !s.expiresAt) return false;
    const diff = parseTime(s.expiresAt) - now;
    return diff > 0 && diff < EXPIRING_SOON_MS;
  }).length;
}

/**
 * Highest priority first, then most recent. NaN-safe: the comparator can never
 * return NaN because parseTime() coerces invalid dates to 0.
 * @param {any[]} stickies
 * @returns {any[]} a new, sorted array
 */
export function sortStickiesForDisplay(stickies) {
  if (!Array.isArray(stickies)) return [];
  return [...stickies].sort((a, b) => {
    const weightDiff =
      (STICKY_PRIORITY_RANK[b.priority] || 0) - (STICKY_PRIORITY_RANK[a.priority] || 0);
    if (weightDiff !== 0) return weightDiff;
    return parseTime(b.createdAt) - parseTime(a.createdAt);
  });
}

/**
 * Stable colour id for a note. Unknown ids fall back to yellow so an imported
 * or corrupted record can never produce an unstyled tile.
 * @param {any} sticky
 * @returns {string}
 */
export function stickyColorId(sticky) {
  const id = sticky && sticky.color;
  return STICKY_COLOR_IDS.includes(id) ? id : STICKY_COLOR_FALLBACK;
}

/**
 * Priority definition for a note, defaulting to `none`.
 * @param {any} sticky
 * @returns {object}
 */
export function stickyPriorityDef(sticky) {
  const id = sticky && sticky.priority;
  return STICKY_PRIORITIES[id] || STICKY_PRIORITIES.none;
}