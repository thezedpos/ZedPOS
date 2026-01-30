"use client";

import { useEffect, useState } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/supabase/client';
import { ProductForm } from '@/components/inventory/ProductForm';
import { AddStockModal } from '@/components/inventory/AddStockModal';
import { Plus, Search, Package, Loader2, PackagePlus, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string | null;
  tax_type: string | null;
  business_id: string;
  created_at: string;
}

export default function InventoryPage() {
  const { businessId, isLoading: businessLoading, userRole } = useBusiness();
  const { maxProducts, tier } = usePermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const supabase = createClient();

  const isOwner = userRole === 'owner';
  const isLimitReached = products.length >= maxProducts;

  // Fetch products
  useEffect(() => {
    if (businessId) {
      fetchProducts();
    }
  }, [businessId]);

  const fetchProducts = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleFormClose = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    fetchProducts(); // Refresh list after form closes
  };

  const handleAddStock = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent opening edit form
    setSelectedProductForStock(product);
    setShowAddStockModal(true);
  };

  const handleAddStockClose = () => {
    setShowAddStockModal(false);
    setSelectedProductForStock(null);
    fetchProducts(); // Refresh list after stock update
  };

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.toLowerCase().includes(query)) ||
      false
    );
  });

  if (businessLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    // FIX: "max-w-[100vw]" and "overflow-x-hidden" forces the browser to cut off any excess width.
    // FIX: "min-h-[100dvh]" uses Dynamic Viewport Height to respect the mobile address bar.
    <div className="w-full max-w-[100vw] overflow-x-hidden min-h-[100dvh] bg-gray-50 pb-32">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 w-full shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 truncate">Inventory</h1>
          
          {isOwner && (
            <div className="flex-shrink-0">
              {isLimitReached ? (
                <div className="flex flex-col items-end">
                  <button
                    disabled
                    className="bg-gray-100 text-gray-400 p-2 rounded-lg font-semibold flex items-center gap-2 cursor-not-allowed border border-gray-200"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <Link
                    href="/dashboard/settings/subscription"
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium underline mt-1"
                  >
                    Upgrade
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleAddProduct}
                  className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors active:scale-95 shadow-sm"
                >
                  <Plus className="w-6 h-6" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 w-full">
         <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-colors text-base"
          />
        </div>
      </div>
      </div>

      {/* Product List Content */}
      <div className="p-4 w-full">
        
        {/* Progress Bar (Free Tier) */}
        {tier === 'free' && (
          <div className="mb-4 bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700">
                Limit: {products.length}/{maxProducts} used
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  products.length >= maxProducts
                    ? 'bg-red-500'
                    : products.length >= maxProducts * 0.8
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((products.length / maxProducts) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="bg-gray-100 rounded-full p-4 mb-3">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {searchQuery ? 'No results' : 'No products'}
            </h3>
            <p className="text-gray-500 text-center mb-4 text-sm max-w-[200px]">
              {searchQuery
                ? 'Try a different search'
                : 'Add your first item to start tracking.'}
            </p>
            {!searchQuery && isOwner && (
              <button
                onClick={handleAddProduct}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
              >
                Add Item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => isOwner && handleEditProduct(product)}
                className={`bg-white rounded-xl p-3 shadow-sm border border-gray-200 relative ${
                  isOwner ? 'active:scale-[0.99] transition-transform' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  {/* Left: Product Name + Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate w-full mb-1">
                        {product.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {product.stock < 5 && (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          LOW
                        </span>
                      )}
                      {product.barcode ? (
                        <p className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {product.barcode}
                        </p>
                      ) : (
                         <p className="text-[10px] text-gray-400 italic mt-0.5">No barcode</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Price + Stock */}
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-bold text-emerald-700 text-base sm:text-lg whitespace-nowrap">
                      K{product.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-xs font-medium ${product.stock < 5 ? 'text-red-600' : 'text-gray-500'}`}>
                        {product.stock} left
                      </p>
                      
                      {/* Add Stock Button */}
                      {isOwner && (
                        <button
                          onClick={(e) => handleAddStock(e, product)}
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-gray-200"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          businessId={businessId!}
          onClose={handleFormClose}
        />
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && selectedProductForStock && (
        <AddStockModal
          productId={selectedProductForStock.id}
          currentStock={selectedProductForStock.stock}
          productName={selectedProductForStock.name}
          onClose={handleAddStockClose}
          onSuccess={handleAddStockClose}
        />
      )}
    </div>
  );
}