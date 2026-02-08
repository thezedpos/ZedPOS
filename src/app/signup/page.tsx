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

  // Form State (Used for UI feedback only)
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- AUTO-LOGOUT ON MOUNT ---
  useEffect(() => {
    const clearSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
    };
    clearSession();
  }, [supabase]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // --- CRITICAL FIX: Extract values directly from the form event ---
    // This bypasses any React state delay or syncing issues.
    const formData = new FormData(e.currentTarget);
    const rawBusinessName = formData.get("businessName") as string;
    const rawFullName = formData.get("fullName") as string;
    const rawEmail = formData.get("email") as string;
    const rawPassword = formData.get("password") as string;
    const rawConfirmPassword = formData.get("confirmPassword") as string;

    console.log("Attempting Signup with:", { rawEmail, hasPassword: !!rawPassword });

    // 1. Strict Validation Check
    if (!rawEmail || !rawPassword || !rawFullName || !rawBusinessName) {
      setError("Please fill in all fields before signing up.");
      setLoading(false);
      return; // STOP HERE
    }

    if (rawPassword !== rawConfirmPassword) {
      setError("Passwords do not match. Please try again.");
      setLoading(false);
      return; // STOP HERE
    }

    try {
      // 2. Sign Up the User (Using RAW values)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: rawEmail,
        password: rawPassword,
        options: {
          data: {
            full_name: rawFullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user created");

      const userId = authData.user.id;

      // 3. Calculate Dates (30 Days Future)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      const isoDate = trialEndDate.toISOString();

      // 4. Create the Business
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert([
          { 
            name: rawBusinessName, 
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

      if (businessError) {
        throw new Error(`Failed to create business: ${businessError.message}`);
      }

      const businessId = businessData.id;

      // 5. Link User
      const { error: memberError } = await supabase
        .from('business_members')
        .insert([
          {
            business_id: businessId,
            user_id: userId,
            name: rawFullName,
            role: 'owner',
            email: rawEmail,
            pin_code: '0000'
          }
        ]);

      // Ignore "Duplicate Key" error if database trigger already ran
      if (memberError && memberError.code !== '23505') {
         throw new Error(`Failed to set owner: ${memberError.message}`);
      }

      // 6. Success!
      console.log("Signup Successful!");
      router.push('/dashboard');
      router.refresh(); 

    } catch (err: any) {
      console.error("Signup Error:", err);
      // Friendly error message for "Anonymous" issue if it somehow still happens
      if (err.message?.includes("anonymous")) {
         setError("Please enter a valid email and password.");
      } else {
         setError(err.message || "Something went wrong during sign up.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start Your 30-Day Free Trial</h1>
          <p className="text-gray-500 mt-2">Full access to Pro features. No credit card required.</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="relative">
              <Building2 className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Lusaka Electronics"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
            <div className="relative">
              <User className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. John Banda"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password Group */}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <CheckCircle className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-colors ${
                    confirmPassword && confirmPassword !== password 
                      ? "border-red-300 focus:ring-red-500 bg-red-50" 
                      : "border-gray-300 focus:ring-emerald-500"
                  }`}
                  placeholder="Repeat password"
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center shadow-lg hover:shadow-emerald-100 active:scale-[0.98] mt-4"
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