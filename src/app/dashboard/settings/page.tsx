"use client";

import { useBusiness } from "@/contexts/BusinessContext";
import { createClient } from "@/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Building2, Users, CreditCard, LogOut, ChevronRight, 
  MapPin 
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { business, businessName, userRole } = useBusiness();
  const supabase = createClient();

  // Helper to handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isTrial = business?.subscription_status === 'trial';
  const tier = (business?.subscription_tier || 'free').toUpperCase();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your business preferences.</p>
      </div>

      {/* Business Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex items-start gap-4">
        <div className="bg-emerald-100 p-3 rounded-full">
          <Building2 className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{businessName}</h2>
          <p className="text-sm text-gray-500 capitalize">Role: {userRole}</p>
          
          <div className="mt-3 flex gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isTrial ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isTrial ? 'PRO TRIAL' : `${tier} PLAN`}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="space-y-3">
        
        {/* 1. Subscription Management */}
        <Link href="/dashboard/settings/subscription" className="block">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center hover:bg-gray-50 transition-colors shadow-sm group">
            <div className="bg-blue-50 p-2 rounded-lg mr-4 group-hover:bg-blue-100 transition-colors">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Subscription Plan</h3>
              <p className="text-sm text-gray-500">Manage billing and upgrades</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        {/* 2. Team Management */}
        <Link href="/dashboard/settings/team" className="block">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center hover:bg-gray-50 transition-colors shadow-sm group">
            <div className="bg-purple-50 p-2 rounded-lg mr-4 group-hover:bg-purple-100 transition-colors">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Staff & Permissions</h3>
              <p className="text-sm text-gray-500">Add cashiers and managers</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        {/* 3. Business Profile */}
        <Link href="/dashboard/settings/profile" className="block">
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center hover:bg-gray-50 transition-colors shadow-sm group">
            <div className="bg-orange-50 p-2 rounded-lg mr-4 group-hover:bg-orange-100 transition-colors">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Business Profile</h3>
              <p className="text-sm text-gray-500">Address, Phone & TPIN</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

      </div>

      {/* --- SIGNOUT SECTION --- */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account Actions</h3>
        
        <button 
          onClick={handleLogout}
          className="w-full bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 p-4 rounded-xl flex items-center justify-center transition-all shadow-sm font-medium"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out of Account
        </button>
      </div>

    </div>
  );
}