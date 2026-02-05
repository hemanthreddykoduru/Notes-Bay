import React from 'react';

export default function AdminDashboardSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                        <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-700 mr-4"></div>
                        <div className="flex-1">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-80">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="h-full bg-gray-100 dark:bg-gray-700/50 rounded flex items-end justify-between p-4 space-x-2">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="w-full bg-gray-200 dark:bg-gray-600 rounded-t" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-80">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3">
                                <div className="flex items-center flex-1">
                                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"></div>
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notes List Header Skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>

            {/* Notes List Skeleton */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 sm:rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center flex-1">
                                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg mr-4 shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
