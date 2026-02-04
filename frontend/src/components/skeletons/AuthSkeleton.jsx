
export default function AuthSkeleton() {
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 flex transition-colors duration-200 animate-pulse">
            {/* Left Side - 3D Scene Placeholder (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gray-100 dark:bg-gray-800 relative flex-col justify-center items-center">
                <div className="h-64 w-64 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mt-8"></div>
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
            </div>

            {/* Right Side - Form Skeleton */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50 dark:bg-gray-900">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div>
                        <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>

                    <div className="mt-8 space-y-6">
                        {/* Input 1 */}
                        <div>
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                        </div>

                        {/* Input 2 */}
                        <div>
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                        </div>

                        {/* Button */}
                        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md mt-6"></div>

                        {/* Social Buttons */}
                        <div className="mt-6 space-y-3">
                            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
