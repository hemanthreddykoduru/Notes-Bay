import { useEffect, useRef } from 'react';

export default function NativeAd() {
    const containerRef = useRef(null);

    useEffect(() => {
        const containerId = 'container-d68e86c78a165471230741b38fdabdee';
        const container = document.getElementById(containerId);

        // Check if script is already injected in the wrapper
        if (containerRef.current && containerRef.current.querySelector('script[src*="effectivegatecpm.com"]')) {
            return;
        }

        if (container) {
            const script = document.createElement('script');
            script.async = true;
            script.dataset.cfasync = "false";
            script.src = "https://pl28635968.effectivegatecpm.com/d68e86c78a165471230741b38fdabdee/invoke.js";

            containerRef.current.appendChild(script);
        }
    }, []);

    return (
        <div className="w-full flex justify-center my-8">
            {/* The ad container required by the script */}
            <div ref={containerRef}>
                <div id="container-d68e86c78a165471230741b38fdabdee"></div>
            </div>
        </div>
    );
}
