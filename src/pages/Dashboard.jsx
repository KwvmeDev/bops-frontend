import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { reportsApi, productsApi } from '../api/client';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, TrendingDown, Plus, BarChart3, Clock } from 'lucide-react';
import { StatCard, SkeletonStatCard, Skeleton } from '../components/ui';
import dayjs from 'dayjs';

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
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (hasMinRole('MANAGER')) {
        try {
          const r = await reportsApi.getDashboard();
          setData(r.data.data);
        } catch {}
      }
      try {
        const r = await productsApi.getAll({ lowStock: 'true' });
        setLowStock(r.data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const sym = currencySymbol;
  const fmt = (n) => `${sym}${Number(n || 0).toFixed(2)}`;

  const todayRevenue = data?.todaySales?.total || 0;
  const todayCount = data?.todaySales?.count || 0;
  const avgOrder = todayCount > 0 ? todayRevenue / todayCount : 0;

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
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
        >
          {loading ? (
            [0, 1, 2, 3].map(i => <motion.div key={i} variants={stagger.item}><SkeletonStatCard /></motion.div>)
          ) : (
            <>
              <motion.div variants={stagger.item}>
                <StatCard title="Today's Revenue" value={todayRevenue} prefix={sym} decimals={2} icon={DollarSign} trendLabel={`${todayCount} transaction${todayCount !== 1 ? 's' : ''}`} />
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
            </>
          )}
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
              <Link to="/reports" className="text-xs text-brand-light hover:text-brand transition-colors">View all →</Link>
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
                <Link to="/sales" className="mt-3 text-xs text-brand-light hover:text-brand transition-colors">Make the first sale →</Link>
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
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{sale.receiptNumber}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{sale.itemCount} items • {sale.cashier}</p>
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
                    +{lowStock.length - 5} more items →
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
