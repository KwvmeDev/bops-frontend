import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

const Receipt = forwardRef(({ sale, tenant }, ref) => {
  const { currencySymbol } = useAuth();
  if (!sale) return null;

  const formatCurrency = (amount) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  return (
    <div ref={ref} data-theme="light" className="p-6 max-w-[300px] mx-auto font-mono text-sm bg-white">
      {/* Header */}
      <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
        <div className='mx-auto h-16 rounded-2xl flex items-center justify-center'>
          <img 
            src="/logo-light.png"
            alt="Klevr"
            // className="h-10" 
            style={{
              height: "54px"
            }}
          />
        </div>
        <h1 className="text-lg font-bold">{tenant?.name || 'My Shop'}</h1>
        {tenant?.address && <p className="text-xs">{tenant.address}</p>}
        {tenant?.phone && <p className="text-xs">{tenant.phone}</p>}
      </div>

      {/* Receipt Info */}
      <div className="mb-4 text-xs">
        <div className="flex justify-between">
          <span>Receipt #:</span>
          <span className="font-bold">{sale.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{dayjs(sale.createdAt).format('YYYY-MM-DD HH:mm')}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span>{sale.user?.name || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment:</span>
          <span>{sale.paymentMethod.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Items */}
      <div className="mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Price</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-1 max-w-[100px] truncate">
                  {item.product?.name || 'Unknown'}
                </td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{(item.unitPrice)}</td>
                <td className="text-right py-1">{(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-2"></div>

      {/* Totals */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(sale.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-1 mt-2">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 pt-4 border-t border-dashed border-gray-400">
        <p className="text-xs">Goods sold are not returnable.</p>
        <p className="text-xs">Thank you for your purchase!</p>
        <p className="text-xs text-gray-500 mt-2">
          {dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

export default Receipt;
