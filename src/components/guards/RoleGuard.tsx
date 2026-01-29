"use client";

import { useBusiness } from "@/contexts/BusinessContext";
import { ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[]; // e.g. ['owner', 'manager']
  fallback?: ReactNode;   // What to show if access denied
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  // 1. Get real data from Context
  // We rename 'isLoading' to avoid conflicts if needed, but here it's fine.
  const { userRole, isLoading } = useBusiness();

  // 2. Wait for loading
  if (isLoading) {
    return null; 
  }

  // 3. Check Permissions
  // We use "as any" to prevent strict TypeScript errors
  if (!userRole || !allowedRoles.includes(userRole as any)) {
    return fallback ? <>{fallback}</> : null;
  }

  // 4. Access Granted
  return <>{children}</>;
}