'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { X, Scan, Loader2, Lock } from 'lucide-react';
import { BarcodeScanner } from '../pos/BarcodeScanner';

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price?: number | null; // Cost price (how much you bought it for)
  stock: number; // Changed from stock_quantity to match DB
  barcode: string | null;
  tax_type: string | null; // Changed from vat_category to tax_type
  business_id: string;
}

interface ProductFormProps {
  product: Product | null;
  businessId: string;
  onClose: () => void;
  onSuccess?: () => void; // Added optional callback
}

const TAX_TYPES = [
  { value: 'standard', label: 'Standard (16%)' },
  { value: 'zero_rated', label: 'Zero-Rated (0%)' },
  { value: 'exempt', label: 'Exempt' },
];

export function ProductForm({ product, businessId, onClose, onSuccess }: ProductFormProps) {
  const { canUseScanner } = usePermissions();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [barcode, setBarcode] = useState('');
  const [taxType, setTaxType] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const supabase = createClient();

  // Populate form if editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price.toString());
      setCostPrice(product.cost_price?.toString() || '');
      setStockQuantity(product.stock.toString()); // Map 'stock' from DB object
      setBarcode(product.barcode || '');
      setTaxType(product.tax_type || 'standard');
    } else {
      // Reset form for new product
      setName('');
      setPrice('');
      setCostPrice('');
      setStockQuantity('0');
      setBarcode('');
      setTaxType('standard');
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare payload mapping form state to DB columns
      const productData = {
        name: name.trim(),
        price: parseFloat(price),
        cost_price: costPrice ? parseFloat(costPrice) : null,
        stock: parseInt(stockQuantity) || 0, // <--- Correct column name is 'stock'
        barcode: barcode.trim() || null,
        tax_type: taxType,
        business_id: businessId,
      };

      // Validate required fields
      if (!productData.name || isNaN(productData.price) || productData.price < 0) {
        setError('Please fill in all required fields with valid values');
        setLoading(false);
        return;
      }

      if (product) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }
      } else {
        // Insert new product
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData);

        if (insertError) {
          setError(insertError.message);
          setLoading(false);
          return;
        }
      }

      // Success
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleScanBarcode = () => {
    if (!canUseScanner) {
      setError('Upgrade to Growth to scan barcodes.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsScannerOpen(true);
  };

  const handleScan = (code: string) => {
    setBarcode(code);
    setIsScannerOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="Enter product name"
            />
          </div>

          {/* Barcode / SKU */}
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
              Barcode (Optional)
            </label>
            <div className="relative">
              <input
                id="barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
                placeholder="Enter or scan barcode / SKU"
              />
              <button
                type="button"
                onClick={handleScanBarcode}
                disabled={!canUseScanner}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 transition-colors p-2 ${
                  canUseScanner
                    ? 'text-gray-400 hover:text-emerald-600'
                    : 'text-gray-300 cursor-not-allowed bg-gray-100 rounded'
                }`}
                title={canUseScanner ? 'Scan Barcode' : 'Upgrade to Growth to scan barcodes.'}
              >
                {canUseScanner ? (
                  <Scan className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Selling Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Selling Price (ZMW) <span className="text-red-500">*</span>
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">How much you sell it for</p>
          </div>

          {/* Cost Price */}
          <div>
            <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price (ZMW) <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">How much you bought it for (for profit tracking)</p>
          </div>

          {/* Stock Quantity */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="0"
            />
          </div>

          {/* Tax Type */}
          <div>
            <label htmlFor="taxType" className="block text-sm font-medium text-gray-700 mb-1">
              Tax Type <span className="text-red-500">*</span>
            </label>
            <select
              id="taxType"
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base bg-white"
            >
              {TAX_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Required for ZRA compliance</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{product ? 'Update' : 'Add'} Product</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}