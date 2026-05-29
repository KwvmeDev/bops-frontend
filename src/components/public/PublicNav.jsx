import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrolledBg = theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.90)';
  const scrolledBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)';

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? scrolledBg : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? scrolledBorder : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
              alt="Klevr"
              className="h-5 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-surface-muted transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, scale: 0.7, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: 30 }}
                  transition={{ duration: 0.18 }}
                  className="block"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <div className="w-px h-5 bg-surface-muted mx-1" />

            <Link
              to="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-2"
            >
              Log in
            </Link>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link
                to="/register"
                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-brand/20"
              >
                Start free trial
              </Link>
            </motion.div>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={toggleTheme}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, scale: 0.7, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: 30 }}
                  transition={{ duration: 0.18 }}
                  className="block"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setMobileOpen(v => !v)}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-16 left-4 right-4 z-50 bg-surface-subtle border border-surface-muted rounded-2xl p-4 shadow-2xl"
            >
              <div className="space-y-1 mb-4">
                {NAV_LINKS.map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-surface-muted rounded-xl transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t border-surface-muted pt-4">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors">
                  Start free trial
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
