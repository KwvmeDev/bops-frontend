import { useCallback, useEffect, useRef, useState } from 'react';

// How long each role can be idle before we start the countdown
const ROLE_IDLE_MS = {
  CASHIER: 15 * 60 * 1000,  // 15 min
  MANAGER: 30 * 60 * 1000,  // 30 min
  OWNER:   60 * 60 * 1000,  // 60 min
};

const WARNING_MS = 60_000; // 60-second countdown before auto-logout
const WARNING_S  = 60;

/**
 * Tracks user inactivity and exposes a warning countdown.
 *
 * @param {object}   options
 * @param {string}   options.role      – User's role (CASHIER | MANAGER | OWNER)
 * @param {Function} options.onTimeout – Called when the countdown reaches zero
 * @param {boolean}  [options.enabled] – Set false to pause tracking (e.g. logged out)
 *
 * @returns {{ warningVisible: boolean, secondsLeft: number, stayLoggedIn: Function }}
 */
export function useInactivityTimeout({ role, onTimeout, enabled = true }) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_S);

  // Refs for timer handles (so we can cancel from any callback without stale closure issues)
  const idleTimer     = useRef(null);
  const logoutTimer   = useRef(null);
  const countdownInt  = useRef(null);

  // Ref mirror so event listeners don't capture stale state
  const isWarning     = useRef(false);

  // Keep onTimeout stable via ref — caller doesn't need to memoize it
  const onTimeoutRef  = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const idleMs = ROLE_IDLE_MS[role] ?? ROLE_IDLE_MS.CASHIER;
  const idleMsRef = useRef(idleMs);
  useEffect(() => { idleMsRef.current = idleMs; }, [idleMs]);

  // ─── helpers ────────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(logoutTimer.current);
    clearInterval(countdownInt.current);
  }, []);

  const startWarning = useCallback(() => {
    isWarning.current = true;
    setWarningVisible(true);

    let s = WARNING_S;
    setSecondsLeft(s);

    countdownInt.current = setInterval(() => {
      s -= 1;
      setSecondsLeft(s);
    }, 1_000);

    logoutTimer.current = setTimeout(() => {
      clearInterval(countdownInt.current);
      isWarning.current = false;
      setWarningVisible(false);
      onTimeoutRef.current();
    }, WARNING_MS);
  }, []);

  /** Reset to idle state and start a fresh idle countdown. */
  const arm = useCallback(() => {
    clearAll();
    isWarning.current = false;
    setWarningVisible(false);
    setSecondsLeft(WARNING_S);

    const waitMs = Math.max(idleMsRef.current - WARNING_MS, 0);
    idleTimer.current = setTimeout(startWarning, waitMs);
  }, [clearAll, startWarning]);

  // ─── activity listener ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) {
      clearAll();
      return;
    }

    const onActivity = () => {
      // Do not reset while the warning is showing — the user must click "Stay logged in"
      if (!isWarning.current) arm();
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    arm(); // kick off on mount / when enabled flips true

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearAll();
    };
  }, [enabled, arm, clearAll]);

  // ─── public API ──────────────────────────────────────────────────────────────

  /** Called when the user clicks "Stay logged in" — dismisses modal, resets timer. */
  const stayLoggedIn = useCallback(() => {
    arm();
  }, [arm]);

  return { warningVisible, secondsLeft, stayLoggedIn };
}
