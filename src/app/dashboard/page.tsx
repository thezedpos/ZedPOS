"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { 
  Loader2, X, TrendingUp, Receipt, AlertTriangle, 
  ShoppingCart, Plus, Users, Settings, Crown, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

// ... (keep your Sale interface)
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
  const [lowStockCount, setLowStockCount] = useState<number>(0); // NEW STATE
  
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect logic...
  useEffect(() => {
    if (!isLoading && !businessId) router.push('/onboarding');
  }, [isLoading, businessId, router]);

  // Trial Math logic...
  useEffect(() => {
    if (business?.subscription_status === 'trial') {
      const targetDate = business.subscription_end_date || business.trial_ends_at;
      if (targetDate) {
        const diffTime = new Date(targetDate).getTime() - new Date().getTime();
        setTrialDaysLeft(Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
      }
    } else {
      setTrialDaysLeft(null); 
    }
  }, [business]);

  // Fetch Dashboard Data
  useEffect(() => {
    if (businessId) {
      const fetchData = async () => {
        try {
          setLoadingStats(true);
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
          
          // 1. Fetch Sales
          const { data: todayData } = await supabase
            .from('sales')
            .select('id, total_amount, created_at, payment_method')
            .eq('business_id', businessId)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .neq('status', 'voided')
            .order('created_at', { ascending: false });

          if (todayData) {
            setTodaySales(todayData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0));
            setTransactionCount(todayData.length);
            setRecentSales(todayData.slice(0, 5));
          }

          // 2. Fetch Low Stock (Quantity <= 4)
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .lte('stock_quantity', 4);
            
          setLowStockCount(count || 0);

        } catch (err) {
          console.error('Error fetching data:', err);
        } finally {
          setLoadingStats(false);
        }
      };

      fetchData();
    }
  }, [businessId, supabase]);

  const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin h-8 w-8 text-emerald-600" /></div>;
  if (!businessId) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-gray-900">
             {businessName || 'Shop'}
          </h1>
          <p className="text-gray-500 text-sm capitalize">{userRole} View</p>
        </div>

        {/* Trial Banner ... (Keep your existing Trial Banner JSX here) */}

        {/* --- REARRANGED STATS GRID --- */}
        <div className="flex flex-col gap-3">
          
          {/* Top Row: BIG Sales Container */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <div className="flex items-center text-emerald-600 mb-2">
              <TrendingUp className="w-5 h-5 mr-2" />
              <p className="text-sm font-semibold uppercase tracking-wider">Today's Sales</p>
            </div>
            {/* truncate prevents the text from breaking the container */}
            <p className="text-4xl md:text-5xl font-black text-gray-900 truncate">
              {loadingStats ? '-' : formatCurrency(todaySales)}
            </p>
          </div>

          {/* Bottom Row: Transactions & Low Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <Receipt className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">{loadingStats ? '-' : transactionCount}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">Transactions</p>
            </div>

            {/* Clickable Low Stock Warning */}
            <Link 
              href="/dashboard/inventory" 
              className={`rounded-xl p-5 shadow-sm border transition-colors relative overflow-hidden group ${
                lowStockCount > 0 
                  ? 'bg-red-50 border-red-100 hover:bg-red-100 cursor-pointer' 
                  : 'bg-white border-gray-100'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 mb-2 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <p className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {loadingStats ? '-' : lowStockCount}
              </p>
              <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                Low Stock Alerts 
                {lowStockCount > 0 && <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
              </p>
            </Link>
          </div>
        </div>

        {/* ... Keep the rest of your Quick Actions and Recent Activity JSX ... */}
        
      </div>
    </div>
  );
}