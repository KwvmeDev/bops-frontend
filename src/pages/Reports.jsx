import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { reportsApi, expensesApi, controlledSubstancesApi } from '../api/client';
import useLocation from '../hooks/useLocation';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { useReactToPrint } from 'react-to-print';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  AlertTriangle, Calendar, Printer, TrendingUp, DollarSign, ShoppingBag,
  Plus, Upload, X
} from 'lucide-react';
import { Skeleton, SkeletonStatCard, Sheet, Button } from '../components/ui';
import Badge from '../components/ui/Badge';
import { useOffline } from '../hooks/useOffline';
import dayjs from 'dayjs';

// Tabs — Cash Drawer and Expenses tabs added; both require at least MANAGER.
// CS Register is pharmacy-only (gated at render time by tenant.pharmacyMode) and OWNER-only.
const TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'profit', label: 'Profit', minRole: 'OWNER' },
  { id: 'cash-drawer', label: 'Cash Drawer', minRole: 'MANAGER' },
  { id: 'expenses', label: 'Expenses', minRole: 'MANAGER' },
  { id: 'monthly', label: 'Monthly', minRole: 'MANAGER' },
  { id: 'trends', label: 'Trends', minRole: 'MANAGER' },
  { id: 'cashier', label: 'Cashier', minRole: 'MANAGER' },
  { id: 'inventory-velocity', label: 'Inventory', minRole: 'MANAGER' },
  { id: 'pnl', label: 'P&L', minRole: 'OWNER' },
  { id: 'cs-register', label: 'CS Register', minRole: 'OWNER' },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  useEffect(() => { spring.set(value); }, [value]);
  const display = useTransform(spring, v => `${prefix}${v.toFixed(2)}${suffix}`);
  return <motion.span>{display}</motion.span>;
}

function StatBox({ label, value, prefix = '', icon: Icon, iconColor, iconBg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-subtle border border-surface-muted/50 rounded-xl p-4 flex items-center gap-4"
    >
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-bold text-zinc-100">
          <AnimatedNumber value={Number(value || 0)} prefix={prefix} />
        </p>
      </div>
    </motion.div>
  );
}

const chartTheme = {
  cartesianGrid: { strokeDasharray: '3 3', stroke: '#27272a' },
  xAxis: { tick: { fill: '#71717a', fontSize: 11 }, axisLine: { stroke: '#27272a' }, tickLine: false },
  yAxis: { tick: { fill: '#71717a', fontSize: 11 }, axisLine: false, tickLine: false },
  tooltip: {
    contentStyle: { backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8 },
    labelStyle: { color: '#a1a1aa' },
    itemStyle: { color: '#e4e4e7' },
  },
};

export default function Reports() {
  const { isOffline } = useOffline();
  const { tenant, hasMinRole, currencySymbol } = useAuth();
  const { canAccess } = useSubscription();
  const { locations, isMultiLocation } = useLocation();
  const [activeTab, setActiveTab] = useState('daily');
  const [prevTab, setPrevTab] = useState('daily');
  const [dateFrom, setDateFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef();

  const handlePrint = useReactToPrint({ contentRef: reportRef, documentTitle: `Report-${activeTab}-${dateFrom}-to-${dateTo}` });

  const tabIndex = (id) => TABS.filter(t => !t.minRole || hasMinRole(t.minRole)).findIndex(t => t.id === id);
  const direction = tabIndex(activeTab) > tabIndex(prevTab) ? 1 : -1;

  const changeTab = (id) => { setPrevTab(activeTab); setActiveTab(id); setReport(null); };

  useEffect(() => {
    // Cash Drawer, Expenses, Monthly, Trends, Cashier, Inventory, P&L, and CS Register tabs manage their own data fetching internally
    if (
      activeTab === 'cash-drawer' ||
      activeTab === 'expenses' ||
      activeTab === 'monthly' ||
      activeTab === 'trends' ||
      activeTab === 'cashier' ||
      activeTab === 'inventory-velocity' ||
      activeTab === 'pnl' ||
      activeTab === 'cs-register'
    ) {
      setLoading(false);
      return;
    }

    // Clear stale report data immediately (synchronous) so a previous tab's
    // report shape never bleeds into the next tab's render while the new
    // fetch is in-flight. The ignore flag discards any in-flight response
    // that resolves after a subsequent effect fires (tab switch / date change).
    setReport(null);
    let ignore = false;

    const load = async () => {
      setLoading(true);
      const locationId = selectedLocationId || undefined;
      try {
        let res;
        if (activeTab === 'daily') res = await reportsApi.getDaily(dateFrom, locationId);
        else if (activeTab === 'weekly') res = await reportsApi.getWeekly(dateFrom, locationId);
        else res = await reportsApi.getProfit({ startDate: dateFrom, endDate: dateTo, ...(locationId ? { locationId } : {}) });
        if (!ignore) setReport(res.data.data);
      } catch {}
      if (!ignore) setLoading(false);
    };
    load();

    return () => { ignore = true; };
  }, [activeTab, dateFrom, dateTo, selectedLocationId]);

  const sym = currencySymbol;

  const visibleTabs = TABS.filter(t => {
    // Gate the CS Register tab: only shown in pharmacy mode
    if (t.id === 'cs-register' && !tenant?.pharmacyMode) return false;
    return !t.minRole || hasMinRole(t.minRole);
  });

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto" ref={reportRef}>
      {/* Offline banner — shown only when network is unavailable */}
      {isOffline && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>You're offline — report data may be incomplete</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Reports</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Sales performance and analytics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Location filter — only visible when tenant has multiple branches */}
          {isMultiLocation && (
            <select
              value={selectedLocationId}
              onChange={e => setSelectedLocationId(e.target.value)}
              className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          {/* Date pickers are hidden for tabs that own their own date controls */}
          {activeTab !== 'cash-drawer' && activeTab !== 'expenses' && activeTab !== 'monthly' && activeTab !== 'trends' && activeTab !== 'cashier' && activeTab !== 'inventory-velocity' && activeTab !== 'pnl' && activeTab !== 'cs-register' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                {/* Daily/Weekly: single-date selector — label as "Date" to avoid range confusion.
                    Profit: true range query — label as "From". */}
                <span className="text-xs text-zinc-500">
                  {activeTab === 'profit' ? 'From' : 'Date'}
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  max={activeTab === 'profit' ? dateTo : dayjs().format('YYYY-MM-DD')}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="bg-transparent text-zinc-200 text-sm focus:outline-none"
                />
              </div>
              {/* "To" picker is only meaningful for the Profit tab (range query).
                  Daily/Weekly ignore dateTo entirely so hide it to avoid confusion. */}
              {activeTab === 'profit' && (
                <>
                  <span className="text-zinc-600 text-xs">—</span>
                  <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
                    <span className="text-xs text-zinc-500">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      max={dayjs().format('YYYY-MM-DD')}
                      onChange={e => setDateTo(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="bg-transparent text-zinc-200 text-sm focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-subtle border border-surface-muted/50 hover:border-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-1 bg-surface-subtle border border-surface-muted/50 rounded-2xl p-1 mb-6 w-fit no-print">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            className={`relative px-5 py-2 rounded-xl text-sm font-medium transition-colors z-10 ${
              activeTab === tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-surface-muted rounded-xl"
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Tabs that share the top-level loading state */}
            {(activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'profit') && (
              loading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
                      <Skeleton className="h-4 w-32 rounded mb-4" />
                      <Skeleton className="h-56 rounded-xl" />
                    </div>
                    <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
                      <Skeleton className="h-4 w-32 rounded mb-4" />
                      <Skeleton className="h-56 rounded-xl" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'daily' && report && <DailyReport report={report} sym={sym} />}
                  {activeTab === 'weekly' && report && <WeeklyReport report={report} sym={sym} />}
                  {activeTab === 'profit' && report && <ProfitReport report={report} sym={sym} />}
                </>
              )
            )}

            {/* Monthly tab — plan-gated, owns its own year selector and fetching */}
            {activeTab === 'monthly' && (
              <MonthlyTab
                sym={sym}
                selectedLocationId={selectedLocationId}
                hasAdvancedReports={canAccess('hasAdvancedReports')}
                hasDataExport={canAccess('hasDataExport')}
              />
            )}

            {/* Trends tab — plan-gated, owns its own date range and fetching */}
            {activeTab === 'trends' && (
              <TrendsTab
                sym={sym}
                selectedLocationId={selectedLocationId}
                hasAdvancedReports={canAccess('hasAdvancedReports')}
                hasDataExport={canAccess('hasDataExport')}
              />
            )}

            {/* Cashier tab — plan-gated (hasAdvancedReports), owns its own date range and fetching */}
            {activeTab === 'cashier' && (
              <CashierTab
                sym={sym}
                selectedLocationId={selectedLocationId}
                hasAdvancedReports={canAccess('hasAdvancedReports')}
                hasDataExport={canAccess('hasDataExport')}
              />
            )}

            {/* Inventory Velocity tab — plan-gated (hasAdvancedReports), owns its own fetching */}
            {activeTab === 'inventory-velocity' && (
              <InventoryVelocityTab
                sym={sym}
                selectedLocationId={selectedLocationId}
                hasAdvancedReports={canAccess('hasAdvancedReports')}
                hasDataExport={canAccess('hasDataExport')}
              />
            )}

            {/* P&L tab — OWNER only, plan-gated (hasProfitReports), owns its own year selector */}
            {activeTab === 'pnl' && (
              <PnlTab
                sym={sym}
                selectedLocationId={selectedLocationId}
                hasProfitReports={canAccess('hasProfitReports')}
                hasDataExport={canAccess('hasDataExport')}
              />
            )}

            {/* Cash Drawer tab — owns its own fetching and date range state */}
            {activeTab === 'cash-drawer' && (
              <CashDrawerTab sym={sym} selectedLocationId={selectedLocationId} />
            )}

            {/* Expenses tab — owns its own fetching, date range, and add-expense sheet */}
            {activeTab === 'expenses' && (
              <ExpensesTab sym={sym} selectedLocationId={selectedLocationId} hasMinRole={hasMinRole} />
            )}

            {/* CS Register tab — pharmacy mode + OWNER only */}
            {activeTab === 'cs-register' && tenant?.pharmacyMode && (
              <CsRegisterTab />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upgrade prompt — shown inside plan-gated tabs when the feature is locked
// ---------------------------------------------------------------------------

function UpgradePrompt({ message = 'Upgrade your plan to access this feature.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
        <TrendingUp className="w-6 h-6 text-brand-light" />
      </div>
      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-zinc-200 mb-1">Feature Locked</p>
        <p className="text-xs text-zinc-500">{message}</p>
      </div>
      <a
        href="/settings?tab=billing"
        className="mt-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors"
      >
        Upgrade Plan
      </a>
    </div>
  );
}

// Tooltip shown over the Export CSV button when hasDataExport is false
function ExportLockedTooltip({ children }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          Upgrade your plan to export data
        </div>
      </div>
    </div>
  );
}

// Month names for the summary table
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---------------------------------------------------------------------------
// Monthly Tab
// ---------------------------------------------------------------------------

function MonthlyTab({ sym, selectedLocationId, hasAdvancedReports, hasDataExport }) {
  const currentYear = dayjs().year();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!hasAdvancedReports) return;
    setLoading(true);
    try {
      const res = await reportsApi.getMonthly({
        year,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, selectedLocationId, hasAdvancedReports]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!hasDataExport) return;
    setExporting(true);
    try {
      const res = await reportsApi.exportData({
        type: 'sales',
        format: 'csv',
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly-report-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export errors are non-critical; silently degrade
    } finally {
      setExporting(false);
    }
  };

  // When the plan feature is not enabled show an upgrade prompt instead of the tab content
  if (!hasAdvancedReports) {
    return <UpgradePrompt message="Monthly analytics require an Advanced Reports plan. Upgrade to unlock year-over-year breakdowns." />;
  }

  // Build a complete 12-month array from the API response (which may omit months with no data)
  const monthlyRows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const found = data?.months?.find(m => m.month === month);
    return {
      month,
      name: MONTH_NAMES[i].slice(0, 3), // Short name for chart x-axis
      fullName: MONTH_NAMES[i],
      revenue: found?.revenue ?? 0,
      expenses: found?.expenses ?? 0,
      grossProfit: found?.grossProfit ?? 0,
      netProfit: found?.netProfit ?? 0,
    };
  });

  const exportButton = (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={exporting || !hasDataExport}
      className="flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-surface-muted/50 hover:border-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
    >
      {exporting
        ? <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" />
        : <TrendingUp className="w-4 h-4" />
      }
      Export CSV
    </motion.button>
  );

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        {/* Year selector */}
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Export button — wrapped in tooltip when export is locked */}
        {hasDataExport
          ? exportButton
          : <ExportLockedTooltip>{exportButton}</ExportLockedTooltip>
        }
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-40 rounded mb-4" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-32 rounded mb-4" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
                {[0, 1, 2, 3, 4].map(j => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Grouped bar chart — two bars per month (revenue + expenses) */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Monthly Revenue vs Expenses — {year}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRows} barCategoryGap="20%">
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis dataKey="name" {...chartTheme.xAxis} />
                  <YAxis {...chartTheme.yAxis} tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                  <Tooltip
                    {...chartTheme.tooltip}
                    formatter={(v, name) => [`${sym}${Number(v).toFixed(2)}`, name === 'revenue' ? 'Revenue' : 'Expenses']}
                    labelFormatter={label => {
                      const row = monthlyRows.find(r => r.name === label);
                      return row ? `${row.fullName} ${year}` : label;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 12 }}
                    formatter={v => v === 'revenue' ? 'Revenue' : 'Expenses'}
                  />
                  {/* Revenue bar — brand indigo */}
                  <Bar dataKey="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  {/* Expenses bar — red */}
                  <Bar dataKey="expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary table — all 12 months */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-muted/50">
              <h3 className="text-sm font-semibold text-zinc-300">Monthly Summary — {year}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-muted/40">
                    {['Month', 'Revenue', 'Expenses', 'Gross Profit', 'Net Profit'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted/30">
                  {monthlyRows.map(row => {
                    const netPositive = row.netProfit >= 0;
                    const grossPositive = row.grossProfit >= 0;
                    return (
                      <tr key={row.month} className="hover:bg-surface-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-zinc-200">{row.fullName}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{sym}{row.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-danger-light">{sym}{row.expenses.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${grossPositive ? 'text-success' : 'text-danger-light'}`}>
                          {sym}{row.grossProfit.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${netPositive ? 'text-success' : 'text-danger-light'}`}>
                          {sym}{row.netProfit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trends Tab
// ---------------------------------------------------------------------------

function TrendsTab({ sym, selectedLocationId, hasAdvancedReports, hasDataExport }) {
  const today = dayjs();
  const [dateFrom, setDateFrom] = useState(today.subtract(29, 'day').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(today.format('YYYY-MM-DD'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Validate that the selected range does not exceed 90 days before fetching
  const rangeDays = dayjs(dateTo).diff(dayjs(dateFrom), 'day') + 1;
  const rangeExceeded = rangeDays > 90;

  const load = useCallback(async () => {
    if (!hasAdvancedReports || rangeExceeded) return;
    setLoading(true);
    try {
      const res = await reportsApi.getTrends({
        startDate: dateFrom,
        endDate: dateTo,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedLocationId, hasAdvancedReports, rangeExceeded]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!hasDataExport) return;
    setExporting(true);
    try {
      const res = await reportsApi.exportData({
        type: 'sales',
        format: 'csv',
        startDate: dateFrom,
        endDate: dateTo,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trends-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently degrade — export failures are non-critical
    } finally {
      setExporting(false);
    }
  };

  if (!hasAdvancedReports) {
    return <UpgradePrompt message="Trend analytics require an Advanced Reports plan. Upgrade to unlock date-range comparisons." />;
  }

  // Normalise trend data points from the API into the chart-ready format
  const trendRows = data?.trends ?? [];

  const exportButton = (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={exporting || !hasDataExport || rangeExceeded}
      className="flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-surface-muted/50 hover:border-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
    >
      {exporting
        ? <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" />
        : <TrendingUp className="w-4 h-4" />
      }
      Export CSV
    </motion.button>
  );

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
        <span className="text-zinc-600 text-xs">—</span>
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today.format('YYYY-MM-DD')}
            onChange={e => setDateTo(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>

        {hasDataExport
          ? exportButton
          : <ExportLockedTooltip>{exportButton}</ExportLockedTooltip>
        }
      </div>

      {/* Inline validation message — shown when the range exceeds the 90-day limit */}
      {rangeExceeded && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Selected range is {rangeDays} days. Please choose a range of 90 days or fewer to load trend data.</span>
        </div>
      )}

      {!rangeExceeded && (loading ? (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
          <Skeleton className="h-4 w-40 rounded mb-4" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            Revenue & Expenses Trend — {dayjs(dateFrom).format('MMM D')} to {dayjs(dateTo).format('MMM D, YYYY')}
          </h3>
          {trendRows.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-zinc-600 text-sm">
              No trend data found for this period
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {/*
                  Dual Y-axis line chart:
                  - Left axis (yAxisId="left") tracks revenue (#6366f1)
                  - Right axis (yAxisId="right") tracks expenses (#ef4444)
                  Both use MM/DD formatted dates on the X-axis via dayjs
                */}
                <LineChart data={trendRows}>
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => dayjs(d).format('MM/DD')}
                    {...chartTheme.xAxis}
                    // Limit tick density for longer ranges to avoid overlap
                    interval={Math.max(0, Math.floor(trendRows.length / 10) - 1)}
                  />
                  {/* Left Y-axis — revenue scale */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    {...chartTheme.yAxis}
                    tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  {/* Right Y-axis — expenses scale; may have a different magnitude */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    {...chartTheme.yAxis}
                    tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip
                    {...chartTheme.tooltip}
                    formatter={(v, name) => [
                      `${sym}${Number(v).toFixed(2)}`,
                      name === 'revenue' ? 'Revenue' : 'Expenses',
                    ]}
                    labelFormatter={d => dayjs(d).format('MMM D, YYYY')}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 12 }}
                    formatter={v => v === 'revenue' ? 'Revenue' : 'Expenses'}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#6366f1' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Drawer Tab
// ---------------------------------------------------------------------------

function CashDrawerTab({ sym, selectedLocationId }) {
  const today = dayjs().format('YYYY-MM-DD');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getCashDrawerReport({
        startDate: dateFrom,
        endDate: dateTo,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedLocationId]);

  useEffect(() => { load(); }, [load]);

  const sessions = data?.sessions ?? [];
  const summary = data?.summary ?? {};

  // Determine variance colour: green when variance is near zero (within 5), red otherwise
  const varianceColor = (v) => {
    const n = Number(v ?? 0);
    if (n > 0) return 'text-success';
    if (n < 0) return 'text-danger-light';
    return 'text-zinc-400';
  };

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
        <span className="text-zinc-600 text-xs">—</span>
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={dayjs().format('YYYY-MM-DD')}
            onChange={e => setDateTo(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <SkeletonStatCard key={i} />)}
          </div>
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-40 rounded mb-4" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
                {[0, 1, 2, 3, 4, 5, 6].map(j => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-xl p-4"
            >
              <p className="text-xs text-zinc-500 mb-1">Total Sessions</p>
              <p className="text-2xl font-bold text-zinc-100">{summary.totalSessions ?? 0}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-xl p-4"
            >
              <p className="text-xs text-zinc-500 mb-1">Total Variance</p>
              <p className={`text-2xl font-bold ${varianceColor(summary.totalVariance)}`}>
                {sym}{Number(summary.totalVariance ?? 0).toFixed(2)}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-xl p-4"
            >
              <p className="text-xs text-zinc-500 mb-1">Avg Variance / Session</p>
              <p className={`text-2xl font-bold ${varianceColor(summary.avgVariance)}`}>
                {sym}{Number(summary.avgVariance ?? 0).toFixed(2)}
              </p>
            </motion.div>
          </div>

          {/* Sessions table */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-muted/50">
              <h3 className="text-sm font-semibold text-zinc-300">Drawer Sessions</h3>
            </div>
            {sessions.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
                No sessions found for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-muted/40">
                      {['Opened', 'Closed', 'Float', 'Expected', 'Counted', 'Variance', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-muted/30">
                    {sessions.map((s, i) => {
                      const variance = Number(s.variance ?? 0);
                      return (
                        <tr key={s.id ?? i} className="hover:bg-surface-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm text-zinc-300">
                            {s.openedAt ? dayjs(s.openedAt).format('MMM D, HH:mm') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-400">
                            {s.closedAt ? dayjs(s.closedAt).format('MMM D, HH:mm') : (
                              <Badge variant="warning" dot>Open</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-400">{sym}{Number(s.openingFloat ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-400">{sym}{Number(s.expectedCash ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-300">{sym}{Number(s.countedCash ?? 0).toFixed(2)}</td>
                          <td className={`px-4 py-3 text-sm font-semibold ${varianceColor(variance)}`}>
                            {variance >= 0 ? '+' : ''}{sym}{variance.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            {s.status === 'OPEN' ? (
                              <Badge variant="warning" dot>Open</Badge>
                            ) : variance === 0 ? (
                              <Badge variant="success" dot>Balanced</Badge>
                            ) : Math.abs(variance) <= 5 ? (
                              <Badge variant="info">Minor</Badge>
                            ) : (
                              <Badge variant="danger" dot>Discrepancy</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expenses Tab
// ---------------------------------------------------------------------------

// Expense categories — matches the server-side enum
const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing',
  'Maintenance', 'Transport', 'Insurance', 'Taxes', 'Other',
];

function ExpensesTab({ sym, selectedLocationId, hasMinRole }) {
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getExpensesSummary({
        startDate: dateFrom,
        endDate: dateTo,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, categoryFilter, selectedLocationId]);

  useEffect(() => { load(); }, [load]);

  const expenses = data?.expenses ?? [];
  const totalAmount = data?.totalAmount ?? 0;
  const byCategory = data?.byCategory ?? [];
  const byDay = data?.byDay ?? [];

  // After a successful add we reload silently without clearing the table
  const onExpenseAdded = () => {
    setSheetOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
        <span className="text-zinc-600 text-xs">—</span>
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today}
            onChange={e => setDateTo(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Add Expense button — MANAGER+ only */}
        {hasMinRole('MANAGER') && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonStatCard />
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-40 rounded mb-4" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-32 rounded mb-4" />
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
                {[0, 1, 2, 3, 4].map(j => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary hero + category badges */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-danger-light">{sym}{Number(totalAmount).toFixed(2)}</p>
              </div>
              {/* Per-category badges */}
              {byCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {byCategory.map(cat => {
                    const pct = totalAmount > 0 ? ((cat.amount / totalAmount) * 100).toFixed(0) : 0;
                    return (
                      <span
                        key={cat.category}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-muted border border-surface-overlay text-zinc-300"
                      >
                        {cat.category}
                        <span className="text-zinc-500">{sym}{Number(cat.amount).toFixed(2)}</span>
                        <span className="text-zinc-600">·{pct}%</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Expenses by category — horizontal bar chart */}
          {byCategory.length > 0 && (
            <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Expenses by Category</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid {...chartTheme.cartesianGrid} horizontal={false} />
                    <XAxis type="number" {...chartTheme.xAxis} tickFormatter={v => `${sym}${v}`} />
                    <YAxis type="category" dataKey="category" width={90} {...chartTheme.yAxis} />
                    <Tooltip {...chartTheme.tooltip} formatter={v => [`${sym}${Number(v).toFixed(2)}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#ef4444" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Expenses by day — vertical bar chart matching the weekly chart style */}
          {byDay.length > 0 && (
            <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Daily Spend</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDay}>
                    <CartesianGrid {...chartTheme.cartesianGrid} />
                    <XAxis dataKey="date" tickFormatter={d => dayjs(d).format('MMM D')} {...chartTheme.xAxis} />
                    <YAxis {...chartTheme.yAxis} />
                    <Tooltip {...chartTheme.tooltip} formatter={v => [`${sym}${Number(v).toFixed(2)}`, 'Amount']} labelFormatter={d => dayjs(d).format('MMM D, YYYY')} />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Expenses table */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-muted/50">
              <h3 className="text-sm font-semibold text-zinc-300">Expense Entries</h3>
            </div>
            {expenses.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
                No expenses found for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-muted/40">
                      {['Date', 'Category', 'Description', 'Amount', 'Receipt'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-muted/30">
                    {expenses.map((exp, i) => (
                      <tr key={exp.id ?? i} className="hover:bg-surface-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {exp.expenseDate ? dayjs(exp.expenseDate).format('MMM D, YYYY') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-zinc-300 border border-surface-overlay">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300 max-w-xs truncate">
                          {exp.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-danger-light">
                          {sym}{Number(exp.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {exp.receiptUrl ? (
                            // 40×40 thumbnail; clicking opens full image in a new tab
                            <a
                              href={exp.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-10 h-10 rounded-lg overflow-hidden border border-surface-overlay hover:border-zinc-500 transition-colors"
                            >
                              <img
                                src={exp.receiptUrl}
                                alt="Receipt"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <span className="text-zinc-600 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sym={sym}
        onSuccess={onExpenseAdded}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Expense Sheet
// ---------------------------------------------------------------------------

function AddExpenseSheet({ open, onOpenChange, sym, onSuccess }) {
  const { upload, uploading, uploadError, reset: resetUpload } = useCloudinaryUpload();

  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    expenseDate: dayjs().format('YYYY-MM-DD'),
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset form each time the sheet opens
  useEffect(() => {
    if (open) {
      setForm({ category: '', description: '', amount: '', expenseDate: dayjs().format('YYYY-MM-DD') });
      setReceiptFile(null);
      setReceiptPreview(null);
      setErrors({});
      resetUpload();
    }
  }, [open]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    // Generate a local preview URL for the chosen image
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
  };

  const validate = () => {
    const errs = {};
    if (!form.category) errs.category = 'Category is required';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'A valid amount is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      let receiptUrl = null;
      if (receiptFile) {
        // Upload image directly to Cloudinary via the hook
        receiptUrl = await upload(receiptFile);
      }

      await expensesApi.create({
        category: form.category,
        description: form.description || null,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        ...(receiptUrl ? { receiptUrl } : {}),
      });

      onSuccess();
    } catch {
      // Upload errors are already surfaced via uploadError from the hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add Expense" description="Record a business expense">
      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* Category */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Category <span className="text-danger-light">*</span>
          </label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg text-sm bg-surface-muted border text-zinc-100 focus:outline-none focus:ring-2 transition-all ${
              errors.category ? 'border-danger/60 ring-danger/20' : 'border-surface-overlay focus:border-brand/60 focus:ring-brand/20'
            }`}
          >
            <option value="">Select category…</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-danger-light flex items-center gap-1">{errors.category}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Amount ({sym}) <span className="text-danger-light">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            placeholder="0.00"
            className={`w-full px-3 py-2.5 rounded-lg text-sm bg-surface-muted border text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-all ${
              errors.amount ? 'border-danger/60 ring-danger/20' : 'border-surface-overlay focus:border-brand/60 focus:ring-brand/20'
            }`}
          />
          {errors.amount && (
            <p className="text-xs text-danger-light flex items-center gap-1">{errors.amount}</p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Date</label>
          <input
            type="date"
            value={form.expenseDate}
            max={dayjs().format('YYYY-MM-DD')}
            onChange={e => set('expenseDate', e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-muted border border-surface-overlay text-zinc-100 focus:outline-none focus:ring-2 focus:border-brand/60 focus:ring-brand/20 transition-all"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            placeholder="Optional notes…"
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-muted border border-surface-overlay text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-brand/60 focus:ring-brand/20 resize-none transition-all"
          />
        </div>

        {/* Receipt upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">Receipt Image</label>

          {receiptPreview ? (
            <div className="relative w-24 h-24">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-full object-cover rounded-xl border border-surface-overlay"
              />
              <button
                type="button"
                onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-surface-overlay rounded-xl cursor-pointer hover:border-zinc-600 transition-colors">
              <Upload className="w-5 h-5 text-zinc-500" />
              <span className="text-xs text-zinc-500">Click to upload (JPG, PNG, PDF)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* Upload progress indicator */}
          {uploading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin inline-block" />
              Uploading receipt…
            </div>
          )}
          {uploadError && (
            <p className="text-xs text-danger-light">{uploadError}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving || uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={saving || uploading}
          >
            Save Expense
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// CS Register Tab
// ---------------------------------------------------------------------------

// Type badge colours for CS register entry types
const CS_TYPE_BADGE = {
  DISPENSED: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  RECEIVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  DISPOSED: 'bg-red-500/15 text-red-300 border-red-500/20',
  ADJUSTED: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
};

function CsRegisterTab() {
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const buildParams = useCallback(
    () => ({
      from: dateFrom,
      to: dateTo,
      ...(productFilter.trim() ? { productId: productFilter.trim() } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    }),
    [dateFrom, dateTo, productFilter, typeFilter]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await controlledSubstancesApi.getRegister(buildParams());
      setData(res.data?.data?.logs ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await controlledSubstancesApi.exportRegister(buildParams());
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cs-register-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently degrade — export errors are non-critical
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        {/* Date from */}
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
        <span className="text-zinc-600 text-xs">—</span>
        {/* Date to */}
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today}
            onChange={e => setDateTo(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>

        {/* Product search */}
        <input
          type="text"
          placeholder="Search product…"
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 w-44"
        />

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          <option value="">All Types</option>
          <option value="DISPENSED">Dispensed</option>
          <option value="RECEIVED">Received</option>
          <option value="DISPOSED">Disposed</option>
          <option value="ADJUSTED">Adjusted</option>
        </select>

        {/* Export button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {exporting
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            : <TrendingUp className="w-4 h-4" />
          }
          Export Register
        </motion.button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-48 rounded" />
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => (
                <Skeleton key={j} className="h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Controlled Substances Register</h3>
            <span className="text-xs text-zinc-500">{data.length} {data.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          {data.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
              No register entries found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-muted/40">
                    {['Date', 'Receipt #', 'Rx Number', 'Product', 'Batch #', 'Qty', 'Type', 'Patient', 'Dispensed By', 'Approved By'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted/30">
                  {data.map((entry, i) => (
                    <tr key={entry.id ?? i} className="hover:bg-surface-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                        {entry.date ? dayjs(entry.date).format('MMM D, YYYY') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-400 whitespace-nowrap">
                        {entry.receiptNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-400 whitespace-nowrap">
                        {entry.rxNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-200 font-medium max-w-[160px] truncate">
                        {entry.product ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">
                        {entry.batchNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">
                        {entry.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.type ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CS_TYPE_BADGE[entry.type] ?? 'bg-surface-muted text-zinc-400 border-surface-overlay'}`}>
                            {entry.type}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 max-w-[120px] truncate">
                        {entry.patientName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 max-w-[120px] truncate">
                        {entry.dispensedBy ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 max-w-[120px] truncate">
                        {entry.approvedBy ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cashier Performance Tab
// ---------------------------------------------------------------------------

function CashierTab({ sym, selectedLocationId, hasAdvancedReports, hasDataExport }) {
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!hasAdvancedReports) return;
    setLoading(true);
    try {
      const res = await reportsApi.getCashierReport({
        startDate: dateFrom,
        endDate: dateTo,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedLocationId, hasAdvancedReports]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!hasDataExport) return;
    setExporting(true);
    try {
      const res = await reportsApi.exportData({
        type: 'cashier',
        format: 'csv',
        startDate: dateFrom,
        endDate: dateTo,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashier-report-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently degrade — export failures are non-critical
    } finally {
      setExporting(false);
    }
  };

  if (!hasAdvancedReports) {
    return <UpgradePrompt message="Cashier performance reports require an Advanced Reports plan. Upgrade to compare cashier productivity." />;
  }

  const cashiers = data?.cashiers ?? [];

  const exportButton = (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={exporting || !hasDataExport}
      className="flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-surface-muted/50 hover:border-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
    >
      {exporting
        ? <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" />
        : <TrendingUp className="w-4 h-4" />
      }
      Export CSV
    </motion.button>
  );

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>
        <span className="text-zinc-600 text-xs">—</span>
        <div className="flex items-center gap-2 bg-surface-subtle border border-surface-muted/50 rounded-xl px-3 py-2">
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today}
            onChange={e => setDateTo(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none"
          />
        </div>

        {hasDataExport
          ? exportButton
          : <ExportLockedTooltip>{exportButton}</ExportLockedTooltip>
        }
      </div>

      {loading ? (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-48 rounded" />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
              {[0, 1, 2, 3, 4].map(j => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Cashier Leaderboard</h3>
            <span className="text-xs text-zinc-500">
              {dayjs(dateFrom).format('MMM D')} — {dayjs(dateTo).format('MMM D, YYYY')}
            </span>
          </div>
          {cashiers.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
              No cashier data found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-muted/40">
                    {['Rank', 'Cashier Name', 'Transactions', 'Revenue', 'Avg Order Value'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted/30">
                  {/* Sorted by revenue desc by the API; rank is the 1-based index */}
                  {cashiers.map((c, i) => {
                    // The top performer gets a gold accent row background
                    const isTop = i === 0;
                    return (
                      <tr
                        key={c.userId ?? i}
                        className={`transition-colors ${isTop ? 'bg-yellow-900/20 hover:bg-yellow-900/30' : 'hover:bg-surface-muted/20'}`}
                      >
                        <td className="px-4 py-3 text-sm font-bold text-zinc-300">
                          {isTop ? (
                            <span className="inline-flex items-center gap-1 text-yellow-400">
                              <span>1</span>
                              <span className="text-xs">★</span>
                            </span>
                          ) : (
                            <span className="text-zinc-500">{i + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-zinc-200">
                          {c.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          {c.transactions ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-100">
                          {sym}{Number(c.revenue ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {sym}{Number(c.avgOrderValue ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory Velocity Tab
// ---------------------------------------------------------------------------

function InventoryVelocityTab({ sym, selectedLocationId, hasAdvancedReports, hasDataExport }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!hasAdvancedReports) return;
    setLoading(true);
    try {
      const res = await reportsApi.getInventoryVelocity({
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, hasAdvancedReports]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!hasDataExport) return;
    setExporting(true);
    try {
      const res = await reportsApi.exportData({
        type: 'inventory',
        format: 'csv',
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-velocity-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently degrade — export failures are non-critical
    } finally {
      setExporting(false);
    }
  };

  if (!hasAdvancedReports) {
    return <UpgradePrompt message="Inventory velocity reports require an Advanced Reports plan. Upgrade to identify dead stock and fast movers." />;
  }

  // Sort by sellThroughRate descending — the API may already do this but we enforce it client-side
  const products = [...(data?.products ?? [])].sort(
    (a, b) => Number(b.sellThroughRate ?? 0) - Number(a.sellThroughRate ?? 0)
  );

  const exportButton = (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={exporting || !hasDataExport}
      className="flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-surface-muted/50 hover:border-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
    >
      {exporting
        ? <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" />
        : <TrendingUp className="w-4 h-4" />
      }
      Export CSV
    </motion.button>
  );

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        {hasDataExport
          ? exportButton
          : <ExportLockedTooltip>{exportButton}</ExportLockedTooltip>
        }
      </div>

      {loading ? (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-48 rounded" />
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(j => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Inventory Velocity (last 30 days)</h3>
            <span className="text-xs text-zinc-500">{products.length} products</span>
          </div>
          {products.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
              No inventory data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-muted/40">
                    {['Product', 'SKU', 'Category', 'Stock', 'Sold (30d)', 'Sell-Through %', 'Days of Stock', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted/30">
                  {products.map((p, i) => {
                    // Dead-stock rows get an amber background and a badge indicator
                    const isDeadStock = !!p.isDeadStock;
                    const sellThrough = Number(p.sellThroughRate ?? 0);
                    const daysOfStock = p.daysOfStock != null ? Number(p.daysOfStock) : null;

                    return (
                      <tr
                        key={p.productId ?? i}
                        className={`transition-colors ${isDeadStock ? 'bg-amber-900/20 hover:bg-amber-900/30' : 'hover:bg-surface-muted/20'}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-zinc-200 max-w-[180px] truncate">
                          {p.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                          {p.sku ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {p.category ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          {p.stock ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          {p.sold30d ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          <span className={
                            sellThrough >= 50 ? 'text-success' :
                            sellThrough >= 20 ? 'text-warning' :
                            'text-danger-light'
                          }>
                            {sellThrough.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {daysOfStock != null ? (daysOfStock === Infinity || daysOfStock > 999 ? '∞' : daysOfStock.toFixed(0)) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isDeadStock ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                              Dead Stock
                            </span>
                          ) : sellThrough >= 50 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                              Fast Mover
                            </span>
                          ) : sellThrough >= 20 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20">
                              Moderate
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-600/20">
                              Slow Mover
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// P&L Tab (OWNER only)
// ---------------------------------------------------------------------------

function PnlTab({ sym, selectedLocationId, hasProfitReports, hasDataExport }) {
  const currentYear = dayjs().year();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!hasProfitReports) return;
    setLoading(true);
    try {
      const res = await reportsApi.getPnl({
        year,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, selectedLocationId, hasProfitReports]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!hasDataExport) return;
    setExporting(true);
    try {
      const res = await reportsApi.exportData({
        type: 'pnl',
        format: 'csv',
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pnl-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently degrade — export failures are non-critical
    } finally {
      setExporting(false);
    }
  };

  if (!hasProfitReports) {
    return <UpgradePrompt message="P&L analytics require a Profit Reports plan. Upgrade to unlock annual income statements with COGS and expense breakdowns." />;
  }

  // Build a complete 12-month array from the API response (API may omit months with no data)
  const pnlRows = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const found = data?.months?.find(m => m.month === month);
    return {
      month,
      name: MONTH_NAMES[i].slice(0, 3),
      fullName: MONTH_NAMES[i],
      revenue: Number(found?.revenue ?? 0),
      cogs: Number(found?.cogs ?? 0),
      grossProfit: Number(found?.grossProfit ?? 0),
      expenses: Number(found?.expenses ?? 0),
      netProfit: Number(found?.netProfit ?? 0),
    };
  });

  const exportButton = (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={exporting || !hasDataExport}
      className="flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-surface-muted/50 hover:border-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
    >
      {exporting
        ? <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" />
        : <TrendingUp className="w-4 h-4" />
      }
      Export CSV
    </motion.button>
  );

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {hasDataExport
          ? exportButton
          : <ExportLockedTooltip>{exportButton}</ExportLockedTooltip>
        }
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-40 rounded mb-4" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <Skeleton className="h-4 w-32 rounded mb-4" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 py-3 border-b border-surface-muted/30">
                {[0, 1, 2, 3, 4, 5].map(j => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stacked bar chart — COGS (red), Expenses (amber), Net Profit (green) per month */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">P&L Breakdown — {year}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlRows} barCategoryGap="20%">
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis dataKey="name" {...chartTheme.xAxis} />
                  <YAxis
                    {...chartTheme.yAxis}
                    tickFormatter={v => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <Tooltip
                    {...chartTheme.tooltip}
                    formatter={(v, name) => {
                      const labels = { cogs: 'COGS', expenses: 'Expenses', netProfit: 'Net Profit' };
                      return [`${sym}${Number(v).toFixed(2)}`, labels[name] ?? name];
                    }}
                    labelFormatter={label => {
                      const row = pnlRows.find(r => r.name === label);
                      return row ? `${row.fullName} ${year}` : label;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 12 }}
                    formatter={v => ({ cogs: 'COGS', expenses: 'Expenses', netProfit: 'Net Profit' }[v] ?? v)}
                  />
                  {/* COGS — red, stacked first */}
                  <Bar dataKey="cogs" stackId="pnl" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  {/* Expenses — amber, stacked second */}
                  <Bar dataKey="expenses" stackId="pnl" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  {/* Net Profit — green, stacked on top */}
                  <Bar dataKey="netProfit" stackId="pnl" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* P&L table — all 12 months, negative net profit rows highlighted red */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-muted/50">
              <h3 className="text-sm font-semibold text-zinc-300">P&L Statement — {year}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-muted/40">
                    {['Month', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted/30">
                  {pnlRows.map(row => {
                    const netNegative = row.netProfit < 0;
                    const grossPositive = row.grossProfit >= 0;
                    return (
                      <tr
                        key={row.month}
                        // Highlight rows with negative net profit in red to draw immediate attention
                        className={`transition-colors ${netNegative ? 'bg-red-900/20 hover:bg-red-900/30' : 'hover:bg-surface-muted/20'}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-zinc-200">{row.fullName}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{sym}{row.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-danger-light">{sym}{row.cogs.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${grossPositive ? 'text-success' : 'text-danger-light'}`}>
                          {sym}{row.grossProfit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-warning">{sym}{row.expenses.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${netNegative ? 'text-danger-light' : 'text-success'}`}>
                          {sym}{row.netProfit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Existing sub-report components (unchanged)
// ---------------------------------------------------------------------------

function DailyReport({ report, sym }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatBox label="Total Sales" value={report.summary.totalSales} prefix={sym} icon={DollarSign} iconColor="text-success" iconBg="bg-success/10" />
        <StatBox label="Transactions" value={report.summary.totalTransactions} icon={ShoppingBag} iconColor="text-brand-light" iconBg="bg-brand/10" />
        <StatBox label="Avg Transaction" value={report.summary.averageTransaction} prefix={sym} icon={TrendingUp} iconColor="text-zinc-400" iconBg="bg-surface-muted" />
        <StatBox label="Gross Profit" value={report.summary.grossProfit} prefix={sym} icon={DollarSign} iconColor="text-warning" iconBg="bg-warning/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Sales by Hour</h3>
          <div className="h-56">
            {report.salesByHour?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.salesByHour}>
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis dataKey="hour" tickFormatter={h => `${h}h`} {...chartTheme.xAxis} />
                  <YAxis {...chartTheme.yAxis} />
                  <Tooltip {...chartTheme.tooltip} formatter={v => [`${sym}${v.toFixed(2)}`, 'Revenue']} labelFormatter={h => `${h}:00–${h}:59`} />
                  <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No sales data</div>}
          </div>
        </div>

        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Payment Methods</h3>
          <div className="h-56">
            {report.salesByPayment?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={report.salesByPayment} dataKey="total" nameKey="paymentMethod" cx="50%" cy="50%" outerRadius={80}
                    label={({ paymentMethod, percent }) => `${paymentMethod.replace('_', ' ')} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#52525b' }}>
                    {report.salesByPayment.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...chartTheme.tooltip} formatter={v => [`${sym}${v.toFixed(2)}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No payment data</div>}
          </div>
        </div>
      </div>

      <TransactionsTable transactions={report.transactions} sym={sym} />
    </div>
  );
}

function WeeklyReport({ report, sym }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
        <p className="text-xs text-zinc-600 mb-3">Week: {report.weekStart}  {report.weekEnd}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Sales', value: report.summary.totalSales, prefix: sym },
            { label: 'Transactions', value: report.summary.totalTransactions },
            { label: 'Daily Avg', value: report.summary.averageDaily, prefix: sym },
            { label: 'Gross Profit', value: report.summary.grossProfit, prefix: sym },
          ].map(({ label, value, prefix = '' }) => (
            <div key={label}>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">
                <AnimatedNumber value={Number(value || 0)} prefix={prefix} />
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Daily Sales</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.salesByDay}>
              <CartesianGrid {...chartTheme.cartesianGrid} />
              <XAxis dataKey="dayName" {...chartTheme.xAxis} />
              <YAxis {...chartTheme.yAxis} />
              <Tooltip {...chartTheme.tooltip} formatter={v => [`${sym}${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ProductTable products={report.topProducts} sym={sym} cols={['Product', 'Qty Sold', 'Revenue', 'Profit']} />
    </div>
  );
}

function ProfitReport({ report, sym }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
        <p className="text-xs text-zinc-600 mb-3">{report.period.start}  {report.period.end}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: report.summary.totalRevenue, prefix: sym, color: 'text-zinc-100' },
            { label: 'Total Cost', value: report.summary.totalCost, prefix: sym, color: 'text-danger-light' },
            { label: 'Total Profit', value: report.summary.totalProfit, prefix: sym, color: 'text-success' },
            { label: 'Profit Margin', value: report.summary.overallMargin, suffix: '%', color: 'text-warning' },
          ].map(({ label, value, prefix = '', suffix = '', color }) => (
            <div key={label}>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{prefix}{Number(value || 0).toFixed(suffix ? 1 : 2)}{suffix}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-muted/50">
          <h3 className="text-sm font-semibold text-zinc-300">Most Profitable Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-surface-muted/40">
              {['Product', 'Revenue', 'Cost', 'Profit', 'Margin'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-surface-muted/30">
              {report.topProfitable?.map((item, i) => (
                <tr key={i} className="hover:bg-surface-muted/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-200">{item.product?.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{sym}{item.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{sym}{item.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-success">{sym}{item.profit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{item.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransactionsTable({ transactions, sym }) {
  if (!transactions?.length) return null;
  return (
    <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-muted/50">
        <h3 className="text-sm font-semibold text-zinc-300">All Transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-surface-muted/40">
            {['Receipt #', 'Time', 'Cashier', 'Items', 'Payment', 'Total'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-surface-muted/30">
            {transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-surface-muted/20 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-zinc-400">{tx.receiptNumber}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{tx.time}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">{tx.cashier}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{tx.itemCount}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{tx.paymentMethod.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-sm font-semibold text-zinc-200">{sym}{tx.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductTable({ products, sym, cols }) {
  if (!products?.length) return null;
  return (
    <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-muted/50">
        <h3 className="text-sm font-semibold text-zinc-300">Top Products</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-surface-muted/40">
            {cols.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-surface-muted/30">
            {products.map((item, i) => (
              <tr key={i} className="hover:bg-surface-muted/20 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-zinc-200">{item.product?.name}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{item.quantitySold}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">{sym}{item.revenue.toFixed(2)}</td>
                {item.profit != null && <td className="px-4 py-3 text-sm text-success">{sym}{item.profit.toFixed(2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
