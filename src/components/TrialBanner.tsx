"use client";

import { useBusiness } from "@/contexts/BusinessContext";
import Link from "next/link";
import { Clock, CheckCircle, ChevronRight } from "lucide-react";

export default function TrialBanner() {
  const { business } = useBusiness();

  // 1. Hide if not in trial mode
  if (!business || business.subscription_status !== 'trial') return null;

  // 2. Calculate Days Remaining
  let daysLeft = 0;
  if (business.trial_ends_at) {
    const trialEnd = new Date(business.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // 3. Determine Style (Only turn Red if 3 days or less)
  const isUrgent = daysLeft <= 3;
  
  return (
    <div className={`w-full px-4 py-3 shadow-sm relative z-40 transition-colors ${
      isUrgent ? "bg-orange-600" : "bg-emerald-600"
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
        
        {/* Left: Message */}
        <div className="flex items-center gap-3 text-sm font-medium">
          {isUrgent ? (
            <Clock className="w-5 h-5 animate-pulse text-white/90" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-100" />
          )}
          <span>
            {daysLeft > 0 
              ? `You are on the Pro Plan Trial. ${daysLeft} days remaining.` 
              : "Your Pro Trial expires today!"}
          </span>
        </div>

        {/* Right: Action Button */}
        <Link 
          href="/dashboard/settings/subscription"
          className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border border-white/20"
        >
          Manage Subscription
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>

      </div>
    </div>
  );
}