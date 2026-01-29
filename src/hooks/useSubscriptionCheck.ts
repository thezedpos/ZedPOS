import { useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { createClient } from '@/supabase/client';

export function useSubscriptionCheck() {
  const { business, refreshBusiness } = useBusiness();
  const supabase = createClient();

  useEffect(() => {
    if (!business) return;

    const checkSubscription = async () => {
      const now = new Date();
      let shouldDowngrade = false;

      // 1. Check TRIAL Expiry
      if (business.subscription_status === 'trial' && business.trial_ends_at) {
        const trialEnd = new Date(business.trial_ends_at);
        if (now > trialEnd) {
          shouldDowngrade = true;
          console.log("Trial expired. Downgrading...");
        }
      }

      // 2. Check PAID SUBSCRIPTION Expiry (if they didn't renew)
      // We assume if status is 'active' AND tier is not 'free', they are on a paid plan
      if (business.subscription_status === 'active' && business.subscription_tier !== 'free' && business.current_period_end) {
        const subEnd = new Date(business.current_period_end);
        if (now > subEnd) {
          shouldDowngrade = true;
          console.log("Subscription expired. Downgrading...");
        }
      }

      // 3. EXECUTE DOWNGRADE (If needed)
      if (shouldDowngrade) {
        const { error } = await supabase
          .from('businesses')
          .update({ 
            subscription_tier: 'free', 
            subscription_status: 'active', // 'active' on free plan means "standard user"
            trial_ends_at: null,
            current_period_end: null
          })
          .eq('id', business.id);

        if (!error) {
          await refreshBusiness(); // Update UI immediately
          alert("Your subscription or trial has expired. You have been moved to the Free plan.");
        }
      }
    };

    checkSubscription();
  }, [business, supabase, refreshBusiness]);
}