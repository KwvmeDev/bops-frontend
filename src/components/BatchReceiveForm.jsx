/**
 * BatchReceiveForm — pharmacy-mode supplement rendered inside each line item of
 * ReceiveDeliverySheet when tenant.pharmacyMode === true.
 *
 * Props:
 *   item         — the row object from ReceiveDeliverySheet
 *                  { id, productName, remaining, qty, checked }
 *   pharmacyMode — boolean; when false this component renders nothing
 *   onChange     — (itemId, { batchNumber, expiryDate }) => void
 *                  notifies the parent so it can merge the fields into the payload
 */
export default function BatchReceiveForm({ item, pharmacyMode, onChange }) {
  // Only relevant in pharmacy mode
  if (!pharmacyMode) return null;

  const inputCls =
    'w-full px-3 py-2 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 ' +
    'text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 ' +
    'focus:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1';

  const handleChange = (field, value) => {
    onChange(item.id, { [field]: value });
  };

  return (
    // Rendered as a two-column grid that fits below the product name + qty row
    <div className="grid grid-cols-2 gap-2 mt-2 col-span-full">
      {/* Batch Number */}
      <div>
        <label className={labelCls} htmlFor={`batch-num-${item.id}`}>
          Batch Number <span className="text-danger-light">*</span>
        </label>
        <input
          id={`batch-num-${item.id}`}
          type="text"
          placeholder="e.g. LOT-2024-001"
          required
          disabled={!item.checked}
          onChange={(e) => handleChange('batchNumber', e.target.value)}
          className={inputCls}
          aria-label={`Batch number for ${item.productName}`}
        />
      </div>

      {/* Expiry Date */}
      <div>
        <label className={labelCls} htmlFor={`expiry-${item.id}`}>
          Expiry Date <span className="text-danger-light">*</span>
        </label>
        <input
          id={`expiry-${item.id}`}
          type="date"
          required
          disabled={!item.checked}
          onChange={(e) => handleChange('expiryDate', e.target.value)}
          className={inputCls}
          aria-label={`Expiry date for ${item.productName}`}
        />
      </div>
    </div>
  );
}
