import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Select({ value, onChange, options = [], placeholder = 'Select…', label, error, disabled, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={cn('relative', className)} ref={ref}>
      {label && <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm',
          'bg-surface-muted border text-zinc-100',
          'transition-all duration-200 focus:outline-none',
          open ? 'border-brand/60 ring-2 ring-brand/20' : 'border-surface-overlay',
          error && 'border-danger/60',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={selected ? 'text-zinc-100' : 'text-zinc-500'}>{selected?.label ?? placeholder}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top' }}
            className="absolute z-50 w-full mt-1.5 bg-surface-subtle border border-surface-overlay rounded-xl shadow-xl overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange?.(opt.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-muted transition-colors',
                    value === opt.value ? 'text-zinc-100' : 'text-zinc-400'
                  )}
                >
                  {opt.label}
                  {value === opt.value && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 400 }}>
                      <Check className="w-4 h-4 text-brand-light" />
                    </motion.span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
