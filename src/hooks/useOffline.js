import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { syncPendingSales, syncProducts } from '../lib/syncService';
import { salesApi } from '../api/client';

/**
 * useOffline — tracks network connectivity and drives the offline sync lifecycle.
 *
 * Returns:
 *   isOffline    — true when navigator.onLine is false
 *   pendingCount — number of pendingSales rows with status 'pending'
 *   syncing      — true while a sync run is in flight
 *   runSync      — manually trigger a sync (no-op when offline or already syncing)
 */
export function useOffline() {
  // Initialise from the browser's current connectivity state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  /**
   * Re-counts pendingSales rows with status 'pending' and updates state.
   * Called on mount and after each sync run.
   */
  const checkPending = useCallback(async () => {
    const count = await db.pendingSales.where('status').equals('pending').count();
    setPendingCount(count);
  }, []);

  /**
   * Push all queued offline sales to the server, then refresh the local product
   * catalogue. try/finally guarantees syncing is reset to false even when an
   * unexpected error propagates out of syncPendingSales or syncProducts.
   */
  const runSync = useCallback(async () => {
    // Guard: do nothing when the device is offline or a sync is already running
    if (!navigator.onLine || syncing) return;

    setSyncing(true);
    try {
      await syncPendingSales(salesApi);
      await syncProducts();
      await checkPending();
    } finally {
      // Always release the syncing lock — even if an error was thrown
      setSyncing(false);
    }
  }, [syncing, checkPending]);

  useEffect(() => {
    // When connectivity is restored: clear the offline flag, then sync immediately
    const goOnline = () => {
      setIsOffline(false);
      runSync();
    };

    // When connectivity is lost: raise the offline flag
    const goOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Count any pre-existing queued sales on first render
    checkPending();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [runSync, checkPending]);

  return { isOffline, pendingCount, syncing, runSync };
}
