'use client';

import { X, CreditCard, Banknote, Smartphone, Users, Loader2, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
}

interface CheckoutModalProps {
  total: number;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  businessId: string;
  onClose: () => void;
  onConfirm: (method: string) => void;
}

export function CheckoutModal({ 
  total, 
  selectedCustomerId, 
  onSelectCustomer, 
  businessId,
  onClose, 
  onConfirm 
}: CheckoutModalProps) {
  const { canTrackDebt } = usePermissions();
  const [method, setMethod] = useState<'cash' | 'mobile' | 'credit' | 'card'>('cash');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!businessId) return;

      try {
        setLoadingCustomers(true);
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name, phone_number')
          .eq('business_id', businessId)
          .order('full_name', { ascending: true });

        if (error) {
          console.error('Error fetching customers:', error);
        } else {
          setCustomers(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [businessId, supabase]);

  const handleConfirm = () => {
    setLoading(true);
    // Add a tiny delay so the user sees the button click animation
    setTimeout(() => {
      onConfirm(method);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Dark Overlay (High Z-Index) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-full md:max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Confirm Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span>Customer</span>
              </div>
            </label>
            {loadingCustomers ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
              </div>
            ) : (
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => onSelectCustomer(e.target.value || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base bg-white"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                    {customer.phone_number ? ` - ${customer.phone_number}` : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedCustomerId && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                Sale will be attributed to: {customers.find(c => c.id === selectedCustomerId)?.full_name}
              </p>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Total Amount Due</p>
            <p className="text-4xl font-extrabold text-emerald-600">
              K{total.toFixed(2)}
            </p>
          </div>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setMethod('cash')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                method === 'cash' 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                  : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Banknote className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">Cash</span>
            </button>

            <button
              onClick={() => setMethod('mobile')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                method === 'mobile' 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                  : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">Mobile</span>
            </button>

            <button
              onClick={() => {
                if (!canTrackDebt) {
                  setToast('Upgrade to Growth to track Customer Debt (Kaloba).');
                  setTimeout(() => setToast(null), 3000);
                  return;
                }
                setMethod('credit');
              }}
              disabled={!canTrackDebt}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                !canTrackDebt
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : method === 'credit' 
                  ? 'border-amber-500 bg-amber-50 text-amber-700' 
                  : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title={!canTrackDebt ? 'Upgrade to Growth to track Customer Debt (Kaloba).' : (!selectedCustomerId ? 'Select a customer first' : 'Sell on credit')}
            >
              {!canTrackDebt ? (
                <Lock className="w-6 h-6 mb-2" />
              ) : (
                <CreditCard className="w-6 h-6 mb-2" />
              )}
              <span className="text-xs font-bold">Credit</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? 'Processing...' : `Pay K${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[80] px-4 py-3 rounded-lg shadow-lg font-semibold text-white bg-red-600 animate-in slide-in-from-top-5">
          {toast}
        </div>
      )}
    </div>
  );
}