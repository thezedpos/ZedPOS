'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { Store, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingShop, setCheckingShop] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();
  const { refreshBusiness } = useBusiness();

  // Fetch user first
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        setUser(user);
      } else {
        setUser(null);
        setCheckingShop(false);
      }
    };
    fetchUser();
  }, [supabase]);

  // Auth guard
  useEffect(() => {
    if (!checkingShop && user === null) {
      router.replace('/login');
      return;
    }
  }, [checkingShop, user, router]);

  // Check if user already has a shop
  useEffect(() => {
    if (!user || !supabase) return;

    const checkExistingShop = async () => {
      try {
        setCheckingShop(true);

        const { data: existingMembers, error: memberError } = await supabase
          .from('business_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (memberError) {
          console.error('Error checking business membership:', memberError);
          setCheckingShop(false);
          return;
        }

        if (existingMembers && existingMembers.length > 0) {
          router.push('/dashboard');
          return;
        }

        setCheckingShop(false);
      } catch (err) {
        console.error('Error checking shop:', err);
        setCheckingShop(false);
      }
    };

    checkExistingShop();
  }, [user, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('You must be logged in to create a shop');
        setLoading(false);
        return;
      }

      // --- FIX 1: ROBUST DATE CALCULATION ---
      const now = new Date();
      // Add exactly 30 days in milliseconds to avoid browser calendar quirks
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      const isoDate = thirtyDaysFromNow.toISOString();

      // 1. Insert new business (WITH TRIAL DATA)
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: shopName.trim(),
          subscription_tier: 'pro',       
          subscription_status: 'trial',   
          trial_ends_at: isoDate,        // <--- Uses robust date
          subscription_end_date: isoDate, 
          current_period_end: isoDate,
          created_at: now.toISOString()
        })
        .select('id, name')
        .single();

      if (businessError || !businessData) {
        setError(businessError?.message || 'Failed to create business');
        setLoading(false);
        return;
      }

      // 2. Insert business_members row
      // --- FIX 2: ADD PIN CODE ---
      const { error: memberError } = await supabase
        .from('business_members')
        .insert({
          user_id: user.id,
          business_id: businessData.id,
          role: 'owner',
          email: user.email,
          pin_code: '0000' // <--- CRITICAL FIX: Missing in your old code
        });

      // Ignore "Duplicate Key" error (Code 23505) if trigger ran first
      if (memberError && memberError.code !== '23505') {
        setError(memberError.message || 'Failed to link user to business');
        setLoading(false);
        return;
      }

      // 3. Safety Check: Ensure Subscription Record Exists
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('business_id', businessData.id)
        .maybeSingle();

      if (!sub) {
        await supabase.from('subscriptions').insert({
          business_id: businessData.id,
          plan_type: 'premium',
          status: 'trial',
          trial_start_date: now.toISOString(),
          trial_ends_at: isoDate
        });
      }

      // 4. Refresh & Redirect
      await refreshBusiness();
      router.push('/dashboard');

    } catch (err) {
      console.error('Onboarding error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (!checkingShop && user === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600 mb-4" />
        <p className="text-gray-600 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  if (checkingShop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600 mb-4" />
        <p className="text-gray-600 font-medium">Loading your shop...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-100 p-4 rounded-full">
            <Store className="w-12 h-12 text-emerald-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to ZedPOS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's set up your shop to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-2">
                Name your Shop
              </label>
              <input
                id="shopName"
                name="shopName"
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g., My Store"
                disabled={loading}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              />
              <p className="mt-2 text-xs text-gray-500">
                You can change this later in settings
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !shopName.trim()}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>Creating your shop...</span>
                </>
              ) : (
                'Create Shop'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}