"use client";

import { useBusiness } from "@/contexts/BusinessContext";

export function usePermissions() {
  // @ts-ignore
  const { business, userRole } = useBusiness(); 

  const rawStatus = (business?.subscription_status || 'active').toLowerCase();
  const rawTier = (business?.subscription_tier || 'free').toLowerCase();
  const endDate = business?.subscription_end_date ? new Date(business.subscription_end_date) : null;

  // 1. Check Valid Trial
  const isTrial = rawStatus === 'trial' && endDate && endDate > new Date();

  // 2. Determine Effective Tier (Trial = Pro)
  const effectiveTier = isTrial ? 'pro' : rawTier;

  // 3. Define Limits
  // Free = 30 items. Growth/Pro = Unlimited (Infinity)
  const maxProducts = effectiveTier === 'free' ? 30 : Infinity;

  return {
    // --- IDENTITY ---
    role: userRole, // <--- THIS WAS MISSING! Adding it fixes the build error.

    // --- SUBSCRIPTION ---
    tier: effectiveTier,
    isTrial,
    maxProducts, 

    // --- FEATURE GATES ---
    canUseScanner: effectiveTier === 'growth' || effectiveTier === 'pro',
    canTrackDebt: effectiveTier === 'growth' || effectiveTier === 'pro',
    canAddStaff: effectiveTier === 'pro',
    canViewAdvancedReports: effectiveTier === 'pro',
    canExportData: effectiveTier === 'pro',
    canManageRoles: userRole === 'owner',
  };
}