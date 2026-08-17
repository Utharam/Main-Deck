/**
 * js/db.js - IndexedDB Core Foundation for The Workbench
 * Version: 1
 */

const DB_NAME = 'workbench';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Initializes and returns the IndexedDB database instance.
 * Handles schema definition, version upgrades, and private mode detection.
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. tasks: (id, projectId, status, phaseId, createdAt)
      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('projectId', 'projectId', { unique: false });
        tasksStore.createIndex('status', 'status', { unique: false });
        tasksStore.createIndex('phaseId', 'phaseId', { unique: false });
        tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. projects: (id, status, updatedAt)
      if (!db.objectStoreNames.contains('projects')) {
        const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectsStore.createIndex('status', 'status', { unique: false });
        projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 3. phases: (id, projectId, order)
      if (!db.objectStoreNames.contains('phases')) {
        const phasesStore = db.createObjectStore('phases', { keyPath: 'id' });
        phasesStore.createIndex('projectId', 'projectId', { unique: false });
        phasesStore.createIndex('order', 'order', { unique: false });
      }

      // 4. notes: (id, projectId, standalone, updatedAt)
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('projectId', 'projectId', { unique: false });
        notesStore.createIndex('standalone', 'standalone', { unique: false });
        notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 5. sops: (id, title, updatedAt)
      if (!db.objectStoreNames.contains('sops')) {
        const sopsStore = db.createObjectStore('sops', { keyPath: 'id' });
        sopsStore.createIndex('title', 'title', { unique: false });
        sopsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 6. flowcharts: (id, updatedAt)
      if (!db.objectStoreNames.contains('flowcharts')) {
        const flowchartsStore = db.createObjectStore('flowcharts', { keyPath: 'id' });
        flowchartsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 7. calls: (id, when, status)
      if (!db.objectStoreNames.contains('calls')) {
        const callsStore = db.createObjectStore('calls', { keyPath: 'id' });
        callsStore.createIndex('when', 'when', { unique: false });
        callsStore.createIndex('status', 'status', { unique: false });
      }

      // 8. emails: (id, when, status)
      if (!db.objectStoreNames.contains('emails')) {
        const emailsStore = db.createObjectStore('emails', { keyPath: 'id' });
        emailsStore.createIndex('when', 'when', { unique: false });
        emailsStore.createIndex('status', 'status', { unique: false });
      }

      // 9. meetings: (id, when)
      if (!db.objectStoreNames.contains('meetings')) {
        const meetingsStore = db.createObjectStore('meetings', { keyPath: 'id' });
        meetingsStore.createIndex('when', 'when', { unique: false });
      }

      // 10. reminders: (id, due, status)
      if (!db.objectStoreNames.contains('reminders')) {
        const remindersStore = db.createObjectStore('reminders', { keyPath: 'id' });
        remindersStore.createIndex('due', 'due', { unique: false });
        remindersStore.createIndex('status', 'status', { unique: false });
      }

      // 11. activities: (id, type, lastDate) - for "Days Since"
      if (!db.objectStoreNames.contains('activities')) {
        const activitiesStore = db.createObjectStore('activities', { keyPath: 'id' });
        activitiesStore.createIndex('type', 'type', { unique: false });
        activitiesStore.createIndex('lastDate', 'lastDate', { unique: false });
      }

      // 12. messages: (id, category) - quotes & human encouragement
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('category', 'category', { unique: false });
      }

      // 13. settings: (key) - key-value preferences
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 14. meta: (key) - metadata like lastBackupTime, installDate
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        console.warn('Workbench Database version changed elsewhere. Closed connection.');
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };

    request.onblocked = () => {
      console.warn('Database open request is blocked by an open connection in another tab.');
    };
  });
}

/**
 * Execute a transaction on a specific store.
 * @param {string} storeName 
 * @param {'readonly'|'readwrite'} mode 
 * @param {(store: IDBObjectStore, tx: IDBTransaction) => Promise<any>|any} callback 
 */
export async function withStore(storeName, mode, callback) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    let callbackResult;
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      tx.oncomplete = () => {
        resolve(callbackResult);
      };

      tx.onerror = (e) => {
        reject(e.target.error);
      };

      tx.onabort = (e) => {
        reject(e.target.error || new Error('IndexedDB transaction aborted'));
      };

      callbackResult = callback(store, tx);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Get all records from a store
 * @param {string} storeName 
 * @returns {Promise<any[]>}
 */
export async function getAll(storeName) {
  return withStore(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Get a single record by key
 * @param {string} storeName 
 * @param {IDBValidKey} key 
 * @returns {Promise<any>}
 */
export async function get(storeName, key) {
  return withStore(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Put (insert or update) a record
 * @param {string} storeName 
 * @param {any} value 
 * @returns {Promise<IDBValidKey>}
 */
export async function put(storeName, value) {
  return withStore(storeName, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Delete a record by key
 * @param {string} storeName 
 * @param {IDBValidKey} key 
 * @returns {Promise<void>}
 */
export async function remove(storeName, key) {
  return withStore(storeName, 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Count total records in a store
 * @param {string} storeName 
 * @returns {Promise<number>}
 */
export async function count(storeName) {
  return withStore(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Query records by index
 * @param {string} storeName 
 * @param {string} indexName 
 * @param {IDBValidKey|IDBKeyRange} query 
 * @returns {Promise<any[]>}
 */
export async function getByIndex(storeName, indexName, query) {
  return withStore(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const index = store.index(indexName);
      const request = index.getAll(query);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}
