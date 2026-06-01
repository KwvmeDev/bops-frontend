import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Receipt, Calendar, Tag, FileText, ImageIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { expensesApi } from '../api/client';
import { toast } from '../components/ui';
import Skeleton from '../components/ui/Skeleton';
import ExpenseSheet from '../components/ExpenseSheet';

// ── Category colour palette ───────────────────────────────────────────────────
// Hashes a category name to one of several Tailwind badge classes so each
// category consistently uses the same colour without needing a lookup table.
const CATEGORY_COLORS = [
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-amber-500/20 text-amber-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20 text-rose-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-orange-500/20 text-orange-300',
  'bg-indigo-500/20 text-indigo-300',
];

function categoryColorClass(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

// ── Loading skeleton row ──────────────────────────────────────────────────────
function ExpenseRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-surface-muted/40 last:border-0">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyExpenses() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-4">
        <Receipt className="w-6 h-6 text-zinc-500" />
      </div>
      <p className="text-zinc-300 font-medium mb-1">No expenses found</p>
      <p className="text-zinc-500 text-sm">Log your first expense to see it here.</p>
    </div>
  );
}

// ── Main Expenses page ────────────────────────────────────────────────────────
export default function Expenses() {
  const { currencySymbol, hasMinRole } = useAuth();

  const canManage = hasMinRole('MANAGER');
  const isOwner = hasMinRole('OWNER');

  // Date range defaults: first day of current month  today
  const [startDate, setStartDate] = useState(
    dayjs().startOf('month').format('YYYY-MM-DD')
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [categoryFilter, setCategoryFilter] = useState('');

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        startDate,
        endDate,
        ...(categoryFilter.trim() ? { category: categoryFilter.trim() } : {}),
      };
      const res = await expensesApi.getAll(params);
      setExpenses(res.data?.data?.expenses ?? []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryFilter]);

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Delete expense with confirmation
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await expensesApi.delete(id);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  // Total for the filtered period
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Expenses</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track and manage business expenses</p>
        </div>

        {canManage && (
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand/20"
          >
            <Plus className="w-4 h-4" />
            Log Expense
          </button>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Start date */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-subtle border border-surface-muted/60 text-zinc-200 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>

        {/* End date */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-subtle border border-surface-muted/60 text-zinc-200 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>

        {/* Category filter */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-400 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Category
          </label>
          <input
            type="text"
            placeholder="All categories"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-subtle border border-surface-muted/60 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors w-36"
          />
        </div>
      </div>

      {/* ── Summary bar ────────────────────────────────────────────── */}
      {!loading && expenses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-subtle border border-surface-muted/50 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span className="text-sm text-zinc-400">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} in selected period
          </span>
          <span className="text-base font-bold text-zinc-100">
            {currencySymbol}{totalExpenses.toFixed(2)}
          </span>
        </motion.div>
      )}

      {/* ── Expense list ───────────────────────────────────────────── */}
      <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <ExpenseRowSkeleton key={i} />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyExpenses />
        ) : (
          <AnimatePresence initial={false}>
            {expenses.map((expense, i) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-muted/40 last:border-0 hover:bg-surface-muted/20 transition-colors group"
              >
                {/* Date */}
                <div className="w-24 flex-shrink-0">
                  <p className="text-xs text-zinc-400">
                    {dayjs(expense.expenseDate).format('DD MMM YYYY')}
                  </p>
                </div>

                {/* Category badge */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColorClass(expense.category)}`}>
                    {expense.category}
                  </span>
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  {expense.description ? (
                    <p className="text-sm text-zinc-300 truncate flex items-center gap-1">
                      <FileText className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                      {expense.description}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">No description</p>
                  )}
                </div>

                {/* Receipt thumbnail */}
                {expense.receiptImageUrl && (
                  <a
                    href={expense.receiptImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                    title="View receipt"
                  >
                    <img
                      src={expense.receiptImageUrl}
                      alt="Receipt"
                      className="h-8 w-8 object-cover rounded-lg border border-surface-muted/60 hover:opacity-80 transition-opacity"
                    />
                  </a>
                )}

                {/* Amount */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-zinc-200 tabular-nums">
                    {currencySymbol}{(expense.amount ?? 0).toFixed(2)}
                  </p>
                </div>

                {/* Delete — OWNER only */}
                {isOwner && (
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── ExpenseSheet slide-over ─────────────────────────────────── */}
      <ExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
