import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { settingsApi, categoriesApi, billingApi } from '../api/client';
import { Save, Plus, Edit2, Trash2, X, CreditCard, Zap, Loader2, Check, Bell, Tag, Settings as SettingsIcon } from 'lucide-react';
import { toast, Toggle } from '../components/ui';

const TABS = [
  { id: 'general',       label: 'General',       icon: SettingsIcon },
  { id: 'categories',    label: 'Categories',     icon: Tag },
  { id: 'billing',       label: 'Billing',        icon: CreditCard, ownerOnly: true },
  { id: 'notifications', label: 'Notifications',  icon: Bell, ownerOnly: true },
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
  const { subscription, plan, isTrialing, trialDaysLeft, openUpgradeModal } = useSubscription();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(0);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [prevTab, setPrevTab] = useState('general');
  const [notifPrefs, setNotifPrefs] = useState({ dailySummary: false, lowStockAlerts: true, weeklyReport: false, trialReminders: true });
  const [savingNotif, setSavingNotif] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const [formData, setFormData] = useState({ name: '', currencySymbol: '', taxRate: '', lowStockThreshold: '', address: '', phone: '' });
  const isOwner = hasMinRole('OWNER');

  const visibleTabs = TABS.filter(t => !t.ownerOnly || isOwner);
  const tabIndex = (id) => visibleTabs.findIndex(t => t.id === id);
  const direction = tabIndex(activeTab) > tabIndex(prevTab) ? 1 : -1;

  const changeTab = (id) => { setPrevTab(activeTab); setActiveTab(id); };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'notifications' && isOwner) {
      settingsApi.getNotificationPrefs().then(r => setNotifPrefs(r.data.data)).catch(() => {});
    }
  }, [activeTab, isOwner]);

  const fetchData = async () => {
    try {
      const [sr, cr] = await Promise.all([settingsApi.get(), categoriesApi.getAll()]);
      const d = sr.data.data;
      setSettings(d);
      setFormData({ name: d.name, currencySymbol: d.currencySymbol, taxRate: (d.taxRate * 100).toString(), lowStockThreshold: d.lowStockThreshold.toString(), address: d.address || '', phone: d.phone || '' });
      setCategories(cr.data.data);
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Currency symbol</label>
                      <input type="text" value={formData.currencySymbol} onChange={e => setFormData(p => ({ ...p, currencySymbol: e.target.value }))} placeholder="$" maxLength={5} className={inputClass} disabled={!isOwner} />
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
