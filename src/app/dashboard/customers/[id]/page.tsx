'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/supabase/client';
import { ReceiptModal } from '@/components/sales/ReceiptModal';
import { CustomerForm } from '@/components/customers/CustomerForm';
import {
  ArrowLeft,
  Edit,
  Loader2,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Wallet,
  CreditCard,
  X,
  Calendar,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  notes: string | null;
  business_id: string;
  created_at: string;
  balance?: number;
}

interface Sale {
  id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  business_id: string;
  customer_id: string | null;
  status?: string | null;
  void_reason?: string | null;
}

interface CustomerPayment {
  id: string;
  customer_id: string;
  amount: number;
  notes: string | null;
  payment_date?: string;
  created_at?: string;
}

type Tab = 'purchases' | 'payments';

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const { businessId } = useBusiness();
  const { canTrackDebt } = usePermissions();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('purchases');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (businessId && customerId) {
      fetchCustomerData();
    }
  }, [businessId, customerId]);

  const fetchCustomerData = async () => {
    if (!businessId || !customerId) return;

    try {
      setLoading(true);

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('business_id', businessId)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        if (customerError.code === 'PGRST116') {
          router.push('/dashboard/customers');
        }
        return;
      }

      setCustomer(customerData);

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, total_amount, tax_amount, payment_method, created_at, business_id, customer_id, status, void_reason')
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!salesError) setSales(salesData || []);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!paymentsError) setPayments((paymentsData as CustomerPayment[]) || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalVisits = sales.length;
  const averageTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;
  const balance = (customer?.balance ?? 0) as number;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          <p className="text-gray-600">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header: Name + Balance Badge + Actions */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
            </div>
            <button
              onClick={() => setShowEditForm(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Edit"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div
              className={`inline-flex items-center justify-center px-6 py-3 rounded-xl text-2xl font-bold ${
                balance > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Wallet className="w-6 h-6 mr-2" />
              Balance: {formatCurrency(balance)}
            </div>
            <button
              onClick={() => {
                if (!canTrackDebt) {
                  setToast('Upgrade to Growth to track Customer Debt (Kaloba).');
                  setTimeout(() => setToast(null), 3000);
                  return;
                }
                setShowPaymentModal(true);
              }}
              disabled={!canTrackDebt}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors min-h-[48px] ${
                canTrackDebt
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={!canTrackDebt ? 'Upgrade to Growth to track Customer Debt (Kaloba).' : 'Record Payment'}
            >
              {!canTrackDebt ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Record Payment</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="space-y-2">
            {customer.phone_number && (
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{customer.phone_number}</p>
              </div>
            )}
            {customer.email && (
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{customer.email}</p>
              </div>
            )}
            {customer.notes && (
              <div>
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-900">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <DollarSign className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Spent</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <ShoppingBag className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-xl font-bold text-gray-900">{totalVisits}</p>
            <p className="text-xs text-gray-500 mt-1">Total Visits</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <TrendingUp className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-xl font-bold text-gray-900">{formatCurrency(averageTicket)}</p>
            <p className="text-xs text-gray-500 mt-1">Avg Ticket</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab('purchases')}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                tab === 'purchases'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Purchase History
            </button>
            <button
              onClick={() => setTab('payments')}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                tab === 'payments'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Payment History
            </button>
          </div>

          {tab === 'purchases' && (
            <div className="p-4">
              {sales.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No purchase history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sales.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="w-full bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-emerald-200 text-left transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{formatDate(sale.created_at)}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {formatTime(sale.created_at)} • {sale.payment_method?.charAt(0).toUpperCase() + (sale.payment_method?.slice(1) || 'Cash')}
                          </p>
                          <span
                            className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded ${
                              sale.status === 'voided'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {sale.status === 'voided' ? 'Voided' : 'Completed'}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-emerald-600 shrink-0">
                          {formatCurrency(sale.total_amount)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="p-4">
              {payments.length === 0 ? (
                <div className="py-12 text-center">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((pmt) => (
                    <div
                      key={pmt.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatDate(pmt.payment_date || pmt.created_at || '')}
                        </p>
                        {pmt.notes && (
                          <p className="text-sm text-gray-500 mt-0.5">{pmt.notes}</p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(pmt.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onVoided={() => {
            fetchCustomerData();
            setSelectedSale(null);
          }}
        />
      )}

      {showEditForm && businessId && (
        <CustomerForm
          customer={customer}
          businessId={businessId}
          onClose={() => {
            setShowEditForm(false);
            fetchCustomerData();
          }}
        />
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          customerId={customerId}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setToast('Payment Recorded');
            setTimeout(() => setToast(null), 3000);
            fetchCustomerData();
          }}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-[80] px-4 py-3 rounded-lg shadow-lg font-semibold text-white bg-emerald-600 animate-in slide-in-from-top-5">
          {toast}
        </div>
      )}
    </div>
  );
}

interface RecordPaymentModalProps {
  customerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function RecordPaymentModal({ customerId, onClose, onSuccess }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('register_customer_payment', {
        p_customer_id: customerId,
        p_amount: num,
        p_notes: note.trim() || null,
        p_date: new Date(date).toISOString(),
      });

      if (rpcError) throw new Error(rpcError.message);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZMW) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Date
              </span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="e.g. Cash"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
