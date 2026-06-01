import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// One-time modal shown after the second location is successfully created.
// Guards against re-showing via localStorage key 'klevr_ob_location_added'.
// Props:
//   onDismiss — called when the user clicks "Got it"; parent should hide
//               this component by toggling its own showNudge state.
export default function LocationAddedNudge({ onDismiss }) {
  // Check on mount — if already dismissed, bail out immediately.
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem('klevr_ob_location_added')
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('klevr_ob_location_added', '1');
    setDismissed(true);
    onDismiss?.();
  };

  return (
    // Using AnimatePresence at the callsite is sufficient; the motion.div
    // here provides the entrance animation when the component first mounts.
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="location-added-nudge-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md mx-4 mt-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
          >
            {/* Header */}
            <h2 className="text-base font-semibold text-zinc-100 mb-3">
              You're set up for multi-location!
            </h2>

            {/* Three bullet points */}
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                Use the location switcher in the sidebar to switch between branches
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                Each location has its own stock — transfer stock via the Transfers page
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                As owner, select &ldquo;All Locations&rdquo; for a combined view of all branches
              </li>
            </ul>

            {/* Dismiss CTA */}
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
