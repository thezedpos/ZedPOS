'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { Loader2, LogOut, Store } from 'lucide-react'; // Added Icons

interface StaffMember {
  id: string;
  name: string;
  role: string;
  pin_code: string;
}

export default function GatekeeperPage() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Loading profiles...');
  const supabase = createClient();

  const handleAutoLogin = useCallback(
    (member: StaffMember) => {
      document.cookie = `active_staff_role=${member.role}; path=/;`;
      localStorage.setItem('active_staff_role', member.role);
      localStorage.setItem('active_staff_name', member.name);
      localStorage.setItem('active_staff_id', member.id);
      
      // FIX: Redirect cashiers straight to POS
      if (member.role === 'cashier') {
        router.push('/dashboard/pos');
      } else {
        router.push('/dashboard');
      }
    },
    [router]
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/'); // FIX: Redirect to Home instead of /login
        return;
      }

      let bId = businessId;
      if (!bId) {
        const { data: memberData } = await supabase
          .from('business_members')
          .select('business_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!memberData) {
          router.push('/signup');
          return;
        }
        bId = memberData.business_id;
      }

      if (!bId) {
        router.push('/signup');
        return;
      }

      const { data: members, error: fetchError } = await supabase
        .from('business_members')
        .select('id, name, role, pin_code')
        .eq('business_id', bId);

      if (fetchError) {
        console.error('Member fetch error:', fetchError);
        setStatusMessage('Error loading profiles. Please try again.');
        return;
      }

      const ownerRecord = members?.find((m) => m.role === 'owner');

      if (!members || members.length === 0 || !ownerRecord) {
        setStatusMessage('Initializing your shop profile...');

        const { data: newOwner, error: createError } = await supabase
          .from('business_members')
          .insert({
            business_id: bId,
            user_id: user.id,
            name: 'Owner',
            role: 'owner',
            email: user.email,
            pin_code: '0000',
          })
          .select('id, name, role, pin_code')
          .single();

        if (newOwner && !createError) {
          handleAutoLogin({
            id: newOwner.id,
            name: newOwner.name ?? 'Owner',
            role: newOwner.role,
            pin_code: newOwner.pin_code ?? '0000',
          });
        } else {
          console.error('Failed to create owner:', createError);
          setStatusMessage('Error initializing profile. Please contact support.');
        }
        return;
      }

      setStaffMembers(
        members.map((m) => ({
          id: m.id,
          name: m.name ?? (m.role === 'owner' ? 'Owner' : 'Staff'),
          role: m.role,
          pin_code: m.pin_code ?? '0000',
        }))
      );
      setStatusMessage('');
    };

    init();
  }, [businessId, router, supabase, handleAutoLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    // FIX: Robust PIN comparison (trim whitespace and ensure string)
    const storedPin = String(selectedStaff.pin_code || '0000').trim();
    const inputPin = pin.trim();

    if (inputPin === storedPin) {
      handleAutoLogin(selectedStaff);
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  // FIX: Added Emergency Logout
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (statusMessage) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
        <p className="text-gray-600 font-medium">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
           {/* Decorative background circle */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500 rounded-full opacity-50 blur-3xl"></div>
           
           <div className="relative z-10">
             <div className="mx-auto bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Store className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white mb-2">Who is this?</h1>
             <p className="text-emerald-100 text-sm">Select your profile to continue</p>
           </div>
        </div>

        <div className="p-8">
          {!selectedStaff ? (
            <>
                <div className="grid grid-cols-2 gap-4">
                {staffMembers.map((member) => (
                    <button
                    key={member.id}
                    onClick={() => setSelectedStaff(member)}
                    className="group flex flex-col items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all aspect-square justify-center relative overflow-hidden"
                    >
                    <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 text-xl font-bold transition-colors ${
                        member.role === 'owner' 
                            ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-200' 
                            : 'bg-gray-100 text-gray-600 group-hover:bg-white'
                        }`}
                    >
                        {(member.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{member.name}</span>
                    <span className="text-xs text-gray-500 capitalize mt-1">{member.role}</span>
                    </button>
                ))}
                </div>
                
                {/* Sign Out Link */}
                <div className="mt-8 text-center pt-6 border-t border-gray-100">
                    <button 
                        onClick={handleSignOut}
                        className="text-sm text-gray-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Switch Account
                    </button>
                </div>
            </>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaff(null);
                    setPin('');
                    setError('');
                  }}
                  className="text-sm text-gray-400 hover:text-emerald-600 mb-6 flex items-center justify-center gap-1 transition-colors"
                >
                  ← Choose different user
                </button>
                
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 text-2xl font-bold flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                    {(selectedStaff.name || 'U').charAt(0).toUpperCase()}
                </div>
                
                <h2 className="text-xl font-bold text-gray-900">Hello, {selectedStaff.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your 4-digit PIN</p>
              </div>

              <div className="flex justify-center my-6">
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setPin(v);
                    setError('');
                  }}
                  className="text-center text-4xl tracking-[0.5em] w-full max-w-[200px] border-b-2 border-gray-200 focus:border-emerald-500 outline-none font-mono py-2 bg-transparent transition-colors text-gray-800"
                  placeholder="••••"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center animate-in fade-in slide-in-from-top-1">
                    {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pin.length < 4}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 active:scale-[0.98]"
              >
                Access System
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}