'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { X, Printer, Loader2, AlertTriangle } from 'lucide-react';

interface Sale {
  id: string;
  receipt_number?: number; // Added to support sequential numbers
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
  onVoided?: () => void; 
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
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
        
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            price_at_sale, 
            products:product_id (
              name,
              tax_type
            )
          `)
          .eq('sale_id', sale.id);

        if (error) {
          console.error('Error fetching sale items:', error);
        } else if (data) {
          const transformedData = data.map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price_at_sale, 
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

  // Uses sequential number if it exists, otherwise falls back to ID hash
  const receiptNumber = sale.receipt_number 
    ? sale.receipt_number.toString() 
    : sale.id.substring(0, 8).toUpperCase();
    
  const subtotal = sale.total_amount - sale.tax_amount;

  const getTaxTypeCode = (taxType: string | null) => {
    if (!taxType) return '';
    switch (taxType) {
      case 'standard': return '(S)';
      case 'zero_rated': return '(Z)';
      case 'exempt': return '(E)';
      default: return '';
    }
  };

  const calculateTaxSummary = () => {
    let standardTotal = 0;
    let zeroExemptTotal = 0;
    let vatCollected = 0;

    items.forEach((item) => {
      const itemTotal = item.unit_price * item.quantity;
      const taxType = item.product?.tax_type;

      if (taxType === 'standard') {
        standardTotal += itemTotal;
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

      alert('Sale voided and stock returned.');
      setSaleStatus('voided');
      setShowVoidDialog(false);
      setVoidReason('');
      
      if (onVoided) onVoided();
    } catch (err: any) {
      console.error('Error voiding sale:', err);
      alert(`Failed to void sale: ${err.message || 'An unexpected error occurred'}`);
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      {/* THE FIX: flex-col, overflow-hidden on outer, and overflow-y-auto on inner */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
        
        {isVoided && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="transform -rotate-45">
              <div className="bg-red-600/90 backdrop-blur-sm text-white px-8 py-4 rounded-lg shadow-2xl">
                <p className="text-4xl font-extrabold tracking-wider">VOIDED</p>
              </div>
            </div>
          </div>
        )}

        {/* Header (Fixed at top) */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Receipt</h2>
            {isVoided && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Voided
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Receipt Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
            </div>
          ) : (
            <div className="space-y-4">
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
                <p className="text-xs font-bold text-gray-800 mt-2 bg-gray-100 inline-block px-3 py-1 rounded-full">
                  Receipt #{receiptNumber}
                </p>
              </div>

              {/* Items Table */}
              <div className="border-b border-gray-200 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-600 font-semibold w-12">Qty</th>
                      <th className="text-left py-2 text-gray-600 font-semibold">Item</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 text-gray-900 align-top font-medium">{item.quantity}</td>
                        <td className="py-2 text-gray-900 align-top">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.product?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-gray-500">
                              @{formatCurrency(item.unit_price)} {item.product?.tax_type && getTaxTypeCode(item.product.tax_type)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-right text-gray-900 font-bold align-top whitespace-nowrap">
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
                  <span className="text-gray-600">Subtotal (Excl. Tax)</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {vatCollected > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (16%)</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(vatCollected)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black pt-2 border-t border-dashed border-gray-200 mt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-emerald-600">{formatCurrency(sale.total_amount)}</span>
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

              {/* Payment Method & Footer */}
              <div className="text-center text-sm text-gray-600 pb-4">
                <p className="capitalize">Payment: <span className="font-semibold text-gray-800">{sale.payment_method || 'Cash'}</span></p>
                <p className="font-semibold mt-4 text-gray-900">Thank you for your business!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Fixed at bottom) */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          
          {canVoid && (
            <button
              onClick={() => setShowVoidDialog(true)}
              className="flex-none px-4 py-3 bg-white border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center"
              title="Void Sale"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-colors shadow-sm ${
               isVoided ? 'bg-gray-800 hover:bg-gray-900' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Void Confirmation Dialog */}
      {showVoidDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Void this Transaction?</h3>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. Stock will be returned to inventory.
              </p>
              
              <div className="mb-6">
                <label htmlFor="voidReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for voiding <span className="text-red-500">*</span>
                </label>
                <input
                  id="voidReason"
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g., Wrong Item, Customer Return"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base"
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
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoidSale}
                  disabled={voiding || !voidReason.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {voiding ? (
                    <Loader2 className="animate-spin w-5 h-5" />
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