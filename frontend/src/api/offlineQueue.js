/**
 * MOMENT Offline-First Store-and-Forward Engine (IndexedDB)
 * ========================================================
 * Stores vital recordings, blood loss measurements, and clinical events locally
 * when internet is unavailable. Automatically synchronizes with backend on reconnection.
 */

const DB_NAME = 'moment_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_events';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineEvent(eventType, data) {
  try {
    const db = await openDatabase();
    if (!db) {
      // Fallback to localStorage if IndexedDB not supported
      const queue = JSON.parse(localStorage.getItem('moment_fallback_queue') || '[]');
      queue.push({ eventType, data, timestamp: new Date().toISOString(), status: 'PENDING' });
      localStorage.setItem('moment_fallback_queue', JSON.stringify(queue));
      return;
    }

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      sync_status: 'PENDING'
    });
  } catch (err) {
    console.warn('Could not save to offline queue:', err);
  }
}

export async function getPendingEventsCount() {
  try {
    const db = await openDatabase();
    if (!db) {
      const queue = JSON.parse(localStorage.getItem('moment_fallback_queue') || '[]');
      return queue.filter(e => e.status === 'PENDING').length;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function flushPendingEvents(syncBatchFn) {
  try {
    const db = await openDatabase();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getAllReq = store.getAll();

    getAllReq.onsuccess = async () => {
      const items = getAllReq.result || [];
      if (items.length === 0) return;

      try {
        const payload = {
          device_id: 'BROWSER-FRONTEND-CLIENT',
          facility_id: 'FAC-SC-KHEDI',
          records: items.map(item => ({
            event_id: `EVT-${item.id}-${Date.now()}`,
            patient_id: item.data?.patient_id || 'MOMENT-PT-2916',
            timestamp: item.timestamp,
            event_type: item.eventType,
            data: item.data
          }))
        };
        await syncBatchFn(payload);

        // Clear synced items
        const clearTx = db.transaction(STORE_NAME, 'readwrite');
        clearTx.objectStore(STORE_NAME).clear();
        console.log(`✅ Synced ${items.length} offline records to backend.`);
      } catch (err) {
        console.warn('Sync attempt failed, records kept in queue:', err);
      }
    };
  } catch (err) {
    console.warn('Error flushing offline queue:', err);
  }
}
