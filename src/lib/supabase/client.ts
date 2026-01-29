import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and Key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Important for mobile apps
  },
});

// User roles
export type UserRole = 'owner' | 'manager' | 'cashier';

// User profile with role
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  business_id: string;
  created_at: string;
}

// Business subscription status
export type SubscriptionStatus = 'free' | 'premium' | 'trial';

export interface Business {
  id: string;
  name: string;
  subscription_status: SubscriptionStatus;
  subscription_expires_at?: string;
  trial_started_at?: string;
  created_at: string;
}

// Helper functions for common Supabase operations
export const supabaseHelpers = {
  // Get current user
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get user profile with role
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  },

  // Get business by ID
  async getBusiness(businessId: string): Promise<Business | null> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) {
      console.error('Error fetching business:', error);
      return null;
    }
    return data;
  },

  // Check if user has premium access
  async hasPremiumAccess(businessId: string): Promise<boolean> {
    const business = await this.getBusiness(businessId);
    if (!business) return false;

    const now = new Date();
    const status = business.subscription_status;

    if (status === 'premium') {
      // Check if subscription hasn't expired
      if (business.subscription_expires_at) {
        const expiresAt = new Date(business.subscription_expires_at);
        return expiresAt > now;
      }
      return true;
    }

    if (status === 'trial') {
      // Check if trial hasn't expired (30 days)
      if (business.trial_started_at) {
        const trialStart = new Date(business.trial_started_at);
        const trialEnd = new Date(trialStart);
        trialEnd.setDate(trialEnd.getDate() + 30);
        return trialEnd > now;
      }
      return false;
    }

    return false; // free tier
  },

  // Process sale transaction via RPC
  async processSaleTransaction(transactionBody: string): Promise<any> {
    const { data, error } = await supabase.rpc('process_sale_transaction', {
      p_body: transactionBody,
    });

    if (error) {
      console.error('Error processing sale transaction:', error);
      throw error;
    }

    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
