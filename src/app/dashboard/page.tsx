'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { 
  Loader2, X, TrendingUp, Receipt, AlertTriangle, 
  ShoppingCart, Plus, Users, BarChart3, Settings, Crown 
} from 'lucide-react';
import Link from 'next/link';

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
  payment_method: string;
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { business, businessId, businessName, isLoading, userRole } = useBusiness();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [showTrialBanner, setShowTrialBanner] = useState(true);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  // Redirect to onboarding if no business found
  useEffect(() => {
    if (!isLoading && !businessId) {
      router.push('/onboarding');
    }
  }, [isLoading, businessId, router]);

  // NEW: Calculate Trial Days directly from the Context (Faster!)
  useEffect(() => {
    if (business?.subscription_status === 'trial' && business?.subscription_end_date) {
      const endDate = new Date(business.subscription_end_date);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setTrialDaysLeft(Math.max(0, diffDays));
    } else {
      setTrialDaysLeft(null); 
    }
  }, [business]);

  // Fetch Sales Data
  useEffect(() => {
    if (businessId) {
      const fetchSalesData = async () => {
        try {
          setLoadingSales(true);
          
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          
          const { data: todayData } = await supabase
            .from('sales')
            .select('id, total_amount, created_at, payment_method')
            .eq('business_id', businessId)
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString())
            .neq('status', 'voided')
            .order('created_at', { ascending: false });

          if (todayData) {
            const total = todayData.reduce((sum: number, sale: Sale) => sum + (sale.total_amount || 0), 0);
            setTodaySales(total);
            setTransactionCount(todayData.length);
          }

          const { data: recentData } = await supabase
            .from('sales')
            .select('id, total_amount, created_at, payment_method')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(5);

          if (recentData) setRecentSales(recentData);

        } catch (err) {
          console.error('Error fetching sales data:', err);
        } finally {
          setLoadingSales(false);
        }
      };

      fetchSalesData();
    }
  }, [businessId, supabase]);

  // --- MISSING HELPER FUNCTIONS RESTORED ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  if (!businessId) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-4">
        
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {businessName || 'Shop'}
          </h1>
        </div>

        {/* --- FIXED BANNER --- */}
        {showTrialBanner && trialDaysLeft !== null && trialDaysLeft > 0 && (
          <div className="relative">
            {/* The Clickable Area */}
            <Link href="/dashboard/settings/subscription" className="block">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
                    <Crown className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Pro Trial Active</p>
                    <p className="text-emerald-50 text-sm">
                      {trialDaysLeft} days remaining. Tap to manage plan.
                    </p>
                  </div>
                </div>
                {/* Visual arrow to indicate clickability */}
                <div className="text-white/80 pr-8">→</div> 
              </div>
            </Link>

            {/* The Close Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTrialBanner(false);
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{loadingSales ? '-' : formatCurrency(todaySales)}</p>
            <p className="text-xs text-gray-500 mt-1">Today's Sales</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <Receipt className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{loadingSales ? '-' : transactionCount}</p>
            <p className="text-xs text-gray-500 mt-1">Transactions</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <AlertTriangle className="w-5 h-5 text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">Low Stock</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/pos" className="bg-emerald-600 text-white rounded-lg p-6 flex flex-col items-center justify-center shadow-sm hover:bg-emerald-700 transition-colors active:scale-95">
              <ShoppingCart className="w-8 h-8 mb-2" />
              <span className="font-semibold text-base">New Sale</span>
            </Link>

            <Link href="/dashboard/inventory" className="bg-white text-gray-900 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors active:scale-95">
              <Plus className="w-8 h-8 mb-2 text-gray-700" />
              <span className="font-semibold text-base">Add Product</span>
            </Link>

            <Link href="/dashboard/customers" className="bg-indigo-600 text-white rounded-lg p-6 flex flex-col items-center justify-center shadow-sm hover:bg-indigo-700 transition-colors active:scale-95">
              <Users className="w-8 h-8 mb-2" />
              <span className="font-semibold text-base">Customers</span>
              <span className="text-xs opacity-80 mt-1">Manage Credit</span>
            </Link>

            <Link href="/dashboard/settings" className="bg-white text-gray-900 rounded-lg p-6 flex flex-col items-center justify-center shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors active:scale-95">
              <Settings className="w-8 h-8 mb-2 text-gray-700" />
              <span className="font-semibold text-base">Settings</span>
              <span className="text-xs text-gray-500 mt-1">Team & Plans</span>
            </Link>

            {/* Close Day (Owner Only) */}
            {userRole === 'owner' && (
              <Link href="/dashboard/reports/daily-summary" className="col-span-2 bg-amber-500 text-white rounded-lg p-4 flex items-center justify-center shadow-sm hover:bg-amber-600 transition-colors active:scale-95">
                <Receipt className="w-6 h-6 mr-2" />
                <span className="font-semibold">Close Business Day (Z-Report)</span>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            {loadingSales ? (
              <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-gray-400" /></div>
            ) : recentSales.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No recent sales</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <span className="text-sm text-gray-500">{formatTime(sale.created_at)}</span>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{sale.payment_method || 'Cash'}</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(sale.total_amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}