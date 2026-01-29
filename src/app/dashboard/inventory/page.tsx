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
    <div className="max-w-6xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          {isOwner && (
            <div className="flex items-center gap-2">
              {isLimitReached ? (
                <>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-not-allowed min-h-[44px]"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Limit Reached ({products.length}/{maxProducts})</span>
                  </button>
                  <Link
                    href="/dashboard/settings/subscription"
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline whitespace-nowrap"
                  >
                    Upgrade to Add More
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleAddProduct}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors active:scale-95 min-h-[44px]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Product</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Bar - FIXED */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-3 sticky top-0 z-10 md:static">
         <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products..." 
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
              <p className="text-sm font-medium text-gray-700">
                You have used {products.length} of {maxProducts} free items.
              </p>
              <span className="text-sm font-semibold text-gray-900">
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
              {searchQuery ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Add your first item to get started with inventory management'}
            </p>
            {!searchQuery && isOwner && (
              <div className="flex flex-col items-center gap-2">
                {isLimitReached ? (
                  <>
                    <button
                      disabled
                      className="bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Limit Reached ({products.length}/{maxProducts})
                    </button>
                    <Link
                      href="/dashboard/settings/subscription"
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline"
                    >
                      Upgrade to Add More
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={handleAddProduct}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Add Your First Item
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => isOwner && handleEditProduct(product)}
                className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 transition-transform ${
                  isOwner ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Product Name + Barcode */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-base truncate">
                        {product.name}
                      </h3>
                      {product.stock < 5 && (
                        <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <AlertCircle className="w-3 h-3" />
                          Low Stock
                        </span>
                      )}
                    </div>
                    {product.barcode ? (
                      <p className="text-xs text-gray-500">Barcode: {product.barcode}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No barcode</p>
                    )}
                  </div>

                  {/* Right: Price + Stock + Add Stock Button */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                    <p className="font-bold text-gray-900 text-lg">
                      ZMW {product.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          product.stock < 5
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        Stock: {product.stock}
                      </p>
                      {isOwner && (
                        <button
                          onClick={(e) => handleAddStock(e, product)}
                          className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                          title="Add Stock"
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