import { useEffect, useRef } from 'react';

export default function LeaderboardAd() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.style.width = '728px';
        iframe.style.height = '90px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.scrolling = 'no';

        container.appendChild(iframe);

        const adContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100%; }</style>
            </head>
            <body>
                <script type="text/javascript">
                    atOptions = {
                        'key' : '841b7e7d333e3d24d3fdbae0c58425ef',
                        'format' : 'iframe',
                        'height' : 90,
                        'width' : 728,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="https://www.highperformanceformat.com/841b7e7d333e3d24d3fdbae0c58425ef/invoke.js"></script>
            </body>
            </html>
        `;

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(adContent);
        doc.close();

    }, []);

    return (
        <div className="flex justify-center my-6">
            <div ref={containerRef} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center w-[728px] h-[90px]">
                {/* Ad will be injected here into an iframe */}
            </div>
        </div>
    );
}
