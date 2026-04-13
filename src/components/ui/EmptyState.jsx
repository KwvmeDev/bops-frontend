import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, onAction, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {Icon && (
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center mb-5"
        >
          <Icon className="w-8 h-8 text-zinc-500" />
        </motion.div>
      )}
      <h3 className="text-base font-semibold text-zinc-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-zinc-500 max-w-sm mb-5">{description}</p>}
      {action && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light hover:text-brand transition-colors"
        >
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="flex items-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
          </motion.span>
          {action}
        </button>
      )}
    </div>
  );
}
