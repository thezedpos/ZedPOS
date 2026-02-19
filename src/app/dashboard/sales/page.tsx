'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { createClient } from '@/supabase/client';
import { ReceiptModal } from '@/components/sales/ReceiptModal';
import { Loader2, Wallet, Smartphone, CreditCard, Hash } from 'lucide-react';

interface Sale {
  id: string;
  receipt_number?: number; // <--- ADDED THIS
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  business_id: string;
  status?: string | null;
  void_reason?: string | null;
}

type FilterPeriod = 'today' | 'yesterday' | 'this_week';

export default function SalesHistoryPage() {
  const { businessId } = useBusiness();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>('today');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const supabase = createClient();

  // Fetch sales based on filter
  useEffect(() => {
    if (businessId) {
      fetchSales();
    }
  }, [businessId, selectedFilter]);

  const fetchSales = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      switch (selectedFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        case 'this_week':
          const dayOfWeek = now.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      const { data, error } = await supabase
        .from('sales')
        // ADDED receipt_number TO QUERY
        .select('id, receipt_number, total_amount, tax_amount, payment_method, created_at, business_id, status, void_reason')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
      } else {
        setSales(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
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

  const getPaymentIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return Wallet;
      case 'mobile':
      case 'mobile_money':
        return Smartphone;
      case 'card':
      case 'credit':
        return CreditCard;
      default:
        return Wallet;
    }
  };

  const getStatusBadge = (sale: Sale) => {
    if (sale.status === 'voided') {
      return (
        <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
          Voided
        </span>
      );
    }
    return (
      <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-1 rounded-full">
        Completed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedFilter('today')}
            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${
              selectedFilter === 'today'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedFilter('yesterday')}
            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${
              selectedFilter === 'yesterday'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setSelectedFilter('this_week')}
            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${
              selectedFilter === 'this_week'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            This Week
          </button>
        </div>

        {/* Sales List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-500 font-medium">No sales found for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => {
              const PaymentIcon = getPaymentIcon(sale.payment_method);
              return (
                <button
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-emerald-500 hover:shadow-md transition-all text-left active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-2 text-gray-500">
                        <Hash className="w-4 h-4" />
                        <span className="text-sm font-bold text-gray-700">
                           {sale.receipt_number ? sale.receipt_number : sale.id.slice(0, 6).toUpperCase()}
                        </span>
                     </div>
                     {getStatusBadge(sale)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-emerald-50 transition-colors">
                         <PaymentIcon className="w-5 h-5 text-gray-600 group-hover:text-emerald-600" />
                      </div>
                      <div>
                         <span className="block text-sm font-bold text-gray-900">
                           {formatTime(sale.created_at)}
                         </span>
                         <span className="text-xs text-gray-500 capitalize font-medium">
                           {sale.payment_method || 'Cash'}
                         </span>
                      </div>
                    </div>

                    <p className="text-xl font-black text-emerald-600">
                      {formatCurrency(sale.total_amount)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onVoided={() => {
            fetchSales(); // Refresh the list after voiding
            setSelectedSale(null); // Close modal
          }}
        />
      )}
    </div>
  );
}