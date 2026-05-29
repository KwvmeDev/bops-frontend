import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../api/client';
import { useReactToPrint } from 'react-to-print';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Printer, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import { Skeleton, SkeletonStatCard } from '../components/ui';
import dayjs from 'dayjs';

const TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'profit', label: 'Profit', minRole: 'OWNER' },
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
  const { tenant, hasMinRole, currencySymbol } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [prevTab, setPrevTab] = useState('daily');
  const [dateFrom, setDateFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef();

  const handlePrint = useReactToPrint({ contentRef: reportRef, documentTitle: `Report-${activeTab}-${dateFrom}-to-${dateTo}` });

  const tabIndex = (id) => TABS.filter(t => !t.minRole || hasMinRole(t.minRole)).findIndex(t => t.id === id);
  const direction = tabIndex(activeTab) > tabIndex(prevTab) ? 1 : -1;

  const changeTab = (id) => { setPrevTab(activeTab); setActiveTab(id); };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let res;
        if (activeTab === 'daily') res = await reportsApi.getDaily(dateFrom);
        else if (activeTab === 'weekly') res = await reportsApi.getWeekly(dateFrom);
        else res = await reportsApi.getProfit({ startDate: dateFrom, endDate: dateTo });
        setReport(res.data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [activeTab, dateFrom, dateTo]);

  const sym = currencySymbol;

  const visibleTabs = TABS.filter(t => !t.minRole || hasMinRole(t.minRole));

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Reports</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Sales performance and analytics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
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
            {loading ? (
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
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

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
        <p className="text-xs text-zinc-600 mb-3">Week: {report.weekStart} → {report.weekEnd}</p>
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
        <p className="text-xs text-zinc-600 mb-3">{report.period.start} → {report.period.end}</p>
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
