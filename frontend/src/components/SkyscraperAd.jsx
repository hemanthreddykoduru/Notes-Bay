import { useEffect, useRef } from 'react';

export default function SkyscraperAd() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        const iframe = document.createElement('iframe');
        iframe.style.width = '160px';
        iframe.style.height = '600px';
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
                        'key' : '68809564639dc13c6c7a42b4d31a217a',
                        'format' : 'iframe',
                        'height' : 600,
                        'width' : 160,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="https://www.highperformanceformat.com/68809564639dc13c6c7a42b4d31a217a/invoke.js"></script>
            </body>
            </html>
        `;

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(adContent);
        doc.close();

    }, []);

    return (
        <div className="flex justify-center h-full">
            <div ref={containerRef} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden sticky top-8 flex items-center justify-center w-[160px] h-[600px]">
                {/* Ad will be injected here into an iframe */}
            </div>
        </div>
    );
}
