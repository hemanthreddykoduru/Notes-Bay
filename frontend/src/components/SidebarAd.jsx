import { useEffect, useRef } from 'react';

export default function SidebarAd() {
    const adRef = useRef(null);

    useEffect(() => {
        if (adRef.current && !adRef.current.querySelector('script')) {
            const scriptContent = document.createElement('script');
            scriptContent.type = 'text/javascript';
            scriptContent.text = `
                atOptions = {
                    'key' : 'b05904016b112a777bda992556a580c9',
                    'format' : 'iframe',
                    'height' : 250,
                    'width' : 300,
                    'params' : {}
                };
            `;

            const scriptSrc = document.createElement('script');
            scriptSrc.type = 'text/javascript';
            scriptSrc.src = "https://www.highperformanceformat.com/b05904016b112a777bda992556a580c9/invoke.js";

            adRef.current.appendChild(scriptContent);
            adRef.current.appendChild(scriptSrc);
        }
    }, []);

    return (
        <div className="flex justify-center my-6">
            <div ref={adRef} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                {/* Ad Container */}
            </div>
        </div>
    );
}
