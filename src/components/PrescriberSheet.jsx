import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { toast } from './ui';
import { prescribersApi } from '../api/client';

/**
 * PrescriberSheet — small slide-up/side Sheet for adding a new prescriber.
 *
 * Props:
 *   open          — boolean controlling sheet visibility
 *   onOpenChange  — callback to toggle open state
 *   onSuccess     — callback(newPrescriber) invoked after a successful save
 */
export default function PrescriberSheet({ open, onOpenChange, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    licenceNumber: '',
    specialisation: '',
    hospital: '',
    phone: '',
  });

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const reset = () => {
    setForm({ name: '', licenceNumber: '', specialisation: '', hospital: '', phone: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Prescriber name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.licenceNumber.trim() ? { licenceNumber: form.licenceNumber.trim() } : {}),
        ...(form.specialisation.trim() ? { specialisation: form.specialisation.trim() } : {}),
        ...(form.hospital.trim() ? { hospital: form.hospital.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      };

      const res = await prescribersApi.create(payload);
      const newPrescriber = res.data?.data;
      toast.success(`Prescriber "${newPrescriber.name}" added`);
      reset();
      onOpenChange(false);
      onSuccess?.(newPrescriber);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add prescriber');
    } finally {
      setLoading(false);
    }
  };

  // Field config drives the rendered inputs to keep the form DRY
  const fields = [
    { id: 'name',           label: 'Full Name',       required: true,  placeholder: 'Dr. Kofi Asante' },
    { id: 'licenceNumber',  label: 'Licence Number',  required: false, placeholder: 'GH-MED-1234' },
    { id: 'specialisation', label: 'Specialisation',  required: false, placeholder: 'General Practitioner' },
    { id: 'hospital',       label: 'Hospital / Clinic', required: false, placeholder: 'Korle-Bu Teaching Hospital' },
    { id: 'phone',          label: 'Phone',           required: false, placeholder: '+233...' },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        if (!val) reset();
        onOpenChange(val);
      }}
      title="Add Prescriber"
      description="Record a prescribing doctor or practitioner."
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {fields.map(({ id, label, required, placeholder }) => (
          <div key={id} className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">
              {label}{' '}
              {!required && <span className="text-zinc-500 font-normal">(optional)</span>}
            </label>
            <input
              type="text"
              value={form[id]}
              onChange={handleChange(id)}
              placeholder={placeholder}
              required={required}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-base border border-surface-muted/60 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
            />
          </div>
        ))}

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => { reset(); onOpenChange(false); }}
            className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : 'Save Prescriber'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
