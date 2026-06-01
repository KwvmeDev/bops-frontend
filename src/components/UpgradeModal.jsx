import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Loader2 } from 'lucide-react';
import { billingApi } from '../api/client';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';

const PLANS = [
  {
    name: 'Starter',
    displayName: 'Starter',
    priceMonthly: 29,
    paystackPlanCode: import.meta.env.VITE_PAYSTACK_STARTER_PLAN_CODE || '',
    features: [
      'Up to 5 staff accounts',
      'Up to 500 products',
      'Daily & weekly reports',
      'CSV data export',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    displayName: 'Pro',
    priceMonthly: 79,
    paystackPlanCode: import.meta.env.VITE_PAYSTACK_PRO_PLAN_CODE || '',
    features: [
      'Up to 20 staff accounts',
      'Unlimited products',
      'Profit margin reports',
      'CSV data export',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    displayName: 'Enterprise',
    priceMonthly: 199,
    paystackPlanCode: import.meta.env.VITE_PAYSTACK_ENTERPRISE_PLAN_CODE || '',
    features: [
      'Unlimited staff accounts',
      'Unlimited products',
      'All reports + profit analysis',
      'API access',
      'Dedicated support',
    ],
    highlighted: false,
  },
];

export default function UpgradeModal() {
  const { upgradeModalOpen, closeUpgradeModal } = useSubscription();
  const { geoSymbol, convertPrice } = useAuth();
  const displaySymbol = geoSymbol ?? '$';
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  const handleSelectPlan = async (plan) => {
    if (!plan.paystackPlanCode) {
      setError('Plan configuration is incomplete. Please contact support.');
      return;
    }
    setLoadingPlan(plan.name);
    setError('');
    try {
      const res = await billingApi.createCheckout(plan.paystackPlanCode);
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <AnimatePresence>
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeUpgradeModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative w-full max-w-3xl bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-brand-light" />
                </div>
                <h2 className="text-base font-semibold text-zinc-100">Upgrade Your Plan</h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={closeUpgradeModal}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-surface-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Sub-header */}
            <div className="px-6 py-3 bg-surface-muted/30 border-b border-surface-muted/50">
              <p className="text-xs text-zinc-500 text-center">
                Choose a plan to continue. Cancel anytime, no lock-in.
              </p>
            </div>

            {/* Plan cards */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-xl border p-5 flex flex-col ${
                    plan.highlighted
                      ? 'border-brand/40 bg-brand/[0.04]'
                      : 'border-surface-overlay/50 bg-surface-muted/20'
                  }`}
                  style={plan.highlighted ? { boxShadow: '0 0 30px rgba(34,197,94,0.07)' } : {}}
                >
                  {plan.highlighted && (
                    <div className="text-xs font-semibold text-brand-light uppercase tracking-wide mb-2">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="text-sm font-semibold text-zinc-200">{plan.displayName}</div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-2xl font-bold text-zinc-100">{displaySymbol}{convertPrice(plan.priceMonthly).toLocaleString()}</span>
                      <span className="text-xs text-zinc-500 mb-0.5">/mo</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-zinc-400">
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-brand' : 'text-zinc-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.highlighted
                        ? 'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20'
                        : 'bg-surface-overlay hover:bg-surface-overlay/80 text-zinc-300'
                    }`}
                  >
                    {loadingPlan === plan.name
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Choose Plan'
                    }
                  </motion.button>
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-6 mb-4 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger-light">
                {error}
              </div>
            )}

            <div className="px-6 pb-5 text-center">
              <p className="text-xs text-zinc-600">
                Secure payment via Paystack. All plans include a 30-day money-back guarantee.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
