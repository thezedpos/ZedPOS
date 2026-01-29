"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav"; 
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { TrialBanner }from "@/components/TrialBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Run the "Enforcer" logic automatically
  useSubscriptionCheck(); 

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