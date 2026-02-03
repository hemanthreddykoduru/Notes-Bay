import { useEffect, useRef } from 'react';

export default function NativeAd() {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent duplicate injection if the script is already there
        // (Though the script itself might handle it, it's safer to check)
        const containerId = 'container-d68e86c78a165471230741b38fdabdee';
        const container = document.getElementById(containerId);

        if (container && !container.hasChildNodes()) {
            const script = document.createElement('script');
            script.async = true;
            script.dataset.cfasync = "false";
            script.src = "https://pl28635968.effectivegatecpm.com/d68e86c78a165471230741b38fdabdee/invoke.js";

            // Append script to body or near the container
            // The instructions say: <div id="..."></div> and then script.
            // Often these scripts document.write or look for the id. 
            // Since it's an external script "invoke.js", it likely looks for the container.
            // Let's append it to the specific ref wrapper or body.
            // Appending to the component might be cleaner to keep it contained.
            containerRef.current.appendChild(script);
        }

        // No cleanup needed for the script itself usually, but we could remove it 
        // to prevent memory leaks if the component unmounts, though these ads 
        // usually modify global state.
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
