import { useEffect, useRef } from 'react';

export default function LeaderboardAd() {
    const adRef = useRef(null);

    useEffect(() => {
        if (adRef.current && !adRef.current.querySelector('script')) {
            const scriptContent = document.createElement('script');
            scriptContent.type = 'text/javascript';
            scriptContent.text = `
                atOptions = {
                    'key' : '841b7e7d333e3d24d3fdbae0c58425ef',
                    'format' : 'iframe',
                    'height' : 90,
                    'width' : 728,
                    'params' : {}
                };
            `;

            const scriptSrc = document.createElement('script');
            scriptSrc.type = 'text/javascript';
            scriptSrc.src = "https://www.highperformanceformat.com/841b7e7d333e3d24d3fdbae0c58425ef/invoke.js";

            adRef.current.appendChild(scriptContent);
            adRef.current.appendChild(scriptSrc);
        }
    }, []);

    return (
        <div className="flex justify-center my-8">
            <div ref={adRef} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 w-[728px] h-[90px]">
                {/* Leaderboard Ad Container (728x90) */}
            </div>
        </div>
    );
}
