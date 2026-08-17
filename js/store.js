/**
 * js/store.js - Unified Data Access Layer for The Workbench
 */

import * as db from './db.js';
import { generateId } from './ui.js';

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
    }
  }

  const msgCount = await db.count('messages');
  if (msgCount < 20) {
    for (const msg of DEFAULT_MESSAGES) {
      await db.put('messages', msg);
    }
  }

  const installMeta = await db.get('meta', 'installedAt');
  if (!installMeta) {
    await db.put('meta', { key: 'installedAt', newDate: new Date().toISOString(), value: new Date().toISOString() });
    await db.put('meta', { key: 'lastBackupAt', value: new Date().toISOString() });
  }
}

/* ==================== SETTINGS & META ==================== */

export async function getSetting(key, fallback = null) {
  const record = await db.get('settings', key);
  return record ? record.value : fallback;
}

export async function setSetting(key, value) {
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
  return task;
}

export async function deleteTask(id) {
  return await db.remove('tasks', id);
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
  return await db.remove('projects', id);
}

/* ==================== PHASES ==================== */

export async function getPhasesByProject(projectId) {
  return await db.getByIndex('phases', 'projectId', projectId);
}

export async function savePhase(phase) {
  if (!phase.id) phase.id = generateId();
  await db.put('phases', phase);
  return phase;
}

export async function deletePhase(id) {
  return await db.remove('phases', id);
}

/* ==================== NOTES ==================== */

export async function getNotes() {
  return await db.getAll('notes');
}

export async function saveNote(note) {
  if (!note.id) note.id = generateId();
  note.updatedAt = new Date().toISOString();
  await db.put('notes', note);
  return note;
}

export async function deleteNote(id) {
  return await db.remove('notes', id);
}

/* ==================== SOPS ==================== */

export async function getSOPs() {
  return await db.getAll('sops');
}

export async function saveSOP(sop) {
  if (!sop.id) sop.id = generateId();
  sop.updatedAt = new Date().toISOString();
  await db.put('sops', sop);
  return sop;
}

export async function deleteSOP(id) {
  return await db.remove('sops', id);
}

/* ==================== CALLS, EMAILS, MEETINGS, REMINDERS ==================== */

export async function getCalls() {
  return await db.getAll('calls');
}
export async function saveCall(item) {
  if (!item.id) item.id = generateId();
  await db.put('calls', item);
  return item;
}
export async function deleteCall(id) {
  return await db.remove('calls', id);
}

export async function getEmails() {
  return await db.getAll('emails');
}
export async function saveEmail(item) {
  if (!item.id) item.id = generateId();
  await db.put('emails', item);
  return item;
}
export async function deleteEmail(id) {
  return await db.remove('emails', id);
}

export async function getMeetings() {
  return await db.getAll('meetings');
}
export async function saveMeeting(item) {
  if (!item.id) item.id = generateId();
  await db.put('meetings', item);
  return item;
}
export async function deleteMeeting(id) {
  return await db.remove('meetings', id);
}

export async function getReminders() {
  return await db.getAll('reminders');
}
export async function saveReminder(item) {
  if (!item.id) item.id = generateId();
  await db.put('reminders', item);
  return item;
}
export async function deleteReminder(id) {
  return await db.remove('reminders', id);
}

/* ==================== ACTIVITIES & MESSAGES ==================== */

export async function getActivities() {
  return await db.getAll('activities');
}
export async function saveActivity(item) {
  if (!item.id) item.id = generateId();
  await db.put('activities', item);
  return item;
}
export async function deleteActivity(id) {
  return await db.remove('activities', id);
}

export async function getMessages() {
  return await db.getAll('messages');
}
export async function saveMessage(item) {
  if (!item.id) item.id = generateId();
  await db.put('messages', item);
  return item;
}
export async function deleteMessage(id) {
  return await db.remove('messages', id);
}

