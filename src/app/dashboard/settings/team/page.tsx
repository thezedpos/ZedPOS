"use client";

import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient } from "@/supabase/client";
import { 
  Users, Plus, Shield, ShieldCheck, Trash2, Lock, Loader2, ArrowLeft, IdCard, Pencil 
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function TeamPage() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const { canAddStaff } = usePermissions();
  const supabase = createClient();

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newNrc, setNewNrc] = useState("");
  const [newRole, setNewRole] = useState("cashier");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  // --- FETCH STAFF ---
  useEffect(() => {
    async function fetchStaff() {
      if (!businessId) return; 

      try {
        const { data, error } = await supabase
          .from('business_members')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: true });
        
        if (data) setStaff(data);
        if (error) console.error("Error loading team:", error);
        
      } catch (err) {
        console.error("Unexpected error fetching staff:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, [businessId, supabase]);

  // --- OPEN MODAL HELPERS ---
  const openAddModal = () => {
    setEditingId(null);
    setNewName("");
    setNewNrc("");
    setNewRole("cashier");
    setNewPin("");
    setIsModalOpen(true);
  };

  const openEditModal = (member: any) => {
    setEditingId(member.id);
    setNewName(member.name || "");
    setNewNrc(member.nrc_number || "");
    setNewRole(member.role || "cashier");
    setNewPin(member.pin_code || "");
    setIsModalOpen(true);
  };

  // --- SAVE HANDLER ---
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canAddStaff && !editingId) {
      alert("Please upgrade to Pro to add more staff!");
      return;
    }

    setSaving(true);
    
    try {
      if (editingId) {
        // --- UPDATE ---
        const { data, error } = await supabase
          .from('business_members')
          .update({
            name: newName,
            nrc_number: newNrc,
            role: newRole,
            pin_code: newPin
          })
          .eq('id', editingId)
          .select()
          .single();

        if (error) throw error;
        setStaff(staff.map(s => s.id === editingId ? data : s));

      } else {
        // --- CREATE ---
        const { data, error } = await supabase
          .from('business_members')
          .insert([{ 
            business_id: businessId, 
            name: newName,
            nrc_number: newNrc,
            role: newRole,
            pin_code: newPin
          }])
          .select()
          .single();

        if (error) throw error;
        setStaff([...staff, data]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setNewName("");
      setNewNrc(""); 
      setNewPin("");

    } catch (err: any) {
      console.error("Save Error:", err);
      alert(`Failed to save: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // --- DELETE HANDLER ---
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    
    try {
      const { error } = await supabase.from('business_members').delete().eq('id', id);
      if (error) {
        alert("Error deleting staff: " + error.message);
      } else {
        setStaff(staff.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Error deleting staff:", err);
    }
  };

  return (
    // FIX 1: Wrapper now has min-h-screen to fill void space and w-full/max-w-full to prevent spillover
    <div className="w-full max-w-full overflow-hidden bg-gray-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
        
        {/* Navigation */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-500 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Settings
        </button>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-500">Manage who has access to your shop.</p>
          </div>

          <button
            onClick={() => {
              if (canAddStaff) {
                openAddModal();
              } else {
                if(confirm("Upgrade to Pro to add staff members?")) {
                  router.push('/dashboard/settings/subscription');
                }
              }
            }}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap w-fit ${
              canAddStaff 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canAddStaff ? <Plus className="w-5 h-5 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {canAddStaff ? "Add Staff Member" : "Add Staff (Pro Only)"}
          </button>
        </div>

        {/* Staff List Table Container */}
        {/* FIX 2: Added max-w-full to container to force internal scrolling */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full max-w-full">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
              <p>Loading team...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No staff members yet. Add one to get started.</p>
            </div>
          ) : (
            // FIX 3: overflow-x-auto allows table to scroll INSIDE this div
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">NRC Number</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Access PIN</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{member.name || "Owner"}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm font-mono whitespace-nowrap">
                        {member.nrc_number || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.role === 'owner' ? 'bg-purple-100 text-purple-800' : 
                          member.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role === 'owner' && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {member.role === 'manager' && <Shield className="w-3 h-3 mr-1" />}
                          {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono tracking-wider">
                        {member.pin_code ? '••••' : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {member.role !== 'owner' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditModal(member)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(member.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unified Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? "Edit Staff Details" : "Add New Staff"}
            </h2>
            
            <form onSubmit={handleSaveStaff} className="space-y-4">
              
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow text-base md:text-sm"
                  placeholder="e.g. Mary Banda"
                />
              </div>

              {/* NRC Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NRC Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IdCard className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    value={newNrc}
                    onChange={(e) => setNewNrc(e.target.value)}
                    className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow uppercase text-base md:text-sm"
                    placeholder="123456/10/1"
                  />
                </div>
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-base md:text-sm"
                >
                  <option value="cashier">Cashier (POS Only)</option>
                  <option value="manager">Manager (Inventory & Reports)</option>
                </select>
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">POS PIN Code (4 Digits)</label>
                <input 
                  type="text" 
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none font-mono tracking-widest text-center text-lg"
                  placeholder="0000"
                />
                <p className="text-xs text-gray-500 mt-1">They will use this to log into the POS screen.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors text-base md:text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 transition-colors flex justify-center items-center shadow-md text-base md:text-sm"
                >
                  {saving ? <Loader2 className="animate-spin w-5 h-5" /> : (editingId ? "Save Changes" : "Create Staff")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}