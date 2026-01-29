'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { X, Printer, Loader2, AlertTriangle } from 'lucide-react';

interface Sale {
  id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  business_id: string;
  status?: string | null;
  void_reason?: string | null;
}

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: {
    name: string;
    tax_type: string | null;
  };
}

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  onVoided?: () => void; // Callback to refresh parent list
}

export function ReceiptModal({ sale, onClose, onVoided }: ReceiptModalProps) {
  const { businessName, businessId, userRole } = useBusiness();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessTpin, setBusinessTpin] = useState<string | null>(null);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [saleStatus, setSaleStatus] = useState<string | null>(sale.status || null);
  const supabase = createClient();

  const isVoided = saleStatus === 'voided';
  const canVoid = userRole === 'owner' && !isVoided;

  // Fetch sale items with product names and business TPIN
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch business TPIN
        if (businessId) {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('tpin')
            .eq('id', businessId)
            .single();
          
          if (businessData?.tpin) {
            setBusinessTpin(businessData.tpin);
          }
        }
        
        // Fetch sale items and join with products
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            products:product_id (
              name,
              tax_type
            )
          `)
          .eq('sale_id', sale.id);

        if (error) {
          console.error('Error fetching sale items:', error);
        } else if (data) {
          // Transform the data to flatten the product name and tax_type
          const transformedData = data.map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            product: {
              name: item.products?.name || 'Unknown Product',
              tax_type: item.products?.tax_type || null,
            },
          }));
          setItems(transformedData);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sale.id, businessId, supabase]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatCurrency = (amount: number) => {
    return `K${amount.toFixed(2)}`;
  };

  const receiptNumber = sale.id.substring(0, 8).toUpperCase();
  const subtotal = sale.total_amount - sale.tax_amount;

  // Get tax type code
  const getTaxTypeCode = (taxType: string | null) => {
    if (!taxType) return '';
    switch (taxType) {
      case 'standard':
        return '(S)';
      case 'zero_rated':
        return '(Z)';
      case 'exempt':
        return '(E)';
      default:
        return '';
    }
  };

  // Calculate totals by tax type
  const calculateTaxSummary = () => {
    let standardTotal = 0;
    let zeroExemptTotal = 0;
    let vatCollected = 0;

    items.forEach((item) => {
      const itemTotal = item.unit_price * item.quantity;
      const taxType = item.product?.tax_type;

      if (taxType === 'standard') {
        standardTotal += itemTotal;
        // Calculate VAT for standard items
        const itemVAT = itemTotal - (itemTotal / 1.16);
        vatCollected += itemVAT;
      } else if (taxType === 'zero_rated' || taxType === 'exempt') {
        zeroExemptTotal += itemTotal;
      }
    });

    return { standardTotal, zeroExemptTotal, vatCollected };
  };

  const { standardTotal, zeroExemptTotal, vatCollected } = calculateTaxSummary();

  const handlePrint = () => {
    // Placeholder for print functionality
    window.print();
  };

  const handleVoidSale = async () => {
    if (!voidReason.trim()) {
      alert('Please provide a reason for voiding this transaction');
      return;
    }

    try {
      setVoiding(true);
      const { data, error } = await supabase.rpc('void_sale_transaction', {
        p_sale_id: sale.id,
        p_reason: voidReason.trim(),
      });

      if (error) {
        console.error('Error voiding sale:', error);
        alert(`Failed to void sale: ${error.message}`);
        setVoiding(false);
        return;
      }

      // Success
      alert('Sale voided and stock returned.');
      setSaleStatus('voided');
      setShowVoidDialog(false);
      setVoidReason('');
      
      // Refresh parent list if callback provided
      if (onVoided) {
        onVoided();
      }
    } catch (err: any) {
      console.error('Error voiding sale:', err);
      alert(`Failed to void sale: ${err.message || 'An unexpected error occurred'}`);
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
        {/* VOIDED Watermark */}
        {isVoided && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="transform -rotate-45">
              <div className="bg-red-600 text-white px-8 py-4 rounded-lg shadow-2xl">
                <p className="text-4xl font-extrabold tracking-wider">VOIDED</p>
              </div>
            </div>
          </div>
        )}

        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Receipt</h2>
          {isVoided && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              VOIDED
            </span>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Receipt Content */}
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Receipt Header */}
            <div className="text-center border-b border-gray-200 pb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {businessName || 'Shop'}
              </h3>
              {businessTpin && (
                <p className="text-xs text-gray-600 mb-2">TPIN: {businessTpin}</p>
              )}
              <p className="text-sm text-gray-600">{formatDate(sale.created_at)}</p>
              <p className="text-sm text-gray-600">{formatTime(sale.created_at)}</p>
              <p className="text-xs text-gray-500 mt-2">Receipt #: {receiptNumber}</p>
            </div>

            {/* Items Table */}
            <div className="border-b border-gray-200 pb-4 overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-semibold">Qty</th>
                    <th className="text-left py-2 text-gray-600 font-semibold">Item</th>
                    <th className="text-right py-2 text-gray-600 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{item.quantity}</td>
                      <td className="py-2 text-gray-900">
                        {item.product?.name || 'Unknown'}
                        {item.product?.tax_type && (
                          <span className="text-xs text-gray-500 ml-1">
                            {getTaxTypeCode(item.product.tax_type)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="space-y-2 border-b border-gray-200 pb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {vatCollected > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (16%)</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(vatCollected)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-600">
                  {formatCurrency(sale.total_amount)}
                </span>
              </div>
            </div>

            {/* VAT Analysis */}
            {(standardTotal > 0 || zeroExemptTotal > 0) && (
              <div className="space-y-1 border-b border-gray-200 pb-4 text-xs">
                <p className="font-semibold text-gray-900 mb-2">VAT Analysis</p>
                {standardTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Total Taxable (16%)</span>
                    <span className="font-medium">{formatCurrency(standardTotal)}</span>
                  </div>
                )}
                {vatCollected > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>VAT Amount</span>
                    <span className="font-medium">{formatCurrency(vatCollected)}</span>
                  </div>
                )}
                {zeroExemptTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Non-Taxable</span>
                    <span className="font-medium">{formatCurrency(zeroExemptTotal)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="text-center text-sm text-gray-600 pb-4 border-b border-gray-200">
              <p className="capitalize">Payment: {sale.payment_method || 'Cash'}</p>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500">
              <p className="font-semibold">Thank you for your business!</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          {canVoid && (
            <button
              onClick={() => setShowVoidDialog(true)}
              className="flex-1 px-4 py-3 border-2 border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <AlertTriangle className="w-5 h-5" />
              Void Sale
            </button>
          )}
          {isVoided && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors min-h-[44px]"
            >
              Close
            </button>
          )}
          {!isVoided && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors min-h-[44px]"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Void Confirmation Dialog */}
      {showVoidDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Void this Transaction?</h3>
              <p className="text-sm text-gray-600 mb-4">
                This action cannot be undone. Stock will be returned to inventory.
              </p>
              
              <div className="mb-4">
                <label htmlFor="voidReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for voiding <span className="text-red-500">*</span>
                </label>
                <input
                  id="voidReason"
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g., Wrong Item, Customer Return, etc."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVoidDialog(false);
                    setVoidReason('');
                  }}
                  disabled={voiding}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoidSale}
                  disabled={voiding || !voidReason.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {voiding ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      <span>Voiding...</span>
                    </>
                  ) : (
                    'Confirm Void'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
