import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Listen for upgrade events from API interceptor
  useEffect(() => {
    const handleUpgradeRequired = () => setUpgradeModalOpen(true);
    const handleSubscriptionExpired = () => setUpgradeModalOpen(true);

    window.addEventListener('upgrade-required', handleUpgradeRequired);
    window.addEventListener('subscription-expired', handleSubscriptionExpired);

    return () => {
      window.removeEventListener('upgrade-required', handleUpgradeRequired);
      window.removeEventListener('subscription-expired', handleSubscriptionExpired);
    };
  }, []);

  const canAccess = useCallback(
    (feature) => {
      if (!plan) return false;
      return plan[feature] === true;
    },
    [plan]
  );

  const openUpgradeModal = useCallback(() => setUpgradeModalOpen(true), []);
  const closeUpgradeModal = useCallback(() => setUpgradeModalOpen(false), []);

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
