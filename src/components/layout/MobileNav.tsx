'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Home, Calculator, Package, BarChart3, Settings, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home', restricted: true },
  { href: '/dashboard/pos', icon: Calculator, label: 'POS', restricted: false },
  { href: '/dashboard/inventory', icon: Package, label: 'Inv', restricted: true },
  { href: '/dashboard/sales', icon: BarChart3, label: 'Reports', restricted: true },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', restricted: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = usePermissions();
  const supabase = createClient();

  // 1. Logic to Handle Sign Out
  const handleSignOut = async () => {
    // Clear Gatekeeper Data
    if (typeof window !== 'undefined') {
        localStorage.removeItem('active_staff_role');
        localStorage.removeItem('active_staff_name');
        localStorage.removeItem('active_staff_id');
    }
    
    // Sign out
    await supabase.auth.signOut();

    // Redirect to Home (/) AND Refresh
    router.push('/'); 
    router.refresh();
  };

  // 2. Filter nav items based on user role
  const visibleNavItems = navItems.filter((item) => {
    if (role === 'cashier' && item.restricted) {
      return false;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 block md:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        
        {/* Render Normal Nav Items */}
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors touch-manipulation"
            >
              <Icon
                className={`w-6 h-6 mb-1 ${
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-[10px] sm:text-xs ${
                  isActive ? 'text-emerald-600 font-medium' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* ALWAYS Render Sign Out Button (Last Item) */}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors touch-manipulation group"
        >
          <LogOut className="w-6 h-6 mb-1 text-gray-400 group-hover:text-red-600 transition-colors" />
          <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-red-600 transition-colors">
            Exit
          </span>
        </button>

      </div>
    </nav>
  );
}