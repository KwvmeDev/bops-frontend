import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Small animated callout shown on first visit to /pick-location for OWNER
// users, positioned below the "All Locations" card.
// Guards via localStorage key 'klevr_ob_picker_seen'.
// Auto-dismisses after 6 seconds.
//
// Props:
//   onDismiss — called when the tooltip hides (auto or manual)
export default function LocationPickerTooltip({ onDismiss }) {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem('klevr_ob_picker_seen')
  );

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      dismiss();
    }, 6000);

    return () => clearTimeout(timer);
    // dismiss is stable — no dependency needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    localStorage.setItem('klevr_ob_picker_seen', '1');
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="location-picker-tooltip"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-2 bg-brand/10 border border-brand/30 text-brand-light rounded-lg p-3 text-xs"
          // Clicking the tooltip itself also dismisses it
          onClick={dismiss}
          role="status"
          aria-live="polite"
        >
          {/* Small up-pointing caret to visually connect to the card above */}
          <span
            aria-hidden="true"
            className="absolute -top-1.5 left-5 w-3 h-3 bg-brand/10 border-l border-t border-brand/30 rotate-45"
          />
          As an owner, All Locations gives you a combined view of revenue and
          stock across all branches
        </motion.div>
      )}
    </AnimatePresence>
  );
}
