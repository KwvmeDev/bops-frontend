import { db } from './db';
import { productsApi, categoriesApi } from '../api/client';

/**
 * Pulls a fresh copy of all products and categories from the server into
 * IndexedDB. Both fetches run in parallel; the write is wrapped in a single
 * Dexie read-write transaction so the local tables are always consistent.
 *
 * Returns true on success, false on any error — never throws.
 */
export async function syncProducts() {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      productsApi.getAll({ limit: 10000 }),
      categoriesApi.getAll(),
    ]);

    await db.transaction('rw', db.products, db.categories, db.syncMeta, async () => {
      // Replace entire local catalogue — simpler than diffing and avoids stale rows
      await db.products.clear();
      await db.products.bulkPut(productsRes.data.data);

      await db.categories.clear();
      await db.categories.bulkPut(categoriesRes.data.data);

      // Record when this sync occurred so the UI can show a "last synced" label
      await db.syncMeta.put({ key: 'products', lastSync: new Date().toISOString() });
    });

    return true;
  } catch {
    // Swallow the error — callers check the boolean return value
    return false;
  }
}

/**
 * Pushes all locally queued offline sales to the server.
 *
 * salesApi is passed as a parameter rather than imported directly so that
 * callers (hooks, tests) can inject a custom implementation or mock.
 *
 * Per-sale status lifecycle:
 *   pending   syncing   synced      (happy path)
 *   pending   syncing   duplicate   (server HTTP 409 — do not retry)
 *   pending   syncing   failed      (any other error — eligible for retry)
 *
 * @param {object} salesApi - Object with a `create(payload)` async method
 */
export async function syncPendingSales(salesApi) {
  const pending = await db.pendingSales.where('status').equals('pending').toArray();

  for (const sale of pending) {
    // Mark as in-flight so duplicate sync runs skip this record
    await db.pendingSales.update(sale.localId, { status: 'syncing' });

    try {
      await salesApi.create(sale.payload);
      await db.pendingSales.update(sale.localId, { status: 'synced' });
    } catch (err) {
      // 409 = server detected a duplicate receipt number; flag and never retry
      const status = err.response?.status === 409 ? 'duplicate' : 'failed';
      await db.pendingSales.update(sale.localId, { status, error: err.message });
    }
  }
}
