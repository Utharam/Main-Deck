/**
 * js/utils/import.js - Backup Restore & Selective Import Engine
 */

import * as store from '../store.js';

/**
 * Read and parse a user-selected JSON file
 * @param {File} file 
 * @returns {Promise<object>}
 */
export async function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON format. Please upload a valid JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

/**
 * Handle import of Workbench JSON files (full backup or selective)
 * @param {object} json 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function handleImport(json) {
  if (!json || json.format !== 'workbench') {
    throw new Error('Unsupported file format. Expected a Workbench JSON file.');
  }

  if (json.type === 'full-backup') {
    return await restoreFullBackup(json.data);
  } else if (json.type === 'selective-sop') {
    await store.saveSOP(json.data);
    return { success: true, message: `SOP "${json.data.title}" imported successfully.` };
  } else if (json.type === 'selective-note') {
    await store.saveNote(json.data);
    return { success: true, message: `Note "${json.data.title}" imported successfully.` };
  } else if (json.type === 'selective-project') {
    const { project, phases = [], tasks = [] } = json.data;
    await store.saveProject(project);
    for (const ph of phases) {
      await store.savePhase(ph);
    }
    for (const t of tasks) {
      await store.saveTask(t);
    }
    return { success: true, message: `Project "${project.name}" with ${phases.length} phases and ${tasks.length} tasks imported successfully.` };
  } else {
    throw new Error(`Unrecognized Workbench payload type: ${json.type}`);
  }
}

/**
 * Restore Full Backup
 */
async function restoreFullBackup(data) {
  if (!data) throw new Error('Empty backup data payload.');

  if (data.settings) {
    for (const [k, v] of Object.entries(data.settings)) {
      await store.setSetting(k, v);
    }
  }

  if (Array.isArray(data.tasks)) {
    for (const item of data.tasks) await store.saveTask(item);
  }
  if (Array.isArray(data.projects)) {
    for (const item of data.projects) await store.saveProject(item);
  }
  if (Array.isArray(data.notes)) {
    for (const item of data.notes) await store.saveNote(item);
  }
  if (Array.isArray(data.sops)) {
    for (const item of data.sops) await store.saveSOP(item);
  }
  if (Array.isArray(data.calls)) {
    for (const item of data.calls) await store.saveCall(item);
  }
  if (Array.isArray(data.emails)) {
    for (const item of data.emails) await store.saveEmail(item);
  }
  if (Array.isArray(data.meetings)) {
    for (const item of data.meetings) await store.saveMeeting(item);
  }
  if (Array.isArray(data.reminders)) {
    for (const item of data.reminders) await store.saveReminder(item);
  }
  if (Array.isArray(data.activities)) {
    for (const item of data.activities) await store.saveActivity(item);
  }

  await store.recordBackup();
  return { success: true, message: 'Full Workbench backup restored successfully!' };
}
