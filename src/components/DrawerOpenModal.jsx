import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { toast } from './ui';
import { cashDrawerApi } from '../api/client';

/**
 * Sheet / modal for opening a new cash drawer session.
 *
 * Props:
 *   open          — boolean controlling sheet visibility
 *   onOpenChange  — callback to toggle open state
 *   locationId    — optional branch id to scope the session
 *   onSuccess     — callback receiving the newly created session object
 */
export default function DrawerOpenModal({ open, onOpenChange, locationId, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        openingFloat: parseFloat(amount) || 0,
        ...(locationId ? { locationId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const res = await cashDrawerApi.open(payload);
      const session = res.data?.data;

      toast.success('Drawer opened');
      onSuccess?.(session);
      // Reset form fields so the sheet starts clean next time
      setAmount('');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open drawer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Open Cash Drawer"
      description="Enter the starting float to begin a new shift."
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Opening float */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Opening Float
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
          />
          <p className="text-xs text-zinc-500">
            Amount of cash physically placed in the drawer at the start of this shift.
          </p>
        </div>

        {/* Notes (optional) */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Notes <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Any notes about this shift..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Opening...' : 'Open Drawer'}
        </button>
      </form>
    </Sheet>
  );
}
