import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AdBlockDetector() {
    const [adBlockDetected, setAdBlockDetected] = useState(false);

    useEffect(() => {
        // Skip detection on localhost/development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('AdBlock detection skipped (localhost)');
            return;
        }

        let isMounted = true;
        const baitClass = 'adsbygoogle ad-banner';
        const baitStyle = 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;';

        // 1. Create Bait Element
        const bait = document.createElement('div');
        bait.className = baitClass;
        bait.style.cssText = baitStyle;
        document.body.appendChild(bait);

        const detect = async () => {
            let failedChecks = 0; // Count how many checks fail
            const REQUIRED_FAILURES = 2; // Require at least 2 checks to fail

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
                failedChecks++;
                console.log('AdBlock Check 1 Failed: Bait Element');
            }

            // Check B: Script Injection with 10s Timeout (increased from 3s)
            try {
                // Check 1: Google Ads (with 10s timeout)
                await Promise.race([
                    new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
                        script.async = true;
                        script.onerror = () => reject(new Error('Blocked Google'));
                        script.onload = () => { script.remove(); resolve(); };
                        document.head.appendChild(script);
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Google')), 10000))
                ]);
            } catch (e) {
                failedChecks++;
                console.log('AdBlock Check 2 Failed: Google Ads -', e.message);
            }

            // Check C: HighPerformanceFormat (with 10s timeout)
            try {
                await Promise.race([
                    new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://www.highperformanceformat.com/841b7e7d333e3d24d3fdbae0c58425ef/invoke.js';
                        script.async = true;
                        script.onerror = () => reject(new Error('Blocked AdNetwork'));
                        script.onload = () => { script.remove(); resolve(); };
                        document.head.appendChild(script);
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout AdNetwork')), 10000))
                ]);
            } catch (e) {
                failedChecks++;
                console.log('AdBlock Check 3 Failed: HighPerformanceFormat -', e.message);
            }

            // Check D: Generic Class
            const testAd = document.createElement('div');
            testAd.innerHTML = '&nbsp;';
            testAd.className = 'adsbox';
            document.body.appendChild(testAd);
            if (testAd.offsetHeight === 0) {
                failedChecks++;
                console.log('AdBlock Check 4 Failed: Generic Class Block');
            }
            testAd.remove();

            // Only trigger if at least 2 checks failed
            console.log(`AdBlock Detection: ${failedChecks} checks failed (need ${REQUIRED_FAILURES})`);
            if (isMounted && failedChecks >= REQUIRED_FAILURES) {
                setAdBlockDetected(true);
            }

            // Cleanup bait
            if (document.body.contains(bait)) {
                document.body.removeChild(bait);
            }
        };

        const timeoutId = setTimeout(detect, 1000); // Delay detection by 1s to let page load

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (document.body.contains(bait)) {
                document.body.removeChild(bait);
            }
        };
    }, []);

    if (!adBlockDetected) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
                <div className="mb-6 flex justify-center">
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full ring-4 ring-red-50 dark:ring-red-900/10">
                        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Ad Blocker Detected
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-lg">
                    We've detected that you are using an ad blocker. Our content is free thanks to our sponsors.
                    <br /><br />
                    <span className="font-semibold text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        Please disable your ad blocker to continue accessing NotesBay.
                    </span>
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-xl hover:shadow-indigo-500/25 transform hover:-translate-y-0.5"
                    >
                        I've Disabled It, Refresh Page
                    </button>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Refresh required after disabling
                    </p>
                </div>
            </div>
        </div>
    );
}
