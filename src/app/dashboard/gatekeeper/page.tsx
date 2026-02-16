'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { Loader2 } from 'lucide-react';

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
      router.push('/dashboard');
    },
    [router]
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
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

    if (pin === (selectedStaff.pin_code ?? '0000')) {
      handleAutoLogin(selectedStaff);
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
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
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-600 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Who is this?</h1>
          <p className="text-emerald-100">Select your profile to continue</p>
        </div>

        <div className="p-8">
          {!selectedStaff ? (
            <div className="grid grid-cols-2 gap-4">
              {staffMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className="flex flex-col items-center p-4 border-2 border-gray-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all aspect-square justify-center"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 text-xl font-bold ${
                      member.role === 'owner' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {(member.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{member.name}</span>
                  <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                </button>
              ))}
            </div>
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
                  className="text-sm text-gray-400 hover:text-gray-600 mb-4"
                >
                  ← Choose different user
                </button>
                <h2 className="text-xl font-bold text-gray-900">Hello, {selectedStaff.name}</h2>
                <p className="text-sm text-gray-500">Enter your PIN</p>
              </div>

              <div className="flex justify-center">
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
                  className="text-center text-4xl tracking-[1em] w-48 border-b-2 border-gray-300 focus:border-emerald-500 outline-none font-mono py-2"
                  placeholder="••••"
                />
              </div>

              {error && <p className="text-center text-red-500 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={pin.length < 4}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all"
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
