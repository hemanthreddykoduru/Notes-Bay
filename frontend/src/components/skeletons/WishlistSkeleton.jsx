import React from 'react';

export default function WishlistSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center mb-8">
                <div className="w-8 h-8 mr-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
                        {/* Image Placeholder */}
                        <div className="h-48 bg-gray-200 dark:bg-gray-700 w-full"></div>

                        <div className="p-4 flex-1 flex flex-col space-y-3">
                            {/* Title & Subject */}
                            <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>

                            {/* Price & Rating */}
                            <div className="flex justify-between items-center mt-4">
                                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>

                            {/* Button Placeholder */}
                            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded mt-auto"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
