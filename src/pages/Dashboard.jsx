import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { reportsApi, productsApi, purchaseOrdersApi, cashDrawerApi, batchesApi } from '../api/client';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, TrendingDown, Plus, BarChart3, Clock, Truck, Receipt } from 'lucide-react';
import { StatCard, SkeletonStatCard, Skeleton } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import useLocation from '../hooks/useLocation';

function getGreeting(name) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${name?.split(' ')[0] || 'there'}.`;
}

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  }
};

export default function Dashboard() {
  const { user, tenant, hasMinRole, currencySymbol } = useAuth();
  const { activeLocation, isMultiLocation } = useLocation();
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [drawerSession, setDrawerSession] = useState(null);
  // Pharmacy expiry alert counts — only populated when pharmacyMode is on
  const [nearExpiryCount, setNearExpiryCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  // 7-day sparkline arrays — null until the independent trends fetch resolves
  const [revenueSparkline, setRevenueSparkline] = useState(null);
  const [expensesSparkline, setExpensesSparkline] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (hasMinRole('MANAGER')) {
        try {
          // Pass locationId when a specific branch is selected; omit for all-locations aggregate
          const locationId = activeLocation?.id === '__all__' ? undefined : activeLocation?.id;
          const [dashRes, drawerRes] = await Promise.allSettled([
            reportsApi.getDashboard(locationId),
            cashDrawerApi.getActive(locationId),
          ]);
          if (dashRes.status === 'fulfilled') setData(dashRes.value.data.data);
          if (drawerRes.status === 'fulfilled') setDrawerSession(drawerRes.value.data?.data ?? null);
        } catch {}
      }
      try {
        const r = await productsApi.getLowStockCount();
        setLowStock(r.data.data.products ?? []);
      } catch {}

      // Pharmacy expiry counts — only fetch when pharmacyMode is on and user is MANAGER+
      if (tenant?.pharmacyMode && hasMinRole('MANAGER')) {
        try {
          const [nearRes, expiredRes] = await Promise.allSettled([
            batchesApi.getExpiring(30),
            batchesApi.getExpired(),
          ]);
          if (nearRes.status === 'fulfilled') {
            setNearExpiryCount((nearRes.value.data?.data ?? []).length);
          }
          if (expiredRes.status === 'fulfilled') {
            setExpiredCount((expiredRes.value.data?.data ?? []).length);
          }
        } catch {
          // Silently ignore — widget simply won't render count
        }
      }

      setLoading(false);
    };
    load();
  }, [activeLocation]);

  // Fetch outstanding purchase orders (ORDERED or PARTIAL status) for MANAGER+ users.
  // Runs independently so PO data doesn't block the main dashboard load.
  useEffect(() => {
    if (!hasMinRole('MANAGER')) return;
    const fetchOutstandingPOs = async () => {
      try {
        const r = await purchaseOrdersApi.getAll({ status: 'ORDERED,PARTIAL' });
        const orders = r.data?.data?.orders ?? r.data?.data ?? r.data ?? [];
        setOutstandingPOs(Array.isArray(orders) ? orders : []);
      } catch {
        // Silently fail — widget simply won't render
      }
    };
    fetchOutstandingPOs();
  }, []);

  // Fetch 7-day trend data for KPI sparklines — fully independent of the main dashboard
  // fetch so a failure here never prevents the dashboard from rendering.
  // Only requested when the user has MANAGER+ role (trend data is sensitive).
  useEffect(() => {
    if (!hasMinRole('MANAGER')) return;
    const fetchTrends = async () => {
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
      const [trendsRes] = await Promise.allSettled([
        reportsApi.getTrends({ startDate, endDate }),
      ]);
      if (trendsRes.status === 'fulfilled') {
        const days = trendsRes.value?.data?.data?.days ?? [];
        // Each day entry is expected to have { revenue, expenses } numeric fields
        setRevenueSparkline(days.map((d) => d.revenue ?? 0));
        setExpensesSparkline(days.map((d) => d.expenses ?? 0));
      }
      // On rejection: sparklines simply stay null — no error is surfaced to the user
    };
    fetchTrends();
  }, []);

  const sym = currencySymbol;
  const fmt = (n) => `${sym}${Number(n || 0).toFixed(2)}`;

  const todayRevenue = data?.todaySales?.total || 0;
  const todayCount = data?.todaySales?.count || 0;
  const avgOrder = todayCount > 0 ? todayRevenue / todayCount : 0;

  // Show the per-location revenue chart only in the all-locations aggregate view
  const showLocationChart = isMultiLocation && activeLocation?.id === '__all__' && (data?.revenueByLocation?.length > 0);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-zinc-100">{getGreeting(user?.name)}</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Here's what's happening at {tenant?.name || 'your shop'} today.</p>
      </motion.div>

      {/* KPI row — managers only */}
      {hasMinRole('MANAGER') && (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8"
        >
          {loading ? (
            [0, 1, 2, 3, 4].map(i => <motion.div key={i} variants={stagger.item}><SkeletonStatCard /></motion.div>)
          ) : (
            <>
              <motion.div variants={stagger.item}>
                <StatCard title="Today's Revenue" value={todayRevenue} prefix={sym} decimals={2} icon={DollarSign} trendLabel={`${todayCount} transaction${todayCount !== 1 ? 's' : ''}`} sparklineData={revenueSparkline} color="#6366f1" />
              </motion.div>
              <motion.div variants={stagger.item}>
                <StatCard title="Avg Order Value" value={avgOrder} prefix={sym} decimals={2} icon={TrendingUp} trendLabel="per transaction" />
              </motion.div>
              <motion.div variants={stagger.item}>
                <StatCard title="Total Products" value={data?.totalProducts || 0} icon={Package} trendLabel="active in inventory" />
              </motion.div>
              <motion.div variants={stagger.item}>
                <StatCard title="Low Stock Items" value={lowStock.length} icon={AlertTriangle} trendLabel={lowStock.length > 0 ? 'Items need restocking' : 'All stocked up'} trend={lowStock.length > 0 ? -1 : 0} />
              </motion.div>
              <motion.div variants={stagger.item}>
                <StatCard title="Today's Expenses" value={data?.todayExpenses?.total || 0} prefix={sym} decimals={2} icon={Receipt} trendLabel={`${data?.todayExpenses?.count || 0} expense${(data?.todayExpenses?.count || 0) !== 1 ? 's' : ''}`} trend={-1} sparklineData={expensesSparkline} color="#ef4444" />
              </motion.div>
            </>
          )}
        </motion.div>
      )}

      {/* Outstanding POs widget — only for MANAGER+ when there are pending deliveries */}
      {hasMinRole('MANAGER') && outstandingPOs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.3 }}
          className="mb-6"
        >
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 rounded-lg flex-shrink-0">
                <Truck className="w-4 h-4 text-brand-light" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{outstandingPOs.length}</span>
                  <span className="text-sm text-zinc-400">outstanding {outstandingPOs.length === 1 ? 'delivery' : 'deliveries'} awaiting receipt</span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">Purchase orders in ORDERED or PARTIAL status</p>
              </div>
            </div>
            <Link
              to="/purchase-orders"
              className="flex-shrink-0 text-xs font-medium text-brand-light hover:text-brand transition-colors whitespace-nowrap"
            >
              View all 
            </Link>
          </div>
        </motion.div>
      )}

      {/* Pharmacy expiry alert widget — only when pharmacyMode is on and MANAGER+ */}
      {tenant?.pharmacyMode && hasMinRole('MANAGER') && !loading && (nearExpiryCount > 0 || expiredCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="mb-6"
        >
          <Link to="/inventory?tab=expiry" className="block">
            <div className="bg-surface-subtle border border-amber-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-amber-500/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {nearExpiryCount > 0 && (
                      <span className="text-sm text-zinc-300">
                        <span className="font-semibold text-amber-400">{nearExpiryCount}</span>
                        {' '}{nearExpiryCount === 1 ? 'batch' : 'batches'} expiring within 30 days
                      </span>
                    )}
                    {nearExpiryCount > 0 && expiredCount > 0 && (
                      <span className="text-zinc-600">·</span>
                    )}
                    {expiredCount > 0 && (
                      <span className="text-sm text-zinc-300">
                        <span className="font-semibold text-red-400">{expiredCount}</span>
                        {' '}expired {expiredCount === 1 ? 'batch' : 'batches'} need disposal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">View expiry management for details</p>
                </div>
              </div>
              <span className="flex-shrink-0 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap">
                View 
              </span>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Cash drawer status row — MANAGER+ only */}
      {hasMinRole('MANAGER') && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.3 }}
          className="mb-6"
        >
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${drawerSession ? 'bg-success/10' : 'bg-surface-muted'}`}>
                <Receipt className={`w-4 h-4 ${drawerSession ? 'text-success' : 'text-zinc-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {drawerSession ? (
                    <>
                      <span className="text-sm font-semibold text-zinc-100">Drawer Open</span>
                      <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-medium">OPEN</span>
                      <span className="text-sm text-zinc-400">• float {sym}{Number(drawerSession.openingFloat || 0).toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-zinc-400">No Open Drawer</span>
                      <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full font-medium">CLOSED</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {drawerSession ? 'Cash drawer session is active' : 'Open a cash drawer session to track cash sales'}
                </p>
              </div>
            </div>
            <Link
              to="/reports?tab=cash-drawer"
              className="flex-shrink-0 text-xs font-medium text-brand-light hover:text-brand transition-colors whitespace-nowrap"
            >
              {drawerSession ? 'Close Drawer ' : 'View Drawer History '}
            </Link>
          </div>
        </motion.div>
      )}

      {/* Per-location revenue breakdown chart (OWNER / all-locations view only) */}
      {hasMinRole('MANAGER') && showLocationChart && (
        <motion.div variants={stagger.item} initial="initial" animate="animate" className="mb-6">
          <div className="bg-surface-subtle rounded-xl border border-surface-muted/50 p-5">
            <h3 className="text-sm font-medium text-text-secondary mb-4">Today's Revenue by Location</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.revenueByLocation} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="locationName"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${sym}${Number(v).toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value) => [`${sym}${Number(value).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Main content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent sales */}
        {hasMinRole('MANAGER') && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Recent Sales</h2>
              <Link to="/reports" className="text-xs text-brand-light hover:text-brand transition-colors">View all </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <div className="space-y-1.5 items-end flex flex-col">
                      <Skeleton className="h-3.5 w-16 rounded" />
                      <Skeleton className="h-3 w-10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.recentSales?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No sales today yet</p>
                <Link to="/sales" className="mt-3 text-xs text-brand-light hover:text-brand transition-colors">Make the first sale </Link>
              </div>
            ) : (
              <div className="divide-y divide-surface-muted/40">
                {data.recentSales.map((sale, i) => (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.03, duration: 0.25 }}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-muted/30 transition-colors group"
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm font-medium text-zinc-200">{sale.receiptNumber}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{sale.itemCount} items • {sale.cashier}</p>
                      {sale.productNames?.length > 0 && (
                        <p className="text-xs text-zinc-600 mt-0.5 truncate">
                          {sale.productNames.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-100">{fmt(sale.total)}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />{dayjs(sale.time).format('HH:mm')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Right column */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4"
        >
          {/* Quick actions */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link to="/sales">
                <motion.div whileTap={{ scale: 0.97 }} className="flex items-center gap-3 px-3.5 py-2.5 bg-brand/10 hover:bg-brand/15 border border-brand/20 rounded-xl text-brand-light transition-colors cursor-pointer">
                  <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">New Sale</span>
                </motion.div>
              </Link>
              {hasMinRole('MANAGER') && (
                <Link to="/inventory">
                  <motion.div whileTap={{ scale: 0.97 }} className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-muted hover:bg-surface-overlay/60 rounded-xl text-zinc-300 transition-colors cursor-pointer mt-1">
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Add Product</span>
                  </motion.div>
                </Link>
              )}
              {hasMinRole('MANAGER') && (
                <Link to="/reports">
                  <motion.div whileTap={{ scale: 0.97 }} className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-muted hover:bg-surface-overlay/60 rounded-xl text-zinc-300 transition-colors cursor-pointer mt-1">
                    <BarChart3 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">View Reports</span>
                  </motion.div>
                </Link>
              )}
            </div>
          </div>

          {/* Low stock panel */}
          {lowStock.length > 0 && (
            <div className="bg-surface-subtle border border-warning/20 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Low Stock
                </h2>
                <span className="text-xs px-2 py-0.5 bg-warning/10 text-warning rounded-full">{lowStock.length}</span>
              </div>
              <div className="divide-y divide-surface-muted/40 max-h-52 overflow-y-auto">
                {lowStock.slice(0, 5).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <p className="text-sm text-zinc-300 truncate">{p.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      p.stock === 0 ? 'bg-danger/10 text-danger-light' : 'bg-warning/10 text-warning-light'
                    }`}>
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
              {lowStock.length > 5 && (
                <div className="px-5 py-3 border-t border-surface-muted/50">
                  <Link to="/inventory?filter=lowStock" className="text-xs text-warning hover:text-warning-light transition-colors">
                    +{lowStock.length - 5} more items 
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Cashier CTA if no manager */}
          {!hasMinRole('MANAGER') && (
            <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 text-center">
              <ShoppingCart className="w-10 h-10 text-brand/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-300 mb-3">Ready to make a sale?</p>
              <Link to="/sales">
                <motion.div whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
                  <ShoppingCart className="w-4 h-4" /> Go to Sales
                </motion.div>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
