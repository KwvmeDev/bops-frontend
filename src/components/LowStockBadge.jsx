import { useState, useEffect } from 'react';
import { productsApi } from '../api/client';

export default function LowStockBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const response = await productsApi.getLowStockCount();
        setCount(response.data.data.count ?? 0);
      } catch {
        // Non-critical — badge simply won't show if count is unavailable
      }
    };

    fetchLowStock();

    // Refresh every 5 minutes
    const interval = setInterval(fetchLowStock, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
      {count}
    </span>
  );
}
