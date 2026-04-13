import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function Card({ interactive, bordered, className, children, ...props }) {
  const base = cn(
    'rounded-xl border bg-surface-subtle text-zinc-100',
    bordered ? 'border-surface-overlay' : 'border-surface-muted/50',
    className
  );

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(base, 'cursor-pointer')}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={base} {...props}>{children}</div>;
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-4 border-b border-surface-muted/50', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-4 border-t border-surface-muted/50', className)} {...props}>
      {children}
    </div>
  );
}
