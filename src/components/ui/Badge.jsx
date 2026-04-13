import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';

const variants = {
  default:  'bg-surface-overlay text-zinc-300',
  brand:    'bg-brand/15 text-brand-light border border-brand/20',
  success:  'bg-success/10 text-success-light border border-success/20',
  warning:  'bg-warning/10 text-warning-light border border-warning/20',
  danger:   'bg-danger/10 text-danger-light border border-danger/20',
  info:     'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

export default function Badge({ variant = 'default', dot, live, className, children }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' ? 'bg-success' :
          variant === 'warning' ? 'bg-warning' :
          variant === 'danger'  ? 'bg-danger' :
          variant === 'brand'   ? 'bg-brand' : 'bg-zinc-400',
          live && 'animate-pulse'
        )} />
      )}
      {children}
    </span>
  );
}

export function NumberBadge({ value, className }) {
  const spring = useSpring(value, { damping: 20, stiffness: 200 });
  const display = useTransform(spring, v => Math.round(v));

  return (
    <motion.span
      key={value}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-danger text-white',
        className
      )}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}
