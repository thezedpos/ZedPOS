'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartDrawer } from '@/components/pos/CartDrawer';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { Loader2, ShoppingCart, Scan, Lock, User, LogOut, CheckCircle } from 'lucide-react';

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
  pin_code: string;
}

export default function POSPage() {
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

  // --- LOCK SCREEN STATE ---
  const [isLocked, setIsLocked] = useState(true); // Default to LOCKED
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);

  // 1. Fetch Data (Products, Customers, AND Staff)
  useEffect(() => {
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

        // Staff (For Lock Screen)
        const { data: staffData } = await supabase
          .from('business_members')
          .select('id, name, role, pin_code')
          .eq('business_id', businessId)
          .order('name');
        if (staffData) setStaffMembers(staffData);

      } catch (err) {
        console.error("Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [businessId, supabase]);

  // --- LOCK SCREEN LOGIC ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffMembers.find(s => s.id === selectedStaffId);
    
    if (staff && staff.pin_code === pinInput) {
      setCurrentStaff(staff);
      setIsLocked(false);
      setPinInput("");
      setPinError(false);
      setToast({ message: `Welcome, ${staff.name}!`, type: 'success' });
      setTimeout(() => setToast(null), 2000);
    } else {
      setPinError(true);
      setPinInput("");
      setToast({ message: 'Incorrect PIN', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    setCurrentStaff(null);
    setSelectedStaffId(null);
    setPinInput("");
  };

  // --- POS LOGIC ---

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
    if (!businessId) {
      alert("System Error: Business ID missing. Please refresh.");
      return;
    }

    // Tax Calc
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

    // IMPORTANT: Record WHO made the sale (staff_id)
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
      staff_id: currentStaff?.id || null, // <--- Add this column to sales table later if you want strict tracking
      staff_name: currentStaff?.name || "Unknown" // Just for metadata if needed
    };

    try {
      const { error } = await supabase.rpc('process_sale_transaction', {
        p_body: payload
      });

      if (error) throw new Error(error.message || "Transaction failed");

      if (paymentMethod === 'credit' && selectedCustomer) {
        const newBalance = (selectedCustomer.balance ?? 0) + total;
        await supabase.from('customers').update({ balance: newBalance }).eq('id', selectedCustomer.id);
      }

      alert('Sale Completed Successfully!');
      setCart([]);
      setSelectedCustomer(null);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

      // OPTIONAL: Auto-Lock after sale?
      // Uncomment next line if you want strict security
      // handleLock(); 
      
    } catch (err: any) {
      console.error("Checkout Exception:", err);
      alert(`Checkout Failed: ${err.message || JSON.stringify(err)}`);
    }
  };

  // --- RENDER LOADING ---
  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  // --- RENDER LOCK SCREEN ---
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-emerald-600 p-6 text-center">
            <h2 className="text-2xl font-bold text-white">POS Locked</h2>
            <p className="text-emerald-100">Select your name to unlock</p>
          </div>
          
          <div className="p-6">
            {!selectedStaffId ? (
              <div className="grid grid-cols-2 gap-4">
                {staffMembers.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all aspect-square"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2 text-xl font-bold text-gray-600">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800 text-center">{staff.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{staff.role}</span>
                  </button>
                ))}
                {staffMembers.length === 0 && (
                  <p className="col-span-2 text-center text-gray-500">No staff members found.</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleUnlock} className="space-y-6">
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedStaffId(null);
                      setPinInput("");
                      setPinError(false);
                    }}
                    className="text-sm text-gray-500 hover:text-emerald-600 mb-4 flex items-center justify-center gap-1"
                  >
                    ← Back to User List
                  </button>
                  <h3 className="text-lg font-bold text-gray-900">
                    Hello, {staffMembers.find(s => s.id === selectedStaffId)?.name}
                  </h3>
                  <p className="text-gray-500 text-sm">Enter your PIN to start selling</p>
                </div>

                <div className="flex justify-center">
                  <input
                    type="password"
                    maxLength={4}
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPinInput(val);
                      if (pinError) setPinError(false);
                    }}
                    className={`text-center text-3xl tracking-[1em] w-48 py-2 border-b-2 outline-none font-mono ${
                      pinError ? 'border-red-500 text-red-600' : 'border-gray-300 focus:border-emerald-500'
                    }`}
                    placeholder="••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pinInput.length < 4}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  Unlock POS
                </button>
              </form>
            )}
          </div>
        </div>
        
        {/* Navigation Link for Owner fallback */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Admin Dashboard is accessible via main menu.</p>
        </div>
      </div>
    );
  }

  // --- RENDER UNLOCKED POS ---
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Top Bar: Scanner + Lock Button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        {/* Current User Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
           <User className="w-4 h-4" />
           <span className="font-medium">{currentStaff?.name || "Owner"}</span>
        </div>

        <div className="flex gap-2">
          {/* Lock Button */}
          <button
            onClick={handleLock}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Lock Screen</span>
          </button>

          {/* Scanner Button */}
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

      {!canUseScanner && (
        <div className="bg-white px-4 pb-2 flex justify-end">
          <p className="text-xs text-gray-500">Scanner locked. Upgrade to enable.</p>
        </div>
      )}

      {/* Product Grid Area */}
      <div className="flex-1 overflow-hidden">
        <ProductGrid 
          products={products} 
          onAddToCart={handleAddToCart} 
        />
      </div>

      {/* Floating Cart Button */}
      {!isCartOpen && cart.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 md:hidden">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-emerald-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 min-h-[44px]"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold text-sm">
              View Cart ({cart.length}) - K{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
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

      {/* Checkout Modal */}
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

      {/* Barcode Scanner */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Add New Customer modal */}
      {showCreateCustomerModal && businessId && (
        <CustomerForm
          customer={null}
          businessId={businessId}
          onClose={() => setShowCreateCustomerModal(false)}
          onSuccess={handleCustomerCreated}
        />
      )}

      {/* Toast Notification */}
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