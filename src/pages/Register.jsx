import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const STEPS = ['Business', 'Account', 'Contact', 'Categories'];

const BUSINESS_TYPES = [
  { key: 'grocery',     label: 'Grocery / Provisions Store',     emoji: '🏪' },
  { key: 'pharmacy',    label: 'Pharmacy',                        emoji: '💊' },
  { key: 'electronics', label: 'Electronics',                     emoji: '📱' },
  { key: 'fashion',     label: 'Fashion & Clothing',              emoji: '👗' },
  { key: 'beauty',      label: 'Beauty & Cosmetics',              emoji: '💄' },
  { key: 'hardware',    label: 'Hardware & Building Materials',   emoji: '🔧' },
  { key: 'auto_parts',  label: 'Auto Parts & Accessories',        emoji: '🚗' },
  { key: 'agriculture', label: 'Agricultural / Farm Supplies',    emoji: '🌾' },
  { key: 'bakery',      label: 'Bakery',                          emoji: '🍞' },
  { key: 'restaurant',  label: 'Restaurant / Fast Food',          emoji: '🍽️' },
  { key: 'stationery',  label: 'Stationery & Office Supplies',    emoji: '📚' },
  { key: 'baby_kids',   label: 'Baby & Kids',                     emoji: '👶' },
  { key: 'general',     label: 'General / Other',                 emoji: '➕' },
];

function PasswordStrength({ password }) {
  const score = Math.min(
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0),
    4
  );
  const colors = ['bg-danger', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= score ? colors[score] : 'bg-surface-overlay'}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            style={{ transformOrigin: 'left' }}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-1">{labels[score]}</p>
    </div>
  );
}

const variants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
};

export default function Register() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState([]);

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: ''
  });

  const { register } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const set = (field) => (e) => setFormData(p => ({ ...p, [field]: e.target.value }));

  const toggleBusinessType = (key) =>
    setBusinessTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );

  const goNext = (e) => {
    e?.preventDefault();
    setError('');
    if (step === 1) {
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
      if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    }
    setDirection(1);
    setStep(s => s + 1);
  };

  const goBack = () => { setDirection(-1); setStep(s => s - 1); setError(''); };

  const handleBackArrow = () => {
    if (step === 0) navigate('/login');
    else goBack();
  };

  const handleSubmit = async (selectedTypes) => {
    setError('');
    setLoading(true);
    try {
      await register({
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        businessTypes: selectedTypes
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all";
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="w-full max-w-md flex flex-col items-center"
      >
        {/* Back arrow */}
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.3 }}
          onClick={handleBackArrow}
          whileTap={{ scale: 0.94 }}
          className="mb-6 w-10 h-10 rounded-full bg-surface-subtle border border-surface-muted/50 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="mb-6"
        >
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="Klevr"
            className="h-8 w-auto"
          />
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    backgroundColor: i < step ? '#22C55E' : i === step ? '#22C55E' : '#27272a',
                    scale: i === step ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                >
                  {i < step ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <span className="text-xs font-semibold text-white">{i + 1}</span>
                  )}
                </motion.div>
                <span className={`text-xs ${i === step ? 'text-zinc-300' : 'text-zinc-600'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <motion.div
                  animate={{ backgroundColor: i < step ? '#10b981' : '#27272a' }}
                  transition={{ duration: 0.3 }}
                  className="w-8 h-px mb-5"
                />
              )}
            </div>
          ))}
        </div>

        {/* Card with glow */}
        <div className="relative w-full">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-brand/15 blur-3xl rounded-3xl -z-10 scale-110" />

          {/* Card */}
          <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
            {/* Card header */}
            <div className="px-6 pt-6 pb-2">
              <h1 className="text-xl font-semibold text-zinc-100">Create your account</h1>
              <p className="text-zinc-500 text-sm mt-1">Start your 14-day free trial</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-6 mt-4 bg-danger/10 border border-danger/30 text-danger-light px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-hidden">
              <AnimatePresence custom={direction} mode="wait">
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="p-6 pt-4"
                >
                  {/* Step 0: Business Info */}
                  {step === 0 && (
                    <form onSubmit={goNext} className="space-y-4">
                      <div>
                        <label className={labelClass}>Business name *</label>
                        <input type="text" required value={formData.businessName} onChange={set('businessName')} placeholder="Your Shop Name" className={inputClass} autoFocus />
                      </div>
                      <div>
                        <label className={labelClass}>Your name *</label>
                        <input type="text" required value={formData.ownerName} onChange={set('ownerName')} placeholder="Full name" className={inputClass} />
                      </div>
                      <motion.button type="submit" whileTap={{ scale: 0.97 }} className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </form>
                  )}

                  {/* Step 1: Account */}
                  {step === 1 && (
                    <form onSubmit={goNext} className="space-y-4">
                      <div>
                        <label className={labelClass}>Email address *</label>
                        <input type="email" required autoComplete="email" value={formData.email} onChange={set('email')} placeholder="you@example.com" className={inputClass} autoFocus />
                      </div>
                      <div>
                        <label className={labelClass}>Password *</label>
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} required minLength={8} value={formData.password} onChange={set('password')} placeholder="Min 8 characters" className={`${inputClass} pr-10`} />
                          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrength password={formData.password} />
                      </div>
                      <div>
                        <label className={labelClass}>Confirm password *</label>
                        <input type={showPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={set('confirmPassword')} placeholder="Confirm your password" className={inputClass} />
                      </div>
                      <motion.button type="submit" whileTap={{ scale: 0.97 }} className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </form>
                  )}

                  {/* Step 2: Contact (optional) */}
                  {step === 2 && (
                    <form onSubmit={goNext} className="space-y-4">
                      <p className="text-xs text-zinc-500 -mt-1 mb-2">Optional. You can fill these in later from Settings.</p>
                      <div>
                        <label className={labelClass}>Phone number</label>
                        <input type="tel" value={formData.phone} onChange={set('phone')} placeholder="+1234567890" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Business address</label>
                        <input type="text" value={formData.address} onChange={set('address')} placeholder="123 Main Street" className={inputClass} />
                      </div>
                      <motion.button type="submit" whileTap={{ scale: 0.97 }} className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </form>
                  )}

                  {/* Step 3: Business type selection */}
                  {step === 3 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-base font-semibold text-zinc-100">What do you sell?</h2>
                        <p className="text-xs text-zinc-500 mt-1">
                          We'll set up your product categories automatically. You can always edit them later.
                        </p>
                      </div>

                      {/* Chip grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {BUSINESS_TYPES.map(({ key, label, emoji }) => {
                          const selected = businessTypes.includes(key);
                          return (
                            <motion.button
                              key={key}
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              onClick={() => toggleBusinessType(key)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                                selected
                                  ? 'border-brand bg-brand/10 text-brand'
                                  : 'border-surface-overlay bg-surface-muted text-zinc-300 hover:border-zinc-500'
                              }`}
                            >
                              <span className="text-base leading-none">{emoji}</span>
                              <span className="leading-tight">{label}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="space-y-3 pt-1">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          disabled={loading}
                          onClick={() => handleSubmit(businessTypes)}
                          className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                          ) : (
                            <>Finish setup <ArrowRight className="w-4 h-4" /></>
                          )}
                        </motion.button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleSubmit([])}
                          className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-60 py-1"
                        >
                          Skip this step
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={goBack}
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-60"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-zinc-600 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-light hover:text-brand font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
