import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Zap, Package, BarChart3, Users, Printer, ShieldCheck,
  ArrowRight, Check, ChevronRight,
} from 'lucide-react';
import PublicNav from '../../components/public/PublicNav';
import Footer from '../../components/public/Footer';
import lpImageLight from '../../assets/lp-image-lt.svg';
import lpImageDark from '../../assets/lp-image-dk.svg';

/* ─── Shared animation helpers ─── */
const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const staggerContainer = {
  initial: {},
  whileInView: {},
  viewport: { once: true, margin: '-80px' },
};

function staggerItem(i) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 },
  };
}

/* ─── App Mockup ─── */
function AppMockup() {
  const { theme } = useTheme();
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-0 bg-brand/10 blur-3xl rounded-3xl" />
      <img
        src={theme === 'dark' ? lpImageDark : lpImageLight}
        alt="Klevr app preview"
        className="relative w-full h-auto rounded-2xl"
      />
    </div>
  );
}

/* ─── Section: Hero ─── */
function HeroSection() {
  return (
    <section className="relative pt-40 pb-24 px-6 overflow-hidden">
      {/* Background glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,197,94,0.14) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 30% at 80% 20%, rgba(74,222,128,0.06) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 border border-brand/20 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-xs text-brand-light font-medium">Now in public beta, free for 14 days</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-zinc-100 tracking-tight leading-[1.05] mb-6"
          style={{ fontFamily: 'Geist, Inter, sans-serif', letterSpacing: '-0.04em' }}
        >
          Run your shop
          <br />
          <span className="text-brand">at full speed.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Klevr gives your retail team a blazing-fast POS, real-time inventory,
          and clean reporting, without the enterprise complexity.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <motion.div whileTap={{ scale: 0.97 }}>
            <Link
              to="/register"
              className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand/25 text-sm"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          <a
            href="#features"
            className="flex items-center gap-1.5 px-6 py-3 text-zinc-400 hover:text-zinc-100 text-sm font-medium transition-colors"
          >
            See how it works
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex items-center justify-center gap-6 mb-20 flex-wrap"
        >
          {[
            { n: '500+', l: 'Businesses' },
            { n: '12', l: 'Countries' },
            { n: '4.9★', l: 'Average rating' },
            { n: '99.9%', l: 'Uptime SLA' },
          ].map(({ n, l }) => (
            <div key={l} className="text-center">
              <div className="text-xl font-bold text-zinc-100">{n}</div>
              <div className="text-xs text-zinc-500">{l}</div>
            </div>
          ))}
        </motion.div>

        {/* App mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
        >
          <AppMockup />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Section: Trust Bar ─── */
function TrustBar() {
  const items = [
    'Retail Shops', 'Pharmacies', 'Cafés', 'Supermarkets', 'Bookstores',
    'Hardware Stores', 'Fashion Boutiques', 'Electronics', 'Bakeries', 'Convenience Stores',
  ];
  const doubled = [...items, ...items];

  return (
    <section className="py-16 border-y border-surface-muted/70 overflow-hidden">
      <p className="text-center text-xs text-zinc-600 uppercase tracking-widest mb-8">
        Trusted by businesses across every industry
      </p>
      <div className="relative">
        <div
          className="flex gap-12 animate-marquee"
          style={{ width: 'max-content' }}
        >
          {doubled.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-zinc-600 whitespace-nowrap"
            >
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              {item}
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-surface-base to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-surface-base to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

/* ─── Section: Features ─── */
const FEATURES = [
  {
    icon: Zap,
    title: 'Instant checkout',
    desc: 'Process a sale in under 10 seconds. No lag, no loading spinners. Just pure speed.',
  },
  {
    icon: Package,
    title: 'Real-time inventory',
    desc: 'Stock levels update the moment a sale is made. Low-stock alerts before you run out.',
  },
  {
    icon: BarChart3,
    title: 'Smart reports',
    desc: 'Daily revenue, weekly trends, profit margins per product. Always accurate.',
  },
  {
    icon: Users,
    title: 'Team management',
    desc: 'Owner, Manager, Cashier roles. The right access for the right people.',
  },
  {
    icon: Printer,
    title: 'Receipt printing',
    desc: 'Print receipts instantly. Works with any USB or network printer, no drivers needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Fully isolated',
    desc: 'Multi-tenant architecture. Your data is yours, completely isolated by design.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-20">
          <h2
            className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4 tracking-tight"
            style={{ letterSpacing: '-0.03em' }}
          >
            Everything your shop needs.
            <br />
            <span className="text-zinc-500">Nothing it doesn't.</span>
          </h2>
          <p className="text-zinc-500 text-lg max-w-lg mx-auto">
            Built for the realities of retail, not for enterprise software teams.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                {...staggerItem(i)}
                className="group p-6 rounded-2xl border border-surface-muted/60 bg-surface-subtle/40 hover:bg-surface-subtle/80 hover:border-surface-muted transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-light" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Section: POS Demo / How it works ─── */
function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Set up in minutes', desc: 'Add your products, invite your team, configure your shop settings.' },
    { n: '02', title: 'Start selling', desc: 'Your cashiers get an instant, distraction-free checkout flow.' },
    { n: '03', title: 'Watch it grow', desc: 'Reports that tell the story of your business. Profit, trends, top products.' },
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <motion.p {...fadeUp} className="text-xs text-brand-light font-semibold uppercase tracking-widest mb-4">
              How it works
            </motion.p>
            <motion.h2
              {...fadeUp}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="text-4xl font-bold text-zinc-100 mb-6 tracking-tight"
              style={{ letterSpacing: '-0.03em' }}
            >
              From setup to first sale
              <br />
              in under 5 minutes.
            </motion.h2>
            <div className="space-y-8 mt-10">
              {steps.map((s, i) => (
                <motion.div key={s.n} {...staggerItem(i)} className="flex gap-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-brand/30 bg-brand/5 flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-light">{s.n}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 mb-1">{s.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div {...staggerItem(3)} className="mt-10">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Start free trial <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Visual mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <AppMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─── Section: Pricing ─── */
const PLANS = [
  {
    name: 'Starter',
    price: 299,
    desc: 'Perfect for a single-location shop.',
    features: ['1 location', '3 team members', 'Unlimited sales', 'Basic reports', 'Email support'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 799,
    desc: 'For growing businesses with more needs.',
    features: ['3 locations', 'Unlimited team', 'Unlimited sales', 'Full reports + profit', 'Priority support', 'Inventory alerts'],
    cta: 'Start free trial',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: 1999,
    desc: 'For large retail operations.',
    features: ['Unlimited locations', 'Unlimited team', 'Unlimited sales', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
    cta: 'Contact sales',
    highlight: false,
  },
];

function PricingSection() {
  const { currencySymbol, convertPrice } = useAuth();
  return (
    <section id="pricing" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <h2
            className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4 tracking-tight"
            style={{ letterSpacing: '-0.03em' }}
          >
            Simple, transparent pricing.
          </h2>
          <p className="text-zinc-500 text-lg">
            14-day free trial on all plans. No credit card required.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              {...staggerItem(i)}
              className={`relative rounded-2xl p-7 flex flex-col ${
                plan.highlight
                  ? 'border border-brand/40 bg-brand/[0.04]'
                  : 'border border-surface-muted/60 bg-surface-subtle/40'
              }`}
              style={plan.highlight ? { boxShadow: '0 0 40px rgba(34,197,94,0.08)' } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-brand text-white text-xs font-semibold rounded-full shadow-lg shadow-brand/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-400 mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold text-zinc-100">{currencySymbol}{convertPrice(plan.price).toLocaleString()}</span>
                  <span className="text-zinc-500 text-sm mb-1">/mo</span>
                </div>
                <p className="text-xs text-zinc-500">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className={`w-3.5 h-3.5 flex-shrink-0 ${plan.highlight ? 'text-brand' : 'text-zinc-500'}`} />
                    <span className="text-xs text-zinc-400">{f}</span>
                  </li>
                ))}
              </ul>

              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20'
                      : 'bg-surface-muted hover:bg-surface-overlay text-zinc-300 border border-surface-muted'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section: CTA Banner ─── */
function CTASection() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          {...fadeUp}
          className="relative rounded-3xl border border-surface-muted/60 bg-surface-subtle/40 p-16 overflow-hidden"
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(34,197,94,0.1) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <h2
              className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4 tracking-tight"
              style={{ letterSpacing: '-0.03em' }}
            >
              Ready to transform
              <br />
              your shop?
            </h2>
            <p className="text-zinc-500 text-lg mb-10">
              Join 500+ retail businesses already running faster on BMS.
              <br />
              14-day free trial. No credit card required.
            </p>
            <motion.div whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-colors text-base shadow-2xl shadow-brand/30"
              >
                Start free trial <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <p className="mt-4 text-xs text-zinc-600">No credit card required · Cancel anytime</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Page root ─── */
export default function Landing() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="bg-surface-base text-zinc-100 min-h-screen">
      <PublicNav />
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
