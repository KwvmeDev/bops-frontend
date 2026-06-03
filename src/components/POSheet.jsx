import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { toast, Sheet } from './ui';
import useLocation from '../hooks/useLocation';
import apiClient from '../api/client';
import SupplierSheet from './SupplierSheet';

// ─── Constants ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  supplierId: '',
  locationId: '',
  expectedDeliveryDate: '',
  notes: '',
};

const EMPTY_ITEM = () => ({
  // Unique key for React list rendering — not sent to API
  _key: Math.random().toString(36).slice(2),
  productId: '',
  name: '',
  quantity: 1,
  unitCost: 0,
});

// ─── Tailwind class helpers ──────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 ' +
  'text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 ' +
  'focus:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';

// ─── ProductSearchInput ──────────────────────────────────────────────────────

// Debounced product search — shows a floating dropdown of matching products.
// On selection, calls onSelect({ id, name, costPrice }).
function ProductSearchInput({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/products', { params: { search: value } });
        const products = res.data?.data ?? [];
        setResults(products);
        setOpen(true);
      } catch {
        // Silently fail — user can retry by typing again
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (product) => {
    onSelect({ id: product.id, name: product.name, costPrice: product.costPrice ?? 0 });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search products to add..."
          className={inputCls + ' pl-9'}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full px-3 py-2.5 text-left hover:bg-zinc-700/60 transition-colors flex items-center justify-between gap-2"
              >
                <span className="text-sm text-zinc-100 truncate">{product.name}</span>
                {product.costPrice != null && (
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    Cost: {product.costPrice}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl px-3 py-3">
          <p className="text-sm text-zinc-500">No products found</p>
        </div>
      )}
    </div>
  );
}

// ─── LineItemRow ─────────────────────────────────────────────────────────────

function LineItemRow({ item, index, onChange, onRemove }) {
  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);

  return (
    <div className="rounded-lg bg-zinc-800/50 px-3 pt-2.5 pb-3 space-y-2.5">
      {/* Product name — full width, no truncation */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-zinc-100 leading-snug">{item.name}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded flex-shrink-0 -mt-0.5"
          aria-label={`Remove ${item.name}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Qty / Unit Cost / Total */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-zinc-500 mb-1 text-center">Qty</p>
          <input
            type="number"
            min="1"
            step="1"
            value={item.quantity}
            onChange={(e) => onChange(index, 'quantity', e.target.value)}
            className={inputCls + ' text-center'}
            aria-label={`Quantity for ${item.name}`}
          />
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1 text-right">Unit Cost</p>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.unitCost}
            onChange={(e) => onChange(index, 'unitCost', e.target.value)}
            className={inputCls + ' text-right'}
            aria-label={`Unit cost for ${item.name}`}
          />
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1 text-right">Total</p>
          <div className="w-full px-3 py-2.5 text-sm text-zinc-300 text-right tabular-nums font-medium">
            {lineTotal.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── POSheet ─────────────────────────────────────────────────────────────────

/**
 * Slide-over sheet for creating or editing a Purchase Order.
 *
 * Props:
 *  open           {boolean}            — controls visibility
 *  onOpenChange   {function}           — called to open/close
 *  poId           {string|null}        — when provided, fetches PO and enters edit mode
 *  initialProduct {object|null}        — { id, name, costPrice } pre-added as first line item
 *  onSuccess      {function}           — called with created/updated PO on success
 */
export default function POSheet({ open, onOpenChange, poId, initialProduct, onSuccess }) {
  const { isMultiLocation } = useLocation();

  // ── Form state ──
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);

  // ── Reference data ──
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);

  // ── Loading & UI states ──
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingPO, setLoadingPO] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Edit-mode state ──
  const [existingPOStatus, setExistingPOStatus] = useState(null); // null = create mode

  // ── SupplierSheet ──
  const [supplierSheetOpen, setSupplierSheetOpen] = useState(false);

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const res = await apiClient.get('/suppliers');
      setSuppliers(res.data?.data ?? []);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const res = await apiClient.get('/locations');
      setLocations(res.data?.data ?? []);
    } catch {
      toast.error('Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  // ─── Open/close effects ───────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    // Always fetch fresh supplier list when sheet opens
    fetchSuppliers();

    // Fetch locations only when multi-location is relevant
    if (isMultiLocation) {
      fetchLocations();
    }

    if (poId) {
      // Edit mode — fetch existing PO
      loadPO(poId);
    } else {
      // Create mode — reset form
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poId]);

  // ─── initialProduct effect ────────────────────────────────────────────────

  // When a new initialProduct is passed while the sheet is already open (or just opened
  // in create mode), inject it as the first item. Guard against edit mode to avoid
  // overwriting fetched data.
  useEffect(() => {
    if (!open || poId || !initialProduct) return;
    setItems([
      {
        _key: Math.random().toString(36).slice(2),
        productId: initialProduct.id,
        name: initialProduct.name,
        quantity: 1,
        unitCost: initialProduct.costPrice ?? 0,
      },
    ]);
  }, [open, poId, initialProduct]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function resetForm() {
    setForm(EMPTY_FORM);
    setItems(initialProduct
      ? [{
          _key: Math.random().toString(36).slice(2),
          productId: initialProduct.id,
          name: initialProduct.name,
          quantity: 1,
          unitCost: initialProduct.costPrice ?? 0,
        }]
      : []
    );
    setExistingPOStatus(null);
  }

  async function loadPO(id) {
    setLoadingPO(true);
    try {
      const res = await apiClient.get(`/purchase-orders/${id}`);
      const po = res.data?.data ?? res.data;

      setExistingPOStatus(po.status);
      setForm({
        supplierId: po.supplierId ?? '',
        locationId: po.locationId ?? '',
        expectedDeliveryDate: po.expectedDeliveryDate
          ? po.expectedDeliveryDate.slice(0, 10) // ISO  YYYY-MM-DD for <input type="date">
          : '',
        notes: po.notes ?? '',
      });
      setItems(
        (po.items ?? []).map((item) => ({
          _key: Math.random().toString(36).slice(2),
          productId: item.productId,
          name: item.product?.name ?? item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        }))
      );
    } catch {
      toast.error('Failed to load purchase order');
    } finally {
      setLoadingPO(false);
    }
  }

  // ─── Form field handlers ──────────────────────────────────────────────────

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAddProduct = (product) => {
    // Prevent duplicate product entries — bump quantity instead
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.productId === product.id);
      if (existing !== -1) {
        return prev.map((item, idx) =>
          idx === existing
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          _key: Math.random().toString(36).slice(2),
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitCost: product.costPrice ?? 0,
        },
      ];
    });
  };

  const handleItemChange = (index, key, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Subtotal ─────────────────────────────────────────────────────────────

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );

  // ─── Supplier Sheet integration ───────────────────────────────────────────

  const handleSupplierCreated = async (newSupplier) => {
    setSupplierSheetOpen(false);
    // Refresh supplier list and auto-select the newly created supplier
    await fetchSuppliers();
    setField('supplierId', newSupplier.id);
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate() {
    if (!form.supplierId) {
      toast.error('Please select a supplier');
      return false;
    }
    if (isMultiLocation && !form.locationId) {
      toast.error('Please select a receiving location');
      return false;
    }
    if (items.length === 0) {
      toast.error('Add at least one product item');
      return false;
    }
    for (const item of items) {
      if (!item.productId) {
        toast.error('All items must have a product selected');
        return false;
      }
      if (Number(item.quantity) < 1) {
        toast.error('Quantity must be at least 1 for all items');
        return false;
      }
      if (Number(item.unitCost) < 0) {
        toast.error('Unit cost cannot be negative');
        return false;
      }
    }
    return true;
  }

  // ─── Payload builder ──────────────────────────────────────────────────────

  function buildPayload() {
    return {
      supplierId: form.supplierId,
      ...(isMultiLocation && form.locationId ? { locationId: form.locationId } : {}),
      ...(form.expectedDeliveryDate ? { expectedDeliveryDate: form.expectedDeliveryDate } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      })),
    };
  }

  // ─── Save handlers ────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/purchase-orders', buildPayload());
      const po = res.data?.data ?? res.data;
      toast.success(`PO ${po.poNumber} created successfully`);
      onOpenChange(false);
      onSuccess?.(po);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to save purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Step 1: create draft
      const createRes = await apiClient.post('/purchase-orders', buildPayload());
      const po = createRes.data?.data ?? createRes.data;

      // Step 2: submit for approval
      await apiClient.post(`/purchase-orders/${po.id}/submit`);

      toast.success(`PO ${po.poNumber} submitted successfully`);
      onOpenChange(false);
      onSuccess?.(po);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to submit purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Read-only guard ──────────────────────────────────────────────────────

  const isReadOnly = existingPOStatus !== null && existingPOStatus !== 'DRAFT';

  // ─── Render ───────────────────────────────────────────────────────────────

  const sheetTitle = poId
    ? existingPOStatus === 'DRAFT'
      ? 'Edit Purchase Order'
      : 'View Purchase Order'
    : 'New Purchase Order';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={sheetTitle}>
        <div className="px-5 py-5 space-y-5">
          {/* Loading skeleton while fetching existing PO */}
          {loadingPO && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Read-only banner */}
          {!loadingPO && isReadOnly && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Only draft POs can be edited. This order is in{' '}
                <span className="font-medium">{existingPOStatus}</span> status.
              </p>
            </div>
          )}

          {!loadingPO && (
            <>
              {/* ── Header fields ────────────────────────────────────────── */}

              {/* Supplier selector */}
              <div>
                <label className={labelCls}>Supplier *</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      required
                      disabled={isReadOnly || loadingSuppliers}
                      value={form.supplierId}
                      onChange={(e) => setField('supplierId', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">
                        {loadingSuppliers ? 'Loading suppliers...' : 'Select supplier'}
                      </option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Inline "New Supplier" link — not shown in read-only mode */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => setSupplierSheetOpen(true)}
                      className="flex items-center gap-1 text-xs text-brand-light hover:text-brand whitespace-nowrap mt-2.5 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      New Supplier
                    </button>
                  )}
                </div>
              </div>

              {/* Location selector — multi-location tenants only */}
              {isMultiLocation && (
                <div>
                  <label className={labelCls}>Receiving Location *</label>
                  <select
                    required
                    disabled={isReadOnly || loadingLocations}
                    value={form.locationId}
                    onChange={(e) => setField('locationId', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">
                      {loadingLocations ? 'Loading locations...' : 'Select location'}
                    </option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Expected delivery date */}
              <div>
                <label className={labelCls}>Expected Delivery Date</label>
                <input
                  type="date"
                  disabled={isReadOnly}
                  value={form.expectedDeliveryDate}
                  onChange={(e) => setField('expectedDeliveryDate', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  disabled={isReadOnly}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={2}
                  placeholder="Optional notes for this order..."
                  className={inputCls + ' resize-none'}
                />
              </div>

              {/* ── Line items ───────────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={labelCls + ' mb-0'}>Items *</span>
                  {!isReadOnly && (
                    <span className="text-xs text-zinc-500">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Product search — hidden in read-only mode */}
                {!isReadOnly && (
                  <div className="mb-3">
                    <ProductSearchInput onSelect={handleAddProduct} />
                  </div>
                )}


                {/* Item rows */}
                <div className="space-y-2">
                  {items.map((item, index) =>
                    isReadOnly ? (
                      // Read-only item display
                      <div
                        key={item._key}
                        className="rounded-lg bg-zinc-800/50 px-3 py-2.5 space-y-1.5"
                      >
                        <span className="text-sm font-medium text-zinc-200 block">{item.name}</span>
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>Qty: <span className="text-zinc-300 font-medium">{item.quantity}</span></span>
                          <span>@ <span className="text-zinc-300 font-medium">{Number(item.unitCost).toFixed(2)}</span> each</span>
                          <span className="text-sm text-zinc-200 font-semibold tabular-nums">
                            {(Number(item.quantity) * Number(item.unitCost)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <LineItemRow
                        key={item._key}
                        item={item}
                        index={index}
                        onChange={handleItemChange}
                        onRemove={handleRemoveItem}
                      />
                    )
                  )}
                </div>

                {/* Empty items hint */}
                {items.length === 0 && !isReadOnly && (
                  <p className="text-sm text-zinc-600 text-center py-4">
                    Search and add products above
                  </p>
                )}

                {/* Running subtotal */}
                {items.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-700/50">
                    <span className="text-sm font-medium text-zinc-400">Subtotal</span>
                    <span className="text-sm font-semibold text-zinc-100 tabular-nums">
                      {subtotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Action buttons — hidden in read-only mode ─────────────── */}
              {!isReadOnly && (
                <div className="flex gap-3 pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : (
                      'Save Draft'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                      </span>
                    ) : (
                      'Save & Submit'
                    )}
                  </button>
                </div>
              )}

              {/* Close button for read-only mode */}
              {isReadOnly && (
                <div className="pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Sheet>

      {/* Nested SupplierSheet — opened from "New Supplier" link */}
      <SupplierSheet
        open={supplierSheetOpen}
        onOpenChange={setSupplierSheetOpen}
        onSuccess={handleSupplierCreated}
      />
    </>
  );
}
