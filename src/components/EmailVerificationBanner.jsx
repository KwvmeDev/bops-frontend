import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Mail, X, CheckCircle } from 'lucide-react';

const DISMISSED_KEY = 'email_verify_banner_dismissed';

export default function EmailVerificationBanner() {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === 'true');
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!isAuthenticated || user?.emailVerified || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await authApi.resendVerification();
      setSent(true);
      setCooldown(60);
    } catch (err) {
      console.error('Failed to resend verification email', err);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-amber-800 flex-wrap">
        <Mail className="w-4 h-4 flex-shrink-0" />
        <span>Please verify your email address to unlock all features.</span>
        {sent ? (
          <span className="flex items-center gap-1 text-green-700 font-medium">
            <CheckCircle className="w-4 h-4" /> Sent!
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="font-medium underline underline-offset-2 hover:text-amber-900 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </button>
        )}
      </div>
      <button onClick={handleDismiss} className="text-amber-600 hover:text-amber-800 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
