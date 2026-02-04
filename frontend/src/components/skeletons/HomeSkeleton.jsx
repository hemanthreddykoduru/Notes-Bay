import { Search, Filter, Sparkles } from 'lucide-react';

export default function HomeSkeleton({ onlyGrid = false }) {
    return (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse ${onlyGrid ? '' : ''}`}>
            {!onlyGrid && (
                <div className="mb-12">
                    {/* Hero Section Skeleton */}
                    <div className="text-center mb-8">
                        {/* Title */}
                        <div className="h-10 sm:h-14 md:h-16 w-3/4 sm:w-2/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                        <div className="h-10 sm:h-14 md:h-16 w-1/2 sm:w-1/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>

                        {/* Subtitle */}
                        <div className="h-4 sm:h-5 md:h-6 w-5/6 sm:w-1/2 md:w-1/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded mt-3"></div>
                        <div className="h-4 sm:h-5 md:h-6 w-2/3 sm:w-1/3 md:w-1/4 mx-auto bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>

                        {/* Hero CTA Button */}
                        <div className="mt-8 flex justify-center">
                            <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </div>
                    </div>

                    {/* 3D Hero Placeholder */}
                    <div className="h-64 sm:h-80 w-full max-w-2xl mx-auto bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
            )}

            {!onlyGrid && (
                <>
                    {/* Search & Filter Bar Skeleton */}
                    <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            {/* Search Input */}
                            <div className="w-full md:w-1/2 lg:w-1/3 h-10 bg-gray-200 dark:bg-gray-700 rounded-md"></div>

                            {/* Filter Toggles */}
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                                <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            </div>
                        </div>
                    </div>

                    {/* Results Count Skeleton */}
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
                </>
            )}

            {/* Notes Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
                        {/* Image Placeholder */}
                        <div className="h-48 bg-gray-200 dark:bg-gray-700 w-full relative">
                            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                        </div>

                        {/* Content Placeholder */}
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>

                            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>

                            <div className="mt-auto space-y-3">
                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>

                                <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Skeleton */}
            {!onlyGrid && (
                <div className="mt-12 flex justify-center items-center gap-2">
                    <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                        ))}
                    </div>
                    <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                </div>
            )}
        </div>
    );
}
