// Everything is saved on the phone: settings + session pose data in localStorage,
// recorded video clips in IndexedDB.

const KEY = 'gymbuddy.v1';

export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
export function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ }
}
export function clearState() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

let dbp;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('gymbuddy-clips', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('clips', mode);
    const req = fn(t.objectStore('clips'));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}
export const putClip = (id, blob) => tx('readwrite', (s) => s.put(blob, id)).catch(() => null);
export const getClip = (id) => tx('readonly', (s) => s.get(id)).catch(() => null);
export const deleteClip = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => null);
export const clearClips = () => tx('readwrite', (s) => s.clear()).catch(() => null);
