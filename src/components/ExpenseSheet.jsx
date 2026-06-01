import { useState } from 'react';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Sheet } from './ui/Sheet';
import { toast } from './ui';
import { expensesApi } from '../api/client';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';

// Common expense category presets shown in the select
const CATEGORY_PRESETS = [
  'Rent',
  'Utilities',
  'Staff',
  'Supplies',
  'Transport',
  'Marketing',
  'Other',
];

/**
 * Slide-over sheet for logging a new expense.
 *
 * Props:
 *   open          — boolean controlling sheet visibility
 *   onOpenChange  — callback to toggle open state
 *   onSuccess     — callback invoked after successful expense creation
 */
export default function ExpenseSheet({ open, onOpenChange, onSuccess }) {
  const { upload, uploading, uploadError, reset: resetUpload } = useCloudinaryUpload();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [receiptUrl, setReceiptUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDescription('');
    setExpenseDate(dayjs().format('YYYY-MM-DD'));
    setReceiptUrl('');
    setPreviewUrl('');
    resetUpload();
  };

  // Handle receipt image file selection — uploads directly to Cloudinary
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show a local object URL as an instant preview while upload is in progress
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setReceiptUrl('');

    try {
      const secureUrl = await upload(file);
      setReceiptUrl(secureUrl);
    } catch {
      // uploadError is set by the hook; show a toast for immediacy
      toast.error('Receipt upload failed — you can still save without it');
      setPreviewUrl('');
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl('');
    setPreviewUrl('');
    resetUpload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        amount: parseFloat(amount),
        category: category.trim(),
        expenseDate,
        ...(description.trim() ? { description: description.trim() } : {}),
        // Only include receipt URL once the Cloudinary upload has completed
        ...(receiptUrl ? { receiptImageUrl: receiptUrl } : {}),
      };

      await expensesApi.create(payload);
      toast.success('Expense logged');
      onSuccess?.();
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
      title="Log Expense"
      description="Record a business expense and optionally attach a receipt photo."
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Amount <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors appearance-none"
          >
            <option value="" disabled>Select a category...</option>
            {CATEGORY_PRESETS.map(preset => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={e => setExpenseDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Description <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="What was this expense for?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors resize-none"
          />
        </div>

        {/* Receipt photo */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-300">
            Receipt Photo <span className="text-zinc-500 font-normal">(optional)</span>
          </label>

          {/* Preview / upload state */}
          {previewUrl ? (
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="h-24 w-24 object-cover rounded-xl border border-surface-muted/60"
              />
              {/* Uploading spinner overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              {/* Remove button */}
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {/* Upload success indicator */}
              {receiptUrl && !uploading && (
                <div className="mt-1 text-xs text-emerald-400">Uploaded</div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-surface-muted/60 bg-surface-base hover:border-brand/40 hover:bg-brand/5 cursor-pointer transition-colors">
              <ImageIcon className="w-5 h-5 text-zinc-500" />
              <span className="text-xs text-zinc-500">
                {uploading ? 'Uploading...' : 'Click to attach receipt'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          )}

          {/* Upload error message */}
          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving...' : 'Log Expense'}
        </button>
      </form>
    </Sheet>
  );
}
