'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/supabase/client';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="relative h-16 w-16">
            <Image
              src="/icon.png"
              alt="ZedPOS Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-gray-900 font-medium">Check your email</p>
              <p className="text-sm text-gray-600">
                We&apos;ve sent a reset link to <span className="font-medium text-gray-900">{email}</span>.
                Click the link to set a new password on your profile page.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-gray-500 hover:text-emerald-600"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
