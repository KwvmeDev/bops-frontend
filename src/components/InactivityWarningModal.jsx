import { AnimatePresence, motion } from 'framer-motion';

// SVG ring geometry
const RADIUS      = 28;
const STROKE      = 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 175.9

/**
 * Full-screen modal shown when the user has been idle too long.
 *
 * @param {object}   props
 * @param {boolean}  props.visible      – Whether the modal is open
 * @param {number}   props.secondsLeft  – Countdown seconds remaining (0–60)
 * @param {Function} props.onStay       – "Stay logged in" handler
 * @param {Function} props.onLogout     – "Sign out now" handler
 */
export default function InactivityWarningModal({ visible, secondsLeft, onStay, onLogout }) {
  const progress    = Math.max(0, Math.min(1, secondsLeft / 60));
  const strokeOffset = CIRCUMFERENCE * (1 - progress);
  const isUrgent   = secondsLeft <= 10;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="inactivity-backdrop"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            key="inactivity-card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative bg-surface-subtle border border-surface-muted rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Countdown ring ── */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg
                viewBox="0 0 64 64"
                className="w-full h-full -rotate-90"
                aria-hidden="true"
              >
                {/* Track */}
                <circle
                  cx="32" cy="32"
                  r={RADIUS}
                  fill="none"
                  strokeWidth={STROKE}
                  className="stroke-surface-muted"
                />
                {/* Progress arc */}
                <circle
                  cx="32" cy="32"
                  r={RADIUS}
                  fill="none"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeOffset}
                  className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${
                    isUrgent ? 'stroke-red-500' : 'stroke-amber-400'
                  }`}
                />
              </svg>

              {/* Number in the middle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-2xl font-bold tabular-nums leading-none ${
                    isUrgent ? 'text-red-400' : 'text-zinc-100'
                  }`}
                >
                  {secondsLeft}
                </span>
              </div>
            </div>

            {/* ── Copy ── */}
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">
              Still there?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              You've been inactive for a while. For your security, we'll sign you
              out automatically in{' '}
              <span className={`font-medium ${isUrgent ? 'text-red-400' : 'text-zinc-200'}`}>
                {secondsLeft}s
              </span>
              .
            </p>

            {/* ── Actions ── */}
            <div className="flex flex-col gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onStay}
                className="w-full px-4 py-2.5 bg-brand hover:opacity-90 active:opacity-80 rounded-lg text-sm font-semibold text-white transition-opacity"
              >
                Stay logged in
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onLogout}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-surface-muted transition-colors"
              >
                Sign out now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
