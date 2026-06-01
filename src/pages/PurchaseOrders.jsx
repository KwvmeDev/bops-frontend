import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Truck, ChevronDown, ChevronUp, PackageCheck,
  Edit2, Download, XCircle, AlertTriangle, Users, Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { purchaseOrdersApi, suppliersApi } from '../api/client';
import { toast, Sheet } from '../components/ui';
import POSheet from '../components/POSheet';
import SupplierSheet from '../components/SupplierSheet';
import ReceiveDeliverySheet from '../components/ReceiveDeliverySheet';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',     cls: 'bg-zinc-700/60 text-zinc-300' },
  ORDERED:   { label: 'Ordered',   cls: 'bg-blue-500/20 text-blue-300' },
  PARTIAL:   { label: 'Partial',   cls: 'bg-amber-500/20 text-amber-300' },
  RECEIVED:  { label: 'Received',  cls: 'bg-green-500/20 text-green-300' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-300' },
};

const FILTER_TABS = [
  { key: '',         label: 'All' },
  { key: 'DRAFT',    label: 'Draft' },
  { key: 'ORDERED',  label: 'Ordered' },
  { key: 'PARTIAL',  label: 'Partial' },
  { key: 'RECEIVED', label: 'Received' },
];

// ─── Tailwind helpers ─────────────────────────────────────────────────────────

const btnPrimary =
  'flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand/20';

const btnSecondary =
  'flex items-center gap-2 px-4 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors';

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-zinc-700 text-zinc-300' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

// ─── PODetailRow ──────────────────────────────────────────────────────────────
// Inline-expanded detail panel for a single PO row

function PODetailPanel({ po, currencySymbol, canManage, isOwner, onReceive, onEdit, onCancel, onDownload }) {
  const canReceive = po.status === 'ORDERED' || po.status === 'PARTIAL';
  const canEdit = po.status === 'DRAFT';
  const canCancel = po.status !== 'RECEIVED' && po.status !== 'CANCELLED';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-1 border-t border-surface-muted/40">
        {/* Items list */}
        <div className="mt-3 space-y-1">
          <div className="grid grid-cols-[1fr_60px_80px_80px_80px] gap-2 px-2 mb-1">
            <span className="text-xs text-zinc-500">Product</span>
            <span className="text-xs text-zinc-500 text-center">Ordered</span>
            <span className="text-xs text-zinc-500 text-center">Received</span>
            <span className="text-xs text-zinc-500 text-right">Unit Cost</span>
            <span className="text-xs text-zinc-500 text-right">Total</span>
          </div>

          {(po.items ?? []).map((item) => {
            const ordered = item.orderedQty ?? item.quantity ?? 0;
            const received = item.receivedQty ?? 0;
            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_60px_80px_80px_80px] gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/30 items-center"
              >
                <span className="text-sm text-zinc-200 truncate">
                  {item.product?.name ?? item.productId}
                </span>
                <span className="text-sm text-zinc-400 text-center">{ordered}</span>
                <span className={`text-sm text-center font-medium ${received >= ordered ? 'text-green-400' : received > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {received}
                </span>
                <span className="text-sm text-zinc-400 text-right tabular-nums">
                  {currencySymbol}{Number(item.unitCost ?? 0).toFixed(2)}
                </span>
                <span className="text-sm text-zinc-300 text-right tabular-nums">
                  {currencySymbol}{Number((item.unitCost ?? 0) * ordered).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {po.notes && (
          <p className="mt-3 text-xs text-zinc-500 italic">Note: {po.notes}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {canManage && canReceive && (
            <button
              type="button"
              onClick={onReceive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-300 text-xs font-medium rounded-lg transition-colors"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Receive Delivery
            </button>
          )}

          {canManage && canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700/60 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}

          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700/60 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>

          {isOwner && canCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel PO
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── SuppliersPanel ───────────────────────────────────────────────────────────
// Sheet listing all suppliers with edit and deactivate actions

function SuppliersPanel({ open, onOpenChange }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supplierSheetOpen, setSupplierSheetOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.data?.data ?? []);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchSuppliers();
  }, [open, fetchSuppliers]);

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate supplier "${name}"?`)) return;
    setDeactivating(id);
    try {
      await suppliersApi.deactivate(id);
      toast.success('Supplier deactivated');
      await fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to deactivate supplier');
    } finally {
      setDeactivating(null);
    }
  };

  const handleEdit = (id) => {
    setEditingSupplierId(id);
    setSupplierSheetOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupplierId(null);
    setSupplierSheetOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title="Manage Suppliers">
        <div className="px-5 py-4 space-y-4">
          <button
            type="button"
            onClick={handleAddNew}
            className={btnPrimary + ' w-full justify-center'}
          >
            <Plus className="w-4 h-4" />
            Add New Supplier
          </button>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="w-10 h-10 mx-auto mb-3 text-zinc-700 opacity-50" />
              <p className="text-sm text-zinc-500">No suppliers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-3 bg-surface-muted/40 rounded-xl border border-surface-muted/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{supplier.name}</p>
                    {supplier.contactName && (
                      <p className="text-xs text-zinc-500 truncate">{supplier.contactName}</p>
                    )}
                    {supplier.phone && (
                      <p className="text-xs text-zinc-600 truncate">{supplier.phone}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(supplier.id)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
                      title="Edit supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deactivating === supplier.id}
                      onClick={() => handleDeactivate(supplier.id, supplier.name)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Deactivate supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sheet>

      {/* Nested SupplierSheet for create / edit */}
      <SupplierSheet
        open={supplierSheetOpen}
        onOpenChange={setSupplierSheetOpen}
        supplierId={editingSupplierId}
        onSuccess={() => {
          setSupplierSheetOpen(false);
          fetchSuppliers();
        }}
      />
    </>
  );
}

// ─── PurchaseOrders page ──────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const { hasMinRole, user, currencySymbol } = useAuth();
  const canManage = hasMinRole('MANAGER');
  const isOwner = user?.role === 'OWNER';

  // ── Data state ──
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  // ── Expanded row ──
  const [expandedId, setExpandedId] = useState(null);

  // ── Sheet states ──
  const [poSheetOpen, setPoSheetOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState(null);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [receiveSheetOpen, setReceiveSheetOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState(null);

  // ── Fetch POs ──────────────────────────────────────────────────────────────

  const fetchPOs = useCallback(async (status = '') => {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const res = await purchaseOrdersApi.getAll(params);
      setPos(res.data?.data?.orders ?? []);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPOs(activeTab);
  }, [activeTab, fetchPOs]);

  // ── Derived: outstanding deliveries count ─────────────────────────────────
  // When the "All" tab is active we derive from the loaded list to avoid an extra fetch.
  // When a status filter is active, derive from what we have (may not be complete,
  // but the banner only shows on the All tab in practice).
  const outstandingCount = activeTab === ''
    ? pos.filter((po) => po.status === 'ORDERED' || po.status === 'PARTIAL').length
    : 0;

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleCreatePO = () => {
    setEditingPoId(null);
    setPoSheetOpen(true);
  };

  const handleEditPO = (poId) => {
    setEditingPoId(poId);
    setPoSheetOpen(true);
    setExpandedId(null);
  };

  const handleReceive = (po) => {
    setReceivingPO(po);
    setReceiveSheetOpen(true);
  };

  const handleCancel = async (po) => {
    if (!window.confirm(`Cancel PO ${po.poNumber ?? po.id}? This cannot be undone.`)) return;
    try {
      await purchaseOrdersApi.cancel(po.id);
      toast.success('Purchase order cancelled');
      await fetchPOs(activeTab);
      setExpandedId(null);
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to cancel purchase order');
    }
  };

  const handleDownloadPdf = async (po) => {
    try {
      const res = await purchaseOrdersApi.exportPdf(po.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${po.poNumber ?? po.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleRowClick = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"
      >
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Purchase Orders</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage supplier orders and incoming stock</p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSuppliersOpen(true)}
              className={btnSecondary}
            >
              <Users className="w-4 h-4" />
              Manage Suppliers
            </button>
            <button
              type="button"
              onClick={handleCreatePO}
              className={btnPrimary}
            >
              <Plus className="w-4 h-4" />
              Create PO
            </button>
          </div>
        )}
      </motion.div>

      {/* Outstanding deliveries banner */}
      <AnimatePresence>
        {outstandingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 px-4 py-3 mb-5 bg-amber-500/10 border border-amber-500/20 rounded-xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              <span className="font-semibold">{outstandingCount}</span> outstanding{' '}
              {outstandingCount === 1 ? 'delivery' : 'deliveries'} awaiting receipt.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand/15 text-brand-light'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PO list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden"
      >
        {loading ? (
          // Loading skeleton
          <div className="divide-y divide-surface-muted/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-surface-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-surface-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-20 bg-surface-muted rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-surface-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : pos.length === 0 ? (
          // Empty state
          <div className="py-20 text-center">
            <Truck className="w-12 h-12 mx-auto mb-4 text-zinc-700 opacity-50" />
            <p className="text-base font-medium text-zinc-500 mb-1">No purchase orders</p>
            {canManage && (
              <button
                type="button"
                onClick={handleCreatePO}
                className="mt-3 text-sm text-brand-light hover:text-brand transition-colors"
              >
                Create your first PO &rarr;
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-surface-muted/30">
            <AnimatePresence initial={false}>
              {pos.map((po, i) => {
                const isExpanded = expandedId === po.id;
                const itemCount = po.items?.length ?? po._count?.items ?? 0;
                const supplierName = po.supplier?.name ?? '—';
                const expectedDate = po.expectedDeliveryDate
                  ? dayjs(po.expectedDeliveryDate).format('MMM D, YYYY')
                  : '—';

                return (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.12) }}
                  >
                    {/* Summary row */}
                    <button
                      type="button"
                      onClick={() => handleRowClick(po.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/30 transition-colors text-left"
                    >
                      {/* Expand icon */}
                      <span className="text-zinc-600 flex-shrink-0">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </span>

                      {/* PO number */}
                      <span className="text-xs font-mono text-zinc-400 w-36 flex-shrink-0 truncate">
                        {po.poNumber ?? po.id.slice(0, 10).toUpperCase()}
                      </span>

                      {/* Supplier */}
                      <span className="text-sm text-zinc-300 flex-1 truncate min-w-0">
                        {supplierName}
                      </span>

                      {/* Item count */}
                      <span className="text-xs text-zinc-500 w-16 text-right flex-shrink-0">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>

                      {/* Subtotal */}
                      <span className="text-sm font-medium text-zinc-200 w-24 text-right flex-shrink-0 tabular-nums">
                        {currencySymbol}{Number(po.subtotal ?? 0).toFixed(2)}
                      </span>

                      {/* Status badge */}
                      <span className="w-24 flex justify-end flex-shrink-0">
                        <StatusBadge status={po.status} />
                      </span>

                      {/* Expected date */}
                      <span className="text-xs text-zinc-500 w-24 text-right flex-shrink-0 hidden sm:block">
                        {expectedDate}
                      </span>
                    </button>

                    {/* Inline detail panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <PODetailPanel
                          key={`detail-${po.id}`}
                          po={po}
                          currencySymbol={currencySymbol}
                          canManage={canManage}
                          isOwner={isOwner}
                          onReceive={() => handleReceive(po)}
                          onEdit={() => handleEditPO(po.id)}
                          onCancel={() => handleCancel(po)}
                          onDownload={() => handleDownloadPdf(po)}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create / Edit PO Sheet */}
      <POSheet
        open={poSheetOpen}
        onOpenChange={setPoSheetOpen}
        poId={editingPoId}
        onSuccess={() => {
          setPoSheetOpen(false);
          fetchPOs(activeTab);
        }}
      />

      {/* Suppliers management panel */}
      <SuppliersPanel
        open={suppliersOpen}
        onOpenChange={setSuppliersOpen}
      />

      {/* Receive delivery sheet */}
      <ReceiveDeliverySheet
        open={receiveSheetOpen}
        onOpenChange={setReceiveSheetOpen}
        po={receivingPO}
        onSuccess={() => {
          setReceiveSheetOpen(false);
          fetchPOs(activeTab);
        }}
      />
    </div>
  );
}
