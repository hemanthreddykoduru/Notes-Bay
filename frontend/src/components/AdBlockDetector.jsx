import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AdBlockDetector() {
    const [adBlockDetected, setAdBlockDetected] = useState(false);

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

            // Check B: Script Injection (More reliable for network blocking)
            if (!detected) {
                try {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
                        script.onerror = () => {
                            reject(new Error('Blocked'));
                        };
                        script.onload = () => {
                            resolve();
                            script.remove();
                        };
                        document.head.appendChild(script);
                    });
                } catch (e) {
                    detected = true;
                    console.log('AdBlock detected via Script Error');
                }
            }

            // Check C: Quick check for typical blocked classes behavior if mapped
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

            if (isMounted && detected) {
                setAdBlockDetected(true);
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
