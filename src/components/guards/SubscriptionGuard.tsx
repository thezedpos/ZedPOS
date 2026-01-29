"use client";

import { useBusiness } from "@/contexts/BusinessContext";
import { ReactNode } from "react";

interface SubscriptionGuardProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional: What to show if they are on the Free plan
}

export function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
  const { business, isLoading } = useBusiness();

  // 1. Wait for data to load
  if (isLoading) {
    return null; 
  }

  // 2. Calculate "Is Premium" manually
  // User is Premium if:
  // - They have a business loaded
  // - AND (Their tier is 'pro' OR they are in a 'trial')
  const isPremium = business && (
    business.subscription_tier === 'pro' || 
    business.subscription_status === 'trial'
  );

  // 3. If NOT premium, show the fallback (or nothing)
  if (!isPremium) {
    return fallback ? <>{fallback}</> : null;
  }

  // 4. Access Granted
  return <>{children}</>;
}