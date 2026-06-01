import { useState } from 'react';
import dayjs from 'dayjs';

// Icon and colour config keyed by LoyaltyTxType
const TX_CONFIG = {
  EARNED:   { icon: '⭐', label: 'Earned',   badgeClass: 'bg-green-900/40 text-green-400 border border-green-700/40' },
  REDEEMED: { icon: '💳', label: 'Redeemed', badgeClass: 'bg-blue-900/40 text-blue-400 border border-blue-700/40' },
  EXPIRED:  { icon: '⏰', label: 'Expired',  badgeClass: 'bg-red-900/40 text-red-400 border border-red-700/40' },
  ADJUSTED: { icon: '✏️', label: 'Adjusted', badgeClass: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40' },
  BONUS:    { icon: '🎁', label: 'Bonus',    badgeClass: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40' },
};

// Fallback for unknown types
const UNKNOWN_CONFIG = { icon: '•', label: 'Unknown', badgeClass: 'bg-zinc-800 text-zinc-400 border border-zinc-700' };

const PAGE_SIZE = 20;

/**
 * LoyaltyHistoryList
 *
 * Renders a screen-only (print:hidden), scrollable, paginated list of loyalty
 * transactions. The component is intentionally display-only; callers own the
 * data fetching and pass the full transactions array as a prop.
 *
 * Props:
 *   transactions  {Array}   — full array of LoyaltyTransaction objects
 *   loading       {boolean} — show skeleton rows while data is loading
 *   error         {string}  — display an error message when non-null
 */
export default function LoyaltyHistoryList({ transactions = [], loading = false, error = null }) {
  const [page, setPage] = useState(1);

  const visibleCount = page * PAGE_SIZE;
  const visible = transactions.slice(0, visibleCount);
  const hasMore = transactions.length > visibleCount;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="print:hidden space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-800 rounded-md" />
        ))}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="print:hidden rounded-md bg-red-900/20 border border-red-800 p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div className="print:hidden flex flex-col items-center justify-center py-12 text-zinc-500 text-sm gap-2">
        <span className="text-3xl">⭐</span>
        <p>No loyalty transactions yet.</p>
      </div>
    );
  }

  return (
    // print:hidden keeps this off paper — the Receipt component handles print output
    <div className="print:hidden space-y-1">
      {visible.map((tx) => {
        const cfg = TX_CONFIG[tx.type] ?? UNKNOWN_CONFIG;
        // Positive points are green; negative (redeemed/expired) are red
        const pointsPositive = tx.points > 0;
        const pointsLabel = pointsPositive ? `+${tx.points}` : `${tx.points}`;
        const pointsColour = pointsPositive ? 'text-green-400' : 'text-red-400';

        return (
          <div
            key={tx.id}
            className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-zinc-800/60 transition-colors"
          >
            {/* Type badge */}
            <span
              className={`mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </span>

            {/* Middle — date + optional note */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400">
                {dayjs(tx.createdAt).format('DD MMM YYYY, HH:mm')}
              </p>
              {tx.note && (
                <p className="text-xs text-zinc-500 truncate" title={tx.note}>
                  {tx.note}
                </p>
              )}
            </div>

            {/* Right — points change + running balance */}
            <div className="shrink-0 text-right">
              <p className={`text-sm font-semibold ${pointsColour}`}>
                {pointsLabel} pts
              </p>
              <p className="text-xs text-zinc-500">
                bal: {tx.balance} pts
              </p>
            </div>
          </div>
        );
      })}

      {/* Load more — only rendered when there are additional pages */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="w-full mt-2 rounded-md border border-zinc-700 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        >
          Load more ({transactions.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
