import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Lock } from 'lucide-react';

// Configure PDF Worker
// Use unpkg CDN for the worker to avoid Vite build issues with the local file
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// configured below

export default function SecurePDFViewer({ fileUrl, onClose, title, userEmail }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [containerWidth, setContainerWidth] = useState(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    const changePage = (offset) => {
        setPageNumber(prevPage => {
            const newPage = prevPage + offset;
            return Math.max(1, Math.min(newPage, numPages));
        });
    };

    const changeScale = (delta) => {
        setScale(prevScale => Math.max(0.5, Math.min(prevScale + delta, 3.0)));
    };

    // Disable Context Menu (Right Click)
    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    function onContainerRef(node) {
        if (node) {
            setContainerWidth(node.clientWidth);
        }
    }

    // Update width on resize
    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('pdf-wrapper');
            if (container) {
                setContainerWidth(container.clientWidth);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isBlurred, setIsBlurred] = useState(false);

    // ... existing code ...

    // Anti-Screenshot: Blur when window loses focus OR mouse leaves (Snipping Tool protection)
    useEffect(() => {
        const handleFocus = () => setIsBlurred(false);
        const handleBlur = () => setIsBlurred(true);
        const handleMouseLeave = () => setIsBlurred(true);
        const handleMouseEnter = () => setIsBlurred(false);

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, []);

    // Anti-Screenshot: Block keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // macOS: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
            if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
                e.preventDefault();
                alert("Screenshots are disabled for privacy.");
                setIsBlurred(true);
            }
            // Windows: PrtScn (Print Screen)
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                alert("Screenshots are disabled for privacy.");
                setIsBlurred(true);
            }
            // Ctrl+P (Print)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                alert("Printing is disabled.");
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 bg-gray-900 flex flex-col h-screen w-screen overflow-hidden select-none"
            onContextMenu={handleContextMenu}
        >
            {/* Blur Overlay */}
            {isBlurred && (
                <div className="absolute inset-0 z-[100] bg-gray-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-4">
                    <div className="bg-white/10 p-8 rounded-full mb-6">
                        <Lock className="w-16 h-16 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Content Hidden</h2>
                    <p className="text-gray-300 text-lg max-w-md">
                        The secure viewer is blurred when the window loses focus to protect content privacy.
                    </p>
                    <button
                        onClick={() => setIsBlurred(false)}
                        className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Resume Reading
                    </button>
                </div>
            )}

            {/* Header / Toolbar */}
            <div className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate max-w-[150px] sm:max-w-md hidden sm:block">
                        {title}
                    </h3>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1}
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>

                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 w-16 text-center">
                        {pageNumber} / {numPages || '--'}
                    </span>

                    <button
                        onClick={() => changePage(1)}
                        disabled={pageNumber >= numPages}
                        className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                </div>

                <div className="flex items-center space-x-2 hidden sm:flex">
                    <button onClick={() => changeScale(-0.1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => changeScale(0.1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div
                id="pdf-wrapper"
                className="flex-1 overflow-auto bg-gray-900 flex justify-center p-2 sm:p-8 touch-pan-y"
                ref={onContainerRef}
            >
                <div className="shadow-2xl relative">
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-10 text-white space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="animate-pulse">Preparing secure view...</p>
                        </div>
                    )}

                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div className="flex flex-col items-center justify-center p-10 text-white space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                                <p>Loading document...</p>
                            </div>
                        }
                        error={<div className="text-red-400 p-10">Failed to load PDF. Please try refreshing.</div>}
                    >
                        {/* Only render page if we have a width to base it on */}
                        {containerWidth && (
                            <div className="relative">
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    width={Math.min(containerWidth - 16, 800)} // Responsive width: Container minus padding (16px), max 800px
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="bg-white"
                                    loading=""
                                />
                                {/* Watermark Overlay - Stronger Visibility */}
                                <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none select-none flex flex-wrap content-center justify-center opacity-30">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1/3 h-1/4 flex items-center justify-center -rotate-45 transform"
                                        >
                                            <span
                                                className="text-gray-700 font-extrabold whitespace-nowrap"
                                                style={{ fontSize: `${24 * scale}px` }}
                                            >
                                                {userEmail || 'NotesBay Safe'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Document>
                </div>
            </div>

            {/* Mobile Footer (Optional, currently using top bar) */}
        </div>
    );
}
