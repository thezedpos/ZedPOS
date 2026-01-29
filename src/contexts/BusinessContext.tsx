"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/supabase/client';
import { useRouter } from 'next/navigation';

type BusinessContextType = {
  businessId: string | null;
  businessName: string | null;
  business: any | null;
  userRole: string | null;
  isLoading: boolean;
  refreshBusiness: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  // Helper to wipe state immediately
  const clearContext = () => {
    setBusiness(null);
    setUserRole(null);
    setIsLoading(false);
  };

  const fetchBusiness = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        clearContext();
        return;
      }

      // 1. Find which business this user belongs to
      const { data: memberData, error: memberError } = await supabase
        .from('business_members')
        .select('business_id, role')
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData) {
        console.log("No business found for user");
        clearContext();
        return;
      }

      // 2. Fetch the actual business details
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', memberData.business_id)
        .single();

      if (businessError) throw businessError;

      setBusiness(businessData);
      setUserRole(memberData.role);

    } catch (error) {
      console.error('Error fetching business context:', error);
      clearContext();
    } finally {
      setIsLoading(false);
    }
  };

  // --- CRITICAL FIX: LISTEN FOR AUTH CHANGES ---
  useEffect(() => {
    // 1. Initial Fetch
    fetchBusiness();

    // 2. Subscribe to Auth Events (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearContext(); // Wipe data instantly
        router.refresh(); // Clear Next.js server cache
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchBusiness(); // Load new user data
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BusinessContext.Provider 
      value={{ 
        businessId: business?.id || null, 
        businessName: business?.name || null,
        business, 
        userRole, 
        isLoading,
        refreshBusiness: fetchBusiness 
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}