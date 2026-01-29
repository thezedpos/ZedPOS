'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string | null;
  tax_type: string | null;
}

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search
  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query) ||
      ''
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500 text-center">
              {searchQuery ? 'No products found' : 'No products available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onAddToCart(product)}
                disabled={product.stock <= 0}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-emerald-600 mb-1">
                  ZMW {product.price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Stock: {product.stock}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
