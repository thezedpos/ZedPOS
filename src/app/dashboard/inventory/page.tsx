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
    // FIX 1: Added pb-28 to lift content above nav bar
    // FIX 2: max-w-[100vw] and overflow-hidden prevent side-scroll
    <div className="max-w-6xl mx-auto w-full max-w-[100vw] overflow-x-hidden pb-28">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory</h1>
          {isOwner && (
            <div className="flex items-center gap-2">
              {isLimitReached ? (
                <div className="flex flex-col items-end">
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-3 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Limit Reached</span>
                  </button>
                  {/* FIX 3: Removed whitespace-nowrap so text wraps if needed */}
                  <Link
                    href="/dashboard/settings/subscription"
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline mt-1"
                  >
                    Upgrade
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleAddProduct}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Product</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="bg-white px-4 pb-4">
         <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white transition-colors text-base"
          />
        </div>
      </div>
      </div>

      {/* Product List */}
      <div className="p-4">
        {/* Progress Bar for Free Tier */}
        {tier === 'free' && (
          <div className="mb-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-700">
                Used {products.length}/{maxProducts} items
              </p>
              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                {products.length}/{maxProducts}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
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
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No results' : 'No products'}
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-[200px] text-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first item to start tracking.'}
            </p>
            {!searchQuery && isOwner && (
              <button
                onClick={handleAddProduct}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
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
                // FIX 4: Ensure grid layout prevents overlap
                className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 relative ${
                  isOwner ? 'active:scale-[0.99] transition-transform' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  {/* Left: Product Name + Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-base truncate w-full">
                        {product.name}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                      {product.stock < 5 && (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          LOW
                        </span>
                      )}
                      {product.barcode ? (
                        <p className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                          {product.barcode}
                        </p>
                      ) : (
                         <p className="text-xs text-gray-400 italic">No barcode</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Price + Stock */}
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-bold text-emerald-700 text-lg whitespace-nowrap">
                      K{product.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-xs font-medium ${product.stock < 5 ? 'text-red-600' : 'text-gray-500'}`}>
                        {product.stock} left
                      </p>
                      
                      {/* Add Stock Button - Only visible to owner */}
                      {isOwner && (
                        <button
                          onClick={(e) => handleAddStock(e, product)}
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                        >
                          <PackagePlus className="w-4 h-4" />
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