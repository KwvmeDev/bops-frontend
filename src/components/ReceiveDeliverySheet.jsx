import { useState, useEffect } from 'react';
import { Loader2, PackageCheck } from 'lucide-react';
import { Sheet, toast } from './ui';
import { purchaseOrdersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BatchReceiveForm from './BatchReceiveForm';

const inputCls =
  'w-full px-3 py-2 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 ' +
  'text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 ' +
  'focus:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';

/**
 * ReceiveDeliverySheet — slide-over sheet for recording a delivery against a PO.
 *
 * Props:
 *   open         — controls Sheet visibility
 *   onOpenChange — called to open/close
 *   po           — the full PO object including items array
 *   onSuccess    — called after a successful receive operation
 */
export default function ReceiveDeliverySheet({ open, onOpenChange, po, onSuccess }) {
  const { tenant } = useAuth();
  const pharmacyMode = tenant?.pharmacyMode === true;

  // Each row tracks: id (poItemId), productName, remaining, qty (user-entered), checked
  // In pharmacyMode, each row also carries: batchNumber, expiryDate
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Rebuild row state whenever the sheet opens or the PO changes
  useEffect(() => {
    if (!open || !po) return;

    const pendingItems = (po.items ?? [])
      .map((item) => {
        const ordered = item.orderedQty ?? item.quantity ?? 0;
        const received = item.receivedQty ?? 0;
        const remaining = ordered - received;
        return {
          id: item.id,
          productName: item.product?.name ?? item.productId,
          remaining,
          qty: remaining, // pre-fill to full remaining qty
          checked: true,
          // Pharmacy-mode fields — empty until the user fills BatchReceiveForm
          batchNumber: '',
          expiryDate: '',
        };
      })
      // Only show items that still have outstanding quantity
      .filter((r) => r.remaining > 0);

    setRows(pendingItems);
    setNotes('');
  }, [open, po]);

  const toggleRow = (id) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );
  };

  const setQty = (id, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        // Clamp to [1, remaining]
        const parsed = Math.max(1, Math.min(Number(value) || 1, r.remaining));
        return { ...r, qty: parsed };
      })
    );
  };

  // Called by BatchReceiveForm when batchNumber or expiryDate changes for a row
  const setBatchField = (id, fields) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...fields } : r))
    );
  };

  const handleSubmit = async () => {
    const checkedRows = rows.filter((r) => r.checked);

    if (checkedRows.length === 0) {
      toast.error('Select at least one item to receive');
      return;
    }

    // In pharmacy mode, every checked row must have a batch number and expiry date
    if (pharmacyMode) {
      const missing = checkedRows.find((r) => !r.batchNumber?.trim() || !r.expiryDate);
      if (missing) {
        toast.error(`Batch number and expiry date are required for ${missing.productName}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await purchaseOrdersApi.receive(po.id, {
        items: checkedRows.map((r) => ({
          poItemId: r.id,
          quantity: r.qty,
          // Include batch fields in the payload when pharmacyMode is active
          ...(pharmacyMode && {
            batchNumber: r.batchNumber.trim(),
            expiryDate: r.expiryDate,
          }),
        })),
        notes: notes.trim() || undefined,
      });

      toast.success(`Received ${checkedRows.length} product${checkedRows.length !== 1 ? 's' : ''} — stock updated`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const checkedCount = rows.filter((r) => r.checked).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Receive Delivery">
      <div className="px-5 py-5 space-y-5">

        {/* PO reference line */}
        {po && (
          <p className="text-xs text-zinc-500">
            Recording delivery for{' '}
            <span className="text-zinc-300 font-medium">{po.poNumber ?? po.id}</span>
          </p>
        )}

        {/* Empty state — all items already received */}
        {rows.length === 0 && (
          <div className="py-10 text-center">
            <PackageCheck className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
            <p className="text-sm text-zinc-500">All items have been fully received.</p>
          </div>
        )}

        {/* Line items */}
        {rows.length > 0 && (
          <div className="space-y-1">
            {/* Column headers */}
            <div className="grid grid-cols-[20px_1fr_90px] gap-3 px-1 mb-2">
              <span />
              <span className="text-xs font-medium text-zinc-500">Product</span>
              <span className="text-xs font-medium text-zinc-500 text-center">Qty</span>
            </div>

            {rows.map((row) => (
              <div
                key={row.id}
                className={`px-1 py-2 rounded-lg transition-colors ${
                  row.checked ? 'bg-zinc-800/40' : 'opacity-50'
                }`}
              >
                {/* Top row: checkbox + product name + qty */}
                <div className="grid grid-cols-[20px_1fr_90px] gap-3 items-center">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => toggleRow(row.id)}
                    className="w-4 h-4 rounded border-zinc-600 accent-brand cursor-pointer"
                    aria-label={`Include ${row.productName}`}
                  />

                  {/* Product name + remaining label */}
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{row.productName}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">remaining: {row.remaining}</p>
                  </div>

                  {/* Quantity input */}
                  <input
                    type="number"
                    min="1"
                    max={row.remaining}
                    step="1"
                    value={row.qty}
                    disabled={!row.checked || submitting}
                    onChange={(e) => setQty(row.id, e.target.value)}
                    className={inputCls + ' text-center'}
                    aria-label={`Receive quantity for ${row.productName}`}
                  />
                </div>

                {/* Pharmacy-mode batch fields rendered below the main row */}
                <BatchReceiveForm
                  item={row}
                  pharmacyMode={pharmacyMode}
                  onChange={setBatchField}
                />
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {rows.length > 0 && (
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery notes, discrepancies..."
              disabled={submitting}
              className={inputCls + ' resize-none'}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1 pb-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || checkedCount === 0}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  Receive {checkedCount > 0 ? `${checkedCount} item${checkedCount !== 1 ? 's' : ''}` : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
