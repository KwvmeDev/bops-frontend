import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import useLocation from '../hooks/useLocation';
import { stockTransfersApi, locationsApi, productsApi } from '../api/client';
import { Plus, ArrowRight, Package, X } from 'lucide-react';
import { toast } from '../components/ui';
import dayjs from 'dayjs';

// Map transfer status values to Tailwind badge classes
const STATUS_STYLES = {
  PENDING:    'bg-zinc-700 text-zinc-200',
  IN_TRANSIT: 'bg-blue-500/20 text-blue-300',
  COMPLETED:  'bg-green-500/20 text-green-300',
  CANCELLED:  'bg-red-500/20 text-red-300',
};

// Blank form state used both for initialisation and post-submit reset
const EMPTY_FORM = {
  fromLocationId: '',
  toLocationId: '',
  items: [{ productId: '', quantity: 1 }],
  notes: '',
};

function TransferModal({ locations, products, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const setItemField = (index, key, value) => {
    setForm(prev => {
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      );
      return { ...prev, items };
    });
  };

  const addItem = () =>
    setForm(prev => ({ ...prev, items: [...prev.items, { productId: '', quantity: 1 }] }));

  const removeItem = (index) =>
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.fromLocationId === form.toLocationId) {
      toast.error('From and To locations must be different');
      return;
    }
    const validItems = form.items.filter(item => item.productId && item.quantity > 0);
    if (!validItems.length) {
      toast.error('Add at least one product item');
      return;
    }
    setSubmitting(true);
    try {
      await stockTransfersApi.create({
        fromLocationId: form.fromLocationId,
        toLocationId: form.toLocationId,
        items: validItems.map(item => ({ productId: item.productId, quantity: Number(item.quantity) })),
        notes: form.notes || undefined,
      });
      toast.success('Transfer created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all';
  const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">New Stock Transfer</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* From / To locations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>From location *</label>
              <select required value={form.fromLocationId} onChange={e => setField('fromLocationId', e.target.value)} className={inputClass}>
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>To location *</label>
              <select required value={form.toLocationId} onChange={e => setField('toLocationId', e.target.value)} className={inputClass}>
                <option value="">Select location</option>
                {locations
                  .filter(loc => loc.id !== form.fromLocationId)
                  .map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>Items *</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-brand-light hover:text-brand transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    required
                    value={item.productId}
                    onChange={e => setItemField(index, 'productId', e.target.value)}
                    className={inputClass + ' flex-1'}
                  >
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    min="1"
                    value={item.quantity}
                    onChange={e => setItemField(index, 'quantity', e.target.value)}
                    className={inputClass + ' w-20 flex-shrink-0'}
                    placeholder="Qty"
                  />
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-zinc-500 hover:text-danger-light rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={2}
              placeholder="Add any transfer notes..."
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Transfer'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function StockTransfers() {
  const { user, hasMinRole } = useAuth();
  const { activeLocation, isMultiLocation } = useLocation();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirming, setConfirming] = useState(null); // transfer id being confirmed

  const canManage = hasMinRole('MANAGER');
  const isOwner = user?.role === 'OWNER';

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pass locationId only when scoped to a real branch, not the aggregate sentinel
      const locationParam = activeLocation?.id && activeLocation.id !== '__all__'
        ? { locationId: activeLocation.id }
        : {};

      const [transfersRes, locationsRes, productsRes] = await Promise.all([
        stockTransfersApi.getAll(locationParam),
        locationsApi.getAll(),
        productsApi.getAll({
          ...(activeLocation?.id && activeLocation.id !== '__all__' ? { locationId: activeLocation.id } : {}),
        }),
      ]);

      setTransfers(transfersRes.data.data ?? []);
      setLocations(locationsRes.data.data ?? []);
      setProducts(productsRes.data.data ?? []);
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // Refetch when active location changes
  }, [activeLocation?.id]);

  const handleConfirm = async (transferId) => {
    setConfirming(transferId);
    try {
      await stockTransfersApi.confirm(transferId);
      toast.success('Transfer confirmed');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm transfer');
    } finally {
      setConfirming(null);
    }
  };

  // A user can confirm receipt when:
  // - They are OWNER, OR
  // - The transfer's destination matches their active location
  const canConfirmTransfer = (transfer) => {
    if (isOwner) return true;
    return transfer.toLocationId === activeLocation?.id;
  };

  // Location name lookup helper
  const locationName = (id) =>
    locations.find(l => l.id === id)?.name ?? id ?? '—';

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Stock Transfers</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Move inventory between locations</p>
        </div>
        {canManage && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand/20"
          >
            <Plus className="w-4 h-4" /> New Transfer
          </motion.button>
        )}
      </motion.div>

      {/* Transfers table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-muted/50">
                {['Transfer', 'Route', 'Items', 'Status', 'Date', canManage ? 'Actions' : null]
                  .filter(Boolean)
                  .map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-muted/30">
                    {Array.from({ length: canManage ? 6 : 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-surface-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-20 text-center">
                    <Package className="w-10 h-10 mx-auto mb-3 text-zinc-700 opacity-50" />
                    <p className="text-sm text-zinc-600">No transfers yet</p>
                    {canManage && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 text-xs text-brand-light hover:text-brand transition-colors"
                      >
                        Create your first transfer 
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {transfers.map((transfer, i) => {
                    const itemCount = transfer.items?.length ?? transfer._count?.items ?? '—';
                    const isPendingOrInTransit = transfer.status === 'PENDING' || transfer.status === 'IN_TRANSIT';

                    return (
                      <motion.tr
                        key={transfer.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: Math.min(i * 0.02, 0.15), duration: 0.22 }}
                        className="border-b border-surface-muted/30 hover:bg-surface-muted/30 transition-colors"
                      >
                        {/* Transfer reference number */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono text-zinc-400">
                            {transfer.referenceNumber ?? transfer.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>

                        {/* From  To */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-zinc-300">{locationName(transfer.fromLocationId)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                            <span className="text-zinc-300">{locationName(transfer.toLocationId)}</span>
                          </div>
                        </td>

                        {/* Items count */}
                        <td className="px-4 py-3.5 text-sm text-zinc-400">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[transfer.status] ?? STATUS_STYLES.PENDING}`}>
                            {transfer.status?.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-sm text-zinc-500">
                          {dayjs(transfer.createdAt).format('MMM D, YYYY')}
                        </td>

                        {/* Actions — MANAGER+ only */}
                        {canManage && (
                          <td className="px-4 py-3.5">
                            {isPendingOrInTransit && canConfirmTransfer(transfer) && (
                              <motion.button
                                whileTap={{ scale: 0.97 }}
                                disabled={confirming === transfer.id}
                                onClick={() => handleConfirm(transfer.id)}
                                className="px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {confirming === transfer.id ? 'Confirming...' : 'Confirm Receipt'}
                              </motion.button>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create transfer modal */}
      <AnimatePresence>
        {showCreateModal && (
          <TransferModal
            locations={locations}
            products={products}
            onClose={() => setShowCreateModal(false)}
            onCreated={async () => {
              setShowCreateModal(false);
              await fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
