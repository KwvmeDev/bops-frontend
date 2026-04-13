import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { productsApi, categoriesApi } from '../api/client';
import { ArrowRight, ArrowLeft, Check, Package, Tag, ShoppingCart, Sparkles, X } from 'lucide-react';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'category', title: 'Category', icon: Tag },
  { id: 'product', title: 'Product', icon: Package },
  { id: 'done', title: 'Done', icon: Check },
];

const STORAGE_KEY = 'bms_onboarding_step';

const variants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
};

function fireworks() {
  const end = Date.now() + 2500;
  const colors = ['#6366f1', '#818cf8', '#10b981', '#f59e0b', '#ffffff'];
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export default function Onboarding() {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved) : 0;
  });
  const [direction, setDirection] = useState(1);
  const [categoryName, setCategoryName] = useState('');
  const [productForm, setProductForm] = useState({ name: '', sellingPrice: '', costPrice: '', stock: '10' });
  const [saving, setSaving] = useState(false);
  const [createdCategory, setCreatedCategory] = useState(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, step); }, [step]);

  const next = useCallback(() => { setDirection(1); setStep(s => s + 1); }, []);
  const back = useCallback(() => { setDirection(-1); setStep(s => s - 1); }, []);

  const skip = () => { localStorage.removeItem(STORAGE_KEY); navigate('/dashboard'); };

  const handleCategorySubmit = async (e) => {
    e?.preventDefault();
    if (!categoryName.trim()) { next(); return; }
    setSaving(true);
    try {
      const res = await categoriesApi.create({ name: categoryName });
      setCreatedCategory(res.data.data);
    } catch {} finally { setSaving(false); }
    next();
  };

  const handleProductSubmit = async (e) => {
    e?.preventDefault();
    if (!productForm.name.trim()) { next(); return; }
    setSaving(true);
    try {
      await productsApi.create({
        name: productForm.name,
        sellingPrice: parseFloat(productForm.sellingPrice) || 0,
        costPrice: parseFloat(productForm.costPrice) || 0,
        stock: parseInt(productForm.stock) || 0,
        categoryId: createdCategory?.id || null,
      });
    } catch {} finally { setSaving(false); }
    next();
  };

  const handleDone = () => {
    fireworks();
    setTimeout(() => { localStorage.removeItem(STORAGE_KEY); navigate('/dashboard'); }, 2000);
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all";
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-surface-base px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(99,102,241,0.10) 0%, #09090b 65%)' }}
    >
      {/* Skip */}
      <button onClick={skip} className="fixed top-4 right-4 p-2 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-surface-muted">
        <X className="w-5 h-5" />
      </button>

      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 24 : 8,
                backgroundColor: i < step ? '#22C55E' : i === step ? '#22C55E' : '#27272a',
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="p-8"
              >
                {/* Step 0: Welcome */}
                {step === 0 && (
                  <div className="text-center space-y-6">
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                      className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand/30"
                    >
                      <span className="text-3xl font-bold text-white">B</span>
                    </motion.div>
                    <div>
                      <h1 className="text-2xl font-bold text-zinc-100">Welcome, {user?.name?.split(' ')[0]}!</h1>
                      <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                        Let's get {tenant?.name || 'your shop'} up and running.<br />
                        This takes less than 2 minutes.
                      </p>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={next}
                      className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                      Let's go <ArrowRight className="w-5 h-5" />
                    </motion.button>
                    <button onClick={skip} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                      Skip setup and explore on my own
                    </button>
                  </div>
                )}

                {/* Step 1: Category */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                        <Tag className="w-5 h-5 text-brand-light" />
                      </div>
                      <h2 className="text-xl font-bold text-zinc-100">Add a category</h2>
                      <p className="text-zinc-500 text-sm mt-1">Organize your products into groups like "Beverages" or "Snacks".</p>
                    </div>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div>
                        <label className={labelClass}>Category name</label>
                        <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder='e.g. "Beverages"' className={inputClass} autoFocus />
                      </div>
                      <div className="flex gap-3">
                        <motion.button type="button" onClick={back} whileTap={{ scale: 0.97 }}
                          className="py-2.5 px-4 bg-surface-muted hover:bg-surface-overlay text-zinc-400 text-sm rounded-xl transition-colors">
                          <ArrowLeft className="w-4 h-4" />
                        </motion.button>
                        <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.97 }}
                          className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                          {categoryName.trim() ? 'Add & Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 2: Product */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4">
                        <Package className="w-5 h-5 text-brand-light" />
                      </div>
                      <h2 className="text-xl font-bold text-zinc-100">Add your first product</h2>
                      <p className="text-zinc-500 text-sm mt-1">Add a product you sell. You can add more later from Inventory.</p>
                    </div>
                    <form onSubmit={handleProductSubmit} className="space-y-3">
                      <div>
                        <label className={labelClass}>Product name</label>
                        <input type="text" value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder='e.g. "Coca-Cola 500ml"' className={inputClass} autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Selling price</label>
                          <input type="number" min="0" step="0.01" value={productForm.sellingPrice} onChange={e => setProductForm(p => ({ ...p, sellingPrice: e.target.value }))} placeholder="0.00" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Stock qty</label>
                          <input type="number" min="0" value={productForm.stock} onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))} placeholder="10" className={inputClass} />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <motion.button type="button" onClick={back} whileTap={{ scale: 0.97 }}
                          className="py-2.5 px-4 bg-surface-muted hover:bg-surface-overlay text-zinc-400 text-sm rounded-xl transition-colors">
                          <ArrowLeft className="w-4 h-4" />
                        </motion.button>
                        <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.97 }}
                          className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                          {productForm.name.trim() ? 'Add & Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Step 3: Done */}
                {step === 3 && (
                  <div className="text-center space-y-6 py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                      className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 250 }}
                      >
                        <Check className="w-10 h-10 text-success" />
                      </motion.div>
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-100">You're all set!</h2>
                      <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                        {tenant?.name || 'Your shop'} is ready to take orders.<br />
                        Start your first sale now.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDone}
                      className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" /> Go to Dashboard
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-zinc-700 mt-4">
          Step {step + 1} of {STEPS.length} — {STEPS[step].title}
        </p>
      </div>
    </div>
  );
}
