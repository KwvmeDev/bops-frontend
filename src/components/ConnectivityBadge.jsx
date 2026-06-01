import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

/**
 * ConnectivityBadge — animated pill that surfaces offline/sync state in the header.
 *
 * Hidden entirely when the device is online and there are no pending sales.
 * Three visible states:
 *   1. Offline       WifiOff icon + "Offline"  (red)
 *   2. Syncing       RefreshCw (spin) + "Syncing N..."  (amber)
 *   3. Pending only  clickable Wifi + "N pending — tap to sync"  (amber)
 */
export function ConnectivityBadge() {
  const { isOffline, pendingCount, syncing, runSync } = useOffline();

  // Nothing to show — device is online and queue is empty
  if (!isOffline && pendingCount === 0) return null;

  // Shared pill wrapper props driven by framer-motion
  const motionProps = {
    initial:    { opacity: 0, y: -8 },
    animate:    { opacity: 1, y: 0 },
    exit:       { opacity: 0, y: -8 },
    transition: { duration: 0.2 },
  };

  // ── State 1: offline ────────────────────────────────────────────────────────
  if (isOffline) {
    return (
      <AnimatePresence>
        <motion.div
          {...motionProps}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400"
        >
          <WifiOff className="w-3 h-3" />
          Offline
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── State 2: online, sync in flight ─────────────────────────────────────────
  if (syncing) {
    return (
      <AnimatePresence>
        <motion.div
          {...motionProps}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing {pendingCount}...
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── State 3: online, pending sales waiting — user can trigger sync manually ──
  return (
    <AnimatePresence>
      <motion.button
        {...motionProps}
        onClick={runSync}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
      >
        <Wifi className="w-3 h-3" />
        {pendingCount} pending — tap to sync
      </motion.button>
    </AnimatePresence>
  );
}

export default ConnectivityBadge;
