import React from 'react';

export default function NoteDetailSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            {/* Breadcrumb Skeleton */}
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    {/* Title & Subject */}
                    <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                        {/* Preview Image Skeleton */}
                        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>

                        <div className="flex flex-col space-y-6">
                            {/* Description Skeleton */}
                            <div className="space-y-3">
                                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>

                            {/* Buy/Action Box Skeleton */}
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl mt-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
