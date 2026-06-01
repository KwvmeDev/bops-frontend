import { useState, useEffect } from 'react';
import { ShieldCheck, User, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import { usersApi } from '../api/client';

// Role badge colours matching the rest of the UI
const ROLE_BADGE = {
  OWNER: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  MANAGER: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
};

/**
 * ManagerApprovalPrompt
 *
 * Shown when the cart contains a controlled-substance product.
 * Fetches all active MANAGER/OWNER users for this tenant, lets the
 * approving manager tap their name, then calls onApprove(userId).
 *
 * Props:
 *   open          {boolean}
 *   onOpenChange  {(open: boolean) => void}
 *   onApprove     {(managerId: string) => void}
 */
export default function ManagerApprovalPrompt({ open, onOpenChange, onApprove }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // The manager who tapped their name — awaiting final confirmation
  const [selected, setSelected] = useState(null);

  // Fetch managers whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setError(null);

    const load = async () => {
      setLoading(true);
      try {
        const res = await usersApi.getAll();
        const all = res.data?.data ?? [];
        // Keep only active MANAGER and OWNER users — cashiers cannot approve
        const eligible = all.filter(
          (u) => u.active !== false && (u.role === 'MANAGER' || u.role === 'OWNER')
        );
        setManagers(eligible);
      } catch {
        setError('Could not load managers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  const handleClose = () => {
    setSelected(null);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (!selected) return;
    // Pass both the userId (for the server payload) and the display name
    // (for the "Approved by …" banner in SalesScreen)
    onApprove(selected.id, selected.name);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Manager Approval Required"
      size="sm"
    >
      <div className="px-5 pb-5 space-y-4">
        {/* Contextual heading */}
        <div className="flex items-start gap-3 pt-1">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-4.5 h-4.5 text-amber-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Controlled substance in cart</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              A manager or owner must confirm this dispensing.
            </p>
          </div>
        </div>

        {/* Manager list */}
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-zinc-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading managers…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        ) : managers.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No active managers found for this tenant.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Select approving manager
            </p>
            <ul className="space-y-1.5">
              {managers.map((mgr) => {
                const isSelected = selected?.id === mgr.id;
                return (
                  <li key={mgr.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(isSelected ? null : mgr)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                          : 'bg-surface-muted border-surface-overlay hover:border-zinc-600 hover:bg-surface-overlay'
                      }`}
                    >
                      {/* Avatar / icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-emerald-500/20' : 'bg-surface-overlay'
                      }`}>
                        {isSelected
                          ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                          : <User className="w-4 h-4 text-zinc-500" />
                        }
                      </div>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-200' : 'text-zinc-200'}`}>
                          {mgr.name}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{mgr.email}</p>
                      </div>

                      {/* Role badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE[mgr.role] ?? 'bg-surface-muted text-zinc-400 border-surface-overlay'}`}>
                        {mgr.role}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Confirmation / action row */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium border border-surface-overlay transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {selected ? `Approve as ${selected.name.split(' ')[0]}` : 'Approve'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
