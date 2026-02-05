import { useEffect } from 'react';

/**
 * AdSense Component - Displays Google AdSense ads
 * @param {string} adSlot - The ad unit slot ID from AdSense
 * @param {string} adFormat - Ad format (auto, rectangle, horizontal, vertical)
 * @param {boolean} fullWidthResponsive - Enable full width responsive ads
 */
export default function AdSense({
    adSlot,
    adFormat = 'auto',
    fullWidthResponsive = true
}) {
    useEffect(() => {
        try {
            // Push ad to AdSense
            if (window.adsbygoogle && process.env.NODE_ENV === 'production') {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (error) {
            console.error('AdSense error:', error);
        }
    }, []);

    // Only show ads in production
    if (process.env.NODE_ENV !== 'production') {
        return null;
    }

    return (
        <div className="adsense-container my-4">
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-6334356671488767"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive.toString()}
            />
        </div>
    );
}
