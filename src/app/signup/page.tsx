"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Loader2, Building2, User, Mail, Lock, AlertCircle, ArrowRight, CheckCircle 
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Clean up session on load
  useEffect(() => {
    const clearSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.auth.signOut();
    };
    clearSession();
  }, [supabase]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // --- 1. GET RAW FORM DATA (The most reliable method) ---
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString().trim();
    const fullName = formData.get("fullName")?.toString().trim();
    const businessName = formData.get("businessName")?.toString().trim();
    const confirmPassword = formData.get("confirmPassword")?.toString().trim();

    // --- DEBUG LOGGING (Open F12 Console to see this) ---
    console.log("Attempting Signup with:", { email, hasPassword: !!password, fullName, businessName });

    // --- 2. THE HARD STOP ---
    // If any field is missing, we KILL the process here.
    // Supabase will NEVER be called if this block runs.
    if (!email || !password || !fullName || !businessName) {
      console.error("Validation Failed: Missing Fields");
      setError("Please fill in all fields.");
      setLoading(false);
      return; 
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // 3. ATTEMPT SIGNUP
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      const userId = authData.user.id;

      // 4. CALCULATE DATES
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      const isoDate = trialEndDate.toISOString();

      // 5. CREATE BUSINESS
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert([
          { 
            name: businessName, 
            subscription_tier: 'pro',       
            subscription_status: 'trial',
            trial_ends_at: isoDate,
            subscription_end_date: isoDate,
            current_period_end: isoDate,
            created_at: new Date().toISOString() 
          }
        ])
        .select()
        .single();

      if (businessError) throw new Error(`Business Error: ${businessError.message}`);

      // 6. LINK USER
      const { error: memberError } = await supabase
        .from('business_members')
        .insert([
          {
            business_id: businessData.id,
            user_id: userId,
            name: fullName,
            role: 'owner',
            email: email,
            pin_code: '0000'
          }
        ]);

      if (memberError && memberError.code !== '23505') {
         throw new Error(`Member Error: ${memberError.message}`);
      }

      // 7. SUCCESS
      router.push('/dashboard');
      router.refresh(); 

    } catch (err: any) {
      console.error("Signup Error:", err);
      
      // Safety Net for the "Anonymous" error
      if (err.message?.toLowerCase().includes("anonymous")) {
         setError("Critical Error: Email was empty. Please type it again.");
      } else {
         setError(err.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start Your 30-Day Free Trial</h1>
          <p className="text-gray-500 mt-2">Full access to Pro features.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="relative">
              <Building2 className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                name="businessName"
                type="text"
                required // HTML5 Validation
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Lusaka Electronics"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
            <div className="relative">
              <User className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                name="fullName"
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. John Banda"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                name="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <CheckCircle className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Repeat password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg mt-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
              <>
                Create Account <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}