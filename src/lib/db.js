import Dexie from 'dexie';

// Local IndexedDB database for offline-first operation.
// All tables are scoped to the authenticated tenant via tenantId.
export const db = new Dexie('KlevrPOS');

db.version(1).stores({
  // Full product catalogue — synced from server on each successful load
  products: 'id, tenantId, sku, name, categoryId, active, updatedAt',

  // Category list — synced alongside products
  categories: 'id, tenantId, name',

  // Sales queued while the device is offline, awaiting push to server.
  // status: 'pending' | 'syncing' | 'synced' | 'failed' | 'duplicate'
  //   pending   — not yet attempted
  //   syncing   — currently being pushed to server
  //   synced    — successfully accepted by server
  //   failed    — server rejected or network error; eligible for retry
  //   duplicate — server detected a duplicate receipt number; do not retry
  pendingSales: '++localId, tenantId, createdAt, status',

  // Sync timestamps keyed by entity name.
  // key: 'products' | 'categories'  value: { lastSync: ISO string }
  syncMeta: 'key',
});

/**
 * Wipes all locally cached tenant data from IndexedDB.
 * Called on logout to prevent cross-user data leakage.
 */
export async function clearTenantData() {
  await db.products.clear();
  await db.categories.clear();
  await db.pendingSales.clear();
  await db.syncMeta.clear();
}
