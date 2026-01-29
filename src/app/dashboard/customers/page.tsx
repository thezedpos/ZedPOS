'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { createClient } from '@/supabase/client';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { Plus, Search, User, Loader2, Edit, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  notes: string | null;
  business_id: string;
  created_at: string;
  balance?: number; // Current balance / credit owed (optional column)
}

export default function CustomersPage() {
  const router = useRouter();
  const { businessId, isLoading: businessLoading } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const supabase = createClient();

  // Fetch customers
  useEffect(() => {
    if (businessId) {
      fetchCustomers();
    }
  }, [businessId]);

  const fetchCustomers = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer');
      } else {
        fetchCustomers(); // Refresh list
      }
    } catch (err) {
      console.error('Error:', err);
      alert('An error occurred');
    }
  };

  const handleFormClose = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    fetchCustomers(); // Refresh list after form closes
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.full_name.toLowerCase().includes(query) ||
      customer.phone_number?.toLowerCase().includes(query) ||
      ''
    );
  });

  if (businessLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <button
            onClick={handleAddCustomer}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
            />
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="p-4">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gray-100 rounded-full p-6 mb-4">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No customers found. Add your first regular client.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddCustomer}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Add Your First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const balance = (customer as Customer).balance ?? 0;
              return (
                <div
                  key={customer.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Customer Info - Clickable */}
                    <button
                      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                      className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                    >
                      <h3 className="font-bold text-gray-900 text-base mb-1">
                        {customer.full_name}
                      </h3>
                      {customer.phone_number && (
                        <p className="text-sm text-gray-600 mb-1">
                          {customer.phone_number}
                        </p>
                      )}
                      <p className={`text-sm font-semibold ${balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        Balance: K{Number(balance).toFixed(2)}
                      </p>
                    </button>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCustomer(customer);
                        }}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Edit customer"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(customer.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete customer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          customer={editingCustomer}
          businessId={businessId!}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
