import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/client';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

const bgStyle = { background: 'radial-gradient(ellipse at 50% 35%, rgba(99,102,241,0.10) 0%, #09090b 65%)' };
const inputClass = "w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4" style={bgStyle}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-8 text-center shadow-2xl">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">Check your inbox</h2>
              <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                If an account exists for <span className="text-zinc-300 font-medium">{email}</span>, we've sent a reset link. Check your spam folder too.
              </p>
              <Link to="/login" className="text-brand-light hover:text-brand text-sm font-medium transition-colors">
                ← Back to login
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-6 shadow-2xl">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Link>
              <div className="mb-6">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-brand-light" />
                </div>
                <h1 className="text-xl font-bold text-zinc-100">Forgot password?</h1>
                <p className="text-zinc-500 text-sm mt-1">Enter your email and we'll send a reset link.</p>
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
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className={inputClass} autoFocus />
                </div>
                <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send reset link'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
