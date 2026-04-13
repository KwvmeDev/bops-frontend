import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

export default function TrialBanner() {
  const { isTrialing, trialDaysLeft, openUpgradeModal } = useSubscription();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('trial-banner-dismissed') === 'true'
  );

  if (!isTrialing || dismissed) return null;

  const isUrgent = trialDaysLeft <= 2;
  const isWarning = trialDaysLeft <= 5;

  const bannerClass = isUrgent
    ? 'bg-red-600 text-white'
    : isWarning
    ? 'bg-amber-500 text-white'
    : 'bg-indigo-600 text-white';

  const handleDismiss = () => {
    sessionStorage.setItem('trial-banner-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className={`${bannerClass} px-4 py-2 flex items-center justify-between text-sm`}>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 flex-shrink-0" />
        <span>
          {trialDaysLeft === 0
            ? 'Your free trial expires today.'
            : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial.`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={openUpgradeModal}
          className="font-semibold underline underline-offset-2 hover:no-underline transition-all"
        >
          Upgrade Now
        </button>
        <button
          onClick={handleDismiss}
          className="opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Dismiss trial banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
