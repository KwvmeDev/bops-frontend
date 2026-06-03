import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { salesApi, receiptApi, cashDrawerApi, productUnitsApi, customersApi } from '../api/client';
import { db } from '../lib/db';
import { useOffline } from '../hooks/useOffline';
import useLocation from '../hooks/useLocation';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import Receipt from '../components/Receipt';
import DrawerStatusBar from '../components/DrawerStatusBar';
import DrawerOpenModal from '../components/DrawerOpenModal';
import DrawerCloseSheet from '../components/DrawerCloseSheet';
import PrescriptionSearchSheet from '../components/PrescriptionSearchSheet';
import ManagerApprovalPrompt from '../components/ManagerApprovalPrompt';
import { Sheet } from '../components/ui/Sheet';
import { X, Printer, CheckCircle, ArrowRight, ShoppingCart, MessageCircle, Loader2, AlertTriangle, Link, UserPlus, Search, UserCheck, PauseCircle, Clock } from 'lucide-react';
import { toast } from '../components/ui';
import SuspendedSalesSheet from '../components/SuspendedSalesSheet';

// ── Tier badge colours — reuses the palette defined in Cart.jsx ───────────────
const TIER_STYLES = {
  STANDARD: 'bg-zinc-700 text-zinc-300',
  SILVER:   'bg-slate-600 text-slate-200',
  GOLD:     'bg-yellow-600/80 text-yellow-100',
  PLATINUM: 'bg-purple-700/80 text-purple-100',
};

/**
 * CustomerSearchSheet — inline search/create panel rendered inside a Sheet.
 * Only mounted when tenant.loyaltyEnabled is true.
 *
 * Props:
 *   onSelect   fn(customer) — called when user picks a result
 *   onClose    fn()         — called to dismiss the sheet
 */
function CustomerSearchSheet({ onSelect, onClose }) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [creating, setCreating]     = useState(false);
  const debounceRef                  = useRef(null);

  // Debounced search — fires 320 ms after the user stops typing
  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await customersApi.search(q.trim());
        setResults(res.data?.data?.customers ?? res.data?.data ?? []);
      } catch {
        // Silent — search failures shouldn't block checkout
      } finally {
        setSearching(false);
      }
    }, 320);
  };

  // Quick-create a new customer and auto-select them
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await customersApi.create({
        name: createName.trim(),
        phone: createPhone.trim() || undefined,
      });
      const created = res.data?.data;
      if (created) {
        onSelect(created);
        toast.success(`Customer "${created.name}" created and selected`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all';
  const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

  return (
    <div className="flex flex-col h-full bg-surface-subtle">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">Select Customer</h2>
        <button
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            autoFocus
            placeholder="Name, phone or email…"
            value={query}
            onChange={handleQueryChange}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
          )}
        </div>

        {/* Search results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-surface-muted/50 border border-surface-muted/40 rounded-xl overflow-hidden"
            >
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-overlay/60 transition-colors border-b border-surface-muted/30 last:border-0 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{c.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{c.phone || c.email || 'No contact'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${TIER_STYLES[c.loyaltyTier] ?? TIER_STYLES.STANDARD}`}>
                      {c.loyaltyTier ?? 'STANDARD'}
                    </span>
                    <span className="text-xs text-yellow-400 font-medium whitespace-nowrap">
                      {(c.loyaltyPoints ?? 0).toLocaleString()} pts
                    </span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create new customer toggle */}
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 text-xs font-medium text-brand-light hover:text-brand transition-colors mt-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {showCreate ? 'Cancel new customer' : 'Create new customer'}
        </button>

        {/* Quick-create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleCreate}
              className="overflow-hidden space-y-3"
            >
              <div>
                <label className={labelClass}>Full name *</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Jane Doe"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="+233…"
                  className={inputClass}
                />
              </div>
              <motion.button
                type="submit"
                disabled={creating}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {creating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  : <><UserPlus className="w-4 h-4" /> Create & Select</>
                }
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SalesScreen() {
  const { tenant, currencySymbol, user, hasMinRole } = useAuth();
  const { activeLocation } = useLocation();
  const { isOffline } = useOffline();
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [momoPhone, setMomoPhone] = useState('');
  const [receiptPhone, setReceiptPhone] = useState('');
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const receiptRef = useRef();

  // ── Loyalty / customer state ────────────────────────────────────────────────
  // Only relevant when tenant.loyaltyEnabled is true; otherwise these are inert.
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [pointsToRedeem, setPointsToRedeem]       = useState(0);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // ── Prescription state (pharmacy mode Rx gate) ────────────────────────────
  // prescriptionId is sent with the sale payload; linkedPrescription holds the
  // full object for display purposes only.
  const [prescriptionId, setPrescriptionId] = useState(null);
  const [linkedPrescription, setLinkedPrescription] = useState(null);
  const [showPrescriptionSheet, setShowPrescriptionSheet] = useState(false);

  // ── Controlled substance approval state ──────────────────────────────────
  // approvedBy stores the manager's userId once they confirm.
  // approvedByName is kept for display only (shown in the amberemerald banner).
  const [approvedBy, setApprovedBy] = useState(null);
  const [approvedByName, setApprovedByName] = useState(null);
  const [showManagerApproval, setShowManagerApproval] = useState(false);

  // ── Suspended sales state ───────────────────────────────────────────────
  const [suspendedSales, setSuspendedSales]   = useState([]);
  const [showSuspended, setShowSuspended]     = useState(false);

  // Load any carts placed on hold for this tenant on mount
  useEffect(() => {
    async function loadSuspended() {
      try {
        const saved = await db.suspendedSales
          .where('tenantId').equals(user.tenantId)
          .toArray();
        setSuspendedSales(saved);
      } catch {
        // Non-critical — degrade silently
      }
    }
    loadSuspended();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drawer session state ─────────────────────────────────────────────────
  const [drawerSession, setDrawerSession] = useState(null);
  const [drawerOpenModalOpen, setDrawerOpenModalOpen] = useState(false);
  const [drawerCloseSheetOpen, setDrawerCloseSheetOpen] = useState(false);

  // Fetch the active drawer session on mount, scoped to the active branch
  useEffect(() => {
    async function fetchActiveSession() {
      try {
        const res = await cashDrawerApi.getActive(activeLocation?.id);
        setDrawerSession(res.data?.data ?? null);
      } catch {
        // Not critical — degrade silently; cashier can still make sales
        setDrawerSession(null);
      }
    }
    fetchActiveSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${completedSale?.receiptNumber}`,
  });

  const handleAddToCart = async (product) => {
    // Optimistically add the product first so the cart feels instant
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      // Extended cart item shape — unitId, units, selectedUnit are null unless
      // pharmacyMode is on and the product has ProductUnit records.
      return [...prev, { ...product, quantity: 1, unitId: null, units: null, selectedUnit: null }];
    });

    // In pharmacy mode, asynchronously fetch product units and attach them to the cart item.
    // We do this after the optimistic add so the UI isn't blocked.
    if (tenant?.pharmacyMode === true) {
      try {
        const res = await productUnitsApi.getForProduct(product.id);
        const units = res.data?.data ?? [];
        if (units.length > 0) {
          const base = units.find((u) => u.isBase) ?? units[0];
          setCartItems(prev =>
            prev.map(i =>
              i.id === product.id
                ? {
                    ...i,
                    units,
                    unitId: base.id,
                    selectedUnit: base,
                    // Override the selling price with the base unit's price
                    sellingPrice: base.sellingPrice,
                  }
                : i
            )
          );
        }
      } catch {
        // Non-critical — units stay null and the product's default sellingPrice is used
      }
    }
  };

  const handleUpdateQuantity = (id, qty) => {
    if (qty < 1) return;
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.min(qty, i.stock) } : i));
  };

  // Called by UnitSelector when the cashier picks a different unit of measure.
  // Updates sellingPrice and unitId on the cart item so totals recalculate immediately.
  const handleUnitChange = (productId, unit) => {
    setCartItems(prev =>
      prev.map(i =>
        i.id === productId
          ? { ...i, unitId: unit.id, selectedUnit: unit, sellingPrice: unit.sellingPrice }
          : i
      )
    );
  };

  const handleRemoveItem = (id) => {
    setCartItems(prev => {
      const remaining = prev.filter(i => i.id !== id);
      // If removing an item means no more rxRequired items remain, clear the linked prescription
      if (prescriptionId) {
        const stillHasRx = remaining.some(i => i.rxRequired === true);
        if (!stillHasRx) {
          setPrescriptionId(null);
          setLinkedPrescription(null);
        }
      }
      // If removing an item means no more controlled-substance items remain, clear approval
      const stillHasCs = remaining.some(i => i.controlledSubstance === true);
      if (!stillHasCs) {
        setApprovedBy(null);
        setApprovedByName(null);
      }
      return remaining;
    });
  };
  const handleClearCart = () => {
    setCartItems([]);
    // Clear any linked prescription when the cart is emptied
    setPrescriptionId(null);
    setLinkedPrescription(null);
    // Clear CS approval on cart clear
    setApprovedBy(null);
    setApprovedByName(null);
  };

  // ── Suspend / resume ────────────────────────────────────────────────────

  const handleSuspend = async () => {
    if (cartItems.length === 0) return;
    const label = `Hold ${suspendedSales.length + 1}`;
    const snapshot = {
      tenantId: user.tenantId,
      label,
      createdAt: new Date().toISOString(),
      total,
      cartItems,
      paymentMethod,
      momoPhone,
      selectedCustomer,
      pointsToRedeem,
      prescriptionId,
      linkedPrescription,
      approvedBy,
      approvedByName,
    };
    try {
      const localId = await db.suspendedSales.add(snapshot);
      setSuspendedSales(prev => [...prev, { ...snapshot, localId }]);
      // Reset all cart state for the next sale
      handleClearCart();
      setPaymentMethod('CASH');
      setMomoPhone('');
      setSelectedCustomer(null);
      setPointsToRedeem(0);
      toast.success(`Cart saved as "${label}"`);
    } catch {
      toast.error('Could not suspend sale — please try again');
    }
  };

  const handleResume = async (suspended) => {
    // Restore full cart state from the snapshot
    setCartItems(suspended.cartItems);
    setPaymentMethod(suspended.paymentMethod ?? 'CASH');
    setMomoPhone(suspended.momoPhone ?? '');
    setSelectedCustomer(suspended.selectedCustomer ?? null);
    setPointsToRedeem(suspended.pointsToRedeem ?? 0);
    setPrescriptionId(suspended.prescriptionId ?? null);
    setLinkedPrescription(suspended.linkedPrescription ?? null);
    setApprovedBy(suspended.approvedBy ?? null);
    setApprovedByName(suspended.approvedByName ?? null);
    // Remove from hold list
    await db.suspendedSales.delete(suspended.localId);
    setSuspendedSales(prev => prev.filter(s => s.localId !== suspended.localId));
    setShowSuspended(false);
    toast.success(`"${suspended.label}" resumed`);
  };

  const handleDiscardSuspended = async (localId) => {
    await db.suspendedSales.delete(localId);
    setSuspendedSales(prev => prev.filter(s => s.localId !== localId));
    toast.success('Hold discarded');
  };

  // ── Checkout ─────────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setLoading(true);

    // Offline path: queue the sale locally and decrement stock in IndexedDB.
    // Uses navigator.onLine directly so the check reflects the live state at
    // the moment the cashier taps Checkout, not when the component last rendered.
    if (!navigator.onLine) {
      try {
        const payload = {
          items: cartItems.map(i => ({ productId: i.id, quantity: i.quantity })),
          paymentMethod,
        };

        // Persist the queued sale; the background sync service will pick it up
        // when connectivity is restored.
        await db.pendingSales.add({
          tenantId: user.tenantId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          payload,
        });

        // Optimistically decrement local stock so the product grid stays accurate
        // while the device remains offline.
        for (const item of cartItems) {
          await db.products
            .where('id')
            .equals(item.id)
            .modify(p => { p.stock = Math.max(0, p.stock - item.quantity); });
        }

        toast.success('Sale saved offline — will sync when connected');
        setCartItems([]);
      } catch (err) {
        toast.error('Could not save sale offline — please try again');
      } finally {
        setLoading(false);
      }
      return; // Skip the online API call entirely
    }

    try {
      const res = await salesApi.create({
        items: cartItems.map(i => ({
          productId: i.id,
          quantity: i.quantity,
          // Include the selected unit when one has been chosen (pharmacy mode)
          ...(i.unitId ? { unitId: i.unitId } : {}),
        })),
        paymentMethod,
        // Include the MoMo number as the receipt delivery phone when provided
        receiptPhone: momoPhone.trim() || undefined,
        // Link a prescription when one is required (pharmacy mode)
        ...(prescriptionId ? { prescriptionId } : {}),
        // Include manager approval userId when controlled substances are present
        ...(approvedBy ? { approvedBy } : {}),
        // Loyalty: attach customer and any points being redeemed
        ...(tenant?.loyaltyEnabled && selectedCustomer
          ? { customerId: selectedCustomer.id, pointsToRedeem: pointsToRedeem || 0 }
          : {}),
      });
      setCompletedSale(res.data.data);
      // Pre-fill the WhatsApp send input with the MoMo number used at checkout
      setReceiptPhone(momoPhone);
      setCartOpen(false);
      setShowReceipt(true);
      setCartItems([]);
      // Reset MoMo phone and WhatsApp state so the next sale starts clean
      setMomoPhone('');
      setWhatsappSent(false);
      // Clear linked prescription for the next sale
      setPrescriptionId(null);
      setLinkedPrescription(null);
      // Clear CS approval for the next sale
      setApprovedBy(null);
      setApprovedByName(null);
      // Reset loyalty state for the next sale
      setSelectedCustomer(null);
      setPointsToRedeem(0);
      // Refresh the drawer session so DrawerStatusBar shows updated expected cash
      try {
        const drawerRes = await cashDrawerApi.getActive(activeLocation?.id);
        setDrawerSession(drawerRes.data?.data ?? null);
      } catch {
        // Non-critical — keep existing session state
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCompletedSale(null);
    setReceiptPhone('');
    setWhatsappSent(false);
    setWhatsappSending(false);
  };

  // Sends the completed sale receipt to the customer via WhatsApp
  const handleSendWhatsApp = async () => {
    if (!receiptPhone.trim() || !completedSale?.receiptToken) return;
    setWhatsappSending(true);
    try {
      await receiptApi.send(completedSale.receiptToken, receiptPhone.trim());
      setWhatsappSent(true);
    } catch {
      toast.error('Failed to send WhatsApp receipt');
    } finally {
      setWhatsappSending(false);
    }
  };

  // Derived values used by the mobile cart bar
  const sym = currencySymbol;
  const taxRate = tenant?.taxRate || 0;
  const subtotal = cartItems.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const total = subtotal + subtotal * taxRate;
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  // Rx gate — items in the cart that have rxRequired=true (pharmacy mode only)
  const rxRequiredItems = tenant?.pharmacyMode
    ? cartItems.filter(i => i.rxRequired === true)
    : [];
  const hasRxRequired = rxRequiredItems.length > 0;
  // Checkout is blocked when there are Rx-required items and no prescription is linked
  const rxBlocked = hasRxRequired && !prescriptionId;

  // CS gate — items flagged as controlled substances (pharmacy mode only)
  const csItems = tenant?.pharmacyMode
    ? cartItems.filter(i => i.controlledSubstance === true)
    : [];
  // Checkout is blocked when there are CS items and no manager has approved
  const csBlocked = csItems.length > 0 && !approvedBy;

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col bg-surface-base overflow-hidden">

      {/* ── Drawer session status bar ─────────────────────────────── */}
      {drawerSession ? (
        <DrawerStatusBar
          session={drawerSession}
          onClose={() => setDrawerCloseSheetOpen(true)}
        />
      ) : hasMinRole('MANAGER') && (
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => setDrawerOpenModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted hover:bg-surface-overlay text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-lg border border-surface-muted/60 transition-colors"
          >
            Open Drawer
          </button>
        </div>
      )}

      {/* ── Rx prescription warning banner (pharmacy mode) ──────────────── */}
      {tenant?.pharmacyMode && hasRxRequired && (
        <div className="px-4 py-2">
          <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
            linkedPrescription
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {linkedPrescription ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-300 font-medium">
                    Prescription linked: <span className="font-mono">{linkedPrescription.rxNumber}</span>
                    {linkedPrescription.patientName && ` — ${linkedPrescription.patientName}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPrescriptionId(null); setLinkedPrescription(null); }}
                  className="text-xs text-emerald-400 hover:text-emerald-200 transition-colors flex-shrink-0"
                >
                  Change
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-300">
                    <span className="font-medium">Prescription required</span>
                    {' — '}
                    {rxRequiredItems.map(i => i.name).join(', ')}
                    {'. Link a prescription to proceed.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrescriptionSheet(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-100 transition-colors flex-shrink-0 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1.5 rounded-lg"
                >
                  <Link className="w-3.5 h-3.5" />
                  Link Prescription
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Controlled substance approval banner (pharmacy mode) ───────── */}
      {tenant?.pharmacyMode && csItems.length > 0 && (
        <div className="px-4 py-2">
          <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border ${
            approvedBy
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {approvedBy ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-300 font-medium">
                  Approved by {approvedByName ?? 'manager'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-300">
                    <span className="font-medium">Controlled substance</span>
                    {' — manager approval required'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManagerApproval(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-100 transition-colors flex-shrink-0 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1.5 rounded-lg"
                >
                  Get Approval
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Customer selector row (loyalty mode only) ────────────────────── */}
      {tenant?.loyaltyEnabled && (
        <div className="px-4 py-2">
          {selectedCustomer ? (
            // Customer is selected — show their name, tier, points inline
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-brand/10 border border-brand/20 rounded-xl"
            >
              <UserCheck className="w-4 h-4 text-brand-light flex-shrink-0" />
              <span className="text-sm font-medium text-zinc-200 flex-1 truncate">
                {selectedCustomer.name}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
                TIER_STYLES[selectedCustomer.loyaltyTier] ?? TIER_STYLES.STANDARD
              }`}>
                {selectedCustomer.loyaltyTier ?? 'STANDARD'}
              </span>
              <span className="text-xs text-yellow-400 font-medium whitespace-nowrap flex-shrink-0">
                {(selectedCustomer.loyaltyPoints ?? 0).toLocaleString()} pts
              </span>
              <button
                type="button"
                onClick={() => { setSelectedCustomer(null); setPointsToRedeem(0); }}
                className="p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
                aria-label="Remove customer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            // No customer selected — show the "Select Customer" button
            <button
              type="button"
              onClick={() => setShowCustomerSearch(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface-muted hover:bg-surface-overlay border border-surface-muted/60 hover:border-surface-overlay text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Select Customer (optional)
            </button>
          )}
        </div>
      )}

      {/* ── Main content row ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* Product grid — full width on mobile, flex-1 on desktop */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ProductGrid onAddToCart={handleAddToCart} />
      </div>

      {/* Cart sidebar — desktop only */}
      <div className="hidden md:flex md:flex-col w-80 lg:w-96 flex-shrink-0 overflow-hidden">

        {/* Suspend toolbar — shown when cart has items or there are holds */}
        {(cartItems.length > 0 || suspendedSales.length > 0) && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-muted/40 flex-shrink-0 bg-surface-subtle">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSuspend}
              disabled={cartItems.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors border border-surface-muted/60 hover:border-surface-overlay"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Suspend
            </motion.button>

            {suspendedSales.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSuspended(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors border border-amber-500/30 hover:border-amber-500/50"
              >
                <Clock className="w-3.5 h-3.5" />
                On Hold
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {suspendedSales.length}
                </span>
              </motion.button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden">
        <Cart
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onCheckout={handleCheckout}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          loading={loading}
          momoPhone={momoPhone}
          onMomoPhoneChange={setMomoPhone}
          onUnitChange={handleUnitChange}
          checkoutDisabled={rxBlocked || csBlocked}
          // Loyalty props — inert when loyaltyEnabled is false
          loyaltyEnabled={!!tenant?.loyaltyEnabled}
          customer={selectedCustomer}
          pointsToRedeem={pointsToRedeem}
          onPointsToRedeemChange={setPointsToRedeem}
          onCustomerSelect={(c) => { setSelectedCustomer(c); setPointsToRedeem(0); }}
          pointsValue={tenant?.pointsValue ?? 0.01}
        />
        </div>{/* end flex-1 overflow-hidden */}
      </div>{/* end cart sidebar */}

      {/* ── Mobile only ─────────────────────────────────────────────────────── */}

      {/* Sticky cart bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-3 py-2.5 bg-surface-base/85 backdrop-blur-md border-t border-surface-muted/40">
        {/* Suspend / On Hold row — only rendered when relevant */}
        {(cartItems.length > 0 || suspendedSales.length > 0) && (
          <div className="flex items-center gap-2 mb-2">
            {cartItems.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSuspend}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-surface-muted rounded-lg border border-surface-muted/60 transition-colors"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Suspend
              </motion.button>
            )}
            {suspendedSales.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSuspended(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-lg border border-amber-500/30 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                On Hold ({suspendedSales.length})
              </motion.button>
            )}
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCartOpen(true)}
          className="w-full py-3.5 px-4 bg-success hover:bg-success/90 text-white rounded-xl font-semibold text-sm flex items-center justify-between shadow-lg shadow-success/20 transition-colors"
        >
          {/* Left: icon + count */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 320 }}
                    className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-white text-success text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span>
              {itemCount > 0
                ? `${itemCount} item${itemCount !== 1 ? 's' : ''} in cart`
                : 'Cart is empty'}
            </span>
          </div>

          {/* Right: total or CTA */}
          <span className="font-bold tracking-tight">
            {itemCount > 0 ? `${sym}${total.toFixed(2)}` : 'View Cart'}
          </span>
        </motion.button>
      </div>

      {/* Cart bottom sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <Cart
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onCheckout={handleCheckout}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          loading={loading}
          variant="sheet"
          momoPhone={momoPhone}
          onMomoPhoneChange={setMomoPhone}
          onUnitChange={handleUnitChange}
          checkoutDisabled={rxBlocked || csBlocked}
          // Loyalty props — inert when loyaltyEnabled is false
          loyaltyEnabled={!!tenant?.loyaltyEnabled}
          customer={selectedCustomer}
          pointsToRedeem={pointsToRedeem}
          onPointsToRedeemChange={setPointsToRedeem}
          onCustomerSelect={(c) => { setSelectedCustomer(c); setPointsToRedeem(0); }}
          pointsValue={tenant?.pointsValue ?? 0.01}
        />
      </Sheet>

      </div>{/* end main content row */}

      {/* ── Receipt modal (shared mobile + desktop) ─────────────────────────── */}
      <AnimatePresence>
        {showReceipt && completedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && handleCloseReceipt()}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 300 }}
                    className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 text-success" />
                  </motion.div>
                  <span className="font-semibold text-zinc-100 text-sm">Sale Complete</span>
                </div>
                <button onClick={handleCloseReceipt} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt */}
              <div className="flex-1 overflow-y-auto bg-surface-muted/30 p-4">
                <div className="bg-white rounded-xl shadow-sm">
                  <Receipt ref={receiptRef} sale={completedSale} tenant={tenant} />
                </div>
              </div>

              {/* WhatsApp receipt section — only shown when the sale has a receiptToken */}
              {completedSale?.receiptToken && (
                <div className="px-4 pb-3 border-t border-surface-muted/40 pt-3 flex-shrink-0">
                  <p className="text-xs text-zinc-500 mb-2">Send receipt via WhatsApp</p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="+233..."
                      value={receiptPhone}
                      onChange={e => setReceiptPhone(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-base border border-surface-muted/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand/50"
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSendWhatsApp}
                      disabled={whatsappSending || whatsappSent || !receiptPhone.trim()}
                      className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {whatsappSending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <MessageCircle className="w-3.5 h-3.5" />
                      }
                      {whatsappSent ? 'Sent' : 'Send'}
                    </motion.button>
                  </div>
                  {whatsappSent && (
                    <p className="text-xs text-emerald-400 mt-1.5">&#10003; Sent to {receiptPhone}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-200 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCloseReceipt}
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  New Sale <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drawer open / close modals ───────────────────────────── */}
      <DrawerOpenModal
        open={drawerOpenModalOpen}
        onOpenChange={setDrawerOpenModalOpen}
        locationId={activeLocation?.id}
        onSuccess={(session) => setDrawerSession(session)}
      />

      <DrawerCloseSheet
        open={drawerCloseSheetOpen}
        onOpenChange={setDrawerCloseSheetOpen}
        session={drawerSession}
        onSuccess={() => setDrawerSession(null)}
      />

      {/* ── Prescription search sheet (pharmacy Rx gate) ─────────────── */}
      {tenant?.pharmacyMode && (
        <PrescriptionSearchSheet
          open={showPrescriptionSheet}
          onOpenChange={setShowPrescriptionSheet}
          rxRequiredProducts={rxRequiredItems}
          onSelect={(rx) => {
            setPrescriptionId(rx.id);
            setLinkedPrescription(rx);
          }}
        />
      )}

      {/* ── Manager approval prompt (controlled substance gate) ──────── */}
      {tenant?.pharmacyMode && (
        <ManagerApprovalPrompt
          open={showManagerApproval}
          onOpenChange={setShowManagerApproval}
          onApprove={(managerId, managerName) => {
            setApprovedBy(managerId);
            setApprovedByName(managerName);
          }}
        />
      )}

      {/* ── Customer search sheet (loyalty mode only) ────────────────── */}
      {tenant?.loyaltyEnabled && (
        <Sheet open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
          <CustomerSearchSheet
            onSelect={(customer) => {
              setSelectedCustomer(customer);
              setPointsToRedeem(0);
              setShowCustomerSearch(false);
            }}
            onClose={() => setShowCustomerSearch(false)}
          />
        </Sheet>
      )}

      {/* ── Suspended sales sheet ─────────────────────────────────────── */}
      <SuspendedSalesSheet
        open={showSuspended}
        onOpenChange={setShowSuspended}
        suspendedSales={suspendedSales}
        currentCartHasItems={cartItems.length > 0}
        currencySymbol={sym}
        onResume={handleResume}
        onDiscard={handleDiscardSuspended}
      />
    </div>
  );
}
