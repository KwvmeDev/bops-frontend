import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { Sheet, toast } from './ui';
import apiClient from '../api/client';

// Blank form used for initialisation and post-submit reset
const EMPTY_FORM = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

const inputClass =
  'w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all disabled:opacity-50';
const textareaClass =
  'w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all disabled:opacity-50 resize-none';
const labelClass = 'block text-xs font-medium text-zinc-400 mb-1.5';
const errorClass = 'text-xs text-red-400 mt-1';

/**
 * SupplierSheet — slide-over panel for creating or editing a supplier.
 *
 * Props:
 *   open         — controls Sheet visibility
 *   onOpenChange — called with true/false when the sheet should open or close
 *   supplierId   — when set  edit mode (fetches supplier on open); when null/undefined  create mode
 *   onSuccess    — called after a successful save, receives the saved supplier object
 */
export default function SupplierSheet({ open, onOpenChange, supplierId, onSuccess }) {
  const isEditing = Boolean(supplierId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);   // fetch loading (edit mode)
  const [submitting, setSubmitting] = useState(false);

  // Populate form when switching into edit mode or when the sheet opens with a supplierId
  useEffect(() => {
    if (!open) return;

    if (!supplierId) {
      // Create mode — ensure form is blank each time the sheet opens
      setForm(EMPTY_FORM);
      setFieldErrors({});
      return;
    }

    // Edit mode — fetch supplier details
    let cancelled = false;
    const fetchSupplier = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/suppliers/${supplierId}`);
        const s = res.data?.data ?? res.data;
        if (!cancelled) {
          setForm({
            name: s.name ?? '',
            contactName: s.contactName ?? '',
            phone: s.phone ?? '',
            email: s.email ?? '',
            address: s.address ?? '',
            notes: s.notes ?? '',
          });
          setFieldErrors({});
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load supplier details');
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSupplier();
    return () => { cancelled = true; };
  }, [open, supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Clear a single field error when the user starts typing in that field
  const clearError = (key) => () =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      let res;
      if (isEditing) {
        res = await apiClient.put(`/suppliers/${supplierId}`, payload);
      } else {
        res = await apiClient.post('/suppliers', payload);
      }

      const saved = res.data?.data ?? res.data;
      toast.success(isEditing ? 'Supplier updated' : 'Supplier created');
      onSuccess?.(saved);
      onOpenChange(false);
    } catch (err) {
      const responseData = err.response?.data;
      const status = err.response?.status;

      // Map field-level validation errors (400/422) to inline messages
      if ((status === 400 || status === 422) && responseData?.errors) {
        const mapped = {};
        for (const fe of responseData.errors) {
          // Support both { field, message } and Zod { path, message } shapes
          const key = fe.field ?? fe.path?.[0];
          if (key) mapped[key] = fe.message;
        }
        setFieldErrors(mapped);
        // If no mappable field errors, fall through to generic toast
        if (Object.keys(mapped).length > 0) return;
      }

      toast.error(responseData?.error ?? 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Content rendered inside Sheet's scrollable child area */}
      <div className="flex flex-col h-full bg-surface-subtle">

        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-semibold text-zinc-100">
            {isEditing ? 'Edit Supplier' : 'New Supplier'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading skeleton while fetching in edit mode */}
        {loading ? (
          <div className="flex-1 p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-surface-muted rounded animate-pulse mb-2" />
                <div className="h-10 bg-surface-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Form body */}
            <form
              id="supplier-form"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {/* Supplier name — required */}
              <div>
                <label className={labelClass}>Supplier name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={setField('name')}
                  onFocus={clearError('name')}
                  placeholder="Acme Wholesale Ltd"
                  className={inputClass}
                />
                {fieldErrors.name && (
                  <p className={errorClass}>{fieldErrors.name}</p>
                )}
              </div>

              {/* Contact person */}
              <div>
                <label className={labelClass}>Contact person</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={setField('contactName')}
                  onFocus={clearError('contactName')}
                  placeholder="Jane Smith"
                  className={inputClass}
                />
                {fieldErrors.contactName && (
                  <p className={errorClass}>{fieldErrors.contactName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={setField('phone')}
                  onFocus={clearError('phone')}
                  placeholder="+1 555 000 0000"
                  className={inputClass}
                />
                {fieldErrors.phone && (
                  <p className={errorClass}>{fieldErrors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  onFocus={clearError('email')}
                  placeholder="orders@acme.com"
                  className={inputClass}
                />
                {fieldErrors.email && (
                  <p className={errorClass}>{fieldErrors.email}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className={labelClass}>Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={setField('address')}
                  onFocus={clearError('address')}
                  placeholder="123 Industrial Ave, City, Country"
                  className={textareaClass}
                />
                {fieldErrors.address && (
                  <p className={errorClass}>{fieldErrors.address}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={setField('notes')}
                  onFocus={clearError('notes')}
                  placeholder="Payment terms, special instructions..."
                  className={textareaClass}
                />
                {fieldErrors.notes && (
                  <p className={errorClass}>{fieldErrors.notes}</p>
                )}
              </div>
            </form>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
              <motion.button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                form="supplier-form"
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Update Supplier' : 'Add Supplier'
                )}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
