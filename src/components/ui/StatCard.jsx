import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const spring = useSpring(0, { damping: 25, stiffness: 100 });
  const display = useTransform(spring, v =>
    `${prefix}${v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`
  );

  useEffect(() => { spring.set(value); }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export default function StatCard({ title, value, prefix, suffix, decimals, trend, trendLabel, icon: Icon, className, sparklineData, color = '#6366f1' }) {
  const trendPositive = trend > 0;
  const trendNeutral = trend === 0 || trend == null;

  // Normalise sparkline payload — each entry must be { v: number } for the Bar dataKey
  const sparkPoints = Array.isArray(sparklineData) && sparklineData.length > 0
    ? sparklineData.map((entry) => ({ v: typeof entry === 'number' ? entry : (entry?.value ?? entry?.total ?? 0) }))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'p-5 rounded-xl border border-surface-muted/50 bg-surface-subtle space-y-2',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-light" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-100 font-display">
        <AnimatedNumber value={value ?? 0} prefix={prefix} suffix={suffix} decimals={decimals} />
      </p>
      {trendLabel && (
        <div className={cn('flex items-center gap-1 text-xs', trendNeutral ? 'text-zinc-500' : trendPositive ? 'text-success' : 'text-danger-light')}>
          <motion.span
            key={trend}
            initial={{ rotate: 0 }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {trendNeutral ? <Minus className="w-3 h-3" /> : trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </motion.span>
          {trendLabel}
        </div>
      )}
      {/* 7-day mini sparkline — only rendered when data is available, hidden when printing */}
      {sparkPoints && (
        <div className="print:hidden pt-1">
          <ResponsiveContainer width="100%" height={40}>
            <BarChart data={sparkPoints} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="20%">
              <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
