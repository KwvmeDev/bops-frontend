import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { productsApi, categoriesApi } from '../api/client';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, X, Save, ChevronUp, ChevronDown, ChevronsUpDown, Wand2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { toast, Skeleton } from '../components/ui';

const SORT_FIELDS = { name: 'name', sellingPrice: 'sellingPrice', stock: 'stock' };

// Generates a SKU from the product name and optional category name.
// Format: W1-W2-W3-CAT-NNNN (first 3 chars of up to 3 name words, first 3 chars of category or GEN, random 4-digit pad)
function generateSKU(name, categoryName) {
  const words = name.trim().split(/\s+/).slice(0, 3);
  const namePart = words
    .map(w => w.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .join('-');
  const catPart = categoryName
    ? categoryName.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GEN'
    : 'GEN';
  const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${namePart}-${catPart}-${num}`;
}

function BulkUploadModal({ categories, onClose, onImported }) {
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState(null);      // parsed rows ready to preview
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);  // { created, failed } after import
  const fileRef = useRef(null);

  const TEMPLATE_HEADERS = ['name', 'sku', 'category', 'costPrice', 'sellingPrice', 'stock', 'lowStockThreshold'];

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products-template.csv');
  }

  function parseFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // Map column names — support both 'category' (name) and 'categoryId'
        const mapped = raw.map(r => {
          // Resolve categoryId from category name if provided
          const catName = (r.category || r.categoryName || '').toString().trim();
          const matched = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          return {
            name: (r.name || '').toString().trim(),
            sku: (r.sku || '').toString().trim() || null,
            categoryId: r.categoryId || matched?.id || null,
            categoryName: catName || null,
            costPrice: Number(r.costPrice) || 0,
            sellingPrice: Number(r.sellingPrice) || 0,
            stock: Number(r.stock) || 0,
            lowStockThreshold: r.lowStockThreshold ? Number(r.lowStockThreshold) : null,
          };
        }).filter(r => r.name);  // drop completely empty rows

        setRows(mapped);
        setFileName(file.name);
        setResult(null);
      } catch {
        toast.error('Could not parse file. Use .xlsx, .xls, or .csv.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    if (!rows?.length) return;
    setSubmitting(true);
    try {
      const res = await productsApi.bulkUpload(rows);
      const { created, failed } = res.data.data;
      setResult({ created, failed });
      if (created > 0) onImported();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-brand-light" />
            <h2 className="text-base font-semibold text-zinc-100">Bulk Import Products</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-brand-light transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download template
            </button>
            <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Drop zone */}
          {!rows && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging ? 'border-brand/60 bg-brand/5' : 'border-surface-muted/60 hover:border-surface-muted hover:bg-surface-muted/20'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300 mb-1">Drop your file here or click to browse</p>
              <p className="text-xs text-zinc-600">Supports .xlsx, .xls, .csv (max 500 rows)</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
            </div>
          )}

          {/* Preview table */}
          {rows && !result && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{rows.length}</span> rows from <span className="text-zinc-200">{fileName}</span>
                </p>
                <button type="button" onClick={() => { setRows(null); setFileName(''); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  Change file
                </button>
              </div>
              <div className="border border-surface-muted/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-muted/50 bg-surface-muted/40">
                        {['Name', 'SKU', 'Category', 'Cost', 'Price', 'Stock'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-surface-muted/30 hover:bg-surface-muted/20">
                          <td className="px-3 py-2 text-zinc-200 max-w-[160px] truncate">{row.name || <span className="text-danger-light">missing</span>}</td>
                          <td className="px-3 py-2 text-zinc-500">{row.sku || <span className="text-zinc-600 italic">auto</span>}</td>
                          <td className="px-3 py-2 text-zinc-500">{row.categoryName || '—'}</td>
                          <td className="px-3 py-2 text-zinc-400">{row.costPrice}</td>
                          <td className="px-3 py-2 text-zinc-200">{row.sellingPrice}</td>
                          <td className="px-3 py-2 text-zinc-400">{row.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 50 && (
                  <p className="px-3 py-2 text-xs text-zinc-600 border-t border-surface-muted/30">
                    Showing 50 of {rows.length} rows
                  </p>
                )}
              </div>
            </>
          )}

          {/* Result summary */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-100">{result.created} product{result.created !== 1 ? 's' : ''} imported successfully</p>
                  {result.failed.length > 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5">{result.failed.length} row{result.failed.length !== 1 ? 's' : ''} failed</p>
                  )}
                </div>
              </div>
              {result.failed.length > 0 && (
                <div className="border border-surface-muted/50 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-surface-muted/40 border-b border-surface-muted/50 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-warning" />
                    <span className="text-xs font-medium text-zinc-400">Failed rows</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {result.failed.map(({ row, reason }) => (
                      <div key={row} className="px-3 py-2 border-b border-surface-muted/30 last:border-0 flex gap-3 text-xs">
                        <span className="text-zinc-500 flex-shrink-0">Row {row}</span>
                        <span className="text-zinc-400">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
          <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
            className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors">
            {result ? 'Close' : 'Cancel'}
          </motion.button>
          {!result && (
            <motion.button type="button" onClick={handleImport} whileTap={{ scale: 0.97 }}
              disabled={!rows?.length || submitting}
              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
              {submitting ? 'Importing...' : `Import ${rows?.length || 0} products`}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductModal({ product, categories, tenant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    categoryId: product?.categoryId || '',
    costPrice: product?.costPrice?.toString() || '',
    sellingPrice: product?.sellingPrice?.toString() || '',
    stock: product?.stock?.toString() || '0',
    lowStockThreshold: product?.lowStockThreshold?.toString() || ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const margin = form.costPrice && form.sellingPrice
    ? (((parseFloat(form.sellingPrice) - parseFloat(form.costPrice)) / parseFloat(form.sellingPrice)) * 100).toFixed(1)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: form.name,
        sku: form.sku || null,
        categoryId: form.categoryId || null,
        costPrice: parseFloat(form.costPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        stock: parseInt(form.stock, 10),
        lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold, 10) : null
      };
      if (product) await productsApi.update(product.id, data);
      else await productsApi.create(data);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all";
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className={labelClass}>Product name *</label>
            <input type="text" required value={form.name} onChange={set('name')} placeholder="Enter product name" className={inputClass} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>SKU / Barcode</label>
              <div className="flex gap-2">
                <input type="text" value={form.sku} onChange={set('sku')} placeholder="Optional" className={inputClass} />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={!form.name.trim()}
                  onClick={() => {
                    const catName = categories.find(c => c.id === form.categoryId)?.name || '';
                    setForm(p => ({ ...p, sku: generateSKU(p.name, catName) }));
                  }}
                  title="Generate SKU"
                  className="flex-shrink-0 px-2.5 py-2.5 bg-surface-muted hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed border border-surface-overlay/50 rounded-lg text-zinc-400 hover:text-brand-light transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={form.categoryId} onChange={set('categoryId')} className={inputClass}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cost price *</label>
              <input type="number" required min="0" step="0.01" value={form.costPrice} onChange={set('costPrice')} placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Selling price *</label>
              <input type="number" required min="0" step="0.01" value={form.sellingPrice} onChange={set('sellingPrice')} placeholder="0.00" className={inputClass} />
            </div>
          </div>
          {margin !== null && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-xs ${parseFloat(margin) > 0 ? 'text-success' : 'text-danger-light'}`}>
              Margin: {margin}%
            </motion.p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Stock qty *</label>
              <input type="number" required min="0" value={form.stock} onChange={set('stock')} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Low stock alert</label>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} placeholder={`Default: ${tenant?.lowStockThreshold || 5}`} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }} className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </motion.button>
            <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.97 }} className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving ? 'Saving...' : <><Save className="w-3.5 h-3.5" /> Save</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function Inventory() {
  const { tenant, hasMinRole, currencySymbol } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(searchParams.get('filter') || '');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });
  const undoTimers = useRef({});

  const canManage = hasMinRole('MANAGER');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pr, cr] = await Promise.all([
        productsApi.getAll({ includeInactive: canManage ? 'true' : 'false' }),
        categoriesApi.getAll()
      ]);
      setProducts(pr.data.data);
      setCategories(cr.data.data);
    } catch {}
    setLoading(false);
  };

  const sym = currencySymbol;
  const fmt = (n) => `${sym}${Number(n).toFixed(2)}`;

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
      if (filter === 'lowStock') {
        const th = p.lowStockThreshold ?? tenant?.lowStockThreshold ?? 5;
        return matchSearch && p.stock <= th;
      }
      return matchSearch;
    })
    .sort((a, b) => {
      const va = a[sort.field], vb = b[sort.field];
      if (typeof va === 'string') return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === 'asc' ? va - vb : vb - va;
    });

  const toggleSort = (field) => setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />;
    return sort.dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-brand-light" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-light" />;
  };

  const handleDelete = (product) => {
    // Optimistic remove
    setProducts(prev => prev.filter(p => p.id !== product.id));
    const toastId = `del-${product.id}`;
    const tid = setTimeout(async () => {
      try { await productsApi.delete(product.id); }
      catch { setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name))); toast.error('Failed to delete product'); }
    }, 5000);
    undoTimers.current[product.id] = tid;
    toast(`"${product.name}" deleted`, {
      id: toastId,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(undoTimers.current[product.id]);
          setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
        }
      },
      duration: 5000
    });
  };

  const handleStockAdjust = async (product, adj) => {
    try {
      await productsApi.adjustStock(product.id, adj);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock + adj } : p));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust stock');
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Inventory</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{products.length} products total</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-muted hover:bg-surface-overlay border border-surface-muted/60 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload CSV/Excel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setEditingProduct(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand/20"
            >
              <Plus className="w-4 h-4" /> Add Product
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {[
            { id: '', label: 'All Products' },
            { id: 'lowStock', label: 'Low Stock', icon: AlertTriangle }
          ].map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilter(id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                filter === id
                  ? id === 'lowStock' ? 'bg-warning/15 text-warning border border-warning/30' : 'bg-brand/15 text-brand-light border border-brand/30'
                  : 'bg-surface-muted text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />} {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-surface-subtle border border-surface-muted/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-muted/50">
                {[
                  { label: 'Product', field: 'name' },
                  { label: 'Category', field: null },
                  { label: 'Cost', field: null },
                  { label: 'Price', field: 'sellingPrice' },
                  { label: 'Stock', field: 'stock' },
                  { label: 'Status', field: null },
                  canManage && { label: 'Actions', field: null },
                ].filter(Boolean).map(({ label, field }) => (
                  <th key={label} onClick={field ? () => toggleSort(field) : undefined}
                    className={`px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider ${field ? 'cursor-pointer hover:text-zinc-300 transition-colors' : ''}`}>
                    <div className="flex items-center gap-1">
                      {label}
                      {field && <SortIcon field={field} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-muted/30">
                    {Array.from({ length: canManage ? 7 : 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-4 py-16 text-center">
                    <Package className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                    <p className="text-sm text-zinc-600">No products found</p>
                    {canManage && (
                      <button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="mt-3 text-xs text-brand-light hover:text-brand transition-colors">
                        Add your first product →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filtered.map((product, i) => {
                    const th = product.lowStockThreshold ?? tenant?.lowStockThreshold ?? 5;
                    const isLow = product.stock <= th && product.stock > 0;
                    const isOut = product.stock === 0;
                    return (
                      <motion.tr
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.15), duration: 0.22 }}
                        className={`border-b border-surface-muted/30 hover:bg-surface-muted/30 transition-colors group ${!product.active ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-zinc-200">{product.name}</p>
                          <p className="text-xs text-zinc-600 mt-0.5">{product.sku || 'No SKU'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-zinc-500">{product.category?.name || '—'}</td>
                        <td className="px-4 py-3.5 text-sm text-zinc-400">{fmt(product.costPrice)}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-zinc-200">{fmt(product.sellingPrice)}</td>
                        <td className="px-4 py-3.5">
                          {canManage ? (
                            <div className="flex items-center gap-2">
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleStockAdjust(product, -1)} disabled={product.stock === 0}
                                className="w-6 h-6 rounded bg-surface-muted hover:bg-surface-overlay flex items-center justify-center text-zinc-400 disabled:opacity-30 transition-colors text-xs font-bold">−</motion.button>
                              <span className={`w-10 text-center text-sm font-medium ${isOut ? 'text-danger-light' : isLow ? 'text-warning' : 'text-zinc-200'}`}>{product.stock}</span>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleStockAdjust(product, 1)}
                                className="w-6 h-6 rounded bg-surface-muted hover:bg-surface-overlay flex items-center justify-center text-zinc-400 transition-colors text-xs font-bold">+</motion.button>
                            </div>
                          ) : (
                            <span className={`text-sm font-medium ${isOut ? 'text-danger-light' : isLow ? 'text-warning' : 'text-zinc-200'}`}>{product.stock}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {!product.active ? (
                            <span className="text-xs px-2 py-1 bg-surface-muted text-zinc-500 rounded-full">Inactive</span>
                          ) : isOut ? (
                            <span className="text-xs px-2 py-1 bg-danger/10 text-danger-light rounded-full">Out of Stock</span>
                          ) : isLow ? (
                            <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">Low Stock</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">In Stock</span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingProduct(product); setShowModal(true); }}
                                className="p-1.5 text-zinc-500 hover:text-brand-light hover:bg-brand/10 rounded-lg transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDelete(product)}
                                className="p-1.5 text-zinc-500 hover:text-danger-light hover:bg-danger/10 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal
            product={editingProduct}
            categories={categories}
            tenant={tenant}
            onClose={() => setShowModal(false)}
            onSaved={async () => { setShowModal(false); await fetchData(); toast.success(editingProduct ? 'Product updated' : 'Product added'); }}
          />
        )}
        {showBulkModal && (
          <BulkUploadModal
            categories={categories}
            onClose={() => setShowBulkModal(false)}
            onImported={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
