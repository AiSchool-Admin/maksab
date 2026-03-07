/**
 * Offline Ad Creation Queue
 *
 * Uses IndexedDB to store ad submissions that failed due to network issues.
 * When connectivity returns, queued ads are automatically submitted via
 * the Background Sync API (or manual retry as fallback).
 */

const DB_NAME = "maksab-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-ads";

export interface QueuedAd {
  id: string;
  formData: Record<string, unknown>;
  images: { name: string; type: string; base64: string }[];
  createdAt: number;
  retryCount: number;
  status: "pending" | "uploading" | "failed";
  error?: string;
}

/** Open (or create) the IndexedDB database */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Generate a simple unique ID for queued items */
function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Convert a File to a base64 string for IndexedDB storage.
 * Files/Blobs can't be reliably stored in IndexedDB across browsers.
 */
export function fileToBase64(file: File): Promise<{ name: string; type: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        base64: reader.result as string,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Add an ad to the offline queue */
export async function queueAd(
  formData: Record<string, unknown>,
  imageFiles: File[],
): Promise<string> {
  const db = await openDB();
  const images = await Promise.all(imageFiles.map(fileToBase64));

  const item: QueuedAd = {
    id: generateId(),
    formData,
    images,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => {
      // Request background sync if available
      requestBackgroundSync();
      resolve(item.id);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all queued ads */
export async function getQueuedAds(): Promise<QueuedAd[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/** Remove a queued ad (after successful submission) */
export async function removeQueuedAd(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Update a queued ad's status */
export async function updateQueuedAd(id: string, updates: Partial<QueuedAd>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, ...updates });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get count of pending ads in queue */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Request background sync registration */
function requestBackgroundSync() {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready
      .then((reg) => {
        return (reg as unknown as { sync: { register: (tag: string) => Promise<void> } })
          .sync.register("sync-pending-ads");
      })
      .catch(() => {
        // Background sync not available — will retry on online event
      });
  }
}

/**
 * Process all queued ads — called on reconnection or by background sync.
 * Returns number of successfully submitted ads.
 */
export async function processQueue(
  submitFn: (formData: Record<string, unknown>, images: { name: string; type: string; base64: string }[]) => Promise<boolean>,
): Promise<number> {
  const ads = await getQueuedAds();
  let successCount = 0;

  for (const ad of ads) {
    if (ad.retryCount >= 5) {
      await updateQueuedAd(ad.id, { status: "failed", error: "فشل بعد 5 محاولات" });
      continue;
    }

    try {
      await updateQueuedAd(ad.id, { status: "uploading" });
      const success = await submitFn(ad.formData, ad.images);

      if (success) {
        await removeQueuedAd(ad.id);
        successCount++;
      } else {
        await updateQueuedAd(ad.id, {
          status: "pending",
          retryCount: ad.retryCount + 1,
        });
      }
    } catch {
      await updateQueuedAd(ad.id, {
        status: "pending",
        retryCount: ad.retryCount + 1,
        error: "خطأ في الشبكة",
      });
    }
  }

  return successCount;
}
