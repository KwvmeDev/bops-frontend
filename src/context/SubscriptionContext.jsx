import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { billingApi } from '../api/client';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  // Cooldown: once the user dismisses the modal we won't auto-reopen it
  // for 24 hours. Stored in localStorage so it survives page refreshes.
  // Manual clicks of "Upgrade" still bypass this (openUpgradeModal is unguarded).
  const UPGRADE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
  const UPGRADE_DISMISSED_KEY = 'klevr_upgrade_dismissed_at';

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await billingApi.getSubscription();
      const data = res.data.data;
      setSubscription(data.subscription);
      setPlan(data.plan);
      setIsTrialing(data.isTrialing);
      setTrialDaysLeft(data.trialDaysLeft);
      setIsExpired(data.isExpired);
    } catch {
      // Non-fatal — subscription info unavailable
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Listen for upgrade events dispatched by the API interceptor (client.js).
  // Guards:
  //  1. Modal already open — no-op (deduplicates concurrent 403s from multi-request pages)
  //  2. User dismissed within the last 24 hours — silently ignored
  //     (stored in localStorage so the cooldown survives page refreshes)
  useEffect(() => {
    const openIfAllowed = () => {
      setUpgradeModalOpen((current) => {
        if (current) return current; // already visible

        const dismissedAt = localStorage.getItem(UPGRADE_DISMISSED_KEY);
        if (dismissedAt) {
          const elapsed = Date.now() - Number(dismissedAt);
          if (elapsed < UPGRADE_COOLDOWN_MS) return current; // within cooldown
        }

        return true;
      });
    };

    window.addEventListener('upgrade-required', openIfAllowed);
    window.addEventListener('subscription-expired', openIfAllowed);

    return () => {
      window.removeEventListener('upgrade-required', openIfAllowed);
      window.removeEventListener('subscription-expired', openIfAllowed);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAccess = useCallback(
    (feature) => {
      if (!plan) return false;
      return plan[feature] === true;
    },
    [plan]
  );

  const openUpgradeModal = useCallback(() => setUpgradeModalOpen(true), []);
  const closeUpgradeModal = useCallback(() => {
    localStorage.setItem(UPGRADE_DISMISSED_KEY, String(Date.now()));
    setUpgradeModalOpen(false);
  }, [UPGRADE_DISMISSED_KEY]);

  const value = {
    subscription,
    plan,
    isTrialing,
    trialDaysLeft,
    isExpired,
    loading,
    upgradeModalOpen,
    canAccess,
    refresh: fetchSubscription,
    openUpgradeModal,
    closeUpgradeModal,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export default SubscriptionContext;
