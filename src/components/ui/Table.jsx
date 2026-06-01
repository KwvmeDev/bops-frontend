import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SkeletonTableRow } from './Skeleton';

export function Table({ className, children }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return <thead className="border-b border-surface-muted/50">{children}</thead>;
}

export function Tbody({ loading, loadingRows = 5, cols = 4, children }) {
  if (loading) {
    return (
      <tbody>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    );
  }
  return <tbody>{children}</tbody>;
}

export function Th({ sortKey, currentSort, onSort, className, children }) {
  const isActive = currentSort?.key === sortKey;
  const dir = currentSort?.dir;

  return (
    <th
      onClick={() => sortKey && onSort?.(sortKey)}
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap',
        sortKey && 'cursor-pointer hover:text-zinc-300 select-none transition-colors',
        isActive && 'text-zinc-200',
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey && (
          <span className="text-zinc-600">
            {isActive ? (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3" />}
          </span>
        )}
      </span>
    </th>
  );
}

export function Tr({ className, children, ...props }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn('border-b border-surface-muted/30 hover:bg-surface-muted/40 transition-colors', className)}
      {...props}
    >
      {children}
    </motion.tr>
  );
}

export function Td({ className, children }) {
  return <td className={cn('px-4 py-3 text-sm text-zinc-300', className)}>{children}</td>;
}
