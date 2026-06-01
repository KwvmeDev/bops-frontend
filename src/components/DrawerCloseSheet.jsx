import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { toast } from './ui';
import { cashDrawerApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Sheet for closing an active cash drawer session.
 * Shows a read-only opening float + expected cash summary, then collects the
 * physical counted cash amount and optional notes before calling the close API.
 *
 * Props:
 *   open          — boolean controlling sheet visibility
 *   onOpenChange  — callback to toggle open state
 *   session       — the currently open session object
 *   onSuccess     — callback invoked after successful close
 */
export default function DrawerCloseSheet({ open, onOpenChange, session, onSuccess }) {
  const { currencySymbol } = useAuth();
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const sym = currencySymbol;

  // Compute live variance as user types; null when input is empty
  const variance = useMemo(() => {
    const counted = parseFloat(countedCash);
    if (isNaN(counted) || session?.expectedCash == null) return null;
    return counted - session.expectedCash;
  }, [countedCash, session?.expectedCash]);

  const varianceDisplay = useMemo(() => {
    if (variance === null) return null;
    const abs = Math.abs(variance).toFixed(2);
    const sign = variance >= 0 ? '+' : '-';
    return `${sign}${sym}${abs}`;
  }, [variance, sym]);

  // Green when within ±5, red otherwise
  const varianceColor =
    variance === null
      ? ''
      : Math.abs(variance) <= 5
      ? 'text-emerald-400'
      : 'text-red-400';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);

    try {
      const payload = {
        countedCash: parseFloat(countedCash),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      await cashDrawerApi.close(session.id, payload);
      toast.success('Drawer closed');
      onSuccess?.();
      // Reset fields for future re-opens
      setCountedCash('');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to close drawer');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Close Cash Drawer"
      description="Count the cash in the drawer and record the closing float."
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* Read-only summary */}
        <div className="bg-surface-base border border-surface-muted/50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Session Summary</p>

          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Opening float</span>
            <span className="text-sm font-medium text-zinc-200">
              {sym}{(session.openingFloat ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Expected cash</span>
            <span className="text-sm font-medium text-zinc-200">
              {session.expectedCash != null
                ? `${sym}${session.expectedCash.toFixed(2)}`
                : <span className="text-zinc-500 italic text-xs">Calculating...</span>
              }
            </span>
          </div>
        </div>

        {/* Counted cash input */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Counted Cash
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={countedCash}
            onChange={e => setCountedCash(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
          />
          <p className="text-xs text-zinc-500">
            The physical amount counted in the cash drawer right now.
          </p>
        </div>

        {/* Live variance indicator */}
        {varianceDisplay && (
          <div className="flex items-center justify-between bg-surface-base border border-surface-muted/40 rounded-xl px-4 py-3">
            <span className="text-sm text-zinc-400">Variance</span>
            <span className={`text-sm font-semibold tabular-nums ${varianceColor}`}>
              {varianceDisplay}
            </span>
          </div>
        )}

        {/* Notes (optional) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Notes <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Explain any variance or add closing notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Closing...' : 'Close Drawer'}
        </button>
      </form>
    </Sheet>
  );
}
