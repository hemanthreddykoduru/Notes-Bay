import { useEffect, useRef } from 'react';

export default function SkyscraperAd() {
    const adRef = useRef(null);

    useEffect(() => {
        if (adRef.current && !adRef.current.querySelector('script')) {
            const scriptContent = document.createElement('script');
            scriptContent.type = 'text/javascript';
            scriptContent.text = `
                atOptions = {
                    'key' : '68809564639dc13c6c7a42b4d31a217a',
                    'format' : 'iframe',
                    'height' : 600,
                    'width' : 160,
                    'params' : {}
                };
            `;

            const scriptSrc = document.createElement('script');
            scriptSrc.type = 'text/javascript';
            scriptSrc.src = "https://www.highperformanceformat.com/68809564639dc13c6c7a42b4d31a217a/invoke.js";

            adRef.current.appendChild(scriptContent);
            adRef.current.appendChild(scriptSrc);
        }
    }, []);

    return (
        <div className="flex justify-center h-full">
            <div ref={adRef} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden sticky top-8">
                {/* Skyscraper Ad Container (160x600) */}
            </div>
        </div>
    );
}
