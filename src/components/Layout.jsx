import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useLocation from '../hooks/useLocation';
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3,
  Settings, Users, LogOut, ChevronLeft, ChevronRight,
  Menu, Sun, Moon, ArrowLeftRight, Truck, Receipt, Pill, UsersRound,
} from 'lucide-react';
import ConnectivityBadge from './ConnectivityBadge';
import LocationSwitcher from './LocationSwitcher';
import LowStockBadge from './LowStockBadge';
import TrialBanner from './TrialBanner';
import EmailVerificationBanner from './EmailVerificationBanner';
import UpgradeModal from './UpgradeModal';
import { Avatar } from './ui';

export default function Layout() {
  const { user, tenant, logout, hasMinRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isMultiLocation } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const navItems = [
    { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sales',           icon: ShoppingCart,    label: 'Sales' },
    { to: '/inventory',       icon: Package,         label: 'Inventory', badge: <LowStockBadge /> },
    { to: '/reports',         icon: BarChart3,       label: 'Reports',   minRole: 'MANAGER' },
    // Transfers nav item — only rendered for multi-location tenants
    { to: '/stock-transfers', icon: ArrowLeftRight,  label: 'Transfers',       minRole: 'MANAGER', multiLocationOnly: true },
    { to: '/purchase-orders', icon: Truck,           label: 'Purchase Orders', minRole: 'MANAGER' },
    { to: '/expenses',        icon: Receipt,         label: 'Expenses',        minRole: 'MANAGER' },
    // Customers — visible to MANAGER+ regardless of feature flags
    { to: '/customers',       icon: UsersRound,      label: 'Customers',       minRole: 'MANAGER' },
    // Pharmacy: Prescriptions — visible only when pharmacyMode is enabled, CASHIER+
    ...(tenant?.pharmacyMode ? [
      { to: '/prescriptions', icon: Pill, label: 'Prescriptions', minRole: 'CASHIER', pharmacyOnly: true },
    ] : []),
    { to: '/settings',        icon: Settings,        label: 'Settings',        minRole: 'MANAGER' },
    { to: '/users',           icon: Users,           label: 'Users',     minRole: 'OWNER' },
  ];

  // Hide items that require multiple locations when tenant is single-location
  const filteredNavItems = navItems.filter(item => !item.multiLocationOnly || isMultiLocation);

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-surface-muted/50 flex-shrink-0">
        <AnimatePresence mode="wait">
          {(!collapsed || mobile) ? (
            <motion.div
              key="full"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <img
                src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
                alt="Klevr"
                className="h-7 w-auto flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100 text-sm truncate">{tenant?.name || 'Klevr'}</p>
                <p className="text-xs text-zinc-500">Point of Sale</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="w-8 h-8 flex items-center justify-center"
            >
              <img
                src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
                alt="Klevr"
                className="h-7 w-auto"
              />
            </motion.div>
          )}
        </AnimatePresence>
        {!mobile && (
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-surface-muted transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Branch switcher — hidden automatically for single-location tenants */}
      <LocationSwitcher />

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          if (item.minRole && !hasMinRole(item.minRole)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => mobile && setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-brand/10 text-brand-light'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-r-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {(!collapsed || mobile) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 text-sm font-medium truncate overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && (!collapsed || mobile) && (
                    <span className="flex-shrink-0">{item.badge}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User identity (sidebar bottom — no actions, just info) */}
      <div className="px-3 pb-4 pt-2 border-t border-surface-muted/50 flex-shrink-0">
        <div className={`flex items-center gap-2.5 ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <Avatar name={user?.name} size="sm" className="flex-shrink-0" />
          <AnimatePresence>
            {(!collapsed || mobile) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface-base">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col bg-surface-subtle border-r border-surface-muted/50 flex-shrink-0 no-print overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-surface-subtle border-r border-surface-muted/50 md:hidden"
            >
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">

        {/* ── Top navbar ── */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-surface-muted/50 bg-surface-subtle no-print">
          {/* Left: mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Shop name on mobile only */}
            <span className="md:hidden font-semibold text-zinc-100 text-sm">{tenant?.name || 'Klevr'}</span>
          </div>

          {/* Right: connectivity badge + theme toggle + divider + logout */}
          <div className="flex items-center gap-1">
            <ConnectivityBadge />

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

            {/* Logout */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-surface-muted transition-colors text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </motion.button>
          </div>
        </header>

        <TrialBanner />
        <EmailVerificationBanner />

        <div className="flex-1">
          <Outlet />
        </div>
      </main>

      <UpgradeModal />
    </div>
  );
}
