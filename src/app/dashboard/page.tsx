"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { 
  Loader2, X, TrendingUp, Receipt, AlertTriangle, 
  ShoppingCart, Plus, Users, Settings, Crown 
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
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  // Redirect to onboarding if no business found
  useEffect(() => {
    if (!isLoading && !businessId) {
      router.push('/onboarding');
    }
  }, [isLoading, businessId, router]);

  // Robust Trial Calculation
  useEffect(() => {
    if (business?.subscription_status === 'trial') {
      const targetDate = business.subscription_end_date || business.trial_ends_at;
      if (targetDate) {
        const endDate = new Date(targetDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(Math.max(0, diffDays));
      }
    } else {
      setTrialDaysLeft(null); 
    }
  }, [business]);

  // Fetch Sales & Low Stock Data
  useEffect(() => {
    if (businessId) {
      const fetchDashboardData = async () => {
        try {
          setLoadingSales(true);
          
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          
          // 1. Fetch Sales
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

          // 2. Fetch Recent Sales
          const { data: recentData } = await supabase
            .from('sales')
            .select('id, total_amount, created_at, payment_method')
            .eq('business_id', businessId)
            .neq('status', 'voided')
            .order('created_at', { ascending: false })
            .limit(5);

          if (recentData) setRecentSales(recentData);

          // 3. Fetch Low Stock Items (Quantity <= 4)
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .lte('stock_quantity', 4);
            
          setLowStockCount(count || 0);

        } catch (err) {
          console.error('Error fetching dashboard data:', err);
        } finally {
          setLoadingSales(false);
        }
      };

      fetchDashboardData();
    }
  }, [businessId, supabase]);

  // Helper Functions
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {businessName || 'Shop'}
          </h1>
        </div>

        {/* Trial Banner */}
        {showTrialBanner && trialDaysLeft !== null && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white relative shadow-lg overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Crown className="w-24 h-24 rotate-12" />
            </div>
            
            <div className="relative z-10 pr-8">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-amber-400 text-sm tracking-wide">PRO TRIAL</span>
              </div>
              <h3 className="text-lg font-bold mb-1">
                {trialDaysLeft} Days Remaining
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                Enjoy full access to premium features.
              </p>
              
              <Link 
                href="/dashboard/settings/subscription"
                className="inline-block bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Manage Plan
              </Link>
            </div>

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

        {/* --- UPDATED STATS LAYOUT --- */}
        <div className="flex flex-col gap-3">
          
          {/* Top Row: Total Sales (Full Width) */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex flex-col justify-center">
            <div className="flex items-center text-emerald-600 mb-1">
              <TrendingUp className="w-5 h-5 mr-2" />
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Today's Sales</p>
            </div>
            {/* break-words guarantees the text will wrap if it gets absurdly huge, but won't cut it off */}
            <p className="text-4xl font-bold text-gray-900 break-words">
              {loadingSales ? '-' : formatCurrency(todaySales)}
            </p>
          </div>

          {/* Bottom Row: Transactions & Low Stock (Side-by-Side) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <Receipt className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900 truncate">{loadingSales ? '-' : transactionCount}</p>
              <p className="text-xs text-gray-500 mt-1">Transactions</p>
            </div>

            <Link 
              href="/dashboard/inventory" 
              className={`rounded-lg p-4 shadow-sm border transition-colors block ${
                lowStockCount > 0 
                  ? 'bg-red-50 border-red-100 hover:bg-red-100' 
                  : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 mb-2 ${lowStockCount > 0 ? 'text-red-500' : 'text-amber-600'}`} />
              <p className={`text-2xl font-bold truncate ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {loadingSales ? '-' : lowStockCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Low Stock Alerts</p>
            </Link>
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