"use client";

import { useBusiness } from "@/contexts/BusinessContext"; 
import { createClient } from "@/supabase/client"; 
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Added router for navigation
import { Check, Phone, Mail, Zap, Loader2, ArrowLeft } from "lucide-react"; // Added ArrowLeft

export default function SubscriptionPage() {
  const router = useRouter(); // Hook for navigation
  const { businessId, isLoading: authLoading } = useBusiness();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // --- FETCH FRESH DATA ---
  useEffect(() => {
    async function fetchSubscriptionData() {
      if (!businessId) return;
      
      const supabase = createClient();
      try {
        const { data } = await supabase
          .from('businesses')
          .select('subscription_tier, subscription_status, subscription_end_date')
          .eq('id', businessId)
          .single();
          
        if (data) {
          setBusiness(data);
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && businessId) {
      fetchSubscriptionData();
    }
  }, [businessId, authLoading]);

  // --- LOGIC ENGINE ---
  const rawStatus = (business?.subscription_status || 'active').toLowerCase();
  const rawTier = (business?.subscription_tier || 'free').toLowerCase();
  const isTrial = rawStatus === 'trial';
  
  const visualTier = isTrial ? 'pro' : rawTier;

  const endDate = business?.subscription_end_date ? new Date(business.subscription_end_date) : new Date();
  const today = new Date();
  const diffTime = Math.abs(endDate.getTime() - today.getTime());
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  const handleUpgradeClick = (plan: string) => {
    setSelectedPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  if (authLoading || (loading && businessId)) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600 mr-3" />
        Loading plan details...
      </div>
    );
  }

  return (
    // Added pb-24 to ensure bottom content isn't hidden by mobile nav
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
      
      {/* --- BACK BUTTON --- */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-gray-500 hover:text-emerald-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Settings
      </button>

      {/* HEADER */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-2 text-lg">Choose the right tools to grow your Zambian business.</p>

        {/* TRIAL BANNER */}
        {isTrial && (
          <div className="mt-6 inline-flex items-center rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-orange-800 shadow-sm text-left">
            <Zap className="h-5 w-5 mr-3 text-orange-500 fill-orange-500 flex-shrink-0" />
            <div>
              <span className="font-bold">PRO TRIAL ACTIVE:</span> You have {daysLeft} days left. 
              <span className="hidden md:inline ml-1">Enjoy full access!</span>
            </div>
          </div>
        )}
      </div>

      {/* PRICING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* === FREE TIER === */}
        <PricingCard 
          tierName="Starter"
          price="Free"
          description="For small kantemba & startups"
          isActive={visualTier === 'free'}
          buttonText={visualTier === 'free' ? "Current Plan" : "Downgrade"}
          isDisabled={visualTier === 'free'}
          features={[
            "50 Products Max",
            "Cash Sales Only",
            "Basic Daily Reports",
          ]}
          missingFeatures={[
            "Barcode Scanner",
            "Credit / Kaloba Tracking",
            "Staff Accounts"
          ]}
        />

        {/* === GROWTH TIER === */}
        <PricingCard 
          tierName="Growth"
          price="K100"
          period="/month"
          description="For growing retail shops"
          isActive={visualTier === 'growth'}
          color="blue"
          buttonText={visualTier === 'growth' ? "Current Plan" : "Upgrade to Growth"}
          isDisabled={visualTier === 'growth'}
          onClick={() => handleUpgradeClick('Growth')}
          features={[
            "Unlimited Products",
            "Barcode Scanner Support",
            "Debt (Kaloba) Tracking",
            "30-Day Sales History",
          ]}
          missingFeatures={[
            "Multi-User Staff Accounts",
            "Low Stock SMS Alerts"
          ]}
        />

        {/* === PRO TIER === */}
        <PricingCard 
          tierName="Pro"
          price="K150"
          period="/month"
          description="For busy shops & wholesalers"
          isActive={visualTier === 'pro'}
          color="emerald"
          isBestValue
          buttonText={isTrial ? "Subscribe Now (Keep Pro)" : (visualTier === 'pro' ? "Current Plan" : "Upgrade to Pro")}
          isDisabled={visualTier === 'pro' && !isTrial}
          onClick={() => handleUpgradeClick('Pro')}
          features={[
            "Everything in Growth",
            "Multi-User Staff Accounts",
            "Advanced Profit/Loss Reports",
            "Low Stock Alerts",
            "Priority Support",
          ]}
        />
      </div>

      {/* SUPPORT FOOTER */}
      <div className="mt-16 border-t pt-10">
        <div className="bg-gray-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Need help or a custom plan?</h3>
            <p className="text-gray-500">Contact our support team directly.</p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <ContactButton icon={<Phone size={18} />} text="Airtel: 0972731792" href="tel:0972731792" />
            <ContactButton icon={<Phone size={18} />} text="MTN: 0967183220" href="tel:0967183220" />
            <ContactButton icon={<Mail size={18} />} text="Email Us" href="mailto:thezedpos@gmail.com" />
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upgrade to {selectedPlan}</h2>
              <button onClick={() => setIsUpgradeModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4 text-gray-600">
              <p>To activate immediately, send <strong>{selectedPlan === 'Pro' ? 'K150' : 'K100'}</strong> to:</p>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <PaymentRow label="Airtel Money" number="0972731792" color="text-red-600" />
                <PaymentRow label="MTN Money" number="0967183220" color="text-yellow-600" />
                <div className="border-t pt-2 mt-2 text-center text-sm font-bold text-gray-800">
                  Name: Chimpanshya Simbeya
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Payment Reference / Phone Number
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 0975..." 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setIsUpgradeModalOpen(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  alert("Request received! We will activate your plan shortly.");
                }}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-lg transition transform active:scale-95"
              >
                I have sent money
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function PricingCard({ tierName, price, period, description, features, missingFeatures, isActive, isBestValue, color = "gray", buttonText, isDisabled, onClick }: any) {
  const borderClass = isActive ? (color === 'emerald' ? 'ring-2 ring-emerald-500' : color === 'blue' ? 'ring-2 ring-blue-500' : 'ring-2 ring-gray-400') : 'border-gray-200';
  const bgClass = isActive ? (color === 'emerald' ? 'bg-emerald-50/50' : color === 'blue' ? 'bg-blue-50/50' : 'bg-gray-50/50') : 'bg-white';
  
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all duration-200 ${borderClass} ${bgClass} ${isActive ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
      {isBestValue && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide">
          BEST VALUE
        </div>
      )}
      <div className="mb-6">
        <h3 className={`text-lg font-bold uppercase tracking-wider ${color === 'emerald' ? 'text-emerald-700' : color === 'blue' ? 'text-blue-700' : 'text-gray-500'}`}>{tierName}</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-4xl font-extrabold text-gray-900">{price}</span>
          {period && <span className="ml-1 text-gray-500 font-medium">{period}</span>}
        </div>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
      <ul className="mb-8 space-y-4 flex-1">
        {features.map((feat: string, i: number) => (
          <li key={i} className="flex items-start">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="text-gray-700 text-sm font-medium pt-0.5">{feat}</span>
          </li>
        ))}
        {missingFeatures?.map((feat: string, i: number) => (
          <li key={i} className="flex items-start opacity-50">
             <div className="flex-shrink-0 w-6 h-6 mr-3 flex items-center justify-center">
              <span className="text-gray-400 font-bold text-lg">×</span>
            </div>
            <span className="text-gray-500 text-sm pt-0.5 line-through">{feat}</span>
          </li>
        ))}
      </ul>
      <button onClick={onClick} disabled={isDisabled} className={`w-full py-3 rounded-xl font-bold transition-all duration-200 ${isDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : (color === 'emerald' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg' : color === 'blue' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-gray-800 text-white')}`}>{buttonText}</button>
    </div>
  );
}

function ContactButton({ icon, text, href }: any) {
  return <a href={href} className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:text-emerald-600 hover:border-emerald-200 transition shadow-sm"><span className="mr-2">{icon}</span>{text}</a>;
}

function PaymentRow({ label, number, color }: any) {
  return <div className="flex justify-between items-center font-medium"><span className="text-gray-600">{label}:</span><span className={`font-bold tracking-wide ${color}`}>{number}</span></div>;
}