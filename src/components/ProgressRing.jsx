import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * ProgressRing — animated SVG circular progress indicator.
 *
 * Props:
 *   value     {number}  — 0–100 percentage
 *   size      {number}  — diameter in px (default 48)
 *   stroke    {number}  — stroke width (default 4)
 *   color     {string}  — stroke color (default "currentColor")
 *   trackColor {string} — background ring color (default "rgba(255,255,255,0.1)")
 *   children  {node}    — content rendered in center
 *   className {string}
 */
export default function ProgressRing({
  value = 0,
  size = 48,
  stroke = 4,
  color = 'currentColor',
  trackColor = 'rgba(255,255,255,0.1)',
  children,
  className = '',
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const spring = useSpring(value, { stiffness: 60, damping: 18 });

  useEffect(() => {
    spring.set(Math.min(100, Math.max(0, value)));
  }, [value, spring]);

  const dashOffset = useTransform(spring, (v) => circumference - (v / 100) * circumference);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
