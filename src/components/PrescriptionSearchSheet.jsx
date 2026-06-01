import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, AlertTriangle, Plus, CheckCircle } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { prescriptionsApi } from '../api/client';
import PrescriptionForm from './PrescriptionForm';

// ── Status badge styles matching Prescriptions page palette ───────────────────
const STATUS_STYLES = {
  ACTIVE:     'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  PARTIAL:    'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  DISPENSED:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  EXPIRED:    'bg-red-500/15 text-red-400 border border-red-500/20',
  CANCELLED:  'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * PrescriptionSearchSheet — opened from SalesScreen when the cart contains
 * rxRequired products. Lets the cashier search for an existing prescription
 * or create a new one on the fly.
 *
 * Props:
 *   open               — boolean controlling sheet visibility
 *   onOpenChange       — callback to toggle open state
 *   onSelect           — callback(prescription) called when a prescription is chosen
 *   rxRequiredProducts — array of cart items that have rxRequired=true
 */
export default function PrescriptionSearchSheet({ open, onOpenChange, onSelect, rxRequiredProducts = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  // ── Search prescriptions on debounced query change ────────────────────────
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setSearchError(null);

    if (!debouncedQuery.trim()) {
      // Show active/partial prescriptions when no query is entered
      setSearching(true);
      prescriptionsApi.getAll({ status: 'ACTIVE,PARTIAL', limit: 20 })
        .then(res => { if (!cancelled) setResults(res.data?.data ?? []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
      return () => { cancelled = true; };
    }

    setSearching(true);
    prescriptionsApi.getAll({ patientName: debouncedQuery.trim(), status: 'ACTIVE,PARTIAL' })
      .then(res => { if (!cancelled) setResults(res.data?.data ?? []); })
      .catch(err => {
        if (!cancelled) {
          setResults([]);
          setSearchError(err.response?.data?.error || 'Search failed');
        }
      })
      .finally(() => { if (!cancelled) setSearching(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery, open]);

  // ── Reset when sheet closes ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSearchError(null);
      setNewFormOpen(false);
    }
  }, [open]);

  const handleSelect = useCallback((rx) => {
    onSelect?.(rx);
    onOpenChange(false);
  }, [onSelect, onOpenChange]);

  // When a new prescription is created via the form, auto-select it
  const handleNewRxCreated = useCallback((rx) => {
    setNewFormOpen(false);
    handleSelect(rx);
  }, [handleSelect]);

  const rxProductNames = rxRequiredProducts.map(p => p.name || p.productName).filter(Boolean).join(', ');

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Link Prescription"
        description="Search for an existing prescription or create a new one."
      >
        <div className="flex flex-col h-full">
          {/* ── Warning banner ──────────────────────────────────────────── */}
          {rxProductNames && (
            <div className="mx-5 mt-4 flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                <span className="font-semibold">Prescription required for:</span> {rxProductNames}
              </p>
            </div>
          )}

          {/* ── Search input ────────────────────────────────────────────── */}
          <div className="px-5 mt-4 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by patient name, phone, or Rx number..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
              )}
            </div>
          </div>

          {/* ── Results list ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
            {searchError && (
              <p className="text-sm text-danger text-center py-6">{searchError}</p>
            )}

            {!searching && !searchError && results.length === 0 && (
              <div className="text-center py-10">
                <p className="text-zinc-400 text-sm">No active prescriptions found.</p>
                <p className="text-zinc-500 text-xs mt-1">Try a different search term or create a new prescription.</p>
              </div>
            )}

            {results.map(rx => {
              const fillsLeft = rx.totalFills - rx.fillsUsed;
              const prescriber = rx.prescriber?.name || rx.prescriberName || 'Unknown prescriber';
              return (
                <button
                  key={rx.id}
                  type="button"
                  onClick={() => handleSelect(rx)}
                  className="w-full text-left bg-surface-base border border-surface-muted/50 hover:border-brand/40 hover:bg-surface-muted/40 rounded-xl p-3.5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-100 font-mono">{rx.rxNumber}</span>
                        <StatusBadge status={rx.status} />
                      </div>
                      <p className="text-sm text-zinc-300 mt-0.5 truncate">{rx.patientName}</p>
                      {rx.patientPhone && (
                        <p className="text-xs text-zinc-500">{rx.patientPhone}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-0.5">Dr. {prescriber}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {/* Fill progress */}
                      <span className="text-xs font-medium text-zinc-400">
                        {rx.fillsUsed}/{rx.totalFills} fills
                      </span>
                      {fillsLeft > 0 && (
                        <span className="text-xs text-emerald-400">{fillsLeft} remaining</span>
                      )}
                      <CheckCircle className="w-4 h-4 text-zinc-600 group-hover:text-brand-light transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Create new prescription CTA ─────────────────────────────── */}
          <div className="px-5 pb-5 border-t border-surface-muted/40 pt-4">
            <button
              type="button"
              onClick={() => setNewFormOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Prescription
            </button>
          </div>
        </div>
      </Sheet>

      {/* Inline PrescriptionForm opened from within this sheet */}
      <PrescriptionForm
        open={newFormOpen}
        onOpenChange={setNewFormOpen}
        onSuccess={handleNewRxCreated}
      />
    </>
  );
}
