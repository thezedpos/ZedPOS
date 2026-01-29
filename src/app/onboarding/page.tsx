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
        setCheckingShop(false); // No user – stop spinning so auth guard can run
      }
    };
    fetchUser();
  }, [supabase]);

  // Auth guard: redirect to login when we've finished checking and there is no user
  useEffect(() => {
    if (!checkingShop && user === null) {
      router.replace('/login');
      return;
    }
  }, [checkingShop, user, router]);

  // Check if user already has a shop on page load
  useEffect(() => {
    // STOP! Do not proceed if auth is not ready yet.
    if (!user || !supabase) {
      return;
    }

    const checkExistingShop = async () => {
      try {
        setCheckingShop(true);

        // --- DEBUG START ---
        const { data: { session } } = await supabase.auth.getSession();
        console.log('DEBUG: Active Session User ID:', session?.user?.id);
        console.log('DEBUG: Context User ID:', user?.id);
        // --- DEBUG END ---

        // Check if user already has a business_members record
        const { data: existingMembers, error: memberError } = await supabase
          .from('business_members')
          .select('id') // We only need the ID to know it exists
          .eq('user_id', user.id)
          .limit(1); // Just give us the first one you find

        if (memberError) {
          console.error('Error checking business membership:', JSON.stringify(memberError, null, 2));
          setCheckingShop(false);
          return;
        }

        // If user already has at least one shop, redirect to dashboard
        if (existingMembers && existingMembers.length > 0) {
          router.push('/dashboard');
          return;
        }

        // No shop found, show onboarding form
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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('You must be logged in to create a shop');
        setLoading(false);
        return;
      }

      // 1. Insert new business into businesses table (NAME ONLY)
      // We removed subscription_status and trial_started_at because they belong in a different table now.
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: shopName.trim(),
        })
        .select('id, name') // Select only columns we know exist
        .single();

      if (businessError || !businessData) {
        setError(businessError?.message || 'Failed to create business');
        setLoading(false);
        return;
      }

      // 2. Insert business_members row linking user as 'owner'
      const { error: memberError } = await supabase
        .from('business_members')
        .insert({
          user_id: user.id,
          business_id: businessData.id,
          role: 'owner',
          email: user.email // Ensure this column exists in your schema, otherwise remove it
        });

      if (memberError) {
        setError(memberError.message || 'Failed to link user to business');
        setLoading(false);
        return;
      }

      // 3. Safety Check: Ensure Subscription Exists
      // (The SQL Trigger usually does this, but we do it manually just in case)
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
          trial_start_date: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // 4. Refresh business context
      await refreshBusiness();

      // 5. Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  // Auth guard: show nothing while redirecting unauthenticated users
  if (!checkingShop && user === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          <p className="text-gray-600 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading spinner while checking for existing shop
  if (checkingShop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          <p className="text-gray-600 font-medium">Loading your shop...</p>
        </div>
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
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base disabled:bg-gray-50 disabled:text-gray-500"
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
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

            <p className="text-xs text-center text-gray-500">
              You'll start with a 30-day Premium trial
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}