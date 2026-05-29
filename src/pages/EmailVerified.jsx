import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const bgStyle = { background: 'radial-gradient(ellipse at 50% 35%, rgba(99,102,241,0.10) 0%, #09090b 65%)' };

export default function EmailVerified() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found.');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => {
        // Update the in-memory + localStorage user so the banner disappears immediately
        updateUser({ emailVerified: true });
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 3000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4" style={bgStyle}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="w-full max-w-md bg-surface-subtle border border-surface-muted/50 rounded-2xl p-8 text-center shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
              >
                <Loader2 className="w-10 h-10 text-brand" />
              </motion.div>
              <h2 className="text-xl font-bold text-zinc-100">Verifying your email...</h2>
              <p className="text-zinc-500 text-sm mt-2">Just a moment.</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-8 h-8 text-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">Email verified!</h2>
              <p className="text-zinc-500 text-sm">Redirecting to your dashboard...</p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 3, ease: 'linear' }}
                style={{ originX: 0 }}
                className="mt-6 h-0.5 bg-brand/40 rounded-full"
              />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <XCircle className="w-8 h-8 text-danger-light" />
              </motion.div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">Verification failed</h2>
              <p className="text-zinc-500 text-sm mb-6">{errorMessage}</p>
              <Link to="/login" className="text-brand-light hover:text-brand text-sm font-medium transition-colors">
                ← Back to login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
