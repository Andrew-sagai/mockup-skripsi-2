/**
 * Penyimpanan berkas PDF berbasis IndexedDB peramban lokal.
 * Memungkinkan berkas PDF nyata yang diunggah pengguna (sampai puluhan MB)
 * tersimpan secara lokal dan dapat dibuka kapan pun dalam pratinjau,
 * tanpa membebani kuota 5MB localStorage.
 */

const DB_NAME = 'distan_surat_docs_db';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_files';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung pada lingkungan ini'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Menyimpan berkas PDF (File atau Blob) ke IndexedDB dengan satu atau beberapa kunci unik
 */
export async function savePdfToStorage(key: string, fileOrBlob: Blob | File): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileOrBlob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Gagal menyimpan PDF ke IndexedDB:', err);
  }
}

/**
 * Mengambil Blob PDF berdasarkan kunci dari IndexedDB
 */
export async function getPdfFromStorage(key: string): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Gagal membaca PDF dari IndexedDB:', err);
    return null;
  }
}

/**
 * Mengambil Blob PDF dari beberapa kandidat kunci secara berurutan
 */
export async function getPdfFromCandidates(keys: (string | undefined | null)[]): Promise<Blob | null> {
  const validKeys = keys.filter((k): k is string => Boolean(k && k.trim().length > 0));
  for (const k of validKeys) {
    // Normalisasi kunci jika berupa URL atau path
    const cleanKey = k.replace(/^(\/docs\/|\/)/, '');
    const found = await getPdfFromStorage(k) || await getPdfFromStorage(cleanKey);
    if (found) return found;
  }
  return null;
}
