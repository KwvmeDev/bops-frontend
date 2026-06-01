import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, Loader2, Users, Star, ChevronRight,
  Phone, Mail, Award, Edit2, UserX, Gift, Sliders,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { customersApi } from '../api/client';
import { Sheet, toast, Avatar, Skeleton } from '../components/ui';
import LoyaltyHistoryList from '../components/LoyaltyHistoryList';

// ── Tier badge colours ────────────────────────────────────────────────────────
// Reuses the same palette as Cart.jsx and LoyaltyRedemptionInput
const TIER_STYLES = {
  STANDARD: 'bg-zinc-700 text-zinc-300',
  SILVER:   'bg-slate-600 text-slate-200',
  GOLD:     'bg-yellow-600/80 text-yellow-100',
  PLATINUM: 'bg-purple-700/80 text-purple-100',
};

function TierBadge({ tier }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
        TIER_STYLES[tier] ?? TIER_STYLES.STANDARD
      }`}
    >
      {tier ?? 'STANDARD'}
    </span>
  );
}

// ── Skeleton rows while fetching ──────────────────────────────────────────────
function CustomerRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-surface-muted/40 last:border-0">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

// ── Customer form (add / edit) ────────────────────────────────────────────────
function CustomerFormSheet({ editingCustomer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:  editingCustomer?.name  ?? '',
    phone: editingCustomer?.phone ?? '',
    email: editingCustomer?.email ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      };
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, payload);
      } else {
        await customersApi.create(payload);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all';
  const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

  return (
    <div className="flex flex-col h-full bg-surface-subtle">
      {/* Sheet header */}
      <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">
          {editingCustomer ? 'Edit Customer' : 'Add Customer'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form body */}
      <form id="customer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className={labelClass}>Full name *</label>
          <input
            type="text"
            required
            autoFocus
            value={form.name}
            onChange={set('name')}
            placeholder="Jane Doe"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+233..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email address</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="jane@example.com"
            className={inputClass}
          />
        </div>
      </form>

      {/* Sheet footer */}
      <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
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
          form="customer-form"
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            editingCustomer ? 'Update' : 'Add Customer'
          )}
        </motion.button>
      </div>
    </div>
  );
}

// ── Points action modal (Award Bonus or Adjust) ───────────────────────────────
function PointsActionModal({ customerId, mode, onClose, onSaved }) {
  const [points, setPoints] = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  // mode: 'bonus' | 'adjust'
  const isBonus = mode === 'bonus';
  const title   = isBonus ? 'Award Bonus Points' : 'Adjust Points';
  const label   = isBonus ? 'Bonus points to award' : 'Points adjustment (negative to subtract)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseInt(points, 10);
    if (!parsed || parsed === 0) {
      toast.error('Enter a non-zero points value');
      return;
    }
    setSaving(true);
    try {
      if (isBonus) {
        await customersApi.awardBonus(customerId, { points: parsed, note: note.trim() || undefined });
        toast.success(`Awarded ${parsed} bonus points`);
      } else {
        await customersApi.adjustLoyalty(customerId, { points: parsed, note: note.trim() || undefined });
        toast.success(`Points adjusted by ${parsed}`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update points');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all';
  const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl w-full max-w-sm"
      >
        <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>{label} *</label>
            <input
              type="number"
              required
              autoFocus
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder={isBonus ? '100' : '50 or -50'}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment..."
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 pt-1">
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
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Confirm'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Customer detail sheet ─────────────────────────────────────────────────────
function CustomerDetailSheet({ customer, canManage, onClose, onEdit, onDeactivate, onPointsAction, onRefresh }) {
  const [loyalty, setLoyalty]           = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);
  const [loyaltyError, setLoyaltyError]   = useState(null);

  // Fetch loyalty data whenever the sheet opens with a customer
  useEffect(() => {
    if (!customer) return;
    setLoyaltyLoading(true);
    setLoyaltyError(null);
    customersApi.getLoyalty(customer.id)
      .then((res) => setLoyalty(res.data?.data ?? null))
      .catch(() => setLoyaltyError('Failed to load loyalty history'))
      .finally(() => setLoyaltyLoading(false));
  }, [customer?.id]);

  if (!customer) return null;

  const transactions = loyalty?.transactions ?? [];
  const balance      = loyalty?.balance      ?? customer.loyaltyPoints ?? 0;
  const tier         = loyalty?.tier         ?? customer.loyaltyTier   ?? 'STANDARD';

  return (
    <div className="flex flex-col h-full bg-surface-subtle">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">Customer Profile</h2>
        <button
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Identity block */}
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-zinc-100 truncate">{customer.name}</h3>
            {customer.phone && (
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {customer.phone}
              </p>
            )}
            {customer.email && (
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" /> {customer.email}
              </p>
            )}
            <p className="text-xs text-zinc-600 mt-0.5">
              Since {dayjs(customer.createdAt).format('DD MMM YYYY')}
            </p>
          </div>
        </div>

        {/* Loyalty summary card */}
        <div className="bg-surface-muted/60 border border-surface-muted/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Loyalty Balance
            </span>
            <TierBadge tier={tier} />
          </div>
          <p className="text-2xl font-bold text-zinc-100">
            {balance.toLocaleString()}
            <span className="text-sm font-normal text-zinc-500 ml-1">pts</span>
          </p>
          {customer.lifetimePoints != null && (
            <p className="text-xs text-zinc-500">
              {customer.lifetimePoints.toLocaleString()} lifetime points earned
            </p>
          )}
        </div>

        {/* MANAGER+ actions */}
        {canManage && (
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onPointsAction('bonus')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-surface-muted hover:bg-surface-overlay text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-xl border border-surface-muted/60 transition-colors"
            >
              <Gift className="w-3.5 h-3.5" /> Award Bonus
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onPointsAction('adjust')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-surface-muted hover:bg-surface-overlay text-zinc-300 hover:text-zinc-100 text-xs font-medium rounded-xl border border-surface-muted/60 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" /> Adjust Points
            </motion.button>
          </div>
        )}

        {/* Loyalty history */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Loyalty History
          </h4>
          <LoyaltyHistoryList
            transactions={transactions}
            loading={loyaltyLoading}
            error={loyaltyError}
          />
        </div>
      </div>

      {/* Footer actions */}
      {canManage && (
        <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onEdit}
            className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </motion.button>
          {customer.active !== false && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onDeactivate}
              className="flex-1 py-2.5 bg-danger/10 hover:bg-danger/20 text-danger-light text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <UserX className="w-3.5 h-3.5" /> Deactivate
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Customers page ───────────────────────────────────────────────────────
export default function Customers() {
  const { hasMinRole } = useAuth();
  const canManage = hasMinRole('MANAGER');

  // List state
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sheet / modal state
  const [formSheetOpen, setFormSheetOpen]     = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pointsActionMode, setPointsActionMode] = useState(null); // 'bonus' | 'adjust' | null

  // Deactivate confirmation state
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating]           = useState(false);

  // Debounce timer ref — avoids flooding the API on every keystroke
  const debounceRef = useRef(null);

  // ── Fetch / search ──────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = q.trim()
        ? await customersApi.search(q.trim())
        : await customersApi.getAll();
      setCustomers(res.data?.data?.customers ?? res.data?.data ?? []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounced search on input change
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCustomers(q), 350);
  };

  // ── Deactivate ──────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!selectedCustomer) return;
    setDeactivating(true);
    try {
      await customersApi.deactivate(selectedCustomer.id);
      toast.success(`${selectedCustomer.name} deactivated`);
      setConfirmDeactivate(false);
      setDetailSheetOpen(false);
      setSelectedCustomer(null);
      fetchCustomers(searchQuery);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate customer');
    } finally {
      setDeactivating(false);
    }
  };

  // ── Open detail sheet ───────────────────────────────────────────────────────
  const openDetail = (customer) => {
    setSelectedCustomer(customer);
    setConfirmDeactivate(false);
    setDetailSheetOpen(true);
  };

  // ── Open edit form from within the detail sheet ─────────────────────────────
  const openEditFromDetail = () => {
    setEditingCustomer(selectedCustomer);
    setDetailSheetOpen(false);
    setFormSheetOpen(true);
  };

  // ── Reload loyalty history after points action ──────────────────────────────
  const handlePointsActionSaved = () => {
    setPointsActionMode(null);
    // Re-fetch selected customer to get updated points from the list endpoint
    fetchCustomers(searchQuery);
    // Re-trigger detail reload by briefly flipping the customer ref
    setSelectedCustomer((prev) => ({ ...prev }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage customer accounts and loyalty</p>
        </div>

        {canManage && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingCustomer(null); setFormSheetOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand/20"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </motion.button>
        )}
      </motion.div>

      {/* ── Search bar ─────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, phone or email…"
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-9 pr-4 py-2.5 bg-surface-subtle border border-surface-muted/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); fetchCustomers(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Customer table ─────────────────────────────────────────── */}
      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">

        {/* Column headers — hidden on small screens */}
        <div className="hidden md:grid grid-cols-[1fr_120px_100px_90px_80px] gap-4 px-4 py-2.5 border-b border-surface-muted/40 bg-surface-muted/30">
          <span className="text-xs font-medium text-zinc-500">Customer</span>
          <span className="text-xs font-medium text-zinc-500">Tier</span>
          <span className="text-xs font-medium text-zinc-500 text-right">Points</span>
          <span className="text-xs font-medium text-zinc-500 text-right">Joined</span>
          <span className="text-xs font-medium text-zinc-500 text-right">Action</span>
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => <CustomerRowSkeleton key={i} />)}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-zinc-300 font-medium mb-1">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </p>
            <p className="text-zinc-500 text-sm">
              {searchQuery ? 'Try a different name, phone or email.' : 'Add your first customer to start tracking loyalty.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {customers.map((customer, i) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                // Row acts as a clickable button — opens detail sheet
                onClick={() => openDetail(customer)}
                className={`flex items-center gap-3 md:grid md:grid-cols-[1fr_120px_100px_90px_80px] md:gap-4 px-4 py-3.5 border-b border-surface-muted/40 last:border-0 hover:bg-surface-muted/20 transition-colors cursor-pointer group ${
                  customer.active === false ? 'opacity-50' : ''
                }`}
              >
                {/* Name + contact */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={customer.name} size="sm" className="flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{customer.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {customer.phone || customer.email || 'No contact info'}
                    </p>
                  </div>
                </div>

                {/* Tier badge */}
                <div className="hidden md:flex items-center">
                  <TierBadge tier={customer.loyaltyTier} />
                </div>

                {/* Points balance */}
                <div className="hidden md:flex items-center justify-end">
                  <span className="text-sm font-semibold text-zinc-100 tabular-nums flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-yellow-500" />
                    {(customer.loyaltyPoints ?? 0).toLocaleString()}
                  </span>
                </div>

                {/* Joined date */}
                <div className="hidden md:flex items-center justify-end">
                  <span className="text-xs text-zinc-500">
                    {dayjs(customer.createdAt).format('DD MMM YY')}
                  </span>
                </div>

                {/* Chevron hint */}
                <div className="flex items-center justify-end ml-auto md:ml-0">
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Add / Edit customer slide-over sheet ───────────────────── */}
      <Sheet open={formSheetOpen} onOpenChange={setFormSheetOpen}>
        <CustomerFormSheet
          editingCustomer={editingCustomer}
          onClose={() => setFormSheetOpen(false)}
          onSaved={() => {
            setFormSheetOpen(false);
            toast.success(editingCustomer ? 'Customer updated' : 'Customer added');
            fetchCustomers(searchQuery);
          }}
        />
      </Sheet>

      {/* ── Customer detail slide-over sheet ───────────────────────── */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <CustomerDetailSheet
          customer={selectedCustomer}
          canManage={canManage}
          onClose={() => setDetailSheetOpen(false)}
          onEdit={openEditFromDetail}
          onDeactivate={() => setConfirmDeactivate(true)}
          onPointsAction={(mode) => setPointsActionMode(mode)}
          onRefresh={() => fetchCustomers(searchQuery)}
        />
      </Sheet>

      {/* ── Points action modal (Award Bonus / Adjust) ─────────────── */}
      <AnimatePresence>
        {pointsActionMode && selectedCustomer && (
          <PointsActionModal
            customerId={selectedCustomer.id}
            mode={pointsActionMode}
            onClose={() => setPointsActionMode(null)}
            onSaved={handlePointsActionSaved}
          />
        )}
      </AnimatePresence>

      {/* ── Deactivate confirmation modal ──────────────────────────── */}
      <AnimatePresence>
        {confirmDeactivate && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setConfirmDeactivate(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <h3 className="text-base font-semibold text-zinc-100 mb-2">Deactivate Customer?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                <span className="font-medium text-zinc-200">{selectedCustomer.name}</span> will
                be hidden from new sales. Their history and loyalty points are preserved.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmDeactivate(false)}
                  className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className="flex-1 py-2.5 bg-danger/80 hover:bg-danger disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {deactivating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Deactivating...</>
                    : 'Deactivate'
                  }
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
