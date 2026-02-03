import { useEffect } from 'react';
import { useAdContext } from '../context/AdContext';

export default function AdBlockDetector() {
    const { setShowFallbackAds } = useAdContext();

    useEffect(() => {
        let isMounted = true;
        const baitClass = 'adsbygoogle ad-banner';
        const baitStyle = 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;';

        // 1. Create Bait Element
        const bait = document.createElement('div');
        bait.className = baitClass;
        bait.style.cssText = baitStyle;
        document.body.appendChild(bait);

        const detect = async () => {
            let detected = false;

            // Check A: Bait Element Properties
            if (
                !bait ||
                bait.offsetParent === null ||
                bait.offsetHeight === 0 ||
                bait.offsetLeft === 0 ||
                bait.offsetTop === 0 ||
                window.getComputedStyle(bait).display === 'none' ||
                window.getComputedStyle(bait).visibility === 'hidden'
            ) {
                detected = true;
                console.log('AdBlock detected via Bait Element');
            }

            // Check B: Script Injection
            if (!detected) {
                try {
                    // Check 1: Google Ads
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
                        script.onerror = () => reject(new Error('Blocked Google'));
                        script.onload = () => { script.remove(); resolve(); };
                        document.head.appendChild(script);
                    });

                    // Check 2: HighPerformanceFormat
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://www.highperformanceformat.com/841b7e7d333e3d24d3fdbae0c58425ef/invoke.js';
                        script.onerror = () => reject(new Error('Blocked AdNetwork'));
                        script.onload = () => { script.remove(); resolve(); };
                        document.head.appendChild(script);
                    });
                } catch (e) {
                    detected = true;
                    console.log('AdBlock detected via Script Error:', e.message);
                }
            }

            // Check C: Generic Class
            if (!detected) {
                const testAd = document.createElement('div');
                testAd.innerHTML = '&nbsp;';
                testAd.className = 'adsbox';
                document.body.appendChild(testAd);
                if (testAd.offsetHeight === 0) {
                    detected = true;
                    console.log('AdBlock detected via Generic Class Block');
                }
                testAd.remove();
            }

            if (isMounted) {
                // UPDATE GLOBAL CONTEXT INSTEAD OF LOCAL STATE
                setShowFallbackAds(detected);
            }

            // Cleanup bait
            if (document.body.contains(bait)) {
                document.body.removeChild(bait);
            }
        };

        // Run detection after a small delay to allow extensions to act
        const timeoutId = setTimeout(detect, 2000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (document.body.contains(bait)) {
                document.body.removeChild(bait);
            }
        };
    }, [setShowFallbackAds]);

    // RENDER NOTHING - Logic only
    return null;
}
