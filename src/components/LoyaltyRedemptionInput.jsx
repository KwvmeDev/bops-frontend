import { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * LoyaltyRedemptionInput — shown inside Cart when a customer is selected
 * and the tenant has loyaltyEnabled = true.
 *
 * Props:
 *   customer       {object}  Customer record; must include loyaltyPoints (int)
 *   value          {number}  Controlled: currently-entered points to redeem
 *   onChange       {fn}      Called with a valid integer pts value on every change
 *   onRedeem       {fn}      Called when "Redeem All" is clicked (sets max points)
 *   onSkip         {fn}      Called when "Skip" is clicked (resets to 0)
 *   pointsValue    {number}  Monetary value per point (e.g. 0.01  1pt = GH₵0.01)
 *   currencySymbol {string}  e.g. "GH₵"
 *   maxAffordable  {number}  Optional ceiling: max points redeemable given cart total
 */
export default function LoyaltyRedemptionInput({
  customer,
  value,
  onChange,
  onRedeem,
  onSkip,
  pointsValue = 0.01,
  currencySymbol = '$',
  maxAffordable,
}) {
  const [warning, setWarning] = useState(false);

  // The ceiling is the lower of what the customer has and what they can afford
  const maxRedeemable = maxAffordable != null
    ? Math.min(customer.loyaltyPoints, maxAffordable)
    : customer.loyaltyPoints;

  const discount = (value || 0) * pointsValue;

  function handleChange(e) {
    const raw = e.target.value;
    // Allow empty field while typing
    if (raw === '') {
      onChange(0);
      setWarning(false);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) return;

    if (parsed > maxRedeemable) {
      // Clamp to max and show amber warning
      onChange(maxRedeemable);
      setWarning(true);
      // Auto-clear warning after 2s so the UI doesn't stay red forever
      setTimeout(() => setWarning(false), 2000);
      return;
    }
    setWarning(false);
    onChange(parsed);
  }

  function handleRedeemAll() {
    setWarning(false);
    onRedeem(maxRedeemable);
  }

  function handleSkip() {
    setWarning(false);
    onSkip();
  }

  return (
    <div className="mx-4 mb-2 rounded-xl bg-zinc-800/70 border border-zinc-700/50 px-3 py-2.5">
      {/* Customer name + balance row */}
      <div className="flex items-center gap-1.5 mb-2">
        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
        <span className="text-xs font-medium text-zinc-300 truncate flex-1">
          {customer.name}
        </span>
        <span className="text-xs text-zinc-400 flex-shrink-0">
          {customer.loyaltyPoints.toLocaleString()} pts available
        </span>
      </div>

      {/* Redemption input row */}
      <div className="flex items-center gap-2">
        {/* Points input */}
        <div className="flex-1">
          <input
            type="number"
            min={0}
            max={maxRedeemable}
            step={10}
            value={value || ''}
            onChange={handleChange}
            placeholder="0"
            className={`w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-colors ${
              warning
                ? 'border-amber-500/70 focus:ring-amber-500/40 focus:border-amber-500'
                : 'border-zinc-700 focus:ring-brand/40 focus:border-brand/50'
            }`}
          />
          {warning && (
            <p className="mt-0.5 text-[10px] text-amber-400">
              Max {maxRedeemable.toLocaleString()} pts
            </p>
          )}
        </div>

        {/* Live discount preview */}
        <div className="flex-shrink-0 text-right min-w-[80px]">
          <span className={`text-sm font-semibold ${value > 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>
            = {currencySymbol}{discount.toFixed(2)} off
          </span>
        </div>
      </div>

      {/* Action links */}
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={handleRedeemAll}
          disabled={maxRedeemable <= 0}
          className="text-[11px] text-yellow-400 hover:text-yellow-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Redeem All
        </button>
        <span className="text-zinc-700 text-[11px]">·</span>
        <button
          type="button"
          onClick={handleSkip}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
