'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PREMIUM_REQUIRED_EVENT } from '@/lib/subscriptionUpsell';

/**
 * Turns a premium-gate API response into one upsell toast that links to /plans
 * (#584). Mounted once in the global provider, so every screen gets it.
 */
export default function PremiumUpsellListener() {
  const router = useRouter();

  useEffect(() => {
    const onPremiumRequired = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      toast(message || 'This feature needs a paid plan.', {
        id: 'premium-upsell',
        action: { label: 'View plans', onClick: () => router.push('/plans') },
      });
    };

    window.addEventListener(PREMIUM_REQUIRED_EVENT, onPremiumRequired);
    return () => window.removeEventListener(PREMIUM_REQUIRED_EVENT, onPremiumRequired);
  }, [router]);

  return null;
}
