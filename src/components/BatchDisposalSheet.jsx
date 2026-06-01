import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { toast } from './ui';
import { batchesApi } from '../api/client';

const inputCls =
  'w-full px-3 py-2 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 ' +
  'text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 ' +
  'focus:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';

// Disposal reasons exposed as a select list. Maps to backend enum values.
const DISPOSAL_REASONS = [
  { value: 'EXPIRED',  label: 'Expired' },
  { value: 'DAMAGED',  label: 'Damaged' },
  { value: 'RECALLED', label: 'Recalled by manufacturer' },
  { value: 'OTHER',    label: 'Other' },
];

/**
 * BatchDisposalSheet — slide-over form for recording a batch disposal.
 *
 * Props:
 *   batch      — { id, batchNumber, quantity, product: { name } }
 *   open       — controls Sheet visibility
 *   onClose    — called on cancel
 *   onSuccess  — called after a successful disposal (parent should refresh the list)
 */
export default function BatchDisposalSheet({ batch, open, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('EXPIRED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form fields whenever the sheet opens with a new batch
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      onClose();
    } else {
      // Pre-populate quantity to full batch quantity on open
      setQuantity(batch?.quantity ?? 1);
      setReason('EXPIRED');
      setNotes('');
    }
  };

  const handleSubmit = async () => {
    if (!batch) return;

    const qty = Number(quantity);
    if (!qty || qty < 1 || qty > batch.quantity) {
      toast.error(`Quantity must be between 1 and ${batch.quantity}`);
      return;
    }

    setSubmitting(true);
    try {
      await batchesApi.dispose(batch.id, {
        quantity: qty,
        reason,
        notes: notes.trim() || undefined,
      });

      toast.success(`Disposed ${qty} unit${qty !== 1 ? 's' : ''} from batch ${batch.batchNumber}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to dispose batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Dispose Batch"
      description={batch ? `${batch.product?.name} — Batch ${batch.batchNumber}` : undefined}
    >
      <div className="px-5 py-5 space-y-5">

        {/* Quantity */}
        <div>
          <label className={labelCls}>
            Quantity to dispose
            {batch && (
              <span className="text-zinc-600 font-normal ml-1">(max {batch.quantity})</span>
            )}
          </label>
          <input
            type="number"
            min={1}
            max={batch?.quantity ?? 1}
            step={1}
            value={quantity}
            disabled={submitting}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
            aria-label="Disposal quantity"
          />
        </div>

        {/* Reason */}
        <div>
          <label className={labelCls}>Reason</label>
          <select
            value={reason}
            disabled={submitting}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
            aria-label="Disposal reason"
          >
            {DISPOSAL_REASONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes — optional */}
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional details about this disposal..."
            disabled={submitting}
            className={inputCls + ' resize-none'}
            aria-label="Disposal notes"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1 pb-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 bg-danger hover:bg-danger/90 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Confirm Disposal
              </>
            )}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
