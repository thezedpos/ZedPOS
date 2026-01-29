"use client";

import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { createClient } from "@/supabase/client";
import { 
  Building2, Save, Loader2, ArrowLeft, Receipt, Lock, Mail, AlertCircle, XCircle, CheckCircle 
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function BusinessProfilePage() {
  const router = useRouter();
  const { businessId, refreshBusiness } = useBusiness();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // NEW: UI Feedback States (Replaces Alerts)
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Business Details State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tpin, setTpin] = useState("");
  const [isVatRegistered, setIsVatRegistered] = useState(false);

  // Security State
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- FETCH DETAILS ---
  useEffect(() => {
    async function fetchProfile() {
      if (!businessId) return;

      try {
        const { data: busData } = await supabase
          .from('businesses')
          .select('name, phone_number, address, tpin, is_vat_registered')
          .eq('id', businessId)
          .single();
        
        if (busData) {
          setName(busData.name || "");
          setPhone(busData.phone_number || "");
          setAddress(busData.address || "");
          setTpin(busData.tpin || "");
          setIsVatRegistered(busData.is_vat_registered || false);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        }

      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [businessId, supabase]);

  // --- SAVE HANDLER ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(""); // Clear previous errors
    setFormSuccess(""); // Clear previous success

    try {
      // 1. Get the REAL current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user || !user.email) {
        throw new Error("Could not verify your identity. Please refresh and log in again.");
      }

      // 2. Security Check
      const isChangingPassword = newPassword.trim().length > 0;
      const isChangingEmail = email.trim().toLowerCase() !== user.email.trim().toLowerCase();

      if (isChangingPassword || isChangingEmail) {
        if (!currentPassword) {
          setFormError("⚠️ You must enter your Current Password to change your Email or Password.");
          setSaving(false);
          window.scrollTo(0, 0); // Scroll to top to see error
          return;
        }

        // VERIFY PASSWORD
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email, 
          password: currentPassword,
        });

        if (verifyError) {
          setFormError("❌ Incorrect Current Password. Access Denied.");
          setSaving(false);
          window.scrollTo(0, 0);
          return;
        }
      }

      // 3. Update Business Details
      const { error: busError } = await supabase
        .from('businesses')
        .update({
          name: name,
          phone_number: phone,
          address: address,
          tpin: tpin,
          is_vat_registered: isVatRegistered
        })
        .eq('id', businessId);

      if (busError) throw busError;

      // 4. Update Password (If verified)
      if (isChangingPassword) {
        if (newPassword !== confirmPassword) {
          setFormError("❌ New passwords do not match!");
          setSaving(false);
          window.scrollTo(0, 0);
          return;
        }
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
      }

      // 5. Update Email (If verified)
      if (isChangingEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email });
        if (emailError) throw emailError;
        setFormSuccess(`✅ Profile updated! A confirmation link has been sent to ${email}.`);
      } else {
        setFormSuccess("✅ Business profile updated successfully!");
      }

      await refreshBusiness(); 
      // Clear sensitive fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.scrollTo(0, 0); // Scroll to see green message

    } catch (err: any) {
      console.error("Save Error:", err);
      setFormError(`⚠️ System Error: ${err.message || "Unknown error"}`);
      window.scrollTo(0, 0);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
      {/* Navigation */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-gray-500 hover:text-emerald-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Settings
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
        <p className="text-gray-500">Update your shop details and account security.</p>
      </div>

      {/* --- ERROR / SUCCESS BANNERS --- */}
      {formError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start animate-in fade-in slide-in-from-top-2">
          <XCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <p className="font-medium">{formError}</p>
        </div>
      )}

      {formSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <p className="font-medium">{formSuccess}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* General Details Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-emerald-600" />
            General Details
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        {/* Tax Details Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-blue-600" />
            Tax & Invoicing
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TPIN</label>
            <input type="text" value={tpin} onChange={(e) => setTpin(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">VAT Registered?</span>
            <input type="checkbox" checked={isVatRegistered} onChange={(e) => setIsVatRegistered(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded" />
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-red-600" />
            Account Security
          </h2>

          <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start text-sm text-blue-700">
             <AlertCircle className="w-5 h-5 shrink-0" />
             <p>Only enter a new password if you want to change it. Otherwise, leave it blank.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
            <div className="relative">
              <Mail className="absolute top-2.5 left-3 w-4 h-4 text-gray-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password (Required to change details)</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••••" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Repeat new password" />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold shadow-md hover:bg-emerald-700 transition-all flex justify-center items-center active:scale-[0.98]"
        >
          {saving ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          {saving ? "Saving Changes..." : "Save Changes"}
        </button>

      </form>
    </div>
  );
}