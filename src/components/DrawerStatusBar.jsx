import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { Circle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

dayjs.extend(duration);

/**
 * Compact status bar shown at the top of SalesScreen when a drawer session is
 * active. Returns null when no session is open so the parent doesn't need to
 * guard the render itself.
 *
 * Props:
 *   session   — the active drawer session object, or null
 *   onClose   — callback that opens DrawerCloseSheet
 */
export default function DrawerStatusBar({ session, onClose }) {
  const { currencySymbol } = useAuth();

  if (!session) return null;

  // Compute human-readable shift duration from session.openedAt
  const openedAt = dayjs(session.openedAt);
  const now = dayjs();
  const diff = dayjs.duration(now.diff(openedAt));
  const hours = Math.floor(diff.asHours());
  const minutes = diff.minutes();
  const shiftLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const expectedCash = session.expectedCash != null
    ? `${currencySymbol}${session.expectedCash.toFixed(2)}`
    : null;

  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 flex items-center gap-4 flex-wrap mx-4 mt-3 mb-1">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-green-300">Shift open</span>
      </div>

      {/* Shift duration */}
      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span className="text-zinc-500">Duration:</span>
        <span className="text-zinc-200 font-medium">{shiftLabel}</span>
      </div>

      {/* Expected cash */}
      {expectedCash && (
        <div className="flex items-center gap-1 text-xs text-zinc-400">
          <span className="text-zinc-500">Expected cash:</span>
          <span className="text-zinc-200 font-medium">{expectedCash}</span>
        </div>
      )}

      {/* Spacer pushes the close button to the right */}
      <div className="flex-1" />

      {/* Close Drawer button */}
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-medium transition-colors border border-green-500/30"
      >
        <X className="w-3 h-3" />
        Close Drawer
      </button>
    </div>
  );
}
