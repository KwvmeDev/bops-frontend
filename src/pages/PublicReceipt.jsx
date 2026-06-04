import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { Share2, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { variants } from '../design/motion';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Format a numeric amount with a currency symbol
function formatAmount(amount, symbol = '') {
  return `${symbol}${Number(amount).toFixed(2)}`;
}

// Humanise the PaymentMethod enum value
function formatPaymentMethod(method) {
  if (!method) return '';
  return method.replace(/_/g, ' ');
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl animate-pulse">
        {/* Shop name placeholder */}
        <div className="h-6 bg-zinc-200 rounded w-2/3 mx-auto mb-2" />
        <div className="h-4 bg-zinc-100 rounded w-1/2 mx-auto mb-6" />
        <div className="border-t border-dashed border-zinc-300 mb-4" />
        {/* Item rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between mb-3">
            <div className="h-3 bg-zinc-100 rounded w-2/5" />
            <div className="h-3 bg-zinc-100 rounded w-1/4" />
          </div>
        ))}
        <div className="border-t border-dashed border-zinc-300 my-4" />
        {/* Totals */}
        <div className="h-4 bg-zinc-100 rounded w-1/3 ml-auto mb-2" />
        <div className="h-5 bg-zinc-200 rounded w-2/5 ml-auto" />
      </div>
    </div>
  );
}

// ─── Error / not-found state ─────────────────────────────────────────────────

function ReceiptError({ shopName }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        variants={variants.slideUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl text-center"
      >
        <AlertTriangle className="mx-auto mb-4 text-amber-500" size={40} />
        <h1 className="text-lg font-bold text-zinc-800 mb-2">Receipt not found</h1>
        <p className="text-sm text-zinc-500">
          {shopName
            ? `This receipt from ${shopName} may have expired or the link is incorrect.`
            : 'This receipt may have expired or the link is incorrect.'}
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main receipt card ────────────────────────────────────────────────────────

function ReceiptCard({ sale }) {
  const { tenant, items = [], currencySymbol } = sale;
  const symbol = currencySymbol || tenant?.currencySymbol || '';
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt from ${tenant?.name || 'Shop'}`,
          text: `Your receipt #${sale.receiptNumber}`,
          url,
        });
      } catch {
        // User cancelled — no action needed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } catch {
        // Clipboard unavailable — silent fail
      }
    }
  }

  return (
    // Outer wrapper: dark background fills the whole viewport
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-start py-8 px-4 print:bg-white print:py-0">
      {/* Action buttons — hidden when printing */}
      <div className="w-full max-w-sm flex gap-3 mb-4 print:hidden">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {shared ? (
            <>
              <CheckCircle size={16} />
              Link copied
            </>
          ) : (
            <>
              <Share2 size={16} />
              Share
            </>
          )}
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Receipt card — white background for print clarity.
          colorScheme: 'light' prevents mobile browsers from forcing dark-mode
          recolouring on the card contents when the OS is in dark mode. */}
      <motion.div
        variants={variants.slideUp}
        initial="hidden"
        animate="visible"
        style={{ colorScheme: 'light' }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none"
      >
        {/* ── Header ── */}
        <div className="bg-white px-6 pt-7 pb-4 text-center border-b border-dashed border-zinc-300">
          <img
            src="/logo-light.png"
            alt={tenant?.name || 'Shop logo'}
            className="h-12 mx-auto mb-3 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="text-xl font-bold text-zinc-800">{tenant?.name || 'My Shop'}</h1>
          {tenant?.address && (
            <p className="text-xs text-zinc-500 mt-0.5">{tenant.address}</p>
          )}
          {tenant?.phone && (
            <p className="text-xs text-zinc-500">{tenant.phone}</p>
          )}
        </div>

        {/* ── Receipt meta ── */}
        <div className="px-6 py-4 bg-white space-y-1 text-xs text-zinc-500">
          <div className="flex justify-between">
            <span>Receipt #</span>
            <span className="font-semibold text-zinc-700">{sale.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="text-zinc-700">
              {dayjs(sale.createdAt).format('DD MMM YYYY, HH:mm')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span className="font-medium text-zinc-700 capitalize">
              {formatPaymentMethod(sale.paymentMethod)}
            </span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-6 border-t border-dashed border-zinc-300" />

        {/* ── Items ── */}
        <div className="px-6 py-4 bg-white">
          <div className="flex text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            <span className="flex-1">Item</span>
            <span className="w-20 text-right">Qty × Price</span>
            <span className="w-20 text-right">Total</span>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex text-sm text-zinc-700">
                <span className="flex-1 truncate pr-2">
                  {item.product?.name || item.name || 'Item'}
                </span>
                <span className="w-20 text-right text-xs text-zinc-500 self-center">
                  {item.quantity} × {formatAmount(item.unitPrice, symbol)}
                </span>
                <span className="w-20 text-right font-medium">
                  {formatAmount(item.total, symbol)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-6 border-t border-dashed border-zinc-300" />

        {/* ── Totals ── */}
        <div className="px-6 py-4 bg-white space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span>
            <span>{formatAmount(sale.subtotal, symbol)}</span>
          </div>
          {Number(sale.taxAmount) > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>Tax</span>
              <span>{formatAmount(sale.taxAmount, symbol)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-zinc-800 border-t border-zinc-200 pt-2 mt-2">
            <span>TOTAL</span>
            <span>{formatAmount(sale.total, symbol)}</span>
          </div>
        </div>

        {/* ── Footer / thank-you ── */}
        <div className="px-6 pb-7 pt-2 bg-white text-center border-t border-dashed border-zinc-200">
          <p className="text-xs text-zinc-400 mt-3">
            Thank you for your purchase!
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Goods sold are not returnable.
          </p>
        </div>
      </motion.div>

      {/* Powered-by note — hidden when printing */}
      <p className="mt-6 text-xs text-zinc-600 print:hidden">
        Powered by Klevr POS
      </p>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function PublicReceipt() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [sale, setSale] = useState(null);
  const [errorShopName, setErrorShopName] = useState(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }

    let cancelled = false;

    async function fetchReceipt() {
      try {
        const res = await axios.get(`${API_URL}/receipts/${token}`);
        if (!cancelled) {
          // Support both response shapes: { data: sale } and { data: { data: sale } }
          const payload = res.data?.data ?? res.data;
          setSale(payload);
          setState('success');
        }
      } catch (err) {
        if (!cancelled) {
          // Attempt to surface the shop name from a 404 body if the server includes it
          const shopName =
            err.response?.data?.shopName ||
            err.response?.data?.data?.tenant?.name ||
            null;
          setErrorShopName(shopName);
          setState('error');
        }
      }
    }

    fetchReceipt();
    return () => { cancelled = true; };
  }, [token]);

  if (state === 'loading') return <Skeleton />;
  if (state === 'error') return <ReceiptError shopName={errorShopName} />;
  return <ReceiptCard sale={sale} />;
}
