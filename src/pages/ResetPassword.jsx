import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/client';
import { KeyRound, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const bgStyle = { background: 'radial-gradient(ellipse at 50% 35%, rgba(99,102,241,0.10) 0%, #09090b 65%)' };
const inputClass = "w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (success) {
      const interval = setInterval(() => setCountdown(c => c - 1), 1000);
      const timer = setTimeout(() => navigate('/login'), 3000);
      return () => { clearTimeout(timer); clearInterval(interval); };
    }
  }, [success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base px-4" style={bgStyle}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          className="w-full max-w-md bg-surface-subtle border border-surface-muted/50 rounded-2xl p-8 text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <XCircle className="w-8 h-8 text-danger-light" />
          </motion.div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Invalid link</h2>
          <p className="text-zinc-500 text-sm mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-brand-light hover:text-brand text-sm font-medium transition-colors">
            Request a new link →
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4" style={bgStyle}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-8 text-center shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">Password reset!</h2>
              <p className="text-zinc-500 text-sm mb-1">Your password has been updated successfully.</p>
              <p className="text-zinc-600 text-xs">
                Redirecting to login in <span className="text-zinc-400 font-medium tabular-nums">{countdown}</span>s...
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 3, ease: 'linear' }}
                style={{ originX: 0 }}
                className="mt-6 h-0.5 bg-brand/40 rounded-full"
              />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-6 shadow-2xl">
              <div className="mb-6">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                  <KeyRound className="w-5 h-5 text-brand-light" />
                </div>
                <h1 className="text-xl font-bold text-zinc-100">Set new password</h1>
                <p className="text-zinc-500 text-sm mt-1">Choose a strong password for your account.</p>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="overflow-hidden">
                    <div className="bg-danger/10 border border-danger/30 text-danger-light px-4 py-3 rounded-lg text-sm">{error}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      className={inputClass + ' pr-10'}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={showPassword ? 'hide' : 'show'} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      placeholder="Repeat password"
                      className={inputClass + ' pr-10'}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={showConfirm ? 'hide' : 'show'} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
                <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset password'}
                </motion.button>
              </form>
              <p className="text-center mt-4">
                <Link to="/login" className="text-brand-light hover:text-brand text-xs font-medium transition-colors">
                  ← Back to login
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
