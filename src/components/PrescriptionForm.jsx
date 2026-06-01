import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { Sheet } from './ui/Sheet';
import { toast } from './ui';
import { prescriptionsApi, prescribersApi, productsApi } from '../api/client';
import PrescriberSheet from './PrescriberSheet';

// ── Empty item factory ─────────────────────────────────────────────────────────
function emptyItem() {
  return { productId: '', productName: '', prescribedQty: 1, instructions: '', durationDays: '' };
}

// ── Debounce hook — fires callback after `delay` ms of inactivity ──────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * PrescriptionForm — Sheet for creating a new prescription.
 *
 * Props:
 *   open          — boolean controlling sheet visibility
 *   onOpenChange  — callback to toggle open state
 *   onSuccess     — callback(newPrescription) invoked after a successful save
 */
export default function PrescriptionForm({ open, onOpenChange, onSuccess }) {
  const [loading, setLoading] = useState(false);

  // ── Patient fields ────────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientDOB, setPatientDOB] = useState('');

  // ── Prescriber search state ───────────────────────────────────────────────
  const [prescriberQuery, setPrescriberQuery] = useState('');
  const [prescriberResults, setPrescriberResults] = useState([]);
  const [prescriberLoading, setPrescriberLoading] = useState(false);
  const [selectedPrescriber, setSelectedPrescriber] = useState(null);
  const [prescriberDropdownOpen, setPrescriberDropdownOpen] = useState(false);
  const [prescriberSheetOpen, setPrescriberSheetOpen] = useState(false);
  const prescriberRef = useRef(null);

  const debouncedPrescriberQuery = useDebounce(prescriberQuery, 300);

  // ── Prescription meta ─────────────────────────────────────────────────────
  const [prescribedDate, setPrescribedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [expiryDate, setExpiryDate] = useState('');
  const [totalFills, setTotalFills] = useState(1);

  // ── Items ─────────────────────────────────────────────────────────────────
  const [items, setItems] = useState([emptyItem()]);
  // Per-item product search state
  const [productQueries, setProductQueries] = useState(['']);
  const [productResults, setProductResults] = useState([[]]);
  const [productSearching, setProductSearching] = useState([false]);
  const [productDropdownOpen, setProductDropdownOpen] = useState([false]);

  // ── Search prescribers when query changes ─────────────────────────────────
  useEffect(() => {
    if (!debouncedPrescriberQuery.trim() || selectedPrescriber) {
      setPrescriberResults([]);
      return;
    }
    let cancelled = false;
    setPrescriberLoading(true);
    prescribersApi.search({ name: debouncedPrescriberQuery.trim() })
      .then(res => {
        if (!cancelled) {
          setPrescriberResults(res.data?.data ?? []);
          setPrescriberDropdownOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setPrescriberResults([]);
      })
      .finally(() => {
        if (!cancelled) setPrescriberLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedPrescriberQuery, selectedPrescriber]);

  // ── Close prescriber dropdown when clicking outside ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (prescriberRef.current && !prescriberRef.current.contains(e.target)) {
        setPrescriberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Product search for a specific item row ────────────────────────────────
  const searchProducts = useCallback(async (index, query) => {
    if (!query.trim()) {
      setProductResults(prev => { const n = [...prev]; n[index] = []; return n; });
      return;
    }
    setProductSearching(prev => { const n = [...prev]; n[index] = true; return n; });
    try {
      const res = await productsApi.getAll({ search: query.trim(), active: true });
      setProductResults(prev => { const n = [...prev]; n[index] = res.data?.data ?? []; return n; });
      setProductDropdownOpen(prev => { const n = [...prev]; n[index] = true; return n; });
    } catch {
      setProductResults(prev => { const n = [...prev]; n[index] = []; return n; });
    } finally {
      setProductSearching(prev => { const n = [...prev]; n[index] = false; return n; });
    }
  }, []);

  // ── Item management ───────────────────────────────────────────────────────
  const addItem = () => {
    setItems(prev => [...prev, emptyItem()]);
    setProductQueries(prev => [...prev, '']);
    setProductResults(prev => [...prev, []]);
    setProductSearching(prev => [...prev, false]);
    setProductDropdownOpen(prev => [...prev, false]);
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setProductQueries(prev => prev.filter((_, i) => i !== index));
    setProductResults(prev => prev.filter((_, i) => i !== index));
    setProductSearching(prev => prev.filter((_, i) => i !== index));
    setProductDropdownOpen(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const selectProduct = (index, product) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, productId: product.id, productName: product.name } : item
    ));
    setProductQueries(prev => { const n = [...prev]; n[index] = product.name; return n; });
    setProductDropdownOpen(prev => { const n = [...prev]; n[index] = false; return n; });
  };

  const handleProductQueryChange = (index, value) => {
    setProductQueries(prev => { const n = [...prev]; n[index] = value; return n; });
    // Clear the linked product if the user types something different
    if (items[index]?.productId) {
      updateItem(index, 'productId', '');
      updateItem(index, 'productName', '');
    }
    searchProducts(index, value);
  };

  // ── Reset entire form ─────────────────────────────────────────────────────
  const reset = () => {
    setPatientName('');
    setPatientPhone('');
    setPatientDOB('');
    setPrescriberQuery('');
    setPrescriberResults([]);
    setSelectedPrescriber(null);
    setPrescriberDropdownOpen(false);
    setPrescribedDate(dayjs().format('YYYY-MM-DD'));
    setExpiryDate('');
    setTotalFills(1);
    setItems([emptyItem()]);
    setProductQueries(['']);
    setProductResults([[]]);
    setProductSearching([false]);
    setProductDropdownOpen([false]);
  };

  // ── Called when a newly-created prescriber is returned from PrescriberSheet ─
  const handlePrescriberCreated = (newPrescriber) => {
    setSelectedPrescriber(newPrescriber);
    setPrescriberQuery(newPrescriber.name);
    setPrescriberDropdownOpen(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }

    // Validate all items have a product selected and a positive quantity
    const validItems = items.filter(item => item.productId);
    if (validItems.length === 0) {
      toast.error('At least one prescription item with a product is required');
      return;
    }
    for (const item of validItems) {
      if (!item.prescribedQty || item.prescribedQty < 1) {
        toast.error('All items must have a quantity of at least 1');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        patientName: patientName.trim(),
        ...(patientPhone.trim() ? { patientPhone: patientPhone.trim() } : {}),
        ...(patientDOB ? { patientDOB } : {}),
        ...(selectedPrescriber ? { prescriberId: selectedPrescriber.id } : {}),
        // Allow free-text prescriber name when no record was selected
        ...(prescriberQuery.trim() && !selectedPrescriber ? { prescriberName: prescriberQuery.trim() } : {}),
        prescribedDate,
        ...(expiryDate ? { expiryDate } : {}),
        totalFills: Number(totalFills) || 1,
        items: validItems.map(item => ({
          productId: item.productId,
          prescribedQty: Number(item.prescribedQty),
          ...(item.instructions.trim() ? { instructions: item.instructions.trim() } : {}),
          ...(item.durationDays ? { durationDays: Number(item.durationDays) } : {}),
        })),
      };

      const res = await prescriptionsApi.create(payload);
      const newRx = res.data?.data;
      toast.success(`Prescription ${newRx.rxNumber} created`);
      reset();
      onOpenChange(false);
      onSuccess?.(newRx);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors';

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(val) => { if (!val) reset(); onOpenChange(val); }}
        title="New Prescription"
        description="Capture a prescription before dispensing Rx-required products."
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── Patient Details ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Patient</p>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">Patient Name <span className="text-danger">*</span></label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="Ama Mensah"
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-300">Phone <span className="text-zinc-500 font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  placeholder="+233..."
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-300">Date of Birth <span className="text-zinc-500 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={patientDOB}
                  onChange={e => setPatientDOB(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ── Prescriber ────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prescriber</p>

            <div className="relative space-y-1.5" ref={prescriberRef}>
              <label className="block text-sm font-medium text-zinc-300">Prescriber <span className="text-zinc-500 font-normal">(optional)</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={prescriberQuery}
                  onChange={e => {
                    setPrescriberQuery(e.target.value);
                    setSelectedPrescriber(null); // clear selection when typing
                  }}
                  onFocus={() => prescriberResults.length > 0 && setPrescriberDropdownOpen(true)}
                  placeholder="Search by name or type to add..."
                  className={`${inputClass} pl-9`}
                />
                {prescriberLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
                )}
              </div>

              {/* Prescriber dropdown */}
              {prescriberDropdownOpen && (prescriberResults.length > 0 || prescriberQuery.trim()) && (
                <div className="absolute z-50 w-full mt-1 bg-surface-subtle border border-surface-overlay rounded-xl shadow-xl overflow-hidden">
                  {prescriberResults.length > 0 && (
                    <ul>
                      {prescriberResults.map(p => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPrescriber(p);
                              setPrescriberQuery(p.name);
                              setPrescriberDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-surface-muted transition-colors"
                          >
                            <p className="text-sm text-zinc-200 font-medium">{p.name}</p>
                            {(p.licenceNumber || p.specialisation) && (
                              <p className="text-xs text-zinc-500">
                                {[p.licenceNumber, p.specialisation].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Add new prescriber option always at bottom of dropdown */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrescriberDropdownOpen(false);
                      setPrescriberSheetOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand-light hover:bg-surface-muted transition-colors border-t border-surface-muted/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Prescriber
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── Prescription Meta ─────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prescription Details</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-300">Prescribed Date</label>
                <input
                  type="date"
                  value={prescribedDate}
                  onChange={e => setPrescribedDate(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-300">Expiry Date <span className="text-zinc-500 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">Total Fills</label>
              <input
                type="number"
                min="1"
                max="12"
                value={totalFills}
                onChange={e => setTotalFills(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-zinc-500">How many times this prescription can be dispensed (1 = single fill)</p>
            </div>
          </section>

          {/* ── Prescription Items ────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Items</p>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs text-brand-light hover:text-brand transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-surface-base border border-surface-muted/50 rounded-xl p-3 space-y-2.5">
                  {/* Header row: product search + remove button */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          value={productQueries[index] || ''}
                          onChange={e => handleProductQueryChange(index, e.target.value)}
                          placeholder="Search product..."
                          className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface-subtle border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 transition-colors"
                        />
                        {productSearching[index] && (
                          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 animate-spin" />
                        )}
                      </div>

                      {/* Product dropdown */}
                      {productDropdownOpen[index] && productResults[index]?.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-surface-subtle border border-surface-overlay rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                          {productResults[index].map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => selectProduct(index, p)}
                              className="w-full text-left px-3 py-2 hover:bg-surface-muted transition-colors"
                            >
                              <p className="text-sm text-zinc-200">{p.name}</p>
                              {p.sku && <p className="text-xs text-zinc-500">SKU: {p.sku}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Remove item — only if more than one item exists */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-zinc-500 hover:text-danger transition-colors flex-shrink-0 rounded-lg hover:bg-surface-muted mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quantity + Duration */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-400">Prescribed Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.prescribedQty}
                        onChange={e => updateItem(index, 'prescribedQty', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-surface-muted/60 text-zinc-100 text-sm focus:outline-none focus:border-brand/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-400">Duration (days)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.durationDays}
                        onChange={e => updateItem(index, 'durationDays', e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-400">Instructions</label>
                    <input
                      type="text"
                      value={item.instructions}
                      onChange={e => updateItem(index, 'instructions', e.target.value)}
                      placeholder="e.g. Take 1 tablet twice daily after meals"
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false); }}
              className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </Sheet>

      {/* Nested sheet for adding a new prescriber inline */}
      <PrescriberSheet
        open={prescriberSheetOpen}
        onOpenChange={setPrescriberSheetOpen}
        onSuccess={handlePrescriberCreated}
      />
    </>
  );
}
