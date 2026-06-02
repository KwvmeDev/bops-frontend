import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { settingsApi, categoriesApi, billingApi, accountingApi } from '../api/client';
import { Save, Plus, Edit2, Trash2, X, CreditCard, Zap, Loader2, Bell, Tag, Settings as SettingsIcon, MapPin, FlaskConical, Star, FileSpreadsheet, Download, History } from 'lucide-react';
import { toast, Toggle } from '../components/ui';
import { locationsApi } from '../api/client';
import useLocation from '../hooks/useLocation';
import LocationsEmptyState from '../components/onboarding/LocationsEmptyState';
import LocationAddedNudge from '../components/onboarding/LocationAddedNudge';
import { CURRENCIES, getCurrencyBySymbol, getCurrencyByCode } from '../lib/currencies';

const TABS = [
  { id: 'general',       label: 'General',       icon: SettingsIcon },
  { id: 'categories',    label: 'Categories',     icon: Tag },
  { id: 'locations',     label: 'Locations',      icon: MapPin,          ownerOnly: true },
  { id: 'billing',       label: 'Billing',        icon: CreditCard,      ownerOnly: true },
  { id: 'notifications', label: 'Notifications',  icon: Bell,            ownerOnly: true },
  { id: 'pharmacy',      label: 'Pharmacy',       icon: FlaskConical,    ownerOnly: true },
  { id: 'loyalty',       label: 'Loyalty',        icon: Star,            ownerOnly: true },
  { id: 'accounting',    label: 'Accounting',     icon: FileSpreadsheet, ownerOnly: true },
];

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-surface-subtle border border-surface-muted/50 rounded-2xl p-1 mb-6 flex-wrap">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors z-10 ${
              active === tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {active === tab.id && (
              <motion.div layoutId="settings-tab" className="absolute inset-0 bg-surface-muted rounded-xl" transition={{ type: 'spring', damping: 22, stiffness: 280 }} />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const inputClass = "w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

export default function Settings() {
  const { tenant, updateTenant, hasMinRole } = useAuth();
  const { subscription, plan, isTrialing, trialDaysLeft, openUpgradeModal, refresh: refreshSubscription } = useSubscription();
  // useLocation is imported for context compliance; localLocations is used for
  // the Locations tab since it needs to refresh after a new location is created.
  useLocation();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(0);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return TABS.some(t => t.id === tab) ? tab : 'general';
  });
  const [prevTab, setPrevTab] = useState('general');
  const [notifPrefs, setNotifPrefs] = useState({ dailySummary: false, lowStockAlerts: true, weeklyReport: false, trialReminders: true });
  const [savingNotif, setSavingNotif] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  // Locations tab state — maintained locally so we can update after a create
  const [localLocations, setLocalLocations] = useState([]);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', phone: '' });
  const [savingLocation, setSavingLocation] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  // Pharmacy settings state — mirrors the Tenant.pharmacyMode and related fields
  const [pharmacyForm, setPharmacyForm] = useState({
    pharmacyMode: false,
    expiryAlertDays: 90,
    printBatchOnReceipt: false,
    printExpiryOnReceipt: false,
  });
  const [savingPharmacy, setSavingPharmacy] = useState(false);

  // Loyalty settings state — mirrors tenant loyalty config fields
  const [loyaltyForm, setLoyaltyForm] = useState({
    loyaltyEnabled: false,
    pointsPerUnit: 1,
    pointsValue: 0.01,
    pointsExpireAfterDays: 365,
  });
  // null means "never expire" — this local flag drives the UI toggle
  const [loyaltyNeverExpire, setLoyaltyNeverExpire] = useState(false);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  // Accounting export settings state — Xero + QuickBooks account code config
  const [accountingForm, setAccountingForm] = useState({
    xeroSalesCode: '200',
    xeroCashCode: '610',
    xeroCardCode: '611',
    xeroTaxCode: 'TAX001',
    qbSalesAccount: 'Sales Income',
    qbCashAccount: 'Checking',
  });
  const [savingAccounting, setSavingAccounting] = useState(false);
  // Date range for export — defaults to today for both from/to
  const today = new Date().toISOString().slice(0, 10);
  const [exportFrom, setExportFrom] = useState(today);
  const [exportTo, setExportTo] = useState(today);
  const [exportingXero, setExportingXero] = useState(false);
  const [exportingQb, setExportingQb] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // `currency` holds the ISO code (e.g. "USD") for the dropdown; `currencySymbol`
  // holds the derived symbol (e.g. "$") that actually gets saved to the DB.
  const [formData, setFormData] = useState({ name: '', currency: 'USD', currencySymbol: '$', taxRate: '', lowStockThreshold: '', address: '', phone: '' });
  const isOwner = hasMinRole('OWNER');

  const visibleTabs = TABS.filter(t => !t.ownerOnly || isOwner);
  const tabIndex = (id) => visibleTabs.findIndex(t => t.id === id);
  const direction = tabIndex(activeTab) > tabIndex(prevTab) ? 1 : -1;

  const changeTab = (id) => { setPrevTab(activeTab); setActiveTab(id); };

  useEffect(() => {
    fetchData();
    // Load locations for the Locations tab independently of the main settings fetch
    locationsApi.getAll().then(r => setLocalLocations(r.data?.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications' && isOwner) {
      settingsApi.getNotificationPrefs().then(r => setNotifPrefs(r.data.data)).catch(() => {});
    }
  }, [activeTab, isOwner]);

  // Detect Paystack checkout redirect: /settings?tab=billing&checkout=success&reference=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;

    // Clean up URL immediately so a page refresh doesn't re-trigger verification
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('checkout');
    cleanUrl.searchParams.delete('reference');
    cleanUrl.searchParams.delete('trxref');
    window.history.replaceState({}, '', cleanUrl.toString());

    billingApi.verifyCheckout(reference)
      .then(() => {
        toast.success('Subscription activated! Your plan has been upgraded.');
        refreshSubscription();
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Payment received but sync failed — please refresh or contact support.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load export history when accounting tab becomes active
  useEffect(() => {
    if (activeTab === 'accounting' && isOwner) {
      setLoadingHistory(true);
      accountingApi.getHistory()
        .then(r => setExportHistory(r.data?.data ?? []))
        .catch(() => setExportHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, isOwner]);

  const fetchData = async () => {
    try {
      const [sr, cr] = await Promise.all([settingsApi.get(), categoriesApi.getAll()]);
      const d = sr.data.data;
      setSettings(d);
      const currencyEntry = getCurrencyBySymbol(d.currencySymbol ?? '$');
      setFormData({
        name: d.name,
        currency: currencyEntry.code,
        currencySymbol: currencyEntry.symbol,
        taxRate: (d.taxRate * 100).toString(),
        lowStockThreshold: d.lowStockThreshold.toString(),
        address: d.address || '',
        phone: d.phone || '',
      });
      setCategories(cr.data.data);
      // Seed pharmacy fields from fetched tenant data
      setPharmacyForm({
        pharmacyMode:          !!d.pharmacyMode,
        expiryAlertDays:       d.expiryAlertDays ?? 90,
        printBatchOnReceipt:   !!d.printBatchOnReceipt,
        printExpiryOnReceipt:  !!d.printExpiryOnReceipt,
      });
      // Seed loyalty fields from fetched tenant data
      const neverExpire = d.pointsExpireAfterDays === null || d.pointsExpireAfterDays === undefined;
      setLoyaltyNeverExpire(neverExpire);
      setLoyaltyForm({
        loyaltyEnabled:         !!d.loyaltyEnabled,
        pointsPerUnit:          d.pointsPerUnit ?? 1,
        pointsValue:            d.pointsValue ?? 0.01,
        pointsExpireAfterDays:  neverExpire ? 365 : (d.pointsExpireAfterDays ?? 365),
      });
      // Seed accounting fields from fetched tenant data
      setAccountingForm({
        xeroSalesCode:   d.xeroSalesCode   ?? '200',
        xeroCashCode:    d.xeroCashCode    ?? '610',
        xeroCardCode:    d.xeroCardCode    ?? '611',
        xeroTaxCode:     d.xeroTaxCode     ?? 'TAX001',
        qbSalesAccount:  d.qbSalesAccount  ?? 'Sales Income',
        qbCashAccount:   d.qbCashAccount   ?? 'Checking',
      });
    } catch {}
    setLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.update({
        name: formData.name, currencySymbol: formData.currencySymbol,
        taxRate: parseFloat(formData.taxRate) / 100, lowStockThreshold: parseInt(formData.lowStockThreshold, 10),
        address: formData.address || null, phone: formData.phone || null
      });
      updateTenant(res.data.data);
      setSettings(res.data.data);
      setSavedKey(k => k + 1);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePharmacy = async () => {
    setSavingPharmacy(true);
    try {
      const res = await settingsApi.update({
        pharmacyMode:         pharmacyForm.pharmacyMode,
        expiryAlertDays:      parseInt(pharmacyForm.expiryAlertDays, 10) || 90,
        printBatchOnReceipt:  pharmacyForm.printBatchOnReceipt,
        printExpiryOnReceipt: pharmacyForm.printExpiryOnReceipt,
      });
      updateTenant(res.data.data);
      setSettings(res.data.data);
      toast.success('Pharmacy settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save pharmacy settings');
    } finally {
      setSavingPharmacy(false);
    }
  };

  const handleSaveLoyalty = async () => {
    setSavingLoyalty(true);
    try {
      const payload = {
        loyaltyEnabled:        loyaltyForm.loyaltyEnabled,
        pointsPerUnit:         parseFloat(loyaltyForm.pointsPerUnit) || 1,
        pointsValue:           parseFloat(loyaltyForm.pointsValue) || 0.01,
        // null signals "never expire"; otherwise send the integer day count
        pointsExpireAfterDays: loyaltyNeverExpire ? null : (parseInt(loyaltyForm.pointsExpireAfterDays, 10) || 365),
      };
      const res = await settingsApi.update(payload);
      updateTenant(res.data.data);
      setSettings(res.data.data);
      toast.success('Loyalty settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save loyalty settings');
    } finally {
      setSavingLoyalty(false);
    }
  };

  const handleSaveAccounting = async () => {
    setSavingAccounting(true);
    try {
      const res = await settingsApi.update({
        xeroSalesCode:  accountingForm.xeroSalesCode  || '200',
        xeroCashCode:   accountingForm.xeroCashCode   || '610',
        xeroCardCode:   accountingForm.xeroCardCode   || '611',
        xeroTaxCode:    accountingForm.xeroTaxCode    || 'TAX001',
        qbSalesAccount: accountingForm.qbSalesAccount || 'Sales Income',
        qbCashAccount:  accountingForm.qbCashAccount  || 'Checking',
      });
      updateTenant(res.data.data);
      setSettings(res.data.data);
      toast.success('Accounting settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save accounting settings');
    } finally {
      setSavingAccounting(false);
    }
  };

  // Trigger a blob download from an API response; filename is derived from the export type
  const triggerBlobDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportXero = async () => {
    if (!exportFrom || !exportTo) { toast.error('Please select a date range'); return; }
    setExportingXero(true);
    try {
      const res = await accountingApi.exportXero({ from: exportFrom, to: exportTo });
      triggerBlobDownload(res.data, `xero-export-${exportFrom}-${exportTo}.csv`);
      toast.success('Xero CSV downloaded');
      // Refresh history after successful export
      accountingApi.getHistory().then(r => setExportHistory(r.data?.data ?? [])).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to export Xero data');
    } finally {
      setExportingXero(false);
    }
  };

  const handleExportQuickbooks = async () => {
    if (!exportFrom || !exportTo) { toast.error('Please select a date range'); return; }
    setExportingQb(true);
    try {
      const res = await accountingApi.exportQuickbooks({ from: exportFrom, to: exportTo });
      triggerBlobDownload(res.data, `quickbooks-export-${exportFrom}-${exportTo}.iif`);
      toast.success('QuickBooks IIF downloaded');
      // Refresh history after successful export
      accountingApi.getHistory().then(r => setExportHistory(r.data?.data ?? [])).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to export QuickBooks data');
    } finally {
      setExportingQb(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSavingLocation(true);
    try {
      await locationsApi.create({
        name: locationForm.name,
        address: locationForm.address || null,
        phone: locationForm.phone || null,
      });
      setLocationForm({ name: '', address: '', phone: '' });
      toast.success('Location created');
      // Show the one-time multi-location nudge if it hasn't been seen yet
      if (!localStorage.getItem('klevr_ob_location_added')) {
        setShowNudge(true);
      }
      // Refresh the inline list — LocationContext doesn't expose a manual
      // refetch, so we re-fetch directly and update local state.
      const res = await locationsApi.getAll();
      setLocalLocations(res.data?.data ?? []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create location');
    } finally {
      setSavingLocation(false);
    }
  };

  const saveNotifPrefs = async () => {
    setSavingNotif(true);
    try {
      await settingsApi.updateNotificationPrefs(notifPrefs);
      toast.success('Preferences saved');
    } catch { toast.error('Failed to save preferences'); }
    finally { setSavingNotif(false); }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      if (editingCategory) await categoriesApi.update(editingCategory.id, { name: categoryName });
      else await categoriesApi.create({ name: categoryName });
      await fetchData();
      setShowCategoryModal(false);
      toast.success(editingCategory ? 'Category updated' : 'Category created');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save category'); }
    finally { setSavingCategory(false); }
  };

  const handleDeleteCategory = async (cat) => {
    try {
      await categoriesApi.delete(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast.success(`"${cat.name}" deleted`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete category'); }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    setCancelLoading(true);
    try {
      await billingApi.cancelSubscription();
      toast.success('Subscription cancelled. Access until end of billing period.');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to cancel subscription'); }
    finally { setCancelLoading(false); }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Manage your shop configuration</p>
      </motion.div>

      <TabBar tabs={visibleTabs} active={activeTab} onChange={changeTab} />

      <div className="overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* General */}
            {activeTab === 'general' && (
              <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-muted/50">
                  <h2 className="text-sm font-semibold text-zinc-200">Shop Information</h2>
                </div>
                <form onSubmit={handleSaveSettings} className="p-5 space-y-4">
                  <div>
                    <label className={labelClass}>Shop name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClass} disabled={!isOwner} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Currency</label>
                      <select
                        value={formData.currency}
                        onChange={e => {
                          const entry = getCurrencyByCode(e.target.value);
                          setFormData(p => ({ ...p, currency: entry.code, currencySymbol: entry.symbol }));
                        }}
                        className={inputClass}
                        disabled={!isOwner}
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code}) — {c.symbol}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Tax rate (%)</label>
                      <input type="number" min="0" max="100" step="0.1" value={formData.taxRate} onChange={e => setFormData(p => ({ ...p, taxRate: e.target.value }))} placeholder="0" className={inputClass} disabled={!isOwner} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Low stock alert threshold</label>
                    <input type="number" min="0" value={formData.lowStockThreshold} onChange={e => setFormData(p => ({ ...p, lowStockThreshold: e.target.value }))} className={inputClass} disabled={!isOwner} />
                    <p className="text-xs text-zinc-600 mt-1">Products at or below this quantity trigger an alert</p>
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="123 Main Street" className={inputClass} disabled={!isOwner} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone number</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+1234567890" className={inputClass} disabled={!isOwner} />
                  </div>
                  {isOwner && (
                    <div className="pt-2">
                      <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                        <AnimatePresence mode="wait">
                          {saving ? (
                            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </motion.span>
                          ) : (
                            <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                              <Save className="w-4 h-4" /> Save Changes
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  )}
                  {!isOwner && <p className="text-xs text-zinc-600 italic">Only the shop owner can modify these settings.</p>}
                </form>
              </div>
            )}

            {/* Categories */}
            {activeTab === 'categories' && (
              <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-200">Product Categories</h2>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => { setEditingCategory(null); setCategoryName(''); setShowCategoryModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 hover:bg-brand/15 border border-brand/20 text-brand-light text-xs font-medium rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </motion.button>
                </div>
                <div className="divide-y divide-surface-muted/40">
                  {categories.length === 0 ? (
                    <div className="py-10 text-center">
                      <Tag className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                      <p className="text-sm text-zinc-600">No categories yet</p>
                    </div>
                  ) : categories.map(cat => (
                    <motion.div key={cat.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="px-5 py-3.5 flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{cat.name}</p>
                        <p className="text-xs text-zinc-600">{cat._count?.products || 0} products</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); setShowCategoryModal(true); }}
                          className="p-1.5 text-zinc-500 hover:text-brand-light hover:bg-brand/10 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-zinc-500 hover:text-danger-light hover:bg-danger/10 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Locations */}
            {activeTab === 'locations' && isOwner && (
              <div>
                {/* Empty state — only shown while the tenant has a single default location */}
                {localLocations.length <= 1 && <LocationsEmptyState />}

                {/* Existing locations list */}
                {localLocations.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {localLocations.map(loc => (
                      <div
                        key={loc.id}
                        className="flex items-center justify-between bg-surface-subtle border border-surface-muted/50 rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{loc.name}</p>
                          {loc.address && <p className="text-xs text-zinc-500 mt-0.5">{loc.address}</p>}
                        </div>
                        {loc.isDefault && (
                          <span className="text-xs text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add location form */}
                <form
                  id="add-location-form"
                  onSubmit={handleCreateLocation}
                  className="bg-surface-subtle border border-surface-muted/50 rounded-xl p-4 space-y-3"
                >
                  <h3 className="text-sm font-medium text-zinc-300">Add a New Branch</h3>
                  <input
                    type="text"
                    value={locationForm.name}
                    onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Branch name"
                    required
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={locationForm.address}
                    onChange={e => setLocationForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Address (optional)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={locationForm.phone}
                    onChange={e => setLocationForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={savingLocation}
                    className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingLocation
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Plus className="w-4 h-4" />
                    }
                    Add Branch
                  </button>
                </form>

                {/* One-time multi-location nudge modal */}
                {showNudge && (
                  <LocationAddedNudge onDismiss={() => setShowNudge(false)} />
                )}
              </div>
            )}

            {/* Billing */}
            {activeTab === 'billing' && isOwner && (
              <div className="space-y-4">
                <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-sm font-semibold text-zinc-200">Current Plan</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-zinc-100">{plan?.displayName || 'Free Trial'}</p>
                        <p className="text-sm text-zinc-500 mt-0.5">{plan?.priceMonthly > 0 ? `$${plan.priceMonthly}/month` : 'Free'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        subscription?.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                        subscription?.status === 'TRIALING' ? 'bg-brand/10 text-brand-light' :
                        subscription?.status === 'PAST_DUE' ? 'bg-warning/10 text-warning' :
                        'bg-danger/10 text-danger-light'
                      }`}>
                        {subscription?.status === 'TRIALING' ? 'Free Trial' : subscription?.status === 'ACTIVE' ? 'Active' : subscription?.status === 'PAST_DUE' ? 'Past Due' : subscription?.status || 'Unknown'}
                      </span>
                    </div>
                    {isTrialing && (
                      <div className="bg-brand/5 border border-brand/20 rounded-xl p-3">
                        <p className="text-sm font-medium text-brand-light">
                          {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining in your trial` : 'Your trial expires today'}
                        </p>
                        {subscription?.trialEndsAt && (
                          <p className="text-xs text-zinc-500 mt-0.5">Ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    )}
                    {subscription?.currentPeriodEnd && !isTrialing && (
                      <p className="text-sm text-zinc-500">Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 space-y-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={openUpgradeModal}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors">
                    <Zap className="w-4 h-4" /> Upgrade Plan
                  </motion.button>
                  {subscription?.status === 'ACTIVE' && (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleCancelSubscription} disabled={cancelLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-danger/5 hover:bg-danger/10 text-danger-light text-sm font-medium rounded-xl transition-colors border border-danger/20 disabled:opacity-60">
                      {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Cancel Subscription
                    </motion.button>
                  )}
                  <p className="text-xs text-zinc-600 text-center">Billing managed securely via Paystack</p>
                </div>

                {plan && (
                  <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-surface-muted/50">
                      <h2 className="text-sm font-semibold text-zinc-400">Plan Limits</h2>
                    </div>
                    <div className="p-5 space-y-2.5">
                      {[
                        { label: 'Max Staff', value: plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers },
                        { label: 'Max Products', value: plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts },
                        { label: 'Sales Reports', value: plan.hasReports ? '✓' : '✗' },
                        { label: 'Profit Reports', value: plan.hasProfitReports ? '✓' : '✗' },
                        { label: 'Data Export', value: plan.hasDataExport ? '✓' : '✗' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">{label}</span>
                          <span className="font-medium text-zinc-200">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pharmacy */}
            {activeTab === 'pharmacy' && isOwner && (
              <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-semibold text-zinc-200">Pharmacy Settings</h2>
                </div>
                <div className="p-5 space-y-5">
                  {/* Enable pharmacy mode */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Enable Pharmacy Mode</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Activates batch tracking, expiry management, and prescription features for all products.
                      </p>
                    </div>
                    <Toggle
                      checked={pharmacyForm.pharmacyMode}
                      onChange={v => setPharmacyForm(p => ({ ...p, pharmacyMode: v }))}
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Fields visible only when pharmacy mode is on (or being enabled) */}
                  <AnimatePresence>
                    {pharmacyForm.pharmacyMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-5 pt-1">
                          {/* Expiry alert threshold */}
                          <div>
                            <label className={labelClass}>Expiry alert threshold (days)</label>
                            <input
                              type="number"
                              min="1"
                              value={pharmacyForm.expiryAlertDays}
                              onChange={e => setPharmacyForm(p => ({ ...p, expiryAlertDays: e.target.value }))}
                              className={inputClass}
                              style={{ maxWidth: '160px' }}
                            />
                            <p className="text-xs text-zinc-600 mt-1">
                              Warn about batches expiring within this many days (default: 90).
                            </p>
                          </div>

                          {/* Receipt printing toggles */}
                          <div className="space-y-3 pt-1">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Receipt Options</p>
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-zinc-200">Print batch number on receipts</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Include the batch/lot number on each sold item line.</p>
                              </div>
                              <Toggle
                                checked={pharmacyForm.printBatchOnReceipt}
                                onChange={v => setPharmacyForm(p => ({ ...p, printBatchOnReceipt: v }))}
                                className="flex-shrink-0"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-zinc-200">Print expiry date on receipts</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Include the expiry date on each sold item line.</p>
                              </div>
                              <Toggle
                                checked={pharmacyForm.printExpiryOnReceipt}
                                onChange={v => setPharmacyForm(p => ({ ...p, printExpiryOnReceipt: v }))}
                                className="flex-shrink-0"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSavePharmacy}
                      disabled={savingPharmacy}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      {savingPharmacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Pharmacy Settings
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && isOwner && (
              <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-muted/50">
                  <h2 className="text-sm font-semibold text-zinc-200">Email Notifications</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Choose which emails you receive</p>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { key: 'dailySummary', label: 'Daily sales summary', desc: 'A daily email with your sales KPIs at 11pm' },
                    { key: 'lowStockAlerts', label: 'Low stock alerts', desc: 'Notifications when products fall below their threshold' },
                    { key: 'weeklyReport', label: 'Weekly report', desc: 'A weekly summary of your store performance' },
                    { key: 'trialReminders', label: 'Trial & billing reminders', desc: 'Important emails about your subscription status' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                      </div>
                      <Toggle
                        checked={notifPrefs[key]}
                        onChange={v => setNotifPrefs(p => ({ ...p, [key]: v }))}
                        className="flex-shrink-0"
                      />
                    </div>
                  ))}
                  <div className="pt-2">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={saveNotifPrefs} disabled={savingNotif}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                      {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Preferences
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Loyalty */}
            {activeTab === 'loyalty' && isOwner && (
              <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                  <Star className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-sm font-semibold text-zinc-200">Loyalty Program</h2>
                </div>
                <div className="p-5 space-y-5">
                  {/* Master toggle — enable/disable loyalty for the whole tenant */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Enable Loyalty Program</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Customers earn points on every sale and can redeem them for discounts at checkout.
                      </p>
                    </div>
                    <Toggle
                      checked={loyaltyForm.loyaltyEnabled}
                      onChange={v => setLoyaltyForm(p => ({ ...p, loyaltyEnabled: v }))}
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Additional fields — only shown when loyalty is enabled */}
                  <AnimatePresence>
                    {loyaltyForm.loyaltyEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pt-1">
                          {/* Points earn rate */}
                          <div>
                            <label className={labelClass}>Points earned per {tenant?.currencySymbol || 'GH₵'}1 spent</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={loyaltyForm.pointsPerUnit}
                              onChange={e => setLoyaltyForm(p => ({ ...p, pointsPerUnit: e.target.value }))}
                              className={inputClass}
                              style={{ maxWidth: '160px' }}
                            />
                            <p className="text-xs text-zinc-600 mt-1">
                              e.g. 1 = one point per {tenant?.currencySymbol || 'GH₵'}1 spent. Use 0.5 for one point per {tenant?.currencySymbol || 'GH₵'}2.
                            </p>
                          </div>

                          {/* Point redemption value */}
                          <div>
                            <label className={labelClass}>Value per point when redeemed ({tenant?.currencySymbol || 'GH₵'})</label>
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={loyaltyForm.pointsValue}
                              onChange={e => setLoyaltyForm(p => ({ ...p, pointsValue: e.target.value }))}
                              className={inputClass}
                              style={{ maxWidth: '160px' }}
                            />
                            <p className="text-xs text-zinc-600 mt-1">
                              e.g. 0.01 = 100 points = {tenant?.currencySymbol || 'GH₵'}1 discount.
                            </p>
                          </div>

                          {/* Points expiry */}
                          <div>
                            <label className={labelClass}>Points expiry</label>
                            <div className="flex items-center gap-3 mb-2">
                              <Toggle
                                checked={loyaltyNeverExpire}
                                onChange={v => setLoyaltyNeverExpire(v)}
                                className="flex-shrink-0"
                              />
                              <span className="text-sm text-zinc-400">Never expire</span>
                            </div>
                            {!loyaltyNeverExpire && (
                              <div>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={loyaltyForm.pointsExpireAfterDays}
                                  onChange={e => setLoyaltyForm(p => ({ ...p, pointsExpireAfterDays: e.target.value }))}
                                  className={inputClass}
                                  style={{ maxWidth: '160px' }}
                                />
                                <p className="text-xs text-zinc-600 mt-1">
                                  Points expire this many days after they were earned (e.g. 365 = 1 year).
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSaveLoyalty}
                      disabled={savingLoyalty}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      {savingLoyalty ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Loyalty Settings
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Accounting */}
            {activeTab === 'accounting' && isOwner && (
              <div className="space-y-4">
                {/* Account code configuration card */}
                <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-sm font-semibold text-zinc-200">Xero Export Settings</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-zinc-500">
                      Map your sales to Xero chart of accounts. These codes must match your Xero account setup.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Sales account code</label>
                        <input
                          type="text"
                          value={accountingForm.xeroSalesCode}
                          onChange={e => setAccountingForm(p => ({ ...p, xeroSalesCode: e.target.value }))}
                          placeholder="200"
                          className={inputClass}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Default: 200 (Sales)</p>
                      </div>
                      <div>
                        <label className={labelClass}>Cash account code</label>
                        <input
                          type="text"
                          value={accountingForm.xeroCashCode}
                          onChange={e => setAccountingForm(p => ({ ...p, xeroCashCode: e.target.value }))}
                          placeholder="610"
                          className={inputClass}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Default: 610 (Cash on Hand)</p>
                      </div>
                      <div>
                        <label className={labelClass}>Card account code</label>
                        <input
                          type="text"
                          value={accountingForm.xeroCardCode}
                          onChange={e => setAccountingForm(p => ({ ...p, xeroCardCode: e.target.value }))}
                          placeholder="611"
                          className={inputClass}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Default: 611 (Card Receipts)</p>
                      </div>
                      <div>
                        <label className={labelClass}>Tax code</label>
                        <input
                          type="text"
                          value={accountingForm.xeroTaxCode}
                          onChange={e => setAccountingForm(p => ({ ...p, xeroTaxCode: e.target.value }))}
                          placeholder="TAX001"
                          className={inputClass}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Default: TAX001</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-sm font-semibold text-zinc-200">QuickBooks Export Settings</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-zinc-500">
                      Map your sales to QuickBooks accounts. These names must match your QuickBooks chart of accounts exactly.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Sales account</label>
                        <input
                          type="text"
                          value={accountingForm.qbSalesAccount}
                          onChange={e => setAccountingForm(p => ({ ...p, qbSalesAccount: e.target.value }))}
                          placeholder="Sales Income"
                          className={inputClass}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Default: Sales Income</p>
                      </div>
                      <div>
                        <label className={labelClass}>Cash account</label>
                        <input
                          type="text"
                          value={accountingForm.qbCashAccount}
                          onChange={e => setAccountingForm(p => ({ ...p, qbCashAccount: e.target.value }))}
                          placeholder="Checking"
                          className={inputClass}
                        />
                        <p className="text-xs text-zinc-600 mt-1">Default: Checking</p>
                      </div>
                    </div>
                    <div className="pt-1">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSaveAccounting}
                        disabled={savingAccounting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        {savingAccounting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Accounting Settings
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Export data section */}
                <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                    <Download className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-sm font-semibold text-zinc-200">Export Data</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-zinc-500">
                      Select a date range then download a file ready to import into your accounting software.
                    </p>
                    {/* Date range pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>From</label>
                        <input
                          type="date"
                          value={exportFrom}
                          onChange={e => setExportFrom(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>To</label>
                        <input
                          type="date"
                          value={exportTo}
                          onChange={e => setExportTo(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    {/* Export buttons */}
                    <div className="flex flex-wrap gap-3 pt-1">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleExportXero}
                        disabled={exportingXero}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        {exportingXero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export to Xero (CSV)
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleExportQuickbooks}
                        disabled={exportingQb}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface-muted hover:bg-surface-overlay border border-surface-overlay/50 disabled:opacity-60 text-zinc-200 text-sm font-medium rounded-xl transition-colors"
                      >
                        {exportingQb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export to QuickBooks (IIF)
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Export history table */}
                <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center gap-2">
                    <History className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-sm font-semibold text-zinc-200">Export History</h2>
                  </div>
                  <div className="divide-y divide-surface-muted/40">
                    {loadingHistory ? (
                      <div className="py-8 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                      </div>
                    ) : exportHistory.length === 0 ? (
                      <div className="py-10 text-center">
                        <History className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                        <p className="text-sm text-zinc-600">No exports yet</p>
                      </div>
                    ) : exportHistory.map((entry, i) => (
                      <div key={entry.id ?? i} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-200 capitalize">{entry.format || entry.type || 'Export'}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {entry.fromDate && entry.toDate
                              ? `${entry.fromDate} – ${entry.toDate}`
                              : entry.dateRange || ''}
                            {entry.exportedBy ? ` · ${entry.exportedBy}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-600 flex-shrink-0">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setShowCategoryModal(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <button onClick={() => setShowCategoryModal(false)} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveCategory} className="p-5">
                <label className={labelClass}>Category name</label>
                <input type="text" required value={categoryName} onChange={e => setCategoryName(e.target.value)} className={`${inputClass} mb-4`} placeholder="e.g. Beverages" autoFocus />
                <div className="flex gap-3">
                  <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setShowCategoryModal(false)}
                    className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors">Cancel</motion.button>
                  <motion.button type="submit" disabled={savingCategory} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
                    {savingCategory ? 'Saving...' : 'Save'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
