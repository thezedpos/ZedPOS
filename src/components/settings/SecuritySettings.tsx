'use client';

import { useState } from 'react';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { Loader2, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

export function SecuritySettings() {
  const { businessId } = useBusiness();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    // 1. Validate New PIN Format
    if (newPin.length !== 4 || newPin !== confirmPin) {
      setMessage({ text: 'New PINs must match and be 4 digits.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !businessId) throw new Error('Not authenticated');

      // 2. Fetch Current PIN from Database
      const { data: member, error: fetchError } = await supabase
        .from('business_members')
        .select('pin_code')
        .eq('user_id', user.id)
        .eq('business_id', businessId)
        .single();

      if (fetchError || !member) throw new Error('Could not verify identity.');

      // 3. Verify Current PIN (Robust Check)
      // We convert both to strings and trim whitespace to prevent "false negatives"
      const dbPin = String(member.pin_code || '').trim();
      const inputPin = currentPin.trim();

      if (dbPin !== inputPin) {
        setMessage({ text: 'Current PIN is incorrect.', type: 'error' });
        setLoading(false);
        return;
      }

      // 4. Update to New PIN
      const { error: updateError } = await supabase
        .from('business_members')
        .update({ pin_code: newPin.trim() })
        .eq('user_id', user.id)
        .eq('business_id', businessId);

      if (updateError) throw updateError;

      setMessage({ text: 'PIN updated successfully!', type: 'success' });
      
      // Clear forms
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');

    } catch (err: unknown) {
      console.error(err);
      setMessage({ text: (err as Error).message || 'Failed to update PIN.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
      <div className="p-6 border-b border-gray-100 flex items-start gap-4">
        <div className="bg-purple-100 p-3 rounded-lg">
          <KeyRound className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Security & Login</h3>
          <p className="text-sm text-gray-500">Update your PIN for POS access (Default: 0000).</p>
        </div>
      </div>
      <div className="p-6">
        <form onSubmit={handleUpdatePin} className="max-w-md space-y-4">
          
          {/* Current PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
            <input
              type="password"
              maxLength={4}
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none font-mono tracking-widest focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="••••"
            />
          </div>

          {/* New PINs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none font-mono tracking-widest focus:ring-2 focus:ring-purple-500 transition-all"
                placeholder="••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
              <input
                type="password"
                maxLength={4}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none font-mono tracking-widest focus:ring-2 focus:ring-purple-500 transition-all"
                placeholder="••••"
              />
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}