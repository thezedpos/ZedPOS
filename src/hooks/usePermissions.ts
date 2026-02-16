"use client";

import { useBusiness } from "@/contexts/BusinessContext";

export function usePermissions() {
  const { business, userRole } = useBusiness();

  const storedRole = typeof window !== "undefined" ? localStorage.getItem("active_staff_role") : null;
  const effectiveRole = storedRole || userRole;

  const rawStatus = (business?.subscription_status || "active").toLowerCase();
  const rawTier = (business?.subscription_tier || "free").toLowerCase();
  const endDate = business?.subscription_end_date ? new Date(business.subscription_end_date) : null;

  const isTrial = rawStatus === "trial" && endDate && endDate > new Date();
  const effectiveTier = isTrial ? "pro" : rawTier;
  const maxProducts = effectiveTier === "free" ? 30 : Infinity;

  return {
    role: effectiveRole,
    tier: effectiveTier,
    isTrial,
    maxProducts,
    canUseScanner: effectiveTier === "growth" || effectiveTier === "pro",
    canTrackDebt: effectiveTier === "growth" || effectiveTier === "pro",
    canAddStaff: effectiveTier === "pro",
    canViewAdvancedReports: effectiveTier === "pro",
    canExportData: effectiveTier === "pro",
    canManageRoles: effectiveRole === "owner",
  };
}