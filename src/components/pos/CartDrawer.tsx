'use client';

import { useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Trash2, User, ChevronDown } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  tax_type: string | null;
}

interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
  balance?: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onCheckout: () => void;
  customers?: Customer[];
  selectedCustomer?: Customer | null;
  onSelectCustomer?: (customer: Customer | null) => void;
  /** Opens "Add New Customer" modal when provided; show "+ New Customer" in the list */
  onAddCustomer?: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart = [], // <--- FIX: Default to empty array if undefined
  onUpdateQuantity,
  onCheckout,
  customers = [],
  selectedCustomer = null,
  onSelectCustomer,
  onAddCustomer,
}: CartDrawerProps) {
  const [showCustomerList, setShowCustomerList] = useState(false);
  
  // Safety check: ensure cart is an array before reducing
  const safeCart = Array.isArray(cart) ? cart : [];

  // Calculate Totals and VAT based on tax_type
  let total = 0;
  let vatAmount = 0;

  safeCart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    // Calculate VAT only for Standard (16%) items
    if (item.tax_type === 'standard') {
      // VAT = Price - (Price / 1.16) for tax-inclusive pricing
      const itemVAT = itemTotal - (itemTotal / 1.16);
      vatAmount += itemVAT;
    }
    // Zero-rated and Exempt items have 0 VAT
  });

  // If closed, don't render anything
  if (!isOpen) return null;

  return (
    <>
      {/* Dark Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Current Sale</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {safeCart.length} items
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Customer selector - above cart items */}
        {onSelectCustomer && (
          <div className="px-4 pt-3 pb-2 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer</label>
            <div className="relative">
              {selectedCustomer ? (
                <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{selectedCustomer.full_name}</p>
                    <p className={`text-xs font-medium ${(selectedCustomer.balance ?? 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {(selectedCustomer.balance ?? 0) > 0
                        ? `Debt: K${Number(selectedCustomer.balance).toFixed(2)}`
                        : 'No balance'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(null)}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors shrink-0"
                    title="Clear to Guest"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomerList(!showCustomerList)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    Select Customer
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCustomerList ? 'rotate-180' : ''}`} />
                </button>
              )}

              {showCustomerList && !selectedCustomer && (
                <>
                  <div
                    className="fixed inset-0 z-[5]"
                    aria-hidden
                    onClick={() => setShowCustomerList(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto z-[10]">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCustomer(null);
                        setShowCustomerList(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 border-b border-gray-100"
                    >
                      Guest / Walk-in
                    </button>
                    {onAddCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerList(false);
                          onAddCustomer();
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm font-semibold text-emerald-600 hover:bg-emerald-50 border-b border-gray-100 flex items-center gap-2"
                      >
                        <span className="text-lg leading-none">+</span>
                        New Customer
                      </button>
                    )}
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onSelectCustomer(c);
                          setShowCustomerList(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-900">{c.full_name}</span>
                        {(c.balance ?? 0) > 0 && (
                          <span className="block text-xs text-red-600">Debt: K{Number(c.balance).toFixed(2)}</span>
                        )}
                      </button>
                    ))}
                    {customers.length === 0 && (
                      <p className="px-3 py-4 text-sm text-gray-500 text-center">No customers yet</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
          {safeCart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            safeCart.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                  <p className="text-sm text-emerald-600 font-bold">
                    K{item.price.toFixed(2)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <span className="w-4 text-center font-semibold text-sm">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="p-1 hover:bg-emerald-50 hover:text-emerald-500 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Area (Fixed at Bottom) */}
        <div className="border-t border-gray-200 bg-white p-4 pb-24 safe-area-pb">
          <div className="space-y-2 mb-4">
            {vatAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>VAT (16% Inclusive)</span>
                <span>K{vatAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-extrabold text-emerald-600">
                K{total.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={safeCart.length === 0}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none min-h-[44px]"
          >
            Checkout (K{total.toFixed(2)})
          </button>
        </div>
      </div>
    </>
  );
}