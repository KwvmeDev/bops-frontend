import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Minus, Plus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import UnitSelector from './UnitSelector';
import LoyaltyRedemptionInput from './LoyaltyRedemptionInput';

const PAYMENT_METHODS = [
  { id: 'CASH',         label: 'Cash',   icon: Banknote },
  { id: 'CARD',         label: 'Card',   icon: CreditCard },
  { id: 'MOBILE_MONEY', label: 'Mobile', icon: Smartphone },
];

// Tier badge colour map — matches LoyaltyTier enum values from the schema
const TIER_STYLES = {
  STANDARD: 'bg-zinc-700 text-zinc-300',
  SILVER:   'bg-slate-600 text-slate-200',
  GOLD:     'bg-yellow-600/80 text-yellow-100',
  PLATINUM: 'bg-purple-700/80 text-purple-100',
};

function AnimatedTotal({ value, prefix }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20 });
  useEffect(() => { spring.set(value); }, [value]);
  const display = useTransform(spring, v => `${prefix}${v.toFixed(2)}`);
  return <motion.span>{display}</motion.span>;
}

/**
 * Cart — sidebar or bottom-sheet cart component.
 *
 * Loyalty props (all optional; loyalty UI is suppressed when not provided):
 *   customer             {object|null}  Selected customer with loyaltyPoints + loyaltyTier
 *   loyaltyEnabled       {bool}         Comes from tenant.loyaltyEnabled
 *   pointsToRedeem       {number}       Controlled: points the cashier has chosen to redeem
 *   onPointsToRedeemChange {fn}         Called with new points int when input changes
 *   onCustomerSelect     {fn}           Called with customer object or null (deselect)
 *   pointsValue          {number}       Monetary value per point (e.g. 0.01)
 */
export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  paymentMethod,
  onPaymentMethodChange,
  loading,
  variant = 'sidebar',
  momoPhone = '',
  onMomoPhoneChange = () => {},
  onUnitChange,
  // Loyalty-specific props
  customer = null,
  loyaltyEnabled = false,
  pointsToRedeem = 0,
  onPointsToRedeemChange = () => {},
  onCustomerSelect = () => {},
  pointsValue = 0.01,
}) {
  const { tenant, currencySymbol } = useAuth();
  const sym = currencySymbol;
  const taxRate = tenant?.taxRate || 0;

  const subtotal = items.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const taxAmount = subtotal * taxRate;

  // Loyalty discount: only apply when feature is active and a customer is attached
  const showLoyalty = loyaltyEnabled && customer != null;
  // Cap redemption so discount never exceeds what's owed (pre-discount total)
  const maxAffordablePoints = pointsValue > 0
    ? Math.floor((subtotal + taxAmount) / pointsValue)
    : 0;
  const effectivePoints = showLoyalty ? Math.min(pointsToRedeem, maxAffordablePoints) : 0;
  const loyaltyDiscount = effectivePoints * pointsValue;

  const total = subtotal + taxAmount - loyaltyDiscount;

  // Deselect customer: clear customer ref and zero out any redeemed points
  function handleDeselectCustomer() {
    onCustomerSelect(null);
    onPointsToRedeemChange(0);
  }

  return (
    <div className={`flex flex-col bg-surface-subtle${variant === 'sidebar' ? ' h-full border-l border-surface-muted/50' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Cart</h2>
          <AnimatePresence>
            {items.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="text-xs bg-brand text-white w-5 h-5 rounded-full flex items-center justify-center font-medium"
              >
                {items.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {items.length > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClearCart}
              className="text-xs text-zinc-500 hover:text-danger-light transition-colors"
            >
              Clear all
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Customer display row — shown when a customer is linked to this sale */}
      <AnimatePresence>
        {showLoyalty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="px-4 py-2 border-b border-surface-muted/30 flex items-center gap-2">
              {/* Customer name */}
              <span className="text-xs font-medium text-zinc-200 flex-1 truncate">
                {customer.name}
              </span>
              {/* Loyalty tier badge */}
              {customer.loyaltyTier && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${TIER_STYLES[customer.loyaltyTier] ?? TIER_STYLES.STANDARD}`}>
                  {customer.loyaltyTier}
                </span>
              )}
              {/* Points balance pill */}
              <span className="text-[11px] text-yellow-400 font-medium whitespace-nowrap">
                {(customer.loyaltyPoints ?? 0).toLocaleString()} pts
              </span>
              {/* Deselect customer */}
              <button
                type="button"
                onClick={handleDeselectCustomer}
                className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                aria-label="Remove customer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items */}
      <div className={variant === 'sheet' ? 'max-h-[46vh] overflow-y-auto' : 'flex-1 overflow-y-auto'}>
        <AnimatePresence>
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-zinc-600 py-12 px-4"
            >
              <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs text-zinc-700 mt-1">Tap products to add them</p>
            </motion.div>
          ) : (
            <div className="py-2">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="px-4 py-3 border-b border-surface-muted/30 last:border-0"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500">{sym}{item.sellingPrice.toFixed(2)} each</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-zinc-600 hover:text-danger-light transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 rounded-lg bg-surface-muted hover:bg-surface-overlay flex items-center justify-center text-zinc-300 disabled:opacity-30 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </motion.button>
                      <motion.span
                        key={item.quantity}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="w-8 text-center text-sm font-medium text-zinc-200"
                      >
                        {item.quantity}
                      </motion.span>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 rounded-lg bg-surface-muted hover:bg-surface-overlay flex items-center justify-center text-zinc-300 disabled:opacity-30 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </motion.button>
                    </div>
                    <span className="text-sm font-semibold text-zinc-100">
                      {sym}{(item.sellingPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Unit selector — only visible in pharmacy mode when product has units */}
                  {tenant?.pharmacyMode === true && item.units?.length > 0 && onUnitChange && (
                    <UnitSelector
                      units={item.units}
                      selectedUnitId={item.unitId}
                      onChange={(unit) => onUnitChange(item.id, unit)}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer: payment + summary + checkout */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex-shrink-0 border-t border-surface-muted/50"
          >
            {/* Loyalty redemption input — shown between customer row and payment section */}
            <AnimatePresence>
              {showLoyalty && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="overflow-hidden pt-2"
                >
                  <LoyaltyRedemptionInput
                    customer={customer}
                    value={pointsToRedeem}
                    onChange={onPointsToRedeemChange}
                    onRedeem={onPointsToRedeemChange}
                    onSkip={() => onPointsToRedeemChange(0)}
                    pointsValue={pointsValue}
                    currencySymbol={sym}
                    maxAffordable={maxAffordablePoints}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment method */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs text-zinc-500 mb-2">Payment method</p>
              <div className="flex gap-1.5">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onPaymentMethodChange(id)}
                    className={`flex-1 py-2 px-1 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === id
                        ? 'border-brand/50 bg-brand/10 text-brand-light'
                        : 'border-surface-overlay/60 text-zinc-500 hover:text-zinc-300 hover:border-surface-overlay'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </motion.button>
                ))}
              </div>

              {/* MoMo phone number input — only visible when Mobile Money is selected */}
              <AnimatePresence>
                {paymentMethod === 'MOBILE_MONEY' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-zinc-500 mt-2 mb-1">MoMo number</p>
                    <input
                      type="tel"
                      placeholder="MoMo number (+233...)"
                      value={momoPhone}
                      onChange={e => onMomoPhoneChange(e.target.value)}
                      className="w-full mt-0 px-3 py-2 rounded-lg bg-surface-base border border-surface-muted/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand/50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Totals */}
            <div className="px-4 pb-2 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal</span>
                <span>{sym}{subtotal.toFixed(2)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                  <span>{sym}{taxAmount.toFixed(2)}</span>
                </div>
              )}
              {/* Points discount line — only shown when points are being redeemed */}
              <AnimatePresence>
                {showLoyalty && effectivePoints > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-between text-xs text-yellow-500">
                      <span>Points discount ({effectivePoints.toLocaleString()} pts)</span>
                      <span>-{sym}{loyaltyDiscount.toFixed(2)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between text-sm font-bold text-zinc-100 pt-1.5 border-t border-surface-muted/50">
                <span>Total</span>
                <AnimatedTotal value={total} prefix={sym} />
              </div>
            </div>

            {/* Checkout button */}
            <div className="px-4 pb-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onCheckout}
                disabled={loading}
                className="w-full py-3 bg-success hover:bg-success/90 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-success/20"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  `Charge ${sym}${total.toFixed(2)}`
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
