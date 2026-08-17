/**
 * js/utils/export.js - Full & Selective Export Utilities (Main Deck)
 */

import * as store from '../store.js';

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportFullBackup() {
  const settings = await store.getAllSettings();
  const tasks = await store.getTasks();
  const projects = await store.getProjects();
  const notes = await store.getNotes();
  const sops = await store.getSOPs();
  const calls = await store.getCalls();
  const emails = await store.getEmails();
  const meetings = await store.getMeetings();
  const reminders = await store.getReminders();
  const activities = await store.getActivities();
  const messages = await store.getMessages();

  const backupPayload = {
    format: 'workbench',
    app: 'main-deck',
    version: 1,
    type: 'full-backup',
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      tasks,
      projects,
      notes,
      sops,
      calls,
      emails,
      meetings,
      reminders,
      activities,
      messages
    }
  };

  const filename = `maindeck-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJson(backupPayload, filename);
  await store.recordBackup();
}

export function exportSOP(sop) {
  const slug = (sop.title || 'procedure').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const payload = {
    format: 'workbench',
    app: 'main-deck',
    version: 1,
    type: 'selective-sop',
    exportedAt: new Date().toISOString(),
    data: sop
  };
  downloadJson(payload, `${slug}.sop.json`);
}

export function exportNote(note) {
  const slug = (note.title || 'note').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const payload = {
    format: 'workbench',
    app: 'main-deck',
    version: 1,
    type: 'selective-note',
    exportedAt: new Date().toISOString(),
    data: note
  };
  downloadJson(payload, `${slug}.note.json`);
}

export async function exportProject(project) {
  const phases = await store.getPhasesByProject(project.id);
  const tasks = await store.getTasksByProject(project.id);
  const slug = (project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const payload = {
    format: 'workbench',
    app: 'main-deck',
    version: 1,
    type: 'selective-project',
    exportedAt: new Date().toISOString(),
    data: {
      project,
      phases,
      tasks
    }
  };
  downloadJson(payload, `${slug}.project.json`);
}
