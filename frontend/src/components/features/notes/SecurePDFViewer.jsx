import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Configure PDF Worker
// Use unpkg CDN for the worker to avoid Vite build issues with the local file
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// configured below

export default function SecurePDFViewer({ fileUrl, onClose, title }) {
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

    return (
        <div
            className="fixed inset-0 z-50 bg-gray-900 flex flex-col h-screen w-screen overflow-hidden select-none"
            onContextMenu={handleContextMenu}
        >
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
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                width={Math.min(containerWidth - 16, 800)} // Responsive width: Container minus padding (16px), max 800px
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="bg-white"
                                loading=""
                            />
                        )}
                    </Document>
                </div>
            </div>

            {/* Mobile Footer (Optional, currently using top bar) */}
        </div>
    );
}
