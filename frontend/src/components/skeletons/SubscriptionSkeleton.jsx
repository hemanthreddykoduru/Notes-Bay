
export default function SubscriptionSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="text-center mb-8 sm:mb-12 md:mb-16">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
                <div className="h-10 sm:h-12 w-3/4 sm:w-1/2 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-6 w-5/6 sm:w-2/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>

            {/* Cards Skeleton */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
                {[1, 2].map((i) => (
                    <div key={i} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden h-full flex flex-col p-6 sm:p-8">
                        {/* Icon Skeleton */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>

                        {/* Title Skeleton */}
                        <div className="h-8 w-40 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>

                        {/* Price/Timer Skeleton */}
                        <div className="h-16 w-3/4 mx-auto bg-gray-200 dark:bg-gray-700 rounded-xl mb-8"></div>

                        {/* Features Skeleton */}
                        <div className="space-y-4 mb-8 flex-grow">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="flex items-center">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 mr-3"></div>
                                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            ))}
                        </div>

                        {/* Button Skeleton */}
                        <div className="h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
