import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { productsApi, categoriesApi } from '../api/client';
import { Search, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from './ui';

export default function ProductGrid({ onAddToCart }) {
  const { tenant, currencySymbol } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [pr, cr] = await Promise.all([productsApi.getAll(), categoriesApi.getAll()]);
        setProducts(pr.data.data);
        setCategories(cr.data.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    const matchCat = !selectedCategory || p.categoryId === selectedCategory;
    return matchSearch && matchCat && p.active;
  }), [products, search, selectedCategory]);

  const sym = currencySymbol;
  const threshold = tenant?.lowStockThreshold ?? 5;

  const handleAdd = useCallback((product) => {
    if (product.stock === 0) return;
    onAddToCart(product);
    setAddedIds(prev => {
      const next = new Set(prev);
      next.add(product.id);
      setTimeout(() => setAddedIds(s => { const n = new Set(s); n.delete(product.id); return n; }), 600);
      return next;
    });
  }, [onAddToCart]);

  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Search + filters */}
      <div className="px-4 py-3 border-b border-surface-muted/50 bg-surface-subtle space-y-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            id="product-search"
            type="text"
            placeholder="Search products… ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
            autoFocus
            className="w-full pl-9 pr-4 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCategory === ''
                ? 'bg-brand text-white shadow-md shadow-brand/30'
                : 'bg-surface-muted text-zinc-400 hover:text-zinc-200 hover:bg-surface-overlay'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-brand text-white shadow-md shadow-brand/30'
                  : 'bg-surface-muted text-zinc-400 hover:text-zinc-200 hover:bg-surface-overlay'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-subtle border border-surface-muted/50 rounded-xl p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <div className="pt-1 flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-16">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No products found</p>
            {search && <button onClick={() => setSearch('')} className="mt-2 text-xs text-brand-light hover:text-brand transition-colors">Clear search</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence>
              {filtered.map((product, i) => {
                const isLow = product.stock > 0 && product.stock <= (product.lowStockThreshold ?? threshold);
                const isOut = product.stock === 0;
                const isAdded = addedIds.has(product.id);

                return (
                  <motion.button
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}
                    whileHover={!isOut ? { scale: 1.02, transition: { duration: 0.1 } } : {}}
                    whileTap={!isOut ? { scale: 0.97 } : {}}
                    onClick={() => handleAdd(product)}
                    disabled={isOut}
                    className={`relative text-left p-4 rounded-xl border transition-colors ${
                      isOut
                        ? 'bg-surface-subtle/40 border-surface-muted/30 opacity-50 cursor-not-allowed'
                        : isAdded
                        ? 'bg-success/10 border-success/30'
                        : 'bg-surface-subtle border-surface-muted/50 hover:border-brand/30 hover:bg-surface-muted/60 cursor-pointer'
                    }`}
                  >
                    {isLow && !isOut && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-warning animate-pulse" />
                    )}
                    {isOut && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-zinc-500 bg-surface-base/80 px-2 py-1 rounded">Out of Stock</span>
                      </span>
                    )}
                    <h3 className="font-medium text-zinc-100 text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{product.sku || product.category?.name || '—'}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className={`text-base font-semibold ${isAdded ? 'text-success' : 'text-brand-light'}`}>
                        {sym}{product.sellingPrice.toFixed(2)}
                      </span>
                      <span className={`text-xs ${isOut ? 'text-danger-light' : isLow ? 'text-warning' : 'text-zinc-600'}`}>
                        {product.stock} left
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
