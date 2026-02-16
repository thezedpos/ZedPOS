"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { TrialBanner } from "@/components/TrialBanner";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      const activeStaff = localStorage.getItem("active_staff_role");
      if (!activeStaff && !pathname?.includes("/gatekeeper")) {
        router.push("/dashboard/gatekeeper");
        return;
      }

      setVerifying(false);
    };
    checkAuth();
  }, [supabase, router, pathname]);

  useSubscriptionCheck();

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50"> 
      
      {/* 1. Desktop Sidebar (Hidden on Mobile) */}
      <Sidebar />
      
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Banner at the top */}
        <TrialBanner />
        
        {/* 2. Content Area */}
        {/* We added 'pb-24' (Padding Bottom) specifically for mobile to clear the nav bar */}
        <div className="p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* 3. Mobile Bottom Nav (Visible only on Mobile) */}
      <MobileNav />
    </div>
  );
}