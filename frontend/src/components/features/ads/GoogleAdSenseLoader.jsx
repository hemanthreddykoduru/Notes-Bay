import { useEffect } from 'react';
import api from '../../../lib/api';

const GoogleAdSenseLoader = () => {
    useEffect(() => {
        const checkSubscriptionAndLoadAds = async () => {
            try {
                // Determine if we should show ads
                // Default to true (show ads) if checking fails, or false? 
                // Better to default to showing ads for max revenue, but maybe check auth first.
                // If user is not logged in, they see ads.
                // If user is logged in, we check subscription.

                let shouldShowAds = true;

                // Simple check: try to fetch subscription status
                // If 401 (not logged in), catch block runs -> show ads
                // If 200, check isSubscribed
                try {
                    const { data } = await api.get('/payments/subscription-status');
                    if (data && data.isSubscribed) {
                        shouldShowAds = false;
                    }
                } catch (error) {
                    // Not logged in or error -> show ads
                    shouldShowAds = true;
                }

                if (shouldShowAds) {
                    // Check if script is already present
                    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;

                    const script = document.createElement('script');
                    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6334356671488767";
                    script.async = true;
                    script.crossOrigin = "anonymous";
                    document.head.appendChild(script);
                }
            } catch (error) {
                console.error('Error in AdSense loader:', error);
            }
        };

        checkSubscriptionAndLoadAds();
    }, []);

    return null; // This component renders nothing
};

export default GoogleAdSenseLoader;
