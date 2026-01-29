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
import { Loader2, ShoppingCart, Scan, Lock } from 'lucide-react';

// Define strict types
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

export default function POSPage() {
  const { businessId } = useBusiness();
  const { canUseScanner } = usePermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]); // Initialize as empty array
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const supabase = createClient();

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

  // 1. Fetch Products
  useEffect(() => {
    async function loadProducts() {
      if (!businessId) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, barcode, tax_type')
        .eq('business_id', businessId)
        .order('name');

      if (data) setProducts(data);
      setLoading(false);
    }
    loadProducts();
  }, [businessId]);

  // 1.5. Fetch Customers
  useEffect(() => {
    async function loadCustomers() {
      if (!businessId) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('full_name', { ascending: true });

      if (!error && data) setCustomers(data as Customer[]);
    }
    loadCustomers();
  }, [businessId, supabase]);

  // 2. Add to Cart Logic (Fixed)
  const handleAddToCart = (product: Product) => {
    console.log("Adding product:", product.name); // Debug log

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      
      if (existing) {
        // Item exists? Increment quantity
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // New item? Add to array with quantity 1
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });

    setIsCartOpen(true); // Auto-open cart on add (optional, good for mobile)
  };

  // 2.5. Handle Barcode Scan
  const handleScan = (code: string) => {
    // Look for product with matching barcode
    const product = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === code.trim().toLowerCase());
    
    if (product) {
      // Product found - add to cart
      handleAddToCart(product);
      
      // Show success toast
      setToast({ message: `Added ${product.name}`, type: 'success' });
      
      // Play success sound (optional - using Web Audio API)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (err) {
        // Silently fail if audio is not supported
        console.log('Audio not supported');
      }
      
      // Close scanner after successful scan
      setIsScannerOpen(false);
    } else {
      // Product not found
      setToast({ message: 'Product not found', type: 'error' });
    }
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => setToast(null), 3000);
  };

  // 3. Update Quantity Logic
  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0); // Remove if 0
    });
  };

  // 4. Checkout Logic
  // Inside src/app/dashboard/pos/page.tsx

  const handleCheckout = async (paymentMethod: string) => {
    if (!businessId) {
      alert("System Error: Business ID missing. Please refresh.");
      return;
    }

    // Calculate total and VAT based on tax_type
    let total = 0;
    let taxAmount = 0;

    cart.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      // Calculate VAT only for Standard (16%) items
      if (item.tax_type === 'standard') {
        // VAT = Price - (Price / 1.16) for tax-inclusive pricing
        const itemVAT = itemTotal - (itemTotal / 1.16);
        taxAmount += itemVAT;
      }
      // Zero-rated and Exempt items have 0 VAT
    });

    // Credit requires a selected customer
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
      }))
    };

    try {
      const { data, error } = await supabase.rpc('process_sale_transaction', {
        p_body: payload
      });

      if (error) {
        console.error("Supabase Error:", error); // Log the full object
        throw new Error(error.message || "Transaction failed");
      }

      // If credit sale, increment customer balance
      if (paymentMethod === 'credit' && selectedCustomer) {
        const newBalance = (selectedCustomer.balance ?? 0) + total;
        await supabase
          .from('customers')
          .update({ balance: newBalance })
          .eq('id', selectedCustomer.id);
      }

      // Success!
      alert('Sale Completed Successfully!');
      setCart([]);
      setSelectedCustomer(null);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      
    } catch (err: any) {
      console.error("Checkout Exception:", err);
      // Show the actual error message
      alert(`Checkout Failed: ${err.message || JSON.stringify(err)}`);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Scan Item Button - Above Product Grid */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-end">
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
          <span>Scan Item</span>
          {!canUseScanner && <Lock className="w-4 h-4" />}
        </button>
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

      {/* Floating Cart Button (Visible when cart closed) - Mobile FAB */}
      {!isCartOpen && cart.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 md:hidden">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-emerald-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 min-h-[44px]"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold text-sm">
              View Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'}) - K{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
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

      {/* Add New Customer modal (from POS) */}
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
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg font-semibold text-white animate-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}