'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { X, Loader2, Lock } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  notes: string | null; // Added notes
  business_id: string;
}

interface CustomerFormProps {
  customer: Customer | null;
  businessId: string;
  onClose: () => void;
  /** Called after save. For new customers, the created customer object is passed. */
  onSuccess?: (createdCustomer?: Customer) => void;
}

export function CustomerForm({ customer, businessId, onClose, onSuccess }: CustomerFormProps) {
  const { canTrackDebt } = usePermissions();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Populate form if editing
  useEffect(() => {
    if (customer) {
      setFullName(customer.full_name);
      setPhoneNumber(customer.phone_number || '');
      setEmail(customer.email || '');
      setNotes(customer.notes || '');
      // Note: If your DB has credit_limit and opening_balance columns, populate them here
      // setCreditLimit(customer.credit_limit?.toString() || '');
      // setOpeningBalance(customer.balance?.toString() || '');
    } else {
      // Reset form for new customer
      setFullName('');
      setPhoneNumber('');
      setEmail('');
      setNotes('');
      setCreditLimit('');
      setOpeningBalance('');
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const customerData = {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        business_id: businessId,
      };

      // Validate required fields
      if (!customerData.full_name) {
        setError('Full name is required');
        setLoading(false);
        return;
      }

      if (customer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }
        if (onSuccess) onSuccess();
      } else {
        // Insert new customer and return it so callers can use it (e.g. auto-select on POS)
        const { data: created, error: insertError } = await supabase
          .from('customers')
          .insert(customerData)
          .select('id, full_name, phone_number, email, notes, business_id')
          .single();

        if (insertError) {
          setError(insertError.message);
          setLoading(false);
          return;
        }
        if (onSuccess && created) onSuccess(created as Customer);
      }

      onClose();
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center p-4">
      {/* Dark Overlay */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="e.g. John Banda"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="e.g. 0977 123456"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              placeholder="customer@email.com"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base resize-none"
              placeholder="Preferred contact time, loyalty details, etc."
            />
          </div>

          {/* Credit Limit */}
          <div>
            <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Credit Limit
              {!canTrackDebt && <Lock className="w-4 h-4 text-gray-400" />}
            </label>
            <input
              id="creditLimit"
              type="number"
              step="0.01"
              min="0"
              value={creditLimit}
              onChange={(e) => canTrackDebt && setCreditLimit(e.target.value)}
              disabled={!canTrackDebt}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base ${
                !canTrackDebt ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
              }`}
              placeholder={!canTrackDebt ? 'Upgrade to Growth' : '0.00'}
              title={!canTrackDebt ? 'Upgrade to the Growth Plan to track customer debt.' : ''}
            />
          </div>

          {/* Opening Balance / Current Debt */}
          <div>
            <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Opening Balance / Current Debt
              {!canTrackDebt && <Lock className="w-4 h-4 text-gray-400" />}
            </label>
            <input
              id="openingBalance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => canTrackDebt && setOpeningBalance(e.target.value)}
              disabled={!canTrackDebt}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base ${
                !canTrackDebt ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
              }`}
              placeholder={!canTrackDebt ? 'Upgrade to Growth' : '0.00'}
              title={!canTrackDebt ? 'Upgrade to the Growth Plan to track customer debt.' : ''}
            />
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
                  <span>Saving...</span>
                </>
              ) : (
                <span>{customer ? 'Update' : 'Add'} Customer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}