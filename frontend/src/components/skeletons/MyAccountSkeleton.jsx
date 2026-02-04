
export default function MyAccountSkeleton() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
            {/* Header Skeleton */}
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    {/* Email Field Skeleton */}
                    <div className="mb-6">
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded mt-1"></div>
                    </div>

                    {/* Name Field Skeleton */}
                    <div className="mb-6">
                        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </div>

                    {/* Mobile Field Skeleton */}
                    <div className="mb-8">
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </div>

                    {/* Buttons Skeleton */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
