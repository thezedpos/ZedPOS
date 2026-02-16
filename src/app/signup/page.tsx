"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Loader2, Building2, User, Mail, Lock, AlertCircle, ArrowRight, CheckCircle, Info 
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

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString().trim();
    const fullName = formData.get("fullName")?.toString().trim();
    const businessName = formData.get("businessName")?.toString().trim();
    const confirmPassword = formData.get("confirmPassword")?.toString().trim();

    // Validation: Stop empty submissions
    if (!email || !password || !fullName || !businessName) {
      setError("Please fill in all fields (Name, Business, Email, Password) to sign up.");
      setLoading(false);
      return; 
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // 1. Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      const userId = authData.user.id;

      // 2. Create Business & Link User
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      const isoDate = trialEndDate.toISOString();

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert([{ 
            name: businessName, 
            subscription_tier: 'pro',       
            subscription_status: 'trial',
            trial_ends_at: isoDate,
            subscription_end_date: isoDate,
            current_period_end: isoDate,
            created_at: new Date().toISOString() 
        }])
        .select()
        .single();

      if (businessError) throw new Error(businessError.message);

      await supabase.from('business_members').insert([{
        business_id: businessData.id,
        user_id: userId,
        name: fullName,
        role: 'owner',
        email: email,
        pin_code: '0000'
      }]);

      router.push('/dashboard');
      router.refresh(); 

    } catch (err: any) {
      console.error("Signup Error:", err);
      if (err.message?.includes("anonymous")) {
         setError("Please enter a valid email and password.");
      } else {
         setError(err.message || "Sign up failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        </div>

        {/* --- NEW INSTRUCTION MESSAGE --- */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800 flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p><strong>First time here?</strong> Enter your email and password below to create a new account.</p>
            <p><strong>Already have an account?</strong> <Link href="/login" className="underline font-semibold hover:text-blue-600">Click here to Log In</Link>.</p>
          </div>
        </div>

        {/* Error Banner */}
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
              <input name="businessName" type="text" required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Lusaka Electronics" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
            <div className="relative">
              <User className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input name="fullName" type="text" required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. John Banda" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input name="email" type="email" required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="you@example.com" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <input name="password" type="password" required minLength={6} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••••" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <CheckCircle className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <input name="confirmPassword" type="password" required minLength={6} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Repeat password" />
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