'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/supabase/client';
import { Loader2, ArrowLeft, Mail, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Redirect to the profile settings page after they click the email link
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/settings/profile`
        : '';
        
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
                <div className="bg-emerald-100 p-3 rounded-2xl">
                <Lock className="w-8 h-8 text-emerald-600" />
                </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-sm text-gray-500">
                Enter your email to receive reset instructions
            </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100">
                <div className="flex justify-center mb-2">
                    <Mail className="w-6 h-6" />
                </div>
                <p className="font-bold">Check your email</p>
                <p className="text-sm mt-1">We sent a link to <strong>{email}</strong></p>
            </div>
            
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 flex justify-center"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send Reset Link'}
            </button>
            
            <div className="text-center mt-4">
                <Link href="/" className="text-sm text-gray-500 hover:text-emerald-600 flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}