'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartDrawer } from '@/components/pos/CartDrawer';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { Loader2, ShoppingCart, Scan, User, Users, LogOut } from 'lucide-react';

// --- TYPES ---
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string | null;
  tax_type: string | null;
}

interface CartItem extends Product {
  quantity: number;
}

interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
  balance?: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export default function POSPage() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const { canUseScanner } = usePermissions();
  const supabase = createClient();

  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  
  // Current Staff State (Loaded from LocalStorage)
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);

  // 1. Fetch Data & Identify User
  useEffect(() => {
    // A. Identify User from LocalStorage (set by Gatekeeper)
    const storedName = localStorage.getItem('active_staff_name');
    const storedRole = localStorage.getItem('active_staff_role');
    const storedId = localStorage.getItem('active_staff_id');

    if (storedName && storedRole && storedId) {
        setCurrentStaff({ id: storedId, name: storedName, role: storedRole });
    } else {
        // If no user found, force them back to Gatekeeper
        router.push('/dashboard/gatekeeper');
        return;
    }

    async function loadData() {
      if (!businessId) return;
      try {
        // Products
        const { data: prodData } = await supabase
          .from('products')
          .select('id, name, price, stock, barcode, tax_type')
          .eq('business_id', businessId)
          .order('name');
        if (prodData) setProducts(prodData);

        // Customers
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .order('full_name');
        if (custData) setCustomers(custData as Customer[]);

      } catch (err) {
        console.error("Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [businessId, supabase, router]);

  // --- ACTIONS ---

  const handleSwitchUser = () => {
    // Clear the current session
    localStorage.removeItem('active_staff_name');
    localStorage.removeItem('active_staff_role');
    localStorage.removeItem('active_staff_id');
    document.cookie = 'active_staff_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Redirect to Gatekeeper
    router.push('/dashboard/gatekeeper');
  };

  const handleCustomerCreated = (newCustomer: { id: string; full_name: string; phone_number: string | null } | undefined) => {
    setShowCreateCustomerModal(false);
    if (newCustomer) {
      const c: Customer = { ...newCustomer, balance: 0 };
      setSelectedCustomer(c);
      setCustomers((prev) => [...prev, c]);
      setToast({ message: 'Customer created and selected', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
    setIsCartOpen(true);
  };

  const handleScan = (code: string) => {
    const product = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === code.trim().toLowerCase());
    if (product) {
      handleAddToCart(product);
      setToast({ message: `Added ${product.name}`, type: 'success' });
      setIsScannerOpen(false);
    } else {
      setToast({ message: 'Product not found', type: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!businessId) return;

    let total = 0;
    let taxAmount = 0;
    cart.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      if (item.tax_type === 'standard') {
        const itemVAT = itemTotal - (itemTotal / 1.16);
        taxAmount += itemVAT;
      }
    });

    if (paymentMethod === 'credit' && !selectedCustomer) {
      setToast({ message: 'Please select a customer for credit sales.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const payload = {
      business_id: businessId,
      total_amount: total,
      tax_amount: taxAmount,
      payment_method: paymentMethod,
      customer_id: selectedCustomer?.id ?? null,
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      })),
      staff_id: currentStaff?.id || null,
      staff_name: currentStaff?.name || "Unknown"
    };

    try {
      const { error } = await supabase.rpc('process_sale_transaction', {
        p_body: payload
      });

      if (error) throw new Error(error.message);

      if (paymentMethod === 'credit' && selectedCustomer) {
        const newBalance = (selectedCustomer.balance ?? 0) + total;
        await supabase.from('customers').update({ balance: newBalance }).eq('id', selectedCustomer.id);
      }

      alert('Sale Completed Successfully!');
      setCart([]);
      setSelectedCustomer(null);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

    } catch (err: any) {
      console.error("Checkout Exception:", err);
      alert(`Checkout Failed: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Top Bar: User Info + Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        
        <div className="flex items-center gap-3">
            {/* 1. EXIT BUTTON (Owner Only) */}
            {currentStaff?.role !== 'cashier' && (
              <a 
                  href="/dashboard" 
                  className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors"
                  title="Go to Dashboard"
              >
                  <div className="p-2 hover:bg-gray-100 rounded-lg">
                    <LogOut className="w-5 h-5 rotate-180" />
                  </div>
              </a>
            )}

            {/* Current User Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <User className="w-4 h-4" />
                <span className="font-medium">{currentStaff?.name || "User"}</span>
            </div>
        </div>

        <div className="flex gap-2">
          {/* 2. SWITCH USER BUTTON (Replaces Lock Screen) */}
          <button
            onClick={handleSwitchUser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Switch User</span>
          </button>

          <button
            onClick={() => {
              if (!canUseScanner) {
                setToast({ message: 'Upgrade to Growth to use the Barcode Scanner.', type: 'error' });
                setTimeout(() => setToast(null), 3000);
                return;
              }
              setIsScannerOpen(true);
            }}
            aria-disabled={!canUseScanner}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors min-h-[44px] ${
              canUseScanner
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Scan className="w-5 h-5" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ProductGrid 
          products={products} 
          onAddToCart={handleAddToCart} 
        />
      </div>

      {!isCartOpen && cart.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 md:hidden">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-emerald-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 min-h-[44px]"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold text-sm">
              View Cart ({cart.length})
            </span>
          </button>
        </div>
      )}

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={() => setIsCheckoutOpen(true)}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        onAddCustomer={() => setShowCreateCustomerModal(true)}
      />

      {isCheckoutOpen && (
        <CheckoutModal 
          total={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
          selectedCustomerId={selectedCustomer?.id ?? null}
          onSelectCustomer={(id) => setSelectedCustomer(id ? customers.find(c => c.id === id) ?? null : null)}
          businessId={businessId!}
          onClose={() => setIsCheckoutOpen(false)}
          onConfirm={handleCheckout}
        />
      )}

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {showCreateCustomerModal && businessId && (
        <CustomerForm
          customer={null}
          businessId={businessId}
          onClose={() => setShowCreateCustomerModal(false)}
          onSuccess={handleCustomerCreated}
        />
      )}

      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg font-semibold text-white animate-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}