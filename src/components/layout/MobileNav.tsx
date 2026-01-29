'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { Home, Calculator, Package, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/pos', icon: Calculator, label: 'POS' },
  { href: '/dashboard/inventory', icon: Package, label: 'Inventory' },
  { href: '/dashboard/sales', icon: BarChart3, label: 'Reports', ownerOnly: true },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings', ownerOnly: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const { userRole } = useBusiness();

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter((item) => {
    // If item requires owner access and user is staff, hide it
    if (item.ownerOnly && userRole === 'staff') {
      return false;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 block md:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
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
                className={`text-xs ${
                  isActive ? 'text-emerald-600 font-medium' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
