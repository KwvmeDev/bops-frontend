import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * UnitSelector — compact dropdown for selecting a product's unit of measure.
 * Rendered next to the quantity control inside the Cart for pharmacy-mode products.
 *
 * Props:
 *   units          — ProductUnit[] fetched from productUnitsApi.getForProduct()
 *                    Each unit: { id, name, sellingPrice, isBase, conversionFactor }
 *   selectedUnitId — id of the currently selected unit (null  base unit selected)
 *   onChange       — (unit: ProductUnit) => void — parent updates cart item price + unitId
 */
export default function UnitSelector({ units, selectedUnitId, onChange }) {
  const { currencySymbol: sym } = useAuth();

  // Initialise with the base unit on first render when no selection has been made
  useEffect(() => {
    if (!selectedUnitId && units?.length > 0) {
      const base = units.find((u) => u.isBase) ?? units[0];
      onChange(base);
    }
  // Only run when units first load or when selectedUnitId transitions from null to a value
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  if (!units?.length) return null;

  const handleChange = (e) => {
    const unit = units.find((u) => u.id === e.target.value);
    if (unit) onChange(unit);
  };

  return (
    <div className="mt-1.5">
      <select
        value={selectedUnitId ?? (units.find((u) => u.isBase) ?? units[0])?.id ?? ''}
        onChange={handleChange}
        className={
          'w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700/60 rounded-lg ' +
          'text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 ' +
          'transition-all cursor-pointer'
        }
        aria-label="Select unit of measure"
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name} — {sym}{Number(unit.sellingPrice).toFixed(2)}
          </option>
        ))}
      </select>
    </div>
  );
}
