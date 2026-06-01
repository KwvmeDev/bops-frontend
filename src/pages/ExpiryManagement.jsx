import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { batchesApi } from '../api/client';
import { AlertTriangle, Clock, Trash2, Package } from 'lucide-react';
import { toast, Skeleton } from '../components/ui';
import dayjs from 'dayjs';

// Sub-tab identifiers
const SUB_TABS = [
  { id: 'expiring', label: 'Expiring Soon' },
  { id: 'expired',  label: 'Expired' },
  { id: 'disposed', label: 'Disposed' },
];

/**
 * Calculates how many days remain until expiryDate.
 * Returns a negative number for already-expired batches.
 */
function daysRemaining(expiryDate) {
  return dayjs(expiryDate).diff(dayjs(), 'day');
}

/**
 * Returns Tailwind text colour class based on days-remaining.
 * > 90 days   emerald (safe)
 * 30–90 days  amber (caution)
 * < 30 days   red (urgent)
 * expired     zinc-500 (greyed out — use "Expired" label instead)
 */
function expiryColour(days) {
  if (days < 0)  return 'text-zinc-500';
  if (days < 30) return 'text-red-400';
  if (days < 90) return 'text-amber-400';
  return 'text-emerald-400';
}

function BatchTable({ batches, loading, onDispose, isExpiredTab }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!batches.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <Package className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No batches found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-muted/50">
            {['Product', 'Batch #', 'Expiry Date', 'Qty', 'Days Remaining', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {batches.map((batch, i) => {
              const days = daysRemaining(batch.expiryDate);
              const colour = expiryColour(days);
              return (
                <motion.tr
                  key={batch.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: Math.min(i * 0.02, 0.15) }}
                  className="border-b border-surface-muted/30 hover:bg-surface-muted/20 transition-colors group"
                >
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-zinc-200">{batch.product?.name || '—'}</p>
                    {batch.product?.sku && (
                      <p className="text-xs text-zinc-600 mt-0.5">{batch.product.sku}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300 font-mono text-xs">
                    {batch.batchNumber}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-400">
                    {dayjs(batch.expiryDate).format('DD MMM YYYY')}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300 font-medium">
                    {batch.quantity}
                  </td>
                  <td className={`px-4 py-3.5 font-medium ${colour}`}>
                    {isExpiredTab || days < 0 ? (
                      <span className="text-red-400">Expired</span>
                    ) : (
                      `${days}d`
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onDispose(batch)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-danger-light hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Dispose
                    </motion.button>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

/**
 * ExpiryManagement — full expiry-tab content rendered inside Inventory.jsx.
 * Displays three sub-tabs: Expiring Soon, Expired, Disposed.
 * Only visible when tenant.pharmacyMode === true.
 *
 * Props:
 *   onDispose(batch)  — called when the user clicks Dispose on a row;
 *                       Inventory.jsx handles opening BatchDisposalSheet.
 *   expiryAlertDays   — override for the expiry threshold (falls back to tenant setting).
 *   refreshKey        — increment to force a data re-fetch from the parent.
 */
export default function ExpiryManagement({ onDispose, expiryAlertDays, refreshKey = 0 }) {
  const { tenant } = useAuth();
  const [subTab, setSubTab] = useState('expiring');
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [expiredBatches, setExpiredBatches]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Threshold: prefer explicit prop, then tenant setting, then default 90 days
  const alertDays = expiryAlertDays ?? tenant?.expiryAlertDays ?? 90;

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const [expiringRes, expiredRes] = await Promise.allSettled([
        batchesApi.getExpiring(alertDays),
        batchesApi.getExpired(),
      ]);
      if (expiringRes.status === 'fulfilled') {
        setExpiringBatches(expiringRes.value.data?.data ?? []);
      }
      if (expiredRes.status === 'fulfilled') {
        setExpiredBatches(expiredRes.value.data?.data ?? []);
      }
    } catch {
      toast.error('Failed to load expiry data');
    } finally {
      setLoading(false);
    }
  }, [alertDays]);

  // Fetch on mount and whenever refreshKey changes (called by parent after disposal)
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches, refreshKey]);

  const handleDispose = (batch) => {
    if (onDispose) {
      onDispose(batch);
    } else {
      // Fallback message when BatchDisposalSheet is not yet wired (subtask_08)
      toast('Disposal sheet coming soon');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-surface-subtle border border-surface-muted/50 rounded-2xl p-1 flex-wrap">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors z-10 ${
              subTab === tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {subTab === tab.id && (
              <motion.div
                layoutId="expiry-subtab"
                className="absolute inset-0 bg-surface-muted rounded-xl"
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {/* Dot indicator for non-empty tabs */}
              {tab.id === 'expired' && !loading && expiredBatches.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              )}
              {tab.id === 'expiring' && !loading && expiringBatches.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              )}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden"
        >
          {subTab === 'expiring' && (
            <>
              <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Expiring within {alertDays} days
                  </h3>
                </div>
                {!loading && (
                  <span className="text-xs px-2 py-0.5 bg-amber-400/10 text-amber-400 rounded-full">
                    {expiringBatches.length} {expiringBatches.length === 1 ? 'batch' : 'batches'}
                  </span>
                )}
              </div>
              <BatchTable
                batches={expiringBatches}
                loading={loading}
                onDispose={handleDispose}
                isExpiredTab={false}
              />
            </>
          )}

          {subTab === 'expired' && (
            <>
              <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Expired Batches</h3>
                </div>
                {!loading && (
                  <span className="text-xs px-2 py-0.5 bg-red-400/10 text-red-400 rounded-full">
                    {expiredBatches.length} {expiredBatches.length === 1 ? 'batch' : 'batches'}
                  </span>
                )}
              </div>
              <BatchTable
                batches={expiredBatches}
                loading={loading}
                onDispose={handleDispose}
                isExpiredTab={true}
              />
            </>
          )}

          {subTab === 'disposed' && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <Trash2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-zinc-500">Disposal history coming soon</p>
              <p className="text-xs text-zinc-600 mt-1">
                Disposed batches will appear here after recording a disposal.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
