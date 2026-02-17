"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Loader2, Building2, User, Mail, Lock, CheckCircle, Store, ArrowRight, AlertCircle
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // STATE: specific for "Stuck" users
  const [existingUser, setExistingUser] = useState<{id: string, email: string} | null>(null);

  // 1. Check if user is ALREADY logged in but missing a shop
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        setExistingUser({
            id: session.user.id,
            email: session.user.email || ""
        });
      }
    };
    checkSession();
  }, [supabase]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const businessName = formData.get("businessName")?.toString().trim();
    const fullName = formData.get("fullName")?.toString().trim();
    
    // Only get these if we are a NEW user
    const email = !existingUser ? formData.get("email")?.toString().trim() : existingUser.email;
    const password = !existingUser ? formData.get("password")?.toString().trim() : null;
    const confirmPassword = !existingUser ? formData.get("confirmPassword")?.toString().trim() : null;

    // Validation
    if (!businessName || !fullName) {
      setError("Please fill in your Name and Business Name.");
      setLoading(false);
      return; 
    }

    if (!existingUser) {
        if (!email || !password) {
            setError("Please fill in all fields.");
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }
    }

    try {
      let userId = existingUser?.id;

      // STEP 1: Create Auth User (ONLY IF NOT LOGGED IN)
      if (!existingUser && email && password) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error("Please check your email for a confirmation link.");
          userId = authData.user.id;
      }

      if (!userId) throw new Error("User identification failed.");

      // STEP 2: Create Business (The Missing Piece)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert([{ 
            name: businessName, 
            subscription_tier: 'pro',       
            subscription_status: 'trial',
            trial_ends_at: trialEndDate.toISOString(),
            created_at: new Date().toISOString() 
        }])
        .select()
        .single();

      if (businessError) throw new Error(businessError.message);

      // STEP 3: Link User as Owner
      await supabase.from('business_members').insert([{
        business_id: businessData.id,
        user_id: userId,
        name: fullName,
        role: 'owner',
        email: email,
        pin_code: '0000'
      }]);

      // Success! Go to Dashboard
      router.push('/dashboard');
      router.refresh(); 

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        
        {/* Header Changes based on Mode */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {existingUser ? "Complete Your Shop" : "Create Account"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {existingUser 
              ? "You are logged in! Just name your shop to finish." 
              : "Start your 30-day free trial"}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg flex items-start text-sm animate-in fade-in gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          
          {/* Business Name (Always Show) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="relative">
              <Store className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input name="businessName" type="text" required className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. Lusaka Electronics" />
            </div>
          </div>

          {/* Full Name (Always Show) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
            <div className="relative">
              <User className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input name="fullName" type="text" required className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. John Banda" />
            </div>
          </div>

          {/* HIDDEN FIELDS FOR LOGGED IN USERS */}
          {!existingUser && (
              <>
                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                    <Mail className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                    <input name="email" type="email" required className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="you@example.com" />
                    </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                        <input name="password" type="password" required minLength={6} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="••••••" />
                    </div>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                    <div className="relative">
                        <CheckCircle className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                        <input name="confirmPassword" type="password" required minLength={6} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="••••••" />
                    </div>
                    </div>
                </div>
              </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg shadow-emerald-200 mt-6 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
              <>
                {existingUser ? "Complete Setup" : "Create Shop"} <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link (Only if NOT logged in) */}
        {!existingUser && (
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 font-bold hover:underline">
                Log in here
                </Link>
            </p>
            </div>
        )}
        
        {/* Logout Link (If stuck logged in) */}
        {existingUser && (
             <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-gray-500 text-sm">
                    Not {existingUser.email}?{' '}
                    <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-red-600 font-bold hover:underline">
                        Log out
                    </button>
                </p>
           </div>
        )}

      </div>
    </div>
  );
}