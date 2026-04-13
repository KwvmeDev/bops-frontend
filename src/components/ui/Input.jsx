import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Input({
  label,
  error,
  type = 'text',
  className,
  id,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        <motion.div
          animate={error ? { x: [-6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        >
          <input
            id={id}
            type={inputType}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg text-sm',
              'bg-surface-muted border text-zinc-100 placeholder:text-zinc-500',
              'transition-all duration-200',
              'focus:outline-none',
              focused && !error && 'border-brand/60 ring-2 ring-brand/20',
              !focused && !error && 'border-surface-overlay',
              error && 'border-danger/60 ring-2 ring-danger/20',
              isPassword && 'pr-10',
              className
            )}
            {...props}
          />
        </motion.div>

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {showPassword ? (
                <motion.span key="off" initial={{ opacity: 0, rotate: -10 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 10 }} transition={{ duration: 0.15 }}>
                  <EyeOff className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="on" initial={{ opacity: 0, rotate: 10 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -10 }} transition={{ duration: 0.15 }}>
                  <Eye className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-xs text-danger-light"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
