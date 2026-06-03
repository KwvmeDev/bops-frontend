import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RotateCcw, Trash2, ShoppingBag, X, AlertTriangle } from 'lucide-react';
import { Sheet } from './ui/Sheet';

/** Returns a human-readable "N min ago" string without importing dayjs/relativeTime. */
function timeAgo(isoString) {
  const diffMs  = Date.now() - new Date(isoString).getTime();
  const mins    = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

/** Short summary of cart contents — e.g. "Jumbo Towel  +4 more" */
function cartSummary(cartItems) {
  if (!cartItems?.length) return 'Empty cart';
  const [first, ...rest] = cartItems;
  const label = first.name.length > 22 ? first.name.slice(0, 20) + '…' : first.name;
  return rest.length > 0 ? `${label}  +${rest.length} more` : label;
}

/**
 * Sheet listing all carts that have been placed on hold.
 *
 * Props:
 *   open               – boolean
 *   onOpenChange       – fn(bool)
 *   suspendedSales     – array of suspended-cart snapshots from IndexedDB
 *   currentCartHasItems – boolean — triggers a confirm step before resuming
 *   currencySymbol     – string (e.g. "GH₵")
 *   onResume           – fn(snapshot) — called when cashier confirms resume
 *   onDiscard          – fn(localId)  — called to permanently delete a hold
 */
export default function SuspendedSalesSheet({
  open,
  onOpenChange,
  suspendedSales = [],
  currentCartHasItems = false,
  currencySymbol = '',
  onResume,
  onDiscard,
}) {
  // localId of the row currently awaiting resume confirmation
  const [confirmingId, setConfirmingId] = useState(null);

  const handleResumeClick = (sale) => {
    if (currentCartHasItems) {
      // Ask before replacing the live cart
      setConfirmingId(sale.localId);
    } else {
      onResume(sale);
    }
  };

  const handleConfirmResume = (sale) => {
    setConfirmingId(null);
    onResume(sale);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setConfirmingId(null); onOpenChange(v); }}>
      <div className="flex flex-col h-full bg-surface-subtle">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">On Hold</h2>
            {suspendedSales.length > 0 && (
              <span className="text-xs font-semibold bg-surface-overlay text-zinc-300 px-1.5 py-0.5 rounded-full">
                {suspendedSales.length}
              </span>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {suspendedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-3">
              <ShoppingBag className="w-8 h-8 opacity-40" />
              <p className="text-sm">No sales on hold</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {suspendedSales.map((sale) => {
                const itemCount = sale.cartItems?.reduce((n, i) => n + i.quantity, 0) ?? 0;
                const isConfirming = confirmingId === sale.localId;

                return (
                  <motion.div
                    key={sale.localId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
                    className="bg-surface-muted/50 border border-surface-muted/40 rounded-xl overflow-hidden"
                  >
                    {/* Row content */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Label pill */}
                      <span className="text-xs font-bold text-zinc-300 bg-surface-overlay px-2 py-1 rounded-lg flex-shrink-0 tabular-nums">
                        {sale.label}
                      </span>

                      {/* Summary */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {cartSummary(sale.cartItems)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-500">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-xs text-zinc-400 font-medium">
                            {currencySymbol}{(sale.total ?? 0).toFixed(2)}
                          </span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-xs text-zinc-600">
                            {timeAgo(sale.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleResumeClick(sale)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-brand/90 hover:bg-brand text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resume
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => { setConfirmingId(null); onDiscard(sale.localId); }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Discard hold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Inline confirm — only shown when current cart has items */}
                    <AnimatePresence>
                      {isConfirming && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <p className="text-xs text-amber-300 flex-1">
                              This will replace your current cart. Continue?
                            </p>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleConfirmResume(sale)}
                              className="text-xs font-semibold text-white bg-brand hover:bg-brand px-3 py-1 rounded-lg transition-colors"
                            >
                              Replace
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </Sheet>
  );
}
