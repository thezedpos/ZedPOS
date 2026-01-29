'use client';

import { useState } from 'react';
import { createClient } from '@/supabase/client';
import { X, Loader2, Plus } from 'lucide-react';

interface AddStockModalProps {
  productId: string;
  currentStock: number;
  productName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStockModal({
  productId,
  currentStock,
  productName,
  onClose,
  onSuccess,
}: AddStockModalProps) {
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const addAmount = parseInt(quantity);
      
      if (isNaN(addAmount) || addAmount <= 0) {
        setError('Please enter a valid positive number');
        setLoading(false);
        return;
      }

      // Fetch current stock
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (fetchError) {
        setError('Failed to fetch current stock');
        setLoading(false);
        return;
      }

      // Update stock by adding the new amount
      const newStock = (currentProduct.stock || 0) + addAmount;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Success
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding stock:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl pb-20">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Stock</h2>
            <p className="text-sm text-gray-500 mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              How many units are you adding?
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="Enter quantity"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Current stock: {currentStock} units
            </p>
          </div>

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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Add Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
