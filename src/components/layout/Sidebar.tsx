"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { usePermissions } from "@/hooks/usePermissions"; 
import { createClient } from "@/supabase/client";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Calculator, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Store
} from "lucide-react";

// Define items with a 'restricted' flag
const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, restricted: true },
  { name: "POS System", href: "/dashboard/pos", icon: Calculator, restricted: false }, // Everyone sees this
  { name: "Inventory", href: "/dashboard/inventory", icon: Package, restricted: true },
  { name: "Sales History", href: "/dashboard/sales", icon: ShoppingCart, restricted: true },
  { name: "Customers", href: "/dashboard/customers", icon: Users, restricted: true },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, restricted: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { businessName } = useBusiness();
  const { role } = usePermissions(); 
  const supabase = createClient();

  const handleLogout = async () => {
    // 1. Clear Gatekeeper Data
    if (typeof window !== 'undefined') {
        localStorage.removeItem('active_staff_role');
        localStorage.removeItem('active_staff_name');
        localStorage.removeItem('active_staff_id');
    }

    // 2. Sign Out
    await supabase.auth.signOut();
    
    // 3. Redirect to Home (Root)
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-30">
      {/* Header / Logo */}
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Store className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900 truncate w-32">
            {businessName || "My Shop"}
          </h2>
          <p className="text-xs text-gray-500 capitalize">{role || "Staff"} View</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // --- SECURITY CHECK ---
          // If user is a cashier, HIDE everything except POS
          if (role === 'cashier' && item.restricted) {
            return null;
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}