import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * AnimatedNumber — spring-animated numeric display.
 *
 * Props:
 *   value     {number}  — target value
 *   prefix    {string}  — prepended string (e.g. "$")
 *   suffix    {string}  — appended string (e.g. "%")
 *   decimals  {number}  — decimal places (default 0)
 *   className {string}  — additional class names
 */
export default function AnimatedNumber({ value = 0, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) => {
    const formatted = v.toFixed(decimals);
    return `${prefix}${formatted}${suffix}`;
  });

  return <motion.span className={className}>{display}</motion.span>;
}
