import { useState, useEffect } from 'react';
import { productsApi } from '../api/client';

export default function LowStockBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const response = await productsApi.getAll({ lowStock: 'true' });
        setCount(response.data.data.length);
      } catch (error) {
        console.error('Failed to fetch low stock count:', error);
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
