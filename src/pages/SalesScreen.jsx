import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { salesApi } from '../api/client';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import Receipt from '../components/Receipt';
import { X, Printer, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from '../components/ui';

export default function SalesScreen() {
  const { tenant } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${completedSale?.receiptNumber}`,
  });

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id, qty) => {
    if (qty < 1) return;
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.min(qty, i.stock) } : i));
  };

  const handleRemoveItem = (id) => setCartItems(prev => prev.filter(i => i.id !== id));
  const handleClearCart = () => setCartItems([]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setLoading(true);
    try {
      const res = await salesApi.create({
        items: cartItems.map(i => ({ productId: i.id, quantity: i.quantity })),
        paymentMethod
      });
      setCompletedSale(res.data.data);
      setShowReceipt(true);
      setCartItems([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReceipt = () => { setShowReceipt(false); setCompletedSale(null); };

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex bg-surface-base overflow-hidden">
      {/* Product grid — left */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ProductGrid onAddToCart={handleAddToCart} />
      </div>

      {/* Cart — right */}
      <div className="w-80 lg:w-96 flex-shrink-0 overflow-hidden">
        <Cart
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onCheckout={handleCheckout}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          loading={loading}
        />
      </div>

      {/* Receipt modal */}
      <AnimatePresence>
        {showReceipt && completedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && handleCloseReceipt()}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="bg-surface-subtle border border-surface-muted/50 rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', damping: 12, stiffness: 300 }}
                    className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 text-success" />
                  </motion.div>
                  <span className="font-semibold text-zinc-100 text-sm">Sale Complete</span>
                </div>
                <button onClick={handleCloseReceipt} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt */}
              <div className="flex-1 overflow-y-auto bg-surface-muted/30 p-4">
                <div className="bg-white rounded-xl shadow-sm">
                  <Receipt ref={receiptRef} sale={completedSale} tenant={tenant} />
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-200 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCloseReceipt}
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  New Sale <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
