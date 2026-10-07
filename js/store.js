/**
 * js/store.js - Unified Data Access Layer for The Workbench
 */

import * as db from './db.js';
import { generateId } from './ui.js';

const DATA_CHANGED_EVENT = 'maindeck:data-changed';

/**
 * Notify the app shell that persisted data changed, so views that are mounted
 * outside the router (the right-rail widgets, the footer docks) can refresh.
 * Without this the rail cards go stale on edit while the Home pills — which
 * re-read on navigation — stay correct, and both are visible at once.
 * @param {string} [source] Optional label for debugging
 */
export function emitDataChanged(source = 'store') {
  try {
    document.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { source } }));
  } catch (err) {
    console.warn('emitDataChanged failed:', err);
  }
}

export { DATA_CHANGED_EVENT };

// Curated 50+ Human Quotes & Encouragements
const DEFAULT_MESSAGES = [
  // Work
  { id: 'msg-w1', category: 'work', text: 'One thing at a time.' },
  { id: 'msg-w2', category: 'work', text: 'Progress, not perfection.' },
  { id: 'msg-w3', category: 'work', text: 'Finish what matters. The rest can wait.' },
  { id: 'msg-w4', category: 'work', text: 'Action cures hesitation.' },
  { id: 'msg-w5', category: 'work', text: 'Small steps, consistently taken.' },
  { id: 'msg-w6', category: 'work', text: 'Clarify before executing.' },
  { id: 'msg-w7', category: 'work', text: 'Done is better than perfect.' },
  { id: 'msg-w8', category: 'work', text: 'You are not fighting a mountain, just 3 tasks.' },
  { id: 'msg-w9', category: 'work', text: 'Focus is saying no to good ideas for great ones.' },
  { id: 'msg-w10', category: 'work', text: 'Keep the main thing the main thing.' },

  // Body
  { id: 'msg-b1', category: 'body', text: 'Hey, I hope you’ve had some water.' },
  { id: 'msg-b2', category: 'body', text: 'Have you stretched your shoulders today?' },
  { id: 'msg-b3', category: 'body', text: 'When did you last walk away from the screen?' },
  { id: 'msg-b4', category: 'body', text: 'Relax your jaw and drop your shoulders.' },
  { id: 'msg-b5', category: 'body', text: 'Look 20 feet away for 20 seconds to rest your eyes.' },
  { id: 'msg-b6', category: 'body', text: 'Take a deep, slow breath in... and let it go.' },
  { id: 'msg-b7', category: 'body', text: 'Unclench your hands. Shake out your wrists.' },
  { id: 'msg-b8', category: 'body', text: 'Stand up and stretch for 30 seconds.' },
  { id: 'msg-b9', category: 'body', text: 'Hydration makes thinking clearer.' },
  { id: 'msg-b10', category: 'body', text: 'Your posture will thank you.' },

  // Life
  { id: 'msg-l1', category: 'life', text: 'Call someone you love.' },
  { id: 'msg-l2', category: 'life', text: 'There’s a whole world outside this browser window.' },
  { id: 'msg-l3', category: 'life', text: 'Life happens outside of spreadsheets.' },
  { id: 'msg-l4', category: 'life', text: 'Work is what you do, not who you are.' },
  { id: 'msg-l5', category: 'life', text: 'Make time for dinner with people who matter.' },
  { id: 'msg-l6', category: 'life', text: 'The spreadsheet will be here tomorrow.' },
  { id: 'msg-l7', category: 'life', text: 'Go outside and feel the breeze.' },
  { id: 'msg-l8', category: 'life', text: 'Remember what you are working for.' },
  { id: 'msg-l9', category: 'life', text: 'Protect your peace.' },
  { id: 'msg-l10', category: 'life', text: 'Be present where your feet are.' },

  // Calm
  { id: 'msg-c1', category: 'calm', text: 'You don’t have to solve everything at once.' },
  { id: 'msg-c2', category: 'calm', text: 'The work will still be here tomorrow.' },
  { id: 'msg-c3', category: 'calm', text: 'Breathe. It’s just work.' },
  { id: 'msg-c4', category: 'calm', text: 'Slow down to go faster.' },
  { id: 'msg-c5', category: 'calm', text: 'Quiet your mind for two minutes.' },
  { id: 'msg-c6', category: 'calm', text: 'Not everything is an emergency.' },
  { id: 'msg-c7', category: 'calm', text: 'Give yourself permission to pause.' },
  { id: 'msg-c8', category: 'calm', text: 'One breath at a time.' },
  { id: 'msg-c9', category: 'calm', text: 'Peace of mind is a choice.' },
  { id: 'msg-c10', category: 'calm', text: 'You are doing fine.' },

  // After Hours
  { id: 'msg-a1', category: 'afterhours', text: '🌙 Remember there are people outside the screen. Close the browser.' },
  { id: 'msg-a2', category: 'afterhours', text: 'Work is done. Life isn’t.' },
  { id: 'msg-a3', category: 'afterhours', text: 'The spreadsheet can wait. The evening can’t.' },
  { id: 'msg-a4', category: 'afterhours', text: 'You’ve done enough for today. Go be somewhere else.' },
  { id: 'msg-a5', category: 'afterhours', text: 'Close the laptop. Go live.' }
];

const DEFAULT_SETTINGS = {
  userName: 'User',
  workStart: '09:00',
  workEnd: '18:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  workingDays: [1, 2, 3, 4, 5],
  theme: 'light',
  quirk: 'auto',
  stressScore: 20
};

/**
 * Initialize Default Store Data
 */
export async function initializeDefaults() {
  const nameSetting = await db.get('settings', 'userName');
  if (!nameSetting) {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      await db.put('settings', { key: k, value: v });
      emitDataChanged('put');
    }
  }

  const msgCount = await db.count('messages');
  if (msgCount < 20) {
    for (const msg of DEFAULT_MESSAGES) {
      await db.put('messages', msg);
      emitDataChanged('put');
    }
  }

  const installMeta = await db.get('meta', 'installedAt');
  if (!installMeta) {
    await db.put('meta', { key: 'installedAt', newDate: new Date().toISOString(), value: new Date().toISOString() });
    emitDataChanged('put');
  }

  // Earlier versions seeded lastBackupAt to the install timestamp, which made
  // Settings report a successful backup that never happened and suppressed the
  // real backup reminder for 3.5 days. Clear that bogus seed so existing users
  // see "Never" until they genuinely export.
  const lastBackup = await db.get('meta', 'lastBackupAt');
  const installedAt = installMeta ? installMeta.value : null;
  if (lastBackup && installedAt && lastBackup.value === installedAt) {
    await db.remove('meta', 'lastBackupAt');
  }
}

/* ==================== SETTINGS & META ==================== */

export async function getSetting(key, fallback = null) {
  const record = await db.get('settings', key);
  return record ? record.value : fallback;
}

export async function setSetting(key, value) {
  emitDataChanged('setSetting');
  return await db.put('settings', { key, value });
}

export async function getAllSettings() {
  const records = await db.getAll('settings');
  const result = { ...DEFAULT_SETTINGS };
  records.forEach((r) => {
    result[r.key] = r.value;
  });
  return result;
}

export async function getMeta(key) {
  const record = await db.get('meta', key);
  return record ? record.value : null;
}

export async function setMeta(key, value) {
  return await db.put('meta', { key, value });
}

export async function recordBackup() {
  return await setMeta('lastBackupAt', new Date().toISOString());
}

export async function shouldPromptBackup() {
  const lastBackup = await getMeta('lastBackupAt');
  if (!lastBackup) return true;
  const daysDiff = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= 3.5;
}

/* ==================== TASKS ==================== */

export async function getTasks() {
  return await db.getAll('tasks');
}

export async function getTasksByProject(projectId) {
  return await db.getByIndex('tasks', 'projectId', projectId);
}

export async function saveTask(task) {
  if (!task.id) task.id = generateId();
  if (!task.createdAt) task.createdAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  await db.put('tasks', task);
  emitDataChanged('put');
  return task;
}

export async function deleteTask(id) {
  await db.remove('tasks', id);
  emitDataChanged('remove');
}

/* ==================== PROJECTS ==================== */

export async function getProjects() {
  return await db.getAll('projects');
}

export async function getProject(id) {
  return await db.get('projects', id);
}

export async function saveProject(project) {
  if (!project.id) project.id = generateId();
  if (!project.createdAt) project.createdAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  await db.put('projects', project);
  emitDataChanged('put');
  return project;
}

export async function deleteProject(id) {
  const phases = await getPhasesByProject(id);
  for (const ph of phases) {
    await db.remove('phases', ph.id);
  }
  const tasks = await getTasksByProject(id);
  for (const t of tasks) {
    await db.remove('tasks', t.id);
  }
  await db.remove('projects', id);
  emitDataChanged('remove');
}

/* ==================== PHASES ==================== */

/**
 * Get every phase across all projects.
 * Used by the Projects page for step completion toggles and context note autosave.
 * @returns {Promise<any[]>}
 */
export async function getPhases() {
  return await db.getAll('phases');
}

export async function getPhasesByProject(projectId) {
  return await db.getByIndex('phases', 'projectId', projectId);
}

export async function savePhase(phase) {
  if (!phase.id) phase.id = generateId();
  await db.put('phases', phase);
  emitDataChanged('put');
  return phase;
}

export async function deletePhase(id) {
  await db.remove('phases', id);
  emitDataChanged('remove');
}

/* ==================== NOTES ==================== */

export async function getNotes() {
  return await db.getAll('notes');
}

export async function saveNote(note) {
  if (!note.id) note.id = generateId();
  note.updatedAt = new Date().toISOString();
  await db.put('notes', note);
  emitDataChanged('put');
  return note;
}

export async function deleteNote(id) {
  await db.remove('notes', id);
  emitDataChanged('remove');
}

/* ==================== SOPS ==================== */

export async function getSOPs() {
  return await db.getAll('sops');
}

export async function saveSOP(sop) {
  if (!sop.id) sop.id = generateId();
  sop.updatedAt = new Date().toISOString();
  await db.put('sops', sop);
  emitDataChanged('put');
  return sop;
}

export async function deleteSOP(id) {
  await db.remove('sops', id);
  emitDataChanged('remove');
}

/* ==================== CALLS, EMAILS, MEETINGS, REMINDERS ==================== */

export async function getCalls() {
  return await db.getAll('calls');
}
export async function saveCall(item) {
  if (!item.id) item.id = generateId();
  await db.put('calls', item);
  emitDataChanged('put');
  return item;
}
export async function deleteCall(id) {
  await db.remove('calls', id);
  emitDataChanged('remove');
}

export async function getEmails() {
  return await db.getAll('emails');
}
export async function saveEmail(item) {
  if (!item.id) item.id = generateId();
  await db.put('emails', item);
  emitDataChanged('put');
  return item;
}
export async function deleteEmail(id) {
  await db.remove('emails', id);
  emitDataChanged('remove');
}

export async function getMeetings() {
  return await db.getAll('meetings');
}
export async function saveMeeting(item) {
  if (!item.id) item.id = generateId();
  await db.put('meetings', item);
  emitDataChanged('put');
  return item;
}
export async function deleteMeeting(id) {
  await db.remove('meetings', id);
  emitDataChanged('remove');
}

export async function getReminders() {
  return await db.getAll('reminders');
}
export async function saveReminder(item) {
  if (!item.id) item.id = generateId();
  await db.put('reminders', item);
  emitDataChanged('put');
  return item;
}
export async function deleteReminder(id) {
  await db.remove('reminders', id);
  emitDataChanged('remove');
}

/* ==================== ACTIVITIES & MESSAGES ==================== */

export async function getActivities() {
  return await db.getAll('activities');
}
export async function saveActivity(item) {
  if (!item.id) item.id = generateId();
  await db.put('activities', item);
  emitDataChanged('put');
  return item;
}
export async function deleteActivity(id) {
  await db.remove('activities', id);
  emitDataChanged('remove');
}

export async function getMessages() {
  return await db.getAll('messages');
}
export async function saveMessage(item) {
  if (!item.id) item.id = generateId();
  await db.put('messages', item);
  emitDataChanged('put');
  return item;
}
export async function deleteMessage(id) {
  await db.remove('messages', id);
  emitDataChanged('remove');
}

/* ==================== STICKY NOTES ==================== */

/**
 * Get all live sticky notes. Expired notes are filtered out but NOT deleted —
 * purging is the exclusive job of cleanupExpiredStickies(), never of a getter.
 * Malformed `expiresAt` values are kept (Date.parse -> NaN fails the comparison).
 * @returns {Promise<any[]>}
 */
export async function getStickies() {
  const now = Date.now();
  const all = await db.getAll('stickies');
  return all.filter((s) => !(s.expiresAt && Date.parse(s.expiresAt) <= now));
}

/**
 * Get every stored sticky note, including expired ones.
 * Used by backup export so a restore is faithful to what was stored.
 * @returns {Promise<any[]>}
 */
export async function getStickiesRaw() {
  return await db.getAll('stickies');
}

/**
 * Save or update a single sticky note.
 * Automatically computes `expiresAt` if `expiryDays` (1 to 7) is provided.
 * @param {object} sticky
 * @returns {Promise<object>}
 */
export async function saveSticky(sticky) {
  if (!sticky.id) sticky.id = generateId();
  const now = new Date();
  if (!sticky.createdAt) sticky.createdAt = now.toISOString();
  sticky.updatedAt = now.toISOString();

  // If expiryDays is provided (1-7), calculate expiresAt; if null or 0, timer is turned off
  if (sticky.expiryDays && Number(sticky.expiryDays) > 0) {
    const days = Number(sticky.expiryDays);
    const expireTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    sticky.expiresAt = expireTime.toISOString();
  } else if (sticky.expiryDays === 0 || sticky.expiryDays === null) {
    sticky.expiresAt = null;
  }

  // Defaults
  if (typeof sticky.zIndex !== 'number') sticky.zIndex = 1;
  if (!sticky.priority) sticky.priority = 'none';
  if (!sticky.color) sticky.color = 'yellow';

  await db.put('stickies', sticky);
  emitDataChanged('put');
  return sticky;
}

/**
 * Delete a sticky note immediately.
 * @param {string} id
 */
export async function deleteSticky(id) {
  await db.remove('stickies', id);
  emitDataChanged('remove');
}

/**
 * Batch save multiple stickies (e.g. after grid rearrangement or bulk stacking updates).
 * @param {object[]} stickies
 */
export async function batchSaveStickies(stickies) {
  if (!stickies || stickies.length === 0) return;
  await db.withStore('stickies', 'readwrite', (store) => {
    for (const item of stickies) {
      store.put(item);
    }
  });
  emitDataChanged('batchSaveStickies');
}

/**
 * Sweep and permanently purge expired stickies in a single transaction.
 * Read and delete must share one transaction: awaiting a second transaction
 * inside the callback would let the first auto-commit (TransactionInactiveError).
 * @returns {Promise<number>} Number of purged stickies
 */
export async function cleanupExpiredStickies() {
  const now = Date.now();
  return await db.withStore('stickies', 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const getReq = store.getAll();
      getReq.onsuccess = () => {
        const rows = getReq.result || [];
        const ids = rows
          .filter((s) => s.expiresAt && Date.parse(s.expiresAt) <= now)
          .map((s) => s.id);
        // Issue every delete synchronously so they share this transaction.
        ids.forEach((id) => store.delete(id));
        // withStore() resolves on tx.oncomplete, so the caller only ever
        // observes this count once the deletes have actually committed.
        resolve(ids.length);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });
}


