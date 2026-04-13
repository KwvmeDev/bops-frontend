import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function Toggle({ checked, onChange, disabled, label, description, className }) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-brand' : 'bg-surface-overlay'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm mt-1',
            checked ? 'ml-6' : 'ml-1'
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <p className="text-sm font-medium text-zinc-200">{label}</p>}
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
      )}
    </div>
  );
}
